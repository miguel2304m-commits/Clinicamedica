import { Router } from "express";
import { z } from "zod";
import { transacao, exigir } from "./db.js";
import { permitir, auditar } from "./auth.js";
import { texto, data, longo, id } from "./validacao.js";
export const agendaLivre = Router();
export const chaveNome = (nome: string) =>
  nome.trim().replace(/\s+/g, " ").toLowerCase();
const entrada = z
  .object({
    pacienteNome: texto,
    medicoNome: texto,
    unidadeNome: texto,
    especialidadeNome: texto,
    inicio: data,
    fim: data,
    observacoes: longo,
  })
  .strict();
for (const metodo of ["post", "put"] as const) {
  agendaLivre[metodo](
    "/agendamentos-livres" + (metodo === "put" ? "/:id" : ""),
    permitir("ADMINISTRADOR"),
    async (req, res) => {
      const dados = entrada.parse(req.body),
        codigo = metodo === "put" ? id.parse(req.params.id) : undefined;
      res.status(codigo ? 200 : 201).json(
        await transacao(async (tx) => {
          exigir(
            dados.fim > dados.inicio &&
              +dados.fim - +dados.inicio <= 4 * 3600000,
            "Informe uma duração positiva de até quatro horas.",
          );
          if (codigo) {
            const atual = await tx.agendamentoLivre.findUnique({
              where: { id: codigo },
            });
            exigir(
              atual && ["AGENDADO", "CONFIRMADO"].includes(atual.situacao),
              "Este pré-agendamento não pode ser alterado.",
              409,
            );
          }
          const medicoChave = chaveNome(dados.medicoNome);
          const medicos = await tx.profissional.findMany({
            where: { medico: { isNot: null } },
            select: { id: true, nome: true },
          });
          const medicosIds = medicos
            .filter((m) => chaveNome(m.nome) === medicoChave)
            .map((m) => m.id);
          const conflito = await tx.agendamento.findFirst({
            where: {
              medicoId: { in: medicosIds },
              situacao: { in: ["AGENDADO", "CONFIRMADO", "REALIZADO"] },
              inicio: { lt: dados.fim },
              fim: { gt: dados.inicio },
            },
          });
          exigir(
            !conflito,
            "O médico já possui atendimento neste intervalo.",
            409,
          );
          const reserva = await tx.agendamentoLivre.findFirst({
            where: {
              medicoChave,
              id: codigo ? { not: codigo } : undefined,
              situacao: { in: ["AGENDADO", "CONFIRMADO"] },
              inicio: { lt: dados.fim },
              fim: { gt: dados.inicio },
            },
          });
          exigir(
            !reserva,
            "Já existe uma reserva para esse médico neste intervalo.",
            409,
          );
          const payload = {
            ...dados,
            medicoChave,
            situacao: "AGENDADO" as const,
          };
          const registro = codigo
            ? await tx.agendamentoLivre.update({
                where: { id: codigo },
                data: payload,
              })
            : await tx.agendamentoLivre.create({ data: payload });
          await auditar(
            tx,
            req.usuario,
            codigo ? "REAGENDAR" : "AGENDAR",
            "AgendamentoLivre",
            registro.id,
          );
          return registro;
        }),
      );
    },
  );
}
agendaLivre.patch(
  "/agendamentos-livres/:id/situacao",
  permitir("ADMINISTRADOR"),
  async (req, res) => {
    const codigo = id.parse(req.params.id);
    const { situacao } = z
      .object({
        situacao: z.enum(["CONFIRMADO", "CANCELADO", "NAO_COMPARECEU"]),
      })
      .strict()
      .parse(req.body);
    res.json(
      await transacao(async (tx) => {
        const atual = await tx.agendamentoLivre.findUnique({
          where: { id: codigo },
        });
        exigir(
          atual &&
            ["AGENDADO", "CONFIRMADO"].includes(atual.situacao) &&
            atual.situacao !== situacao,
          "Transição não permitida.",
          409,
        );
        if (situacao === "NAO_COMPARECEU")
          exigir(
            atual.fim <= new Date(),
            "Registre a ausência após o término previsto.",
          );
        const registro = await tx.agendamentoLivre.update({
          where: { id: codigo },
          data: { situacao },
        });
        await auditar(tx, req.usuario, situacao, "AgendamentoLivre", codigo);
        return registro;
      }),
    );
  },
);
