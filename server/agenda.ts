import { Router } from "express";
import { z } from "zod";
import { db, transacao, exigir, type Tx } from "./db";
import { permitir, auditar } from "./auth";
import { agenda, consulta, id, data } from "./validacao";
export const agendaRouter = Router();
const recepcao = permitir("ADMINISTRADOR", "RECEPCIONISTA");
export async function validarAgenda(
  tx: Tx,
  input: z.infer<typeof agenda>,
  ignorar?: number,
) {
  exigir(
    input.fim > input.inicio && +input.fim - +input.inicio <= 4 * 3600000,
    "A duração deve ser positiva e de até 4 horas.",
  );
  const [unidade, especialidade, oferta] = await Promise.all([
    tx.profissionalUnidade.findUnique({
      where: {
        profissionalId_unidadeId: {
          profissionalId: input.medicoId,
          unidadeId: input.unidadeId,
        },
      },
    }),
    tx.medicoEspecialidade.findUnique({
      where: {
        medicoId_especialidadeId: {
          medicoId: input.medicoId,
          especialidadeId: input.especialidadeId,
        },
      },
    }),
    tx.unidadeEspecialidade.findUnique({
      where: {
        unidadeId_especialidadeId: {
          unidadeId: input.unidadeId,
          especialidadeId: input.especialidadeId,
        },
      },
    }),
  ]);
  exigir(
    unidade && especialidade && oferta,
    "O médico, a unidade e a especialidade não possuem os vínculos necessários.",
  );
  const conflito = await tx.agendamento.findFirst({
    where: {
      medicoId: input.medicoId,
      id: ignorar ? { not: ignorar } : undefined,
      situacao: { in: ["AGENDADO", "CONFIRMADO", "REALIZADO"] },
      inicio: { lt: input.fim },
      fim: { gt: input.inicio },
    },
  });
  exigir(
    !conflito,
    "O médico já possui atendimento neste intervalo, inclusive em outra unidade.",
    409,
  );
  let convenioHistorico: string | null = null;
  if (input.pacienteConvenioId) {
    const v = await tx.pacienteConvenio.findUnique({
      where: { id: input.pacienteConvenioId },
      include: { convenio: true },
    });
    exigir(
      v &&
        v.pacienteId === input.pacienteId &&
        v.ativo &&
        v.adesao <= input.inicio,
      "Convênio inválido, inativo ou não pertencente ao paciente.",
    );
    convenioHistorico = `${v.convenio.nome} • ${v.carteirinha}`;
  }
  return convenioHistorico;
}
const include = {
  paciente: { select: { id: true, nome: true } },
  medico: { include: { profissional: { select: { nome: true } } } },
  unidade: true,
  especialidade: true,
  consulta: { select: { id: true } },
};
agendaRouter.get(
  "/agendamentos",
  permitir("ADMINISTRADOR", "RECEPCIONISTA", "MEDICO", "ENFERMAGEM"),
  async (req, res) => {
    const q = z
      .object({
        inicio: data,
        fim: data,
        unidadeId: id.optional(),
        medicoId: id.optional(),
        situacao: z
          .enum([
            "AGENDADO",
            "CONFIRMADO",
            "REALIZADO",
            "CANCELADO",
            "NAO_COMPARECEU",
          ])
          .optional(),
      })
      .parse(req.query);
    exigir(
      q.fim > q.inicio && +q.fim - +q.inicio <= 93 * 86400000,
      "Selecione um período de até 93 dias.",
    );
    const u = req.usuario;
    const where: any = {
      inicio: { gte: q.inicio, lt: q.fim },
      unidadeId: q.unidadeId,
      medicoId: q.medicoId,
      situacao: q.situacao,
    };
    if (u.perfil === "MEDICO") where.medicoId = u.profissionalId ?? -1;
    if (u.perfil === "ENFERMAGEM")
      where.unidade = {
        profissionais: { some: { profissionalId: u.profissionalId ?? -1 } },
      };
    const rows = await db.agendamento.findMany({
      where,
      include,
      orderBy: { inicio: "asc" },
    });
    res.json(
      rows.map((a) =>
        u.perfil === "ENFERMAGEM"
          ? {
              ...a,
              observacoes: undefined,
              convenioHistorico: undefined,
              pacienteConvenioId: undefined,
            }
          : a,
      ),
    );
  },
);
agendaRouter.post("/agendamentos", recepcao, async (req, res) => {
  const input = agenda.parse(req.body);
  res.status(201).json(
    await transacao(async (tx) => {
      const convenioHistorico = await validarAgenda(tx, input);
      const a = await tx.agendamento.create({
        data: { ...input, convenioHistorico },
      });
      await auditar(tx, req.usuario, "AGENDAR", "Agendamento", a.id);
      return a;
    }),
  );
});
agendaRouter.put("/agendamentos/:id", recepcao, async (req, res) => {
  const codigo = id.parse(req.params.id),
    input = agenda.parse(req.body);
  res.json(
    await transacao(async (tx) => {
      const a = await tx.agendamento.findUnique({ where: { id: codigo } });
      exigir(
        a && ["AGENDADO", "CONFIRMADO"].includes(a.situacao),
        "Somente atendimentos agendados ou confirmados podem ser reagendados.",
        409,
      );
      const convenioHistorico = await validarAgenda(tx, input, codigo);
      const r = await tx.agendamento.update({
        where: { id: codigo },
        data: { ...input, convenioHistorico, situacao: "AGENDADO" },
      });
      await auditar(tx, req.usuario, "REAGENDAR", "Agendamento", codigo);
      return r;
    }),
  );
});
agendaRouter.patch("/agendamentos/:id/situacao", recepcao, async (req, res) => {
  const codigo = id.parse(req.params.id);
  const { situacao } = z
    .object({ situacao: z.enum(["CONFIRMADO", "CANCELADO", "NAO_COMPARECEU"]) })
    .strict()
    .parse(req.body);
  res.json(
    await transacao(async (tx) => {
      const a = await tx.agendamento.findUnique({ where: { id: codigo } });
      exigir(a, "Agendamento não encontrado.", 404);
      const permitidas: Record<string, string[]> = {
        AGENDADO: ["CONFIRMADO", "CANCELADO", "NAO_COMPARECEU"],
        CONFIRMADO: ["CANCELADO", "NAO_COMPARECEU"],
      };
      exigir(
        permitidas[a.situacao]?.includes(situacao),
        "Transição de situação não permitida.",
        409,
      );
      if (situacao === "NAO_COMPARECEU")
        exigir(
          a.fim <= new Date(),
          "Registre a ausência somente após o término previsto.",
        );
      const r = await tx.agendamento.update({
        where: { id: codigo },
        data: { situacao },
      });
      await auditar(tx, req.usuario, situacao, "Agendamento", codigo);
      return r;
    }),
  );
});
agendaRouter.post("/consultas", permitir("MEDICO"), async (req, res) => {
  const input = consulta.parse(req.body);
  res.status(201).json(
    await transacao(async (tx) => {
      const a = await tx.agendamento.findUnique({
        where: { id: input.agendamentoId },
      });
      exigir(a, "Agendamento não encontrado.", 404);
      exigir(
        a.medicoId === req.usuario.profissionalId,
        "Atendimento pertence a outro médico.",
        403,
      );
      exigir(
        ["AGENDADO", "CONFIRMADO"].includes(a.situacao),
        "Este agendamento não pode gerar uma consulta.",
        409,
      );
      exigir(
        a.inicio <= new Date(),
        "O atendimento não pode ser realizado antes do início previsto.",
      );
      const c = await tx.consulta.create({
        data: {
          ...input,
          pacienteId: a.pacienteId,
          medicoId: a.medicoId,
          unidadeId: a.unidadeId,
          especialidadeId: a.especialidadeId,
        },
      });
      await tx.agendamento.update({
        where: { id: a.id },
        data: { situacao: "REALIZADO" },
      });
      await auditar(tx, req.usuario, "REALIZAR", "Consulta", c.id);
      return c;
    }),
  );
});
