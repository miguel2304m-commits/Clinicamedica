import { Router } from "express";
import { z } from "zod";
import { db, transacao, exigir } from "./db.js";
import { permitir, auditar, escopoPaciente, publico } from "./auth.js";
import {
  pessoa,
  profissional,
  paginar,
  texto,
  longo,
  cnpj,
  id,
  data,
  dinheiro,
} from "./validacao.js";
import bcrypt from "bcryptjs";
export const cadastros = Router();
const admin = permitir("ADMINISTRADOR");
const cadastro = permitir("ADMINISTRADOR", "RECEPCIONISTA");
const schemas: Record<string, z.ZodObject<any>> = {
  especialidades: z.object({ nome: texto, descricao: longo }),
  unidades: z.object({
    nome: texto,
    endereco: texto,
    telefone: texto,
    horario: texto,
    especialidades: z.array(id).min(1),
  }),
  convenios: z.object({ nome: texto, cnpj, telefone: texto }),
  alergias: z.object({ nome: texto, descricao: longo }),
  exames: z.object({ nome: texto, descricao: longo, tipo: texto }),
  medicamentos: z.object({
    nome: texto,
    principioAtivo: texto,
    fabricante: texto,
    apresentacao: texto,
  }),
  procedimentos: z.object({
    nome: texto,
    descricao: longo,
    valorPadrao: dinheiro,
  }),
};
const models: Record<string, string> = {
  especialidades: "especialidade",
  unidades: "unidade",
  convenios: "convenio",
  alergias: "alergia",
  exames: "exame",
  medicamentos: "medicamento",
  procedimentos: "procedimento",
};
cadastros.get("/catalogos/:tipo", async (req, res) => {
  const tipo = String(req.params.tipo);
  exigir(models[tipo], "Catálogo não encontrado.", 404);
  const { pagina, tamanho, busca } = paginar.parse(req.query);
  const modelo = (db as any)[models[tipo]];
  const where = { nome: { contains: busca, mode: "insensitive" } };
  const include =
    tipo === "unidades"
      ? {
          especialidades: { include: { especialidade: true } },
          profissionais: {
            include: {
              profissional: {
                select: { id: true, nome: true, registro: true },
              },
            },
          },
        }
      : undefined;
  const [itens, total] = await Promise.all([
    modelo.findMany({
      where,
      include,
      skip: (pagina - 1) * tamanho,
      take: tamanho,
      orderBy: { nome: "asc" },
    }),
    modelo.count({ where }),
  ]);
  res.json({ itens, total, pagina, tamanho });
});
for (const method of ["post", "put"] as const)
  cadastros[method](
    "/catalogos/:tipo" + (method === "put" ? "/:id" : ""),
    async (req, res, next) => {
      if (req.params.tipo === "convenios") return cadastro(req, res, next);
      return admin(req, res, next);
    },
    async (req, res) => {
      const tipo = String(req.params.tipo);
      exigir(schemas[tipo], "Catálogo não encontrado.", 404);
      const input = schemas[tipo].strict().parse(req.body);
      const codigo = method === "put" ? id.parse(req.params.id) : undefined;
      const result = await transacao(async (tx) => {
        const { especialidades, ...resto } = input;
        const dados =
          tipo === "unidades"
            ? {
                ...resto,
                especialidades: {
                  ...(codigo ? { deleteMany: {} } : {}),
                  create: [...new Set(especialidades as number[])].map(
                    (especialidadeId) => ({ especialidadeId }),
                  ),
                },
              }
            : input;
        const item = await (tx as any)[models[tipo]][
          codigo ? "update" : "create"
        ]({ ...(codigo ? { where: { id: codigo } } : {}), data: dados });
        await auditar(
          tx,
          req.usuario,
          codigo ? "ALTERAR" : "CRIAR",
          tipo,
          item.id,
        );
        return item;
      });
      res.status(codigo ? 200 : 201).json(result);
    },
  );
