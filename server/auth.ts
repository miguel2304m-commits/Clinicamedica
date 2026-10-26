import type { Request, Response, NextFunction } from "express";
import { Perfil } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { db, Erro, exigir, type Tx } from "./db";
export type Identidade = {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  profissionalId: number | null;
};
declare global {
  namespace Express {
    interface Request {
      usuario: Identidade;
    }
  }
}
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const tokenNovo = () => randomBytes(32).toString("hex");
export const publico = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  profissionalId: true,
} as const;
export async function autenticar(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.sessao;
  if (!token) throw new Erro(401, "Entre na sua conta para continuar.");
  const sessao = await db.sessao.findUnique({
    where: { id: hashToken(token) },
    include: { usuario: true },
  });
  exigir(
    sessao && sessao.expiraEm > new Date() && sessao.usuario.ativo,
    "Sua sessão expirou. Entre novamente.",
    401,
  );
  const { id, nome, email, perfil, profissionalId } = sessao.usuario;
  req.usuario = { id, nome, email, perfil, profissionalId };
  next();
}
export const permitir =
  (...perfis: Perfil[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    exigir(
      perfis.includes(req.usuario.perfil),
      "Seu perfil não tem permissão para esta ação.",
      403,
    );
    next();
  };
export async function auditar(
  tx: Tx,
  u: Identidade | null,
  acao: string,
  recurso: string,
  recursoId?: number | string,
) {
  await tx.auditoria.create({
    data: { usuarioId: u?.id, acao, recurso, recursoId: recursoId?.toString() },
  });
}
export async function escopoPaciente(
  u: Identidade,
  pacienteId: number,
  tx: Tx = db,
) {
  exigir(u.profissionalId, "Conta clínica sem profissional vinculado.", 403);
  if (u.perfil === "MEDICO") {
    const n = await tx.agendamento.count({
      where: {
        pacienteId,
        medicoId: u.profissionalId,
        situacao: { in: ["AGENDADO", "CONFIRMADO", "REALIZADO"] },
      },
    });
    exigir(n > 0, "Paciente fora da sua carteira de atendimento.", 403);
  } else if (u.perfil === "ENFERMAGEM") {
    const n = await tx.agendamento.count({
      where: {
        pacienteId,
        situacao: { in: ["AGENDADO", "CONFIRMADO", "REALIZADO"] },
        unidade: {
          profissionais: { some: { profissionalId: u.profissionalId } },
        },
      },
    });
    exigir(n > 0, "Paciente fora das unidades em que você atua.", 403);
  } else throw new Erro(403, "Informação restrita à equipe clínica.");
}
export async function consultaPropria(
  u: Identidade,
  consultaId: number,
  tx: Tx = db,
) {
  const c = await tx.consulta.findUnique({ where: { id: consultaId } });
  exigir(c, "Consulta não encontrada.", 404);
  exigir(
    u.perfil === "MEDICO" && c.medicoId === u.profissionalId,
    "Somente o médico responsável pode registrar nesta consulta.",
    403,
  );
  return c;
}
