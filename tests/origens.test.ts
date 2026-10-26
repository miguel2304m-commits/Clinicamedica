import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import {
  protegerOrigem,
  ORIGEM_OFICIAL,
  ambientePublicado,
} from "../server/origens.js";

function api(env: Record<string, string | undefined>) {
  const app = express();
  app.use(protegerOrigem(env));
  app.post("/api/login", (_req, res) => res.sendStatus(204));
  app.options("/api/login", (_req, res) => res.sendStatus(204));
  app.use(
    (
      erro: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => res.status(erro.status ?? 500).json({ erro: erro.message }),
  );
  return app;
}
const prod = { VERCEL: "1", VERCEL_ENV: "production", NODE_ENV: "production" };
const casos: [string, Record<string, string | undefined>, string, number][] = [
  [
    "produção sem APP_ORIGIN permite domínio oficial",
    prod,
    ORIGEM_OFICIAL,
    204,
  ],
  [
    "APP_ORIGIN local não impede domínio oficial",
    { ...prod, APP_ORIGIN: "http://localhost:5173" },
    ORIGEM_OFICIAL,
    204,
  ],
  [
    "normaliza configuração com espaços e barra final",
    { ...prod, APP_ORIGIN: " https://clinica.exemplo.com/ " },
    "https://clinica.exemplo.com",
    204,
  ],
  ["bloqueia origem externa", prod, "https://externo.example", 403],
  [
    "bloqueia projeto Vercel arbitrário",
    prod,
    "https://outro-projeto.vercel.app",
    403,
  ],
  ["bloqueia prefixo semelhante", prod, ORIGEM_OFICIAL + ".evil.example", 403],
  [
    "bloqueia URL com credenciais",
    prod,
    "https://clinica-medica-xi-eight.vercel.app@evil.example",
    403,
  ],
  ["bloqueia origem null", prod, "null", 403],
  [
    "bloqueia HTTP em produção",
    prod,
    ORIGEM_OFICIAL.replace("https:", "http:"),
    403,
  ],
  ["bloqueia porta diferente", prod, ORIGEM_OFICIAL + ":444", 403],
  [
    "bloqueia localhost mesmo configurado na produção",
    { ...prod, APP_ORIGIN: "http://localhost:5173" },
    "http://localhost:5173",
    403,
  ],
  [
    "permite desenvolvimento local",
    { NODE_ENV: "development" },
    "http://localhost:5173",
    204,
  ],
  [
    "permite preview somente pelo host exato do ambiente",
    {
      ...prod,
      VERCEL_ENV: "preview",
      VERCEL_URL: "clinica-preview-123.vercel.app",
    },
    "https://clinica-preview-123.vercel.app",
    204,
  ],
  [
    "preview não entra na lista da produção",
    { ...prod, VERCEL_URL: "clinica-preview-123.vercel.app" },
    "https://clinica-preview-123.vercel.app",
    403,
  ],
  [
    "domínio do projeto vem de variável do servidor",
    { ...prod, VERCEL_PROJECT_PRODUCTION_URL: "clinica.exemplo.com" },
    "https://clinica.exemplo.com",
    204,
  ],
];
for (const [nome, env, origem, status] of casos)
  test(nome, async () => {
    const r = await request(api(env))
      .post("/api/login")
      .set("Origin", origem)
      .set("X-Clinica-Client", "web");
    assert.equal(r.status, status, r.text);
    assert.equal(r.headers["access-control-allow-origin"], undefined);
  });
test("origem oficial ainda exige cabeçalho CSRF", async () => {
  await request(api(prod))
    .post("/api/login")
    .set("Origin", ORIGEM_OFICIAL)
    .expect(403);
});
test("Host e X-Forwarded-Host não autorizam origem externa", async () => {
  await request(api(prod))
    .post("/api/login")
    .set("Host", "externo.example")
    .set("X-Forwarded-Host", "externo.example")
    .set("Origin", "https://externo.example")
    .set("X-Clinica-Client", "web")
    .expect(403);
});
test("bloqueia Fetch Metadata cross-site inclusive sem Origin", async () => {
  await request(api(prod))
    .post("/api/login")
    .set("Sec-Fetch-Site", "cross-site")
    .set("X-Clinica-Client", "web")
    .expect(403);
});
test("clientes sem Origin precisam do cabeçalho obrigatório", async () => {
  await request(api(prod))
    .post("/api/login")
    .set("X-Clinica-Client", "web")
    .expect(204);
  await request(api(prod)).post("/api/login").expect(403);
});
test("preflight não concede CORS a outro site", async () => {
  const r = await request(api(prod))
    .options("/api/login")
    .set("Origin", "https://externo.example")
    .set("Access-Control-Request-Method", "POST");
  assert.equal(r.headers["access-control-allow-origin"], undefined);
  assert.equal(r.headers["access-control-allow-credentials"], undefined);
});
test("Vercel usa cookie seguro mesmo com NODE_ENV incorreto", () => {
  assert.equal(
    ambientePublicado({ VERCEL: "1", NODE_ENV: "development" }),
    true,
  );
  assert.equal(ambientePublicado({ NODE_ENV: "production" }), true);
  assert.equal(ambientePublicado({ NODE_ENV: "development" }), false);
});
