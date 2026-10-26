import "dotenv/config";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import request from "supertest";
import { Prisma } from "@prisma/client";
const url = new URL(process.env.DATABASE_URL!);
assert.ok(
  ["localhost", "127.0.0.1"].includes(url.hostname),
  "Testes de escrita somente no PostgreSQL local. Use node scripts/testar-local.mjs.",
);
url.pathname = "/clinica_test";
const schemaTeste =
  process.env.TEST_SCHEMA ?? "teste_" + randomUUID().replaceAll("-", "");
assert.match(schemaTeste, /^teste_[a-z0-9_]+$/);
url.searchParams.set("schema", schemaTeste);
process.env.DATABASE_URL = url.toString();
assert.equal(
  new URL(process.env.DATABASE_URL).pathname,
  "/clinica_test",
  "Testes só podem operar no banco clinica_test.",
);
const { db } = await import("../server/db");
const { app } = await import("../server/app");
const { seed } = await import("../prisma/seed");
const admin = request.agent(app),
  recepcao = request.agent(app),
  medico = request.agent(app),
  outro = request.agent(app),
  enf = request.agent(app),
  fin = request.agent(app);
const header = { "X-Clinica-Client": "web" };
let p: any,
  p2: any,
  m: any,
  m2: any,
  u: any,
  u2: any,
  e: any,
  catalogo: any,
  v: any,
  a: any,
  c: any,
  cobrancas: any[],
  procedimento: any;
