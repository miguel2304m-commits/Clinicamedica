// Verifica somente leituras, com a mesma rota usada em produção.
import express from "express";
import request from "supertest";
import assert from "node:assert/strict";
import { db } from "../server/db.js";
import { agendaRouter } from "../server/agenda.js";
try {
  const usuario = await db.usuario.findFirstOrThrow({
    where: { perfil: "ADMINISTRADOR", ativo: true },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      profissionalId: true,
    },
  });
  const app = express();
  app.use((req, _res, next) => {
    req.usuario = usuario;
    next();
  });
  app.use("/api", agendaRouter);
  const inicio = new Date();
  inicio.setUTCHours(0, 0, 0, 0);
  const fim = new Date(+inicio + 7 * 86400000);
  const unidade = await db.unidade.findFirst({ select: { id: true } });
  for (const filtros of [
    {},
    { situacao: "AGENDADO" },
    ...(unidade ? [{ unidadeId: unidade.id }] : []),
  ]) {
    const r = await request(app)
      .get("/api/agendamentos")
      .query({
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        ...filtros,
      });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body));
  }
  console.log(
    "GET /api/agendamentos: OK com Neon, intervalo, situação e unidade; nenhuma escrita.",
  );
} finally {
  await db.$disconnect();
}