cadastros.get("/pacientes", async (req, res) => {
  const { pagina, tamanho, busca } = paginar.parse(req.query);
  const sexo = z
    .enum(["F", "M", "OUTRO", "NAO_INFORMADO"])
    .optional()
    .parse(req.query.sexo);
  const u = req.usuario;
  const where: any = {
    sexo,
    OR: [
      { nome: { contains: busca, mode: "insensitive" } },
      { cpf: { contains: busca } },
    ],
  };
  if (u.perfil === "MEDICO")
    where.agendamentos = {
      some: {
        medicoId: u.profissionalId ?? -1,
        situacao: { in: ["AGENDADO", "CONFIRMADO", "REALIZADO"] },
      },
    };
  if (u.perfil === "ENFERMAGEM")
    where.agendamentos = {
      some: {
        situacao: { in: ["AGENDADO", "CONFIRMADO", "REALIZADO"] },
        unidade: {
          profissionais: { some: { profissionalId: u.profissionalId ?? -1 } },
        },
      },
    };
  const [itens, total] = await Promise.all([
    db.paciente.findMany({
      where,
      skip: (pagina - 1) * tamanho,
      take: tamanho,
      orderBy: { nome: "asc" },
    }),
    db.paciente.count({ where }),
  ]);
  res.json({ itens, total, pagina, tamanho });
});
cadastros.post("/pacientes", cadastro, async (req, res) => {
  const input = pessoa.strict().parse(req.body);
  const p = await transacao(async (tx) => {
    const p = await tx.paciente.create({
      data: { ...input, prontuario: { create: {} } },
    });
    await auditar(tx, req.usuario, "CRIAR", "Paciente", p.id);
    return p;
  });
  res.status(201).json(p);
});
cadastros.put("/pacientes/:id", cadastro, async (req, res) => {
  const input = pessoa.strict().parse(req.body);
  const codigo = id.parse(req.params.id);
  res.json(
    await transacao(async (tx) => {
      const p = await tx.paciente.update({
        where: { id: codigo },
        data: input,
      });
      await auditar(tx, req.usuario, "ALTERAR", "Paciente", p.id);
      return p;
    }),
  );
});
cadastros.get("/pacientes/:id", async (req, res) => {
  const codigo = id.parse(req.params.id);
  if (["MEDICO", "ENFERMAGEM"].includes(req.usuario.perfil))
    await escopoPaciente(req.usuario, codigo);
  const p = await db.paciente.findUnique({
    where: { id: codigo },
    include: { convenios: { include: { convenio: true } } },
  });
  exigir(p, "Paciente não encontrado.", 404);
  res.json(p);
});
cadastros.post("/pacientes/:id/convenios", cadastro, async (req, res) => {
  const pacienteId = id.parse(req.params.id);
  const input = z
    .object({ convenioId: id, carteirinha: texto, adesao: data })
    .strict()
    .parse(req.body);
  res.status(201).json(
    await transacao(async (tx) => {
      const v = await tx.pacienteConvenio.create({
        data: { ...input, pacienteId },
      });
      await auditar(tx, req.usuario, "VINCULAR", "PacienteConvenio", v.id);
      return v;
    }),
  );
});
cadastros.patch(
  "/pacientes/:id/convenios/:vinculoId",
  cadastro,
  async (req, res) => {
    const pacienteId = id.parse(req.params.id),
      codigo = id.parse(req.params.vinculoId);
    const { ativo } = z.object({ ativo: z.boolean() }).strict().parse(req.body);
    res.json(
      await transacao(async (tx) => {
        const v = await tx.pacienteConvenio.findUnique({
          where: { id: codigo },
        });
        exigir(v?.pacienteId === pacienteId, "Vínculo não encontrado.", 404);
        const r = await tx.pacienteConvenio.update({
          where: { id: codigo },
          data: { ativo },
        });
        await auditar(
          tx,
          req.usuario,
          "ALTERAR_SITUACAO",
          "PacienteConvenio",
          codigo,
        );
        return r;
      }),
    );
  },
);
cadastros.get("/profissionais", async (req, res) => {
  const { pagina, tamanho, busca } = paginar.parse(req.query);
  const where = { nome: { contains: busca, mode: "insensitive" as const } };
  const [itens, total] = await Promise.all([
    db.profissional.findMany({
      where,
      skip: (pagina - 1) * tamanho,
      take: tamanho,
      orderBy: { nome: "asc" },
      include: {
        medico: {
          include: { especialidades: { include: { especialidade: true } } },
        },
        unidades: { include: { unidade: true } },
      },
    }),
    db.profissional.count({ where }),
  ]);
  res.json({
    itens: itens.map((p) =>
      req.usuario.perfil === "ADMINISTRADOR"
        ? p
        : {
            id: p.id,
            nome: p.nome,
            registro: p.registro,
            medico: p.medico,
            unidades: p.unidades,
          },
    ),
    total,
    pagina,
    tamanho,
  });
});
for (const method of ["post", "put"] as const)
  cadastros[method](
    "/profissionais" + (method === "put" ? "/:id" : ""),
    admin,
    async (req, res) => {
      const input = profissional.strict().parse(req.body);
      const codigo = method === "put" ? id.parse(req.params.id) : undefined;
      res.status(codigo ? 200 : 201).json(
        await transacao(async (tx) => {
          const { unidades, medico, ...base } = input;
          if (codigo) {
            const atual = await tx.medico.findUnique({
              where: { profissionalId: codigo },
            });
            exigir(
              !atual || medico,
              "Não é permitido remover a condição de médico de um cadastro histórico.",
            );
          }
          const dados = {
            ...base,
            unidades: {
              ...(codigo ? { deleteMany: {} } : {}),
              create: [...new Set(unidades)].map((unidadeId) => ({
                unidadeId,
              })),
            },
          };
          const p = codigo
            ? await tx.profissional.update({
                where: { id: codigo },
                data: dados,
              })
            : await tx.profissional.create({ data: dados });
          if (medico) {
            const dados = { crm: medico.crm, ufCrm: medico.ufCrm };
            await tx.medico.upsert({
              where: { profissionalId: p.id },
              create: {
                ...dados,
                profissionalId: p.id,
                especialidades: {
                  create: [...new Set(medico.especialidades)].map(
                    (especialidadeId) => ({ especialidadeId }),
                  ),
                },
              },
              update: {
                ...dados,
                especialidades: {
                  deleteMany: {},
                  create: [...new Set(medico.especialidades)].map(
                    (especialidadeId) => ({ especialidadeId }),
                  ),
                },
              },
            });
          }
          await auditar(
            tx,
            req.usuario,
            codigo ? "ALTERAR" : "CRIAR",
            "Profissional",
            p.id,
          );
          return p;
        }),
      );
    },
  );
