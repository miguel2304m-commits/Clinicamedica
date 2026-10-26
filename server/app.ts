import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import path from "node:path";
import { existsSync } from "node:fs";
import { db, Erro, exigir } from "./db.js";
import { autenticar, auditar, hashToken, tokenNovo, publico } from "./auth.js";
import { cadastros } from "./cadastros.js";
import { agendaRouter } from "./agenda.js";
import { clinica } from "./clinica.js";
import { financeiro } from "./financeiro.js";
export const app = express();
const hashInexistente = bcrypt.hashSync("senha-inexistente-publica", 12);
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "128kb" }));
app.use(cookieParser());
app.use("/api", (req, _res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origem = req.get("origin");
    const permitidas = [
      process.env.APP_ORIGIN,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ];
    exigir(
      !origem || permitidas.includes(origem),
      "Origem da requisição não permitida.",
      403,
    );
    exigir(
      req.get("x-clinica-client") === "web",
      "Cabeçalho de proteção obrigatório.",
      403,
    );
  }
  next();
});
app.get("/api/saude", async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});
app.post(
  "/api/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { erro: "Muitas tentativas. Aguarde 15 minutos." },
  }),
  async (req, res) => {
    const { email, senha } = z
      .object({ email: z.string().email(), senha: z.string().max(100) })
      .strict()
      .parse(req.body);
    const u = await db.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });
    const valido = await bcrypt.compare(senha, u?.senhaHash ?? hashInexistente);
    if (!u || !u.ativo || !valido) {
      await auditar(db, null, "LOGIN_FALHOU", "Sessao");
      throw new Erro(401, "E-mail ou senha inválidos.");
    }
    const token = tokenNovo();
    await db.sessao.create({
      data: {
        id: hashToken(token),
        usuarioId: u.id,
        expiraEm: new Date(Date.now() + 8 * 3600000),
      },
    });
    res.cookie("sessao", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 3600000,
      path: "/",
    });
    await auditar(db, u, "LOGIN", "Sessao");
    const { id, nome, email: mail, perfil, profissionalId } = u;
    res.json({ id, nome, email: mail, perfil, profissionalId });
  },
);
app.use("/api", autenticar);
app.get("/api/me", async (req, res) => res.json(req.usuario));
app.post("/api/logout", async (req, res) => {
  await db.sessao.deleteMany({ where: { id: hashToken(req.cookies.sessao) } });
  res.clearCookie("sessao", { path: "/" });
  res.json({ mensagem: "Sessão encerrada." });
});
app.get("/api/dashboard", async (req, res) => {
  const u = req.usuario;
  const agora = new Date();
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(agora);
  const inicio = new Date(dia + "T00:00:00-03:00"),
    fim = new Date(+inicio + 86400000);
  const escopo: any =
    u.perfil === "MEDICO"
      ? { medicoId: u.profissionalId ?? -1 }
      : u.perfil === "ENFERMAGEM"
        ? {
            unidade: {
              profissionais: {
                some: { profissionalId: u.profissionalId ?? -1 },
              },
            },
          }
        : {};
  const [agendamentos, realizadas, ausencias] = await Promise.all([
    db.agendamento.count({
      where: {
        ...escopo,
        inicio: { gte: inicio, lt: fim },
        situacao: { in: ["AGENDADO", "CONFIRMADO"] },
      },
    }),
    db.agendamento.count({
      where: {
        ...escopo,
        inicio: { gte: inicio, lt: fim },
        situacao: "REALIZADO",
      },
    }),
    db.agendamento.count({
      where: {
        ...escopo,
        inicio: { gte: inicio, lt: fim },
        situacao: "NAO_COMPARECEU",
      },
    }),
  ]);
  let financeiroResumo: any = null;
  if (["ADMINISTRADOR", "FINANCEIRO"].includes(u.perfil)) {
    const [c, p] = await Promise.all([
      db.cobranca.aggregate({
        where: { situacao: { not: "CANCELADA" } },
        _sum: { valor: true },
      }),
      db.pagamento.aggregate({
        where: { situacao: "RECEBIDO" },
        _sum: { valor: true },
      }),
    ]);
    financeiroResumo = {
      faturado: c._sum.valor ?? 0,
      recebido: p._sum.valor ?? 0,
      aberto: new Prisma.Decimal(c._sum.valor ?? 0).minus(p._sum.valor ?? 0),
    };
  }
  res.json({
    agendamentos,
    realizadas,
    ausencias,
    financeiro: financeiroResumo,
    data: dia,
  });
});
app.use("/api", cadastros, agendaRouter, clinica, financeiro);
app.use("/api", (_req, res) =>
  res.status(404).json({ erro: "Recurso não encontrado." }),
);
if (existsSync(path.resolve("dist/index.html"))) {
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
}
app.use(
  (
    erro: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (erro instanceof z.ZodError)
      return res.status(422).json({
        erro: "Confira os campos informados.",
        campos: erro.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    if (erro instanceof Erro)
      return res.status(erro.status).json({ erro: erro.message });
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      const mensagens: Record<string, [number, string]> = {
        P2002: [
          409,
          "Registro duplicado: CPF, CNPJ, CRM, e-mail ou vínculo já cadastrado.",
        ],
        P2003: [422, "O vínculo informado é inválido ou está em uso."],
        P2025: [404, "Registro não encontrado."],
        P2034: [
          409,
          "Conflito com outra operação. Atualize e tente novamente.",
        ],
        P2004: [409, "A operação viola uma regra de integridade do banco."],
      };
      const [status, msg] = mensagens[erro.code] ?? [
        422,
        "O banco recusou a operação. Verifique os vínculos e as regras do registro.",
      ];
      return res.status(status).json({ erro: msg });
    }
    if (erro.type === "entity.parse.failed")
      return res.status(400).json({ erro: "JSON inválido." });
    console.error("Falha interna:", erro.code ?? erro.name);
    return res
      .status(500)
      .json({ erro: "Não foi possível concluir a operação." });
  },
);