const inicio = new Date(Date.now() - 20 * 86400000);
inicio.setUTCHours(12, 0, 0, 0);
const criarAgenda = (minutos = 0) => ({
  pacienteId: p.id,
  medicoId: m.profissionalId,
  unidadeId: u.id,
  especialidadeId: e.id,
  pacienteConvenioId: v.id,
  inicio: new Date(+inicio + minutos * 60000).toISOString(),
  fim: new Date(+inicio + (minutos + 30) * 60000).toISOString(),
});
before(
  async () => {
    execFileSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { env: process.env, stdio: "pipe" },
    );
    assert.equal(
      await db.usuario.count(),
      0,
      "O schema de teste deve estar vazio; nenhum dado existente será apagado.",
    );
    await seed();
    for (const [agent, email] of [
      [admin, "admin"],
      [recepcao, "recepcao"],
      [medico, "medico"],
      [outro, "medico2"],
      [enf, "enfermagem"],
      [fin, "financeiro"],
    ] as const) {
      const r = await agent
        .post("/api/login")
        .set(header)
        .send({
          email: email + "@clinica.local",
          senha: process.env.DEMO_PASSWORD ?? "Clinica@2026",
        });
      assert.equal(r.status, 200, r.text);
    }
    [p, p2] = await db.paciente.findMany({ orderBy: { id: "asc" }, take: 2 });
    [m, m2] = await db.medico.findMany({ orderBy: { profissionalId: "asc" } });
    [u, u2] = await db.unidade.findMany({ orderBy: { id: "asc" } });
    e = await db.especialidade.findFirst();
    catalogo = await db.exame.findFirst();
    v = await db.pacienteConvenio.findFirst();
    procedimento = await db.procedimento.findFirst();
  },
  { timeout: 60000 },
);
after(() => db.$disconnect());
test("RF01: autenticação e proteção contra requisição sem cabeçalho", async () => {
  assert.equal((await request(app).get("/api/pacientes")).status, 401);
  assert.equal((await request(app).post("/api/login").send({})).status, 403);
  assert.equal(
    (
      await admin
        .post("/api/logout")
        .set(header)
        .set("Origin", "https://externo.example")
    ).status,
    403,
  );
});
test("RF02: CPF duplicado é rejeitado e prontuário é único", async () => {
  const { nome, cpf, nascimento, sexo, telefone, email, endereco } = p;
  const r = await recepcao
    .post("/api/pacientes")
    .set(header)
    .send({ nome, cpf, nascimento, sexo, telefone, email, endereco });
  assert.equal(r.status, 409, r.text);
  assert.equal(await db.prontuario.count({ where: { pacienteId: p.id } }), 1);
});
test("RN01: banco impede paciente sem prontuário", async () => {
  await assert.rejects(() =>
    db.paciente.create({
      data: {
        nome: "Teste sem prontuário",
        cpf: "00000000001",
        nascimento: new Date("1990-01-01"),
        sexo: "F",
        telefone: "000",
        email: "teste@exemplo.local",
        endereco: "Rua teste",
      },
    }),
  );
});
test("RF02: CPF com dígito incorreto e nascimento futuro rejeitados", async () => {
  const { nome, sexo, telefone, email, endereco } = p;
  const r = await recepcao.post("/api/pacientes").set(header).send({
    nome,
    sexo,
    telefone,
    email,
    endereco,
    cpf: "11111111111",
    nascimento: "2999-01-01",
  });
  assert.equal(r.status, 422);
});
test("RF06: agenda aceita vínculos válidos", async () => {
  const r = await recepcao
    .post("/api/agendamentos")
    .set(header)
    .send(criarAgenda());
  assert.equal(r.status, 201, r.text);
  a = r.body;
});
test("RN05: sobreposição em outra unidade é impedida", async () => {
  const r = await recepcao
    .post("/api/agendamentos")
    .set(header)
    .send({ ...criarAgenda(15), unidadeId: u2.id });
  assert.equal(r.status, 409, r.text);
});
test("RN05: dois agendamentos concorrentes geram apenas uma reserva", async () => {
  const dados = criarAgenda(120);
  const rs = await Promise.all([
    recepcao.post("/api/agendamentos").set(header).send(dados),
    recepcao.post("/api/agendamentos").set(header).send(dados),
  ]);
  assert.equal(rs.filter((r) => r.status === 201).length, 1);
  assert.ok(rs.some((r) => [409, 422].includes(r.status)));
  assert.equal(
    await db.agendamento.count({
      where: { medicoId: m.profissionalId, inicio: new Date(dados.inicio) },
    }),
    1,
  );
});
test("RN05: horários adjacentes são permitidos", async () => {
  const r = await recepcao
    .post("/api/agendamentos")
    .set(header)
    .send(criarAgenda(30));
  assert.equal(r.status, 201, r.text);
});
test("RN06: vínculo de convênio de outro paciente é rejeitado", async () => {
  const r = await recepcao
    .post("/api/agendamentos")
    .set(header)
    .send({ ...criarAgenda(240), pacienteId: p2.id });
  assert.equal(r.status, 422, r.text);
});
test("RN04: médico sem vínculo com unidade é rejeitado", async () => {
  const nova = await db.unidade.create({
    data: {
      nome: "Unidade de teste",
      endereco: "Teste",
      telefone: "000",
      horario: "08h-18h",
    },
  });
  const r = await recepcao
    .post("/api/agendamentos")
    .set(header)
    .send({ ...criarAgenda(240), unidadeId: nova.id });
  assert.equal(r.status, 422, r.text);
});
test("RF07: reagendar altera intervalo e retorna para AGENDADO", async () => {
  await recepcao
    .patch(`/api/agendamentos/${a.id}/situacao`)
    .set(header)
    .send({ situacao: "CONFIRMADO" })
    .expect(200);
  const r = await recepcao
    .put(`/api/agendamentos/${a.id}`)
    .set(header)
    .send(criarAgenda(300));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.body.situacao, "AGENDADO");
  a = r.body;
});
test("RN07: consulta de agendamento cancelado é rejeitada", async () => {
  const r = await recepcao
    .post("/api/agendamentos")
    .set(header)
    .send(criarAgenda(360));
  await recepcao
    .patch(`/api/agendamentos/${r.body.id}/situacao`)
    .set(header)
    .send({ situacao: "CANCELADO" })
    .expect(200);
  const c = await medico.post("/api/consultas").set(header).send({
    agendamentoId: r.body.id,
    queixa: "Teste",
    diagnostico: "Teste",
    conduta: "Teste",
  });
  assert.equal(c.status, 409, c.text);
});
test("RF08: consulta é criada pelo médico responsável", async () => {
  const r = await medico.post("/api/consultas").set(header).send({
    agendamentoId: a.id,
    queixa: "Teste",
    diagnostico: "Diagnóstico fictício",
    conduta: "Conduta fictícia",
  });
  assert.equal(r.status, 201, r.text);
  c = r.body;
  assert.equal(
    (await db.agendamento.findUniqueOrThrow({ where: { id: a.id } })).situacao,
    "REALIZADO",
  );
});
test("RN08: não duplica consulta nem cancela atendimento realizado", async () => {
  assert.equal(
    (
      await medico.post("/api/consultas").set(header).send({
        agendamentoId: a.id,
        queixa: "Teste",
        diagnostico: "Teste",
        conduta: "Teste",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await recepcao
        .patch(`/api/agendamentos/${a.id}/situacao`)
        .set(header)
        .send({ situacao: "CANCELADO" })
    ).status,
    409,
  );
  assert.equal(await db.consulta.count({ where: { agendamentoId: a.id } }), 1);
});
test("RN09: exame com paciente divergente é rejeitado pela API e pelo banco", async () => {
  const r = await medico
    .post(`/api/consultas/${c.id}/exames`)
    .set(header)
    .send({ pacienteId: p2.id, exameId: catalogo.id });
  assert.equal(r.status, 422);
  await assert.rejects(() =>
    db.solicitacaoExame.create({
      data: { consultaId: c.id, pacienteId: p2.id, exameId: catalogo.id },
    }),
  );
});
test("RF09: mesmo exame pode ser solicitado novamente; cancelado não é pendente", async () => {
  const r = await medico
    .post(`/api/consultas/${c.id}/exames`)
    .set(header)
    .send({ pacienteId: p.id, exameId: catalogo.id });
  assert.equal(r.status, 201, r.text);
  const segundo = await medico
    .post(`/api/consultas/${c.id}/exames`)
    .set(header)
    .send({ pacienteId: p.id, exameId: catalogo.id });
  assert.equal(segundo.status, 201);
  await medico
    .patch(`/api/solicitacoes-exames/${r.body.id}`)
    .set(header)
    .send({ situacao: "CANCELADO" })
    .expect(200);
  const pendentes = await medico.get(
    `/api/pacientes/${p.id}/exames?pendentes=true`,
  );
  assert.ok(!pendentes.body.some((e: any) => e.id === r.body.id));
  assert.ok(pendentes.body.some((e: any) => e.id === segundo.body.id));
});
test("RF10: prescrição vazia rejeitada e múltiplos itens persistidos", async () => {
  assert.equal(
    (
      await medico
        .post(`/api/consultas/${c.id}/prescricoes`)
        .set(header)
        .send({ itens: [] })
    ).status,
    422,
  );
  const med = await db.medicamento.findFirstOrThrow();
  const item = {
    medicamentoId: med.id,
    quantidade: 1,
    dose: "Fictícia",
    frequencia: "Fictícia",
    duracao: "Fictícia",
    observacoes: "",
  };
  const r = await medico
    .post(`/api/consultas/${c.id}/prescricoes`)
    .set(header)
    .send({ itens: [item, { ...item, quantidade: 2 }] });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.body.itens.length, 2);
});
test("RF11: preço realizado é preservado após editar catálogo", async () => {
  const r = await medico
    .post(`/api/consultas/${c.id}/procedimentos`)
    .set(header)
    .send({
      procedimentoId: procedimento.id,
      profissionalId: m.profissionalId,
      data: new Date().toISOString(),
      valorCobrado: "75.25",
    });
  assert.equal(r.status, 201, r.text);
  await db.procedimento.update({
    where: { id: procedimento.id },
    data: { valorPadrao: "999.00" },
  });
  assert.equal(
    (
      await db.procedimentoRealizado.findUniqueOrThrow({
        where: { id: r.body.id },
      })
    ).valorCobrado.toFixed(2),
    "75.25",
  );
});
test("RF12: divisão de cobertura conserva total e não cria recebimento", async () => {
  const r = await fin.post("/api/cobrancas").set(header).send({
    consultaId: c.id,
    origem: "Consulta teste",
    valorTotal: "300.00",
    valorCoberto: "200.00",
    vencimento: hoje(),
    chave: randomUUID(),
  });
  assert.equal(r.status, 201, r.text);
  cobrancas = r.body;
  assert.equal(cobrancas.length, 2);
  assert.equal(
    cobrancas.reduce((s, x) => s + Number(x.valor), 0),
    300,
  );
  assert.equal(
    await db.pagamento.count({
      where: { cobrancaId: { in: cobrancas.map((x) => x.id) } },
    }),
    0,
  );
});
test("RN12: cobertura acima do total é rejeitada", async () => {
  const r = await fin.post("/api/cobrancas").set(header).send({
    consultaId: c.id,
    origem: "Teste",
    valorTotal: "10.00",
    valorCoberto: "20.00",
    vencimento: hoje(),
    chave: randomUUID(),
  });
  assert.equal(r.status, 422);
});
test("RF13: pagamento parcial, idempotência e excesso", async () => {
  const cob = cobrancas.find((x) => x.responsavel === "PACIENTE");
  const input = { valor: "40.10", forma: "PIX", chave: randomUUID() };
  const r = await fin
    .post(`/api/cobrancas/${cob.id}/pagamentos`)
    .set(header)
    .send(input);
  assert.equal(r.status, 201, r.text);
  await fin
    .post(`/api/cobrancas/${cob.id}/pagamentos`)
    .set(header)
    .send(input)
    .expect(201);
  assert.equal(await db.pagamento.count({ where: { cobrancaId: cob.id } }), 1);
  assert.equal(
    (await db.cobranca.findUniqueOrThrow({ where: { id: cob.id } })).situacao,
    "PARCIAL",
  );
  const excesso = await fin
    .post(`/api/cobrancas/${cob.id}/pagamentos`)
    .set(header)
    .send({ valor: "60.00", forma: "PIX", chave: randomUUID() });
  assert.equal(excesso.status, 422);
});
test("RN13: pagamentos concorrentes não superam o saldo", async () => {
  const cob = cobrancas.find((x) => x.responsavel === "PACIENTE");
  const rs = await Promise.all([
    fin
      .post(`/api/cobrancas/${cob.id}/pagamentos`)
      .set(header)
      .send({ valor: "50.00", forma: "PIX", chave: randomUUID() }),
    fin
      .post(`/api/cobrancas/${cob.id}/pagamentos`)
      .set(header)
      .send({ valor: "50.00", forma: "PIX", chave: randomUUID() }),
  ]);
  assert.equal(rs.filter((r) => r.status === 201).length, 1);
  const soma = await db.pagamento.aggregate({
    where: { cobrancaId: cob.id },
    _sum: { valor: true },
  });
  assert.equal(soma._sum.valor!.toFixed(2), "90.10");
});
test("RF13: repasse usa forma convênio e estorno reabre saldo", async () => {
  const cob = cobrancas.find((x) => x.responsavel === "CONVENIO");
  assert.equal(
    (
      await fin
        .post(`/api/cobrancas/${cob.id}/pagamentos`)
        .set(header)
        .send({ valor: "200.00", forma: "PIX", chave: randomUUID() })
    ).status,
    422,
  );
  const r = await fin
    .post(`/api/cobrancas/${cob.id}/pagamentos`)
    .set(header)
    .send({ valor: "200.00", forma: "CONVENIO", chave: randomUUID() });
  assert.equal(r.status, 201, r.text);
  assert.equal(
    (await db.cobranca.findUniqueOrThrow({ where: { id: cob.id } })).situacao,
    "QUITADA",
  );
  await fin
    .post(`/api/pagamentos/${r.body.id}/estorno`)
    .set(header)
    .send({})
    .expect(200);
  assert.equal(
    (await db.cobranca.findUniqueOrThrow({ where: { id: cob.id } })).situacao,
    "ABERTA",
  );
});
test("RN14: administrador, recepção e financeiro não leem prontuários", async () => {
  for (const ag of [admin, recepcao, fin]) {
    assert.equal(
      (await ag.get(`/api/pacientes/${p.id}/prontuario`)).status,
      403,
    );
    assert.equal(
      (await ag.get(`/api/pacientes/${p.id}/historico`)).status,
      403,
    );
  }
  assert.equal((await recepcao.get("/api/cobrancas")).status, 403);
});
test("RN14: outro médico não altera consulta e enfermagem recebe acesso mínimo", async () => {
  assert.equal(
    (
      await outro
        .post(`/api/consultas/${c.id}/exames`)
        .set(header)
        .send({ pacienteId: p.id, exameId: catalogo.id })
    ).status,
    403,
  );
  assert.equal((await enf.get(`/api/pacientes/${p.id}/historico`)).status, 403);
  assert.equal(
    (await enf.get(`/api/pacientes/${p.id}/prontuario`)).status,
    200,
  );
  assert.equal(
    (await enf.get(`/api/pacientes/${p2.id}/prontuario`)).status,
    403,
  );
});
test("RF14: relatórios não duplicam cobertura e distinguem datas", async () => {
  const r = await fin.get(
    `/api/relatorios?inicio=${new Date(Date.now() - 40 * 86400000).toISOString()}&fim=${new Date(Date.now() + 86400000).toISOString()}`,
  );
  assert.equal(r.status, 200, r.text);
  assert.equal(Number(r.body.faturamento), 600);
  assert.equal(Number(r.body.recebido), 130.1);
  assert.equal(Number(r.body.coberturaPrevista), 400);
  assert.equal(Number(r.body.repasseRecebido), 0);
  assert.equal(Number(r.body.aberto), 469.9);
});
test("RN06: histórico do convênio permanece após inativação do vínculo", async () => {
  await recepcao
    .patch(`/api/pacientes/${p.id}/convenios/${v.id}`)
    .set(header)
    .send({ ativo: false })
    .expect(200);
  const registro = await db.agendamento.findUniqueOrThrow({
    where: { id: a.id },
  });
  assert.ok(registro.convenioHistorico?.includes("DEMO-001"));
  assert.equal(
    (
      await recepcao
        .post("/api/agendamentos")
        .set(header)
        .send(criarAgenda(480))
    ).status,
    422,
  );
});
test("RNF04: leitura e mutações geram auditoria sem conteúdo clínico", async () => {
  await medico.get(`/api/pacientes/${p.id}/historico`).expect(200);
  const a = await db.auditoria.findFirst({
    where: { acao: "LER_HISTORICO", recursoId: String(p.id) },
  });
  assert.ok(a);
  assert.ok(!Object.keys(a).includes("diagnostico"));
});
test("RN07: ausência futura e consulta de não comparecimento são recusadas", async () => {
  const inicioFuturo = new Date(Date.now() + 30 * 86400000);
  const r = await recepcao
    .post("/api/agendamentos")
    .set(header)
    .send({
      ...criarAgenda(800),
      pacienteConvenioId: null,
      inicio: inicioFuturo.toISOString(),
      fim: new Date(+inicioFuturo + 1800000).toISOString(),
    });
  assert.equal(r.status, 201, r.text);
  assert.equal(
    (
      await recepcao
        .patch(`/api/agendamentos/${r.body.id}/situacao`)
        .set(header)
        .send({ situacao: "NAO_COMPARECEU" })
    ).status,
    422,
  );
  const passado = await recepcao
    .post("/api/agendamentos")
    .set(header)
    .send({ ...criarAgenda(800), pacienteConvenioId: null });
  assert.equal(passado.status, 201);
  await recepcao
    .patch(`/api/agendamentos/${passado.body.id}/situacao`)
    .set(header)
    .send({ situacao: "NAO_COMPARECEU" })
    .expect(200);
  assert.equal(
    (
      await medico.post("/api/consultas").set(header).send({
        agendamentoId: passado.body.id,
        queixa: "Teste",
        diagnostico: "Teste",
        conduta: "Teste",
      })
    ).status,
    409,
  );
});
test("RN10: exame realizado exige resultado e oculta resultado da enfermagem", async () => {
  const r = await medico
    .post(`/api/consultas/${c.id}/exames`)
    .set(header)
    .send({ pacienteId: p.id, exameId: catalogo.id });
  assert.equal(r.status, 201);
  assert.equal(
    (
      await medico
        .patch(`/api/solicitacoes-exames/${r.body.id}`)
        .set(header)
        .send({ situacao: "REALIZADO" })
    ).status,
    422,
  );
  await medico
    .patch(`/api/solicitacoes-exames/${r.body.id}`)
    .set(header)
    .send({
      situacao: "REALIZADO",
      realizadoEm: new Date().toISOString(),
      resultado: "Resultado fictício",
    })
    .expect(200);
  const leitura = await enf.get(`/api/pacientes/${p.id}/exames`);
  assert.equal(leitura.status, 200);
  assert.ok(leitura.body.every((e: any) => !Object.hasOwn(e, "resultado")));
});
test("RN12: chave de emissão repetida retorna original e não aceita outro total", async () => {
  const chave = randomUUID(),
    input = {
      consultaId: c.id,
      origem: "Teste idempotência",
      valorTotal: "10.00",
      vencimento: hoje(),
      chave,
    };
  const r = await fin.post("/api/cobrancas").set(header).send(input);
  assert.equal(r.status, 201);
  const repetida = await fin.post("/api/cobrancas").set(header).send(input);
  assert.equal(repetida.status, 201);
  assert.equal(repetida.body[0].id, r.body[0].id);
  assert.equal(
    (
      await fin
        .post("/api/cobrancas")
        .set(header)
        .send({ ...input, valorTotal: "11.00" })
    ).status,
    409,
  );
  await fin
    .post(`/api/cobrancas/${r.body[0].id}/cancelamento`)
    .set(header)
    .send({})
    .expect(200);
});
test("RN11: banco rejeita prescrição sem itens e médico sem especialidade", async () => {
  await assert.rejects(() =>
    db.prescricao.create({ data: { consultaId: c.id } }),
  );
  const profissional = await db.profissional.findFirstOrThrow({
    where: { medico: null },
  });
  await assert.rejects(() =>
    db.medico.create({
      data: {
        profissionalId: profissional.id,
        crm: "TESTE_SEM_ESPECIALIDADE",
        ufCrm: "SP",
      },
    }),
  );
});
test("RN18: alteração de perfil revoga sessão e impede auto-rebaixamento", async () => {
  const u = await db.usuario.findFirstOrThrow({
    where: { email: "admin@clinica.local" },
  });
  assert.equal(
    (
      await admin
        .put("/api/usuarios/" + u.id)
        .set(header)
        .send({
          nome: u.nome,
          email: u.email,
          perfil: "RECEPCIONISTA",
          ativo: true,
        })
    ).status,
    422,
  );
  const r = await admin.post("/api/usuarios").set(header).send({
    nome: "Conta revogável",
    email: "revogavel@clinica.local",
    senha: "TesteSenha@2026",
    perfil: "RECEPCIONISTA",
  });
  assert.equal(r.status, 201, r.text);
  const sessao = request.agent(app);
  await sessao
    .post("/api/login")
    .set(header)
    .send({ email: "revogavel@clinica.local", senha: "TesteSenha@2026" })
    .expect(200);
  await admin
    .put("/api/usuarios/" + r.body.id)
    .set(header)
    .send({
      nome: "Conta revogável",
      email: "revogavel@clinica.local",
      perfil: "RECEPCIONISTA",
      ativo: false,
    })
    .expect(200);
  assert.equal((await sessao.get("/api/me")).status, 401);
});
function hoje() {
  return new Date().toISOString().slice(0, 10);
}

test("Agenda valida intervalo, unidade e situação sem confundir parâmetros com falha de banco", async () => {
  const base = {
    inicio: "2027-05-10T00:00:00-03:00",
    fim: "2027-05-11T00:00:00-03:00",
  };
  for (const filtros of [{}, { unidadeId: u.id }, { situacao: "AGENDADO" }]) {
    await admin
      .get("/api/agendamentos")
      .query({ ...base, ...filtros })
      .expect(200);
  }
  for (const filtros of [
    { inicio: "inválido" },
    { fim: base.inicio },
    { fim: "2028-05-10T00:00:00Z" },
    { unidadeId: "abc" },
    { situacao: "INVALIDA" },
  ]) {
    const r = await admin
      .get("/api/agendamentos")
      .query({ ...base, ...filtros });
    assert.equal(r.status, 422);
    assert.notEqual(r.body.codigo, "P2021");
  }
});
test("Tabela ausente retorna 503 com código P2021 e instrução de migration", async () => {
  const original = db.agendamentoLivre.findMany;
  db.agendamentoLivre.findMany = (async () => {
    throw new Prisma.PrismaClientKnownRequestError("Tabela ausente", {
      code: "P2021",
      clientVersion: "6.19.0",
    });
  }) as typeof original;
  try {
    const r = await admin
      .get("/api/agendamentos")
      .query({ inicio: "2027-05-10T00:00:00Z", fim: "2027-05-11T00:00:00Z" });
    assert.equal(r.status, 503);
    assert.equal(r.body.codigo, "P2021");
    assert.match(r.body.erro, /migrations/);
  } finally {
    db.agendamentoLivre.findMany = original;
  }
});

test("Admin salva, lista, altera e cancela agendamento com nomes livres", async () => {
  const dados = {
    pacienteNome: "Nome livre de teste",
    medicoNome: "Dra. Teste Livre",
    unidadeNome: "Unidade digitada",
    especialidadeNome: "Especialidade digitada",
    inicio: "2027-08-10T10:00:00-03:00",
    fim: "2027-08-10T10:30:00-03:00",
  };
  assert.equal(
    (await recepcao.post("/api/agendamentos-livres").set(header).send(dados))
      .status,
    403,
  );
  const r = await admin
    .post("/api/agendamentos-livres")
    .set(header)
    .send(dados);
  assert.equal(r.status, 201, r.text);
  assert.equal(
    (await admin.post("/api/agendamentos-livres").set(header).send(dados))
      .status,
    409,
  );
  const lista = await admin.get(
    "/api/agendamentos?inicio=2027-08-10T00:00:00Z&fim=2027-08-11T00:00:00Z",
  );
  assert.ok(
    lista.body.some(
      (a: any) => a.livre && a.paciente.nome === dados.pacienteNome,
    ),
  );
  assert.equal(
    (
      await recepcao.get(
        "/api/agendamentos?inicio=2027-08-10T00:00:00Z&fim=2027-08-11T00:00:00Z",
      )
    ).body.some((a: any) => a.livre),
    false,
  );
  await admin
    .put("/api/agendamentos-livres/" + r.body.id)
    .set(header)
    .send({ ...dados, pacienteNome: "Nome corrigido" })
    .expect(200);
  await admin
    .patch("/api/agendamentos-livres/" + r.body.id + "/situacao")
    .set(header)
    .send({ situacao: "CANCELADO" })
    .expect(200);
});
test("Reserva livre impede sobreposição com agenda vinculada nos dois sentidos", async () => {
  const profissional = await db.profissional.findUniqueOrThrow({
    where: { id: m.profissionalId },
  });
  const normal = { ...criarAgenda(1500), pacienteConvenioId: null };
  const livre = {
    pacienteNome: "Paciente sem cadastro",
    medicoNome: profissional.nome,
    unidadeNome: "Unidade livre",
    especialidadeNome: "Clínica Geral",
    inicio: normal.inicio,
    fim: normal.fim,
  };
  const reserva = await admin
    .post("/api/agendamentos-livres")
    .set(header)
    .send(livre);
  assert.equal(reserva.status, 201, reserva.text);
  assert.equal(
    (await recepcao.post("/api/agendamentos").set(header).send(normal)).status,
    409,
  );
  await admin
    .patch(`/api/agendamentos-livres/${reserva.body.id}/situacao`)
    .set(header)
    .send({ situacao: "CANCELADO" })
    .expect(200);
  await recepcao.post("/api/agendamentos").set(header).send(normal).expect(201);
  assert.equal(
    (await admin.post("/api/agendamentos-livres").set(header).send(livre))
      .status,
    409,
  );
});
