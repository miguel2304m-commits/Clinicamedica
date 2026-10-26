import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db, transacao, exigir, type Tx } from "./db";
import { permitir, auditar } from "./auth";
import { id, texto, dinheiro, data, paginar } from "./validacao";
export const financeiro = Router();
const acesso = permitir("ADMINISTRADOR", "FINANCEIRO");
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
export async function saldo(tx: Tx, cobrancaId: number) {
  const c = await tx.cobranca.findUniqueOrThrow({
    where: { id: cobrancaId },
    include: { pagamentos: { where: { situacao: "RECEBIDO" } } },
  });
  const recebido = c.pagamentos.reduce((s, p) => s.plus(p.valor), D(0));
  return { c, recebido, aberto: c.valor.minus(recebido) };
}
financeiro.get("/consultas-faturaveis", acesso, async (req, res) => {
  const { pagina, tamanho } = paginar.parse(req.query);
  const [itens, total] = await Promise.all([
    db.consulta.findMany({
      select: {
        id: true,
        data: true,
        paciente: { select: { nome: true } },
        agendamento: {
          select: { pacienteConvenioId: true, convenioHistorico: true },
        },
        procedimentos: {
          select: {
            id: true,
            valorCobrado: true,
            procedimento: { select: { nome: true } },
          },
        },
      },
      orderBy: { id: "desc" },
      skip: (pagina - 1) * tamanho,
      take: tamanho,
    }),
    db.consulta.count(),
  ]);
  res.json({ itens, total, pagina, tamanho });
});
financeiro.get("/cobrancas", acesso, async (req, res) => {
  const { pagina, tamanho, busca } = paginar.parse(req.query);
  const q = z
    .object({
      pacienteId: id.optional(),
      situacao: z
        .enum(["ABERTA", "PARCIAL", "QUITADA", "CANCELADA"])
        .optional(),
    })
    .parse(req.query);
  const where: any = {
    situacao: q.situacao,
    consulta: {
      pacienteId: q.pacienteId,
      paciente: { nome: { contains: busca, mode: "insensitive" } },
    },
  };
  const [rows, total] = await Promise.all([
    db.cobranca.findMany({
      where,
      include: {
        consulta: {
          select: {
            paciente: { select: { id: true, nome: true } },
            agendamento: { select: { convenioHistorico: true } },
          },
        },
        pagamentos: true,
      },
      orderBy: { id: "desc" },
      skip: (pagina - 1) * tamanho,
      take: tamanho,
    }),
    db.cobranca.count({ where }),
  ]);
  const itens = rows.map((c) => {
    const recebido = c.pagamentos
      .filter((p) => p.situacao === "RECEBIDO")
      .reduce((s, p) => s.plus(p.valor), D(0));
    return {
      ...c,
      recebido,
      saldo: c.situacao === "CANCELADA" ? D(0) : c.valor.minus(recebido),
    };
  });
  res.json({ itens, total, pagina, tamanho });
});
financeiro.post("/cobrancas", acesso, async (req, res) => {
  const input = z
    .object({
      consultaId: id,
      procedimentoRealizadoId: id.optional(),
      origem: texto,
      valorTotal: dinheiro,
      valorCoberto: dinheiro.default("0"),
      vencimento: data,
      chave: z.string().uuid(),
    })
    .strict()
    .parse(req.body);
  res.status(201).json(
    await transacao(async (tx) => {
      const existentes = await tx.cobranca.findMany({
        where: { grupo: input.chave },
      });
      if (existentes.length) {
        const primeiro = existentes[0];
        const totalExistente = existentes.reduce(
          (s, c) => s.plus(c.valor),
          D(0),
        );
        const coberturaExistente = existentes
          .filter((c) => c.responsavel === "CONVENIO")
          .reduce((s, c) => s.plus(c.valor), D(0));
        exigir(
          primeiro.consultaId === input.consultaId &&
            primeiro.origem === input.origem &&
            primeiro.procedimentoRealizadoId ===
              (input.procedimentoRealizadoId ?? null) &&
            primeiro.vencimento.toISOString().slice(0, 10) ===
              input.vencimento.toISOString().slice(0, 10) &&
            totalExistente.eq(input.valorTotal) &&
            coberturaExistente.eq(input.valorCoberto),
          "Chave de operação já utilizada com dados diferentes.",
          409,
        );
        return existentes;
      }
      const c = await tx.consulta.findUnique({
        where: { id: input.consultaId },
        include: { agendamento: true },
      });
      exigir(c, "Consulta não encontrada.", 404);
      const total = D(input.valorTotal),
        coberto = D(input.valorCoberto);
      exigir(
        total.gt(0) && coberto.lte(total),
        "A cobertura deve estar entre zero e o total, e o total deve ser positivo.",
      );
      exigir(
        coberto.eq(0) || c.agendamento.pacienteConvenioId,
        "Este atendimento não possui convênio vinculado.",
      );
      if (input.procedimentoRealizadoId) {
        const p = await tx.procedimentoRealizado.findUnique({
          where: { id: input.procedimentoRealizadoId },
        });
        exigir(
          p?.consultaId === c.id,
          "Procedimento não pertence a esta consulta.",
        );
        exigir(
          p.valorCobrado.eq(total),
          "O total deve corresponder ao valor registrado na realização.",
        );
        exigir(
          !(await tx.cobranca.count({
            where: {
              procedimentoRealizadoId: p.id,
              situacao: { not: "CANCELADA" },
            },
          })),
          "Procedimento já faturado.",
          409,
        );
      }
      const base = {
        consultaId: c.id,
        procedimentoRealizadoId: input.procedimentoRealizadoId,
        origem: input.origem,
        grupo: input.chave,
        vencimento: input.vencimento,
      };
      const rows = [];
      if (total.minus(coberto).gt(0))
        rows.push(
          await tx.cobranca.create({
            data: {
              ...base,
              valor: total.minus(coberto),
              responsavel: "PACIENTE",
            },
          }),
        );
      if (coberto.gt(0))
        rows.push(
          await tx.cobranca.create({
            data: {
              ...base,
              valor: coberto,
              responsavel: "CONVENIO",
              pacienteConvenioId: c.agendamento.pacienteConvenioId,
            },
          }),
        );
      await auditar(tx, req.usuario, "FATURAR", "Consulta", c.id);
      return rows;
    }),
  );
});
financeiro.post("/cobrancas/:id/pagamentos", acesso, async (req, res) => {
  const cobrancaId = id.parse(req.params.id);
  const input = z
    .object({
      valor: dinheiro,
      forma: z.enum(["DINHEIRO", "CREDITO", "DEBITO", "PIX", "CONVENIO"]),
      chave: z.string().uuid(),
    })
    .strict()
    .parse(req.body);
  res.status(201).json(
    await transacao(async (tx) => {
      const existente = await tx.pagamento.findUnique({
        where: { chave: input.chave },
      });
      if (existente) {
        exigir(
          existente.cobrancaId === cobrancaId &&
            existente.valor.eq(input.valor) &&
            existente.forma === input.forma,
          "Chave de pagamento já utilizada.",
          409,
        );
        return existente;
      }
      const { c, aberto } = await saldo(tx, cobrancaId);
      exigir(c.situacao !== "CANCELADA", "Cobrança cancelada.", 409);
      const valor = D(input.valor);
      exigir(
        valor.gt(0) && valor.lte(aberto),
        "O pagamento deve ser positivo e não ultrapassar o saldo.",
      );
      exigir(
        (c.responsavel === "CONVENIO") === (input.forma === "CONVENIO"),
        "Use a forma Convênio somente para repasses do convênio.",
      );
      const p = await tx.pagamento.create({ data: { cobrancaId, ...input } });
      await tx.cobranca.update({
        where: { id: cobrancaId },
        data: { situacao: valor.eq(aberto) ? "QUITADA" : "PARCIAL" },
      });
      await auditar(tx, req.usuario, "RECEBER", "Pagamento", p.id);
      return p;
    }),
  );
});
financeiro.post("/pagamentos/:id/estorno", acesso, async (req, res) => {
  const codigo = id.parse(req.params.id);
  res.json(
    await transacao(async (tx) => {
      const p = await tx.pagamento.findUnique({ where: { id: codigo } });
      exigir(
        p && p.situacao === "RECEBIDO",
        "Pagamento já estornado ou inexistente.",
        409,
      );
      const r = await tx.pagamento.update({
        where: { id: codigo },
        data: { situacao: "ESTORNADO" },
      });
      const s = await saldo(tx, p.cobrancaId);
      await tx.cobranca.update({
        where: { id: p.cobrancaId },
        data: { situacao: s.recebido.eq(0) ? "ABERTA" : "PARCIAL" },
      });
      await auditar(tx, req.usuario, "ESTORNAR", "Pagamento", codigo);
      return r;
    }),
  );
});
financeiro.post("/cobrancas/:id/cancelamento", acesso, async (req, res) => {
  const codigo = id.parse(req.params.id);
  res.json(
    await transacao(async (tx) => {
      const { c, recebido } = await saldo(tx, codigo);
      exigir(
        c.situacao !== "CANCELADA" && recebido.eq(0),
        "Estorne os pagamentos antes de cancelar a cobrança.",
        409,
      );
      const r = await tx.cobranca.update({
        where: { id: codigo },
        data: { situacao: "CANCELADA" },
      });
      await auditar(tx, req.usuario, "CANCELAR", "Cobranca", codigo);
      return r;
    }),
  );
});
financeiro.get("/relatorios", acesso, async (req, res) => {
  const q = z
    .object({
      inicio: data,
      fim: data,
      unidadeId: id.optional(),
      medicoId: id.optional(),
      especialidadeId: id.optional(),
    })
    .parse(req.query);
  exigir(
    q.fim > q.inicio && +q.fim - +q.inicio <= 366 * 86400000,
    "Selecione um intervalo de até 366 dias.",
  );
  const filtro = {
    unidadeId: q.unidadeId,
    medicoId: q.medicoId,
    especialidadeId: q.especialidadeId,
  };
  const periodo = { gte: q.inicio, lt: q.fim };
  const result = await transacao(async (tx) => {
    const cobrancas = await tx.cobranca.findMany({
      where: {
        emitidaEm: periodo,
        situacao: { not: "CANCELADA" },
        consulta: filtro,
      },
      include: {
        pagamentos: { where: { situacao: "RECEBIDO" } },
        consulta: {
          select: {
            medicoId: true,
            unidadeId: true,
            especialidadeId: true,
            paciente: { select: { id: true, nome: true } },
            medico: { select: { profissional: { select: { nome: true } } } },
            especialidade: { select: { nome: true } },
            unidade: { select: { nome: true } },
          },
        },
      },
    });
    const pagamentos = await tx.pagamento.findMany({
      where: {
        data: periodo,
        situacao: "RECEBIDO",
        cobranca: { situacao: { not: "CANCELADA" }, consulta: filtro },
      },
    });
    const consultas = await tx.consulta.groupBy({
      by: ["especialidadeId"],
      where: { data: periodo, ...filtro },
      _count: { id: true },
    });
    const especialidades = await tx.especialidade.findMany();
    const procedimentos = await tx.procedimentoRealizado.findMany({
      where: { data: periodo, consulta: filtro },
      include: {
        procedimento: true,
        profissional: { select: { nome: true } },
        consulta: { select: { paciente: { select: { nome: true } } } },
      },
    });
    const grupos: Record<string, Record<string, Prisma.Decimal>> = {
      medicos: {},
      especialidades: {},
      unidades: {},
    };
    const pendentes: Record<
      number,
      {
        pacienteId: number;
        nome: string;
        paciente: Prisma.Decimal;
        convenio: Prisma.Decimal;
      }
    > = {};
    let faturamento = D(0),
      aberto = D(0),
      coberturaPrevista = D(0);
    for (const c of cobrancas) {
      faturamento = faturamento.plus(c.valor);
      if (c.responsavel === "CONVENIO")
        coberturaPrevista = coberturaPrevista.plus(c.valor);
      const recebido = c.pagamentos.reduce((s, p) => s.plus(p.valor), D(0));
      const saldo = c.valor.minus(recebido);
      aberto = aberto.plus(saldo);
      for (const [tipo, nome] of [
        [
          "medicos",
          `#${c.consulta.medicoId} · ${c.consulta.medico.profissional.nome}`,
        ],
        [
          "especialidades",
          `#${c.consulta.especialidadeId} · ${c.consulta.especialidade.nome}`,
        ],
        ["unidades", `#${c.consulta.unidadeId} · ${c.consulta.unidade.nome}`],
      ])
        grupos[tipo][nome] = (grupos[tipo][nome] ?? D(0)).plus(c.valor);
      if (saldo.gt(0)) {
        const p = c.consulta.paciente;
        pendentes[p.id] ??= {
          pacienteId: p.id,
          nome: p.nome,
          paciente: D(0),
          convenio: D(0),
        };
        const chave = c.responsavel === "PACIENTE" ? "paciente" : "convenio";
        pendentes[p.id][chave] = pendentes[p.id][chave].plus(saldo);
      }
    }
    return {
      faturamento,
      recebido: pagamentos.reduce((s, p) => s.plus(p.valor), D(0)),
      aberto,
      coberturaPrevista,
      repasseRecebido: pagamentos
        .filter((p) => p.forma === "CONVENIO")
        .reduce((s, p) => s.plus(p.valor), D(0)),
      grupos,
      pendentes: Object.values(pendentes),
      consultas: consultas.map((c) => ({
        especialidade: especialidades.find((e) => e.id === c.especialidadeId)
          ?.nome,
        quantidade: c._count.id,
      })),
      procedimentos,
    };
  });
  res.json(result);
});