cadastros.get("/usuarios", admin, async (_req, res) =>
  res.json(
    await db.usuario.findMany({
      select: { ...publico, ativo: true },
      orderBy: { id: "asc" },
    }),
  ),
);
const usuario = z
  .object({
    nome: texto,
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    perfil: z.enum([
      "ADMINISTRADOR",
      "RECEPCIONISTA",
      "MEDICO",
      "ENFERMAGEM",
      "FINANCEIRO",
    ]),
    profissionalId: id.nullable().default(null),
    senha: z.string().min(10).max(100).optional(),
    ativo: z.boolean().default(true),
  })
  .strict();
for (const method of ["post", "put"] as const)
  cadastros[method](
    "/usuarios" + (method === "put" ? "/:id" : ""),
    admin,
    async (req, res) => {
      const input = usuario.parse(req.body);
      const codigo = method === "put" ? id.parse(req.params.id) : undefined;
      exigir(
        codigo || input.senha,
        "Informe uma senha com pelo menos 10 caracteres.",
      );
      exigir(
        codigo !== req.usuario.id ||
          (input.ativo && input.perfil === "ADMINISTRADOR"),
        "Não é permitido desativar ou rebaixar a própria conta.",
      );
      res.status(codigo ? 200 : 201).json(
        await transacao(async (tx) => {
          if (["MEDICO", "ENFERMAGEM"].includes(input.perfil))
            exigir(
              input.profissionalId,
              "O perfil clínico exige um profissional vinculado.",
            );
          if (input.perfil === "MEDICO")
            exigir(
              await tx.medico.findUnique({
                where: { profissionalId: input.profissionalId! },
              }),
              "Vincule um profissional médico.",
            );
          const { senha, ...dados } = input;
          const senhaHash = senha ? await bcrypt.hash(senha, 12) : undefined;
          const u = codigo
            ? await tx.usuario.update({
                where: { id: codigo },
                data: { ...dados, senhaHash },
                select: publico,
              })
            : await tx.usuario.create({
                data: { ...dados, senhaHash: senhaHash! },
                select: publico,
              });
          if (codigo)
            await tx.sessao.deleteMany({ where: { usuarioId: codigo } });
          await auditar(
            tx,
            req.usuario,
            codigo ? "ALTERAR" : "CRIAR",
            "Usuario",
            u.id,
          );
          return u;
        }),
      );
    },
  );
cadastros.get("/auditoria", admin, async (req, res) => {
  const { pagina, tamanho } = paginar.parse(req.query);
  res.json({
    itens: await db.auditoria.findMany({
      skip: (pagina - 1) * tamanho,
      take: tamanho,
      orderBy: { id: "desc" },
      include: { usuario: { select: { nome: true } } },
    }),
    total: await db.auditoria.count(),
    pagina,
    tamanho,
  });
});
