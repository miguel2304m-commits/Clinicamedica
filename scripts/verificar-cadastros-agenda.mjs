import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const sufixo = Date.now().toString();
  const nomes = {
    especialidade: "Especialidade " + sufixo,
    unidade: "Unidade " + sufixo,
    medico: "Médico " + sufixo,
    paciente: "Paciente " + sufixo,
  };
  const cpf = (base) => {
    const dig = (s) => {
      const r =
        ([...s].reduce((t, v, i) => t + Number(v) * (s.length + 1 - i), 0) *
          10) %
        11;
      return r === 10 ? 0 : r;
    };
    const dez = base + dig(base);
    return dez + dig(dez);
  };
  const field = (n) => page.locator(`dialog [name=${n}]`);
  async function preencher(valores) {
    for (const [n, v] of Object.entries(valores)) await field(n).fill(v);
  }
  async function salvar(rota) {
    const resposta = page.waitForResponse(
      (r) => r.url().endsWith("/api" + rota) && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Salvar registro", exact: true })
      .click();
    const r = await resposta;
    assert.equal(r.status(), 201, await r.text());
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    return r.json();
  }
  await page.goto("http://127.0.0.1:3002");
  await page.getByLabel("E-mail", { exact: true }).fill("admin@clinica.local");
  await page.getByLabel("Senha", { exact: true }).fill("Clinica@2026");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await page
    .getByRole("heading", { name: "Visão geral", exact: true })
    .waitFor();
  await page
    .locator("nav")
    .getByRole("button", { name: "Cadastros", exact: true })
    .click();
  async function novo(tipo) {
    await page
      .locator(".tabs")
      .getByRole("button", { name: tipo, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Novo registro", exact: true })
      .click();
  }
  await novo("Especialidades");
  await preencher({
    nome: nomes.especialidade,
    descricao: "Teste de persistência",
  });
  const e = await salvar("/catalogos/especialidades");
  await novo("Unidades");
  await preencher({
    nome: nomes.unidade,
    endereco: "Rua Teste",
    telefone: "11999990000",
    horario: "08h às 20h",
  });
  await field("especialidades")
    .locator(`option[value="${e.id}"]`)
    .waitFor({ state: "attached" });
  await field("especialidades").selectOption(String(e.id));
  const u = await salvar("/catalogos/unidades");
  await novo("Profissionais");
  await preencher({
    nome: nomes.medico,
    cpf: cpf(sufixo.slice(-9)),
    nascimento: "1980-01-01",
    telefone: "11999990001",
    email: sufixo + "@exemplo.local",
    registro: "CRM teste",
    crm: "UI" + sufixo,
  });
  await field("ufCrm").selectOption("SP");
  await field("unidades")
    .locator(`option[value="${u.id}"]`)
    .waitFor({ state: "attached" });
  await field("unidades").selectOption(String(u.id));
  await field("especialidades").selectOption(String(e.id));
  const m = await salvar("/profissionais");
  await page
    .locator("nav")
    .getByRole("button", { name: "Pacientes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Novo paciente", exact: true })
    .click();
  await preencher({
    nome: nomes.paciente,
    cpf: cpf(String(Number(sufixo.slice(-9)) + 1).padStart(9, "0")),
    nascimento: "1995-01-01",
    telefone: "11999990002",
    email: "p" + sufixo + "@exemplo.local",
    endereco: "Rua Teste",
  });
  await field("sexo").selectOption("NAO_INFORMADO");
  const p = await salvar("/pacientes");
  await page
    .locator("nav")
    .getByRole("button", { name: "Agenda", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Novo agendamento", exact: true })
    .click();
  for (const [chave, nome] of Object.entries({
    pacienteId: nomes.paciente,
    medicoId: nomes.medico,
    unidadeId: nomes.unidade,
    especialidadeId: nomes.especialidade,
  })) {
    assert.ok(
      await page
        .locator(`#opcoes-${chave} option`)
        .evaluateAll((ops, n) => ops.some((o) => o.value === n), nome),
    );
    await field(chave).fill(nome);
  }
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  await field("inicio").fill(dia + "T18:00");
  await field("fim").fill(dia + "T18:30");
  const a = await salvar("/agendamentos");
  assert.equal(a.pacienteId, p.id);
  assert.equal(a.medicoId, m.id);
  assert.equal(a.unidadeId, u.id);
  assert.equal(a.especialidadeId, e.id);
  await page
    .getByRole("button", { name: nomes.paciente, exact: true })
    .waitFor();
  await page.reload();
  await page
    .locator("nav")
    .getByRole("button", { name: "Agenda", exact: true })
    .click();
  await page
    .getByRole("button", { name: nomes.paciente, exact: true })
    .waitFor();
  console.log(
    "OK: quatro cadastros pela interface, sugestões atualizadas, criação vinculada e listagem após recarregar.",
  );
} finally {
  await browser.close();
}
