import { Router } from "express";
import { z } from "zod";
import { db, transacao, exigir } from "./db";
import { permitir, auditar, escopoPaciente, consultaPropria } from "./auth";
import { id, texto, longo, dinheiro, data } from "./validacao";
export const clinica = Router();
const medico = permitir("MEDICO");
clinica.get(
  "/pacientes/:id/prontuario",
  permitir("MEDICO", "ENFERMAGEM"),
  async (req, res) => {
    const pacienteId = id.parse(req.params.id);
    await escopoPaciente(req.usuario, pacienteId);
    const p = await db.prontuario.findUnique({
      where: { pacienteId },
      include: {
        anotacoes: {
          include: { profissional: { select: { nome: true } } },
          orderBy: { data: "desc" },
        },
        paciente: { select: { alergias: { include: { alergia: true } } } },
      },
    });
    await auditar(db, req.usuario, "LER", "Prontuario", p?.id);
    res.json(p);
  },
);
clinica.post(
  "/pacientes/:id/alergias",
  permitir("MEDICO", "ENFERMAGEM"),
  async (req, res) => {
    const pacienteId = id.parse(req.params.id);
    const input = z
      .object({ alergiaId: id, observacoes: longo })
      .strict()
      .parse(req.body);
    res.json(
      await transacao(async (tx) => {
        await escopoPaciente(req.usuario, pacienteId, tx);
        const r = await tx.pacienteAlergia.upsert({
          where: {
            pacienteId_alergiaId: { pacienteId, alergiaId: input.alergiaId },
          },
          create: { pacienteId, ...input },
          update: { observacoes: input.observacoes },
        });
        await auditar(
          tx,
          req.usuario,
          "REGISTRAR_ALERGIA",
          "Paciente",
          pacienteId,
        );
        return r;
      }),
    );
  },
);
clinica.post(
  "/pacientes/:id/anotacoes",
  permitir("ENFERMAGEM"),
  async (req, res) => {
    const pacienteId = id.parse(req.params.id);
    const { texto: conteudo } = z
      .object({ texto: z.string().trim().min(1).max(5000) })
      .strict()
      .parse(req.body);
    res.status(201).json(
      await transacao(async (tx) => {
        await escopoPaciente(req.usuario, pacienteId, tx);
        const p = await tx.prontuario.findUniqueOrThrow({
          where: { pacienteId },
        });
        const r = await tx.anotacaoEnfermagem.create({
          data: {
            prontuarioId: p.id,
            profissionalId: req.usuario.profissionalId!,
            texto: conteudo,
          },
        });
        await auditar(tx, req.usuario, "ANOTAR", "Prontuario", p.id);
        return r;
      }),
    );
  },
);
clinica.get("/pacientes/:id/historico", medico, async (req, res) => {
  const pacienteId = id.parse(req.params.id);
  await escopoPaciente(req.usuario, pacienteId);
  const consultas = await db.consulta.findMany({
    where: { pacienteId },
    include: {
      medico: { include: { profissional: { select: { nome: true } } } },
      unidade: true,
      especialidade: true,
      agendamento: { select: { convenioHistorico: true } },
      exames: { include: { exame: true } },
      prescricoes: { include: { itens: { include: { medicamento: true } } } },
      procedimentos: {
        include: {
          procedimento: true,
          profissional: { select: { nome: true } },
        },
      },
    },
    orderBy: { data: "desc" },
  });
  await auditar(db, req.usuario, "LER_HISTORICO", "Paciente", pacienteId);
  res.json(consultas);
});
clinica.get(
  "/pacientes/:id/exames",
  permitir("MEDICO", "ENFERMAGEM"),
  async (req, res) => {
    const pacienteId = id.parse(req.params.id);
    await escopoPaciente(req.usuario, pacienteId);
    const rows = await db.solicitacaoExame.findMany({
      where: {
        pacienteId,
        ...(req.query.pendentes === "true"
          ? {
              situacao: {
                in: ["SOLICITADO", "AGENDADO"] as ("SOLICITADO" | "AGENDADO")[],
              },
            }
          : {}),
      },
      include: { exame: true },
      orderBy: { solicitadoEm: "desc" },
    });
    await auditar(db, req.usuario, "LER_EXAMES", "Paciente", pacienteId);
    res.json(
      rows.map((e) =>
        req.usuario.perfil === "ENFERMAGEM"
          ? { ...e, resultado: undefined }
          : e,
      ),
    );
  },
);
clinica.post("/consultas/:id/exames", medico, async (req, res) => {
  const consultaId = id.parse(req.params.id);
  const input = z
    .object({ exameId: id, pacienteId: id })
    .strict()
    .parse(req.body);
  res.status(201).json(
    await transacao(async (tx) => {
      const c = await consultaPropria(req.usuario, consultaId, tx);
      exigir(
        c.pacienteId === input.pacienteId,
        "O paciente do exame deve ser o mesmo da consulta.",
      );
      const r = await tx.solicitacaoExame.create({
        data: { consultaId, ...input },
      });
      await auditar(tx, req.usuario, "SOLICITAR", "SolicitacaoExame", r.id);
      return r;
    }),
  );
});
clinica.patch(
  "/solicitacoes-exames/:id",
  permitir("MEDICO", "ENFERMAGEM"),
  async (req, res) => {
    const codigo = id.parse(req.params.id);
    const input = z
      .object({
        situacao: z.enum(["AGENDADO", "REALIZADO", "CANCELADO"]),
        realizadoEm: data.optional(),
        resultado: z.string().trim().max(10000).optional(),
      })
      .strict()
      .parse(req.body);
    res.json(
      await transacao(async (tx) => {
        const e = await tx.solicitacaoExame.findUnique({
          where: { id: codigo },
        });
        exigir(e, "Solicitação não encontrada.", 404);
        if (req.usuario.perfil === "MEDICO")
          await consultaPropria(req.usuario, e.consultaId, tx);
        else {
          await escopoPaciente(req.usuario, e.pacienteId, tx);
          exigir(
            input.situacao === "AGENDADO" &&
              !input.resultado &&
              !input.realizadoEm,
            "Enfermagem pode apenas agendar o exame.",
            403,
          );
        }
        const transicoes: Record<string, string[]> = {
          SOLICITADO: ["AGENDADO", "REALIZADO", "CANCELADO"],
          AGENDADO: ["REALIZADO", "CANCELADO"],
        };
        exigir(
          transicoes[e.situacao]?.includes(input.situacao),
          "Transição de exame não permitida.",
          409,
        );
        if (input.situacao === "REALIZADO")
          exigir(
            input.resultado &&
              input.realizadoEm &&
              input.realizadoEm >= e.solicitadoEm &&
              input.realizadoEm <= new Date(),
            "Informe resultado e data válida de realização.",
          );
        else
          exigir(
            !input.resultado && !input.realizadoEm,
            "Resultado e realização só são aceitos em exames realizados.",
          );
        const r = await tx.solicitacaoExame.update({
          where: { id: codigo },
          data: input,
        });
        await auditar(
          tx,
          req.usuario,
          input.situacao,
          "SolicitacaoExame",
          codigo,
        );
        return r;
      }),
    );
  },
);
clinica.post("/consultas/:id/prescricoes", medico, async (req, res) => {
  const consultaId = id.parse(req.params.id);
  const input = z
    .object({
      itens: z
        .array(
          z
            .object({
              medicamentoId: id,
              quantidade: id,
              dose: texto,
              frequencia: texto,
              duracao: texto,
              observacoes: longo,
            })
            .strict(),
        )
        .min(1)
        .max(30),
    })
    .strict()
    .parse(req.body);
  res.status(201).json(
    await transacao(async (tx) => {
      await consultaPropria(req.usuario, consultaId, tx);
      const r = await tx.prescricao.create({
        data: { consultaId, itens: { create: input.itens } },
        include: { itens: true },
      });
      await auditar(tx, req.usuario, "PRESCREVER", "Prescricao", r.id);
      return r;
    }),
  );
});
clinica.post("/consultas/:id/procedimentos", medico, async (req, res) => {
  const consultaId = id.parse(req.params.id);
  const input = z
    .object({
      procedimentoId: id,
      profissionalId: id,
      valorCobrado: dinheiro,
      data,
    })
    .strict()
    .parse(req.body);
  res.status(201).json(
    await transacao(async (tx) => {
      const c = await consultaPropria(req.usuario, consultaId, tx);
      exigir(
        input.data >= c.data && input.data <= new Date(),
        "A realização deve ocorrer entre a consulta e o momento atual.",
      );
      exigir(
        await tx.profissionalUnidade.findUnique({
          where: {
            profissionalId_unidadeId: {
              profissionalId: input.profissionalId,
              unidadeId: c.unidadeId,
            },
          },
        }),
        "Profissional responsável não atua nesta unidade.",
      );
      const r = await tx.procedimentoRealizado.create({
        data: { consultaId, ...input },
      });
      await auditar(tx, req.usuario, "REALIZAR", "ProcedimentoRealizado", r.id);
      return r;
    }),
  );
});
