import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
});
const page = await context.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(e.message));
await mkdir("docs/evidencias", { recursive: true });
const resultados = [];
async function passo(nome, fn) {
  await fn();
  resultados.push(nome);
  console.log("OK:", nome);
}
async function login(email) {
  await page.goto("http://127.0.0.1:3002");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(email + "@clinica.local");
  await page.getByLabel("Senha", { exact: true }).fill("Clinica@2026");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await page
    .getByRole("heading", { name: "Visão geral", exact: true })
    .waitFor();
}
try {
  await passo("Login e dashboard com métricas do PostgreSQL", async () => {
    await login("admin");
    await page.screenshot({
      path: "docs/evidencias/dashboard.png",
      fullPage: true,
    });
  });
  await passo("Agenda diária e semanal", async () => {
    await page
      .locator("nav")
      .getByRole("button", { name: "Agenda", exact: true })
      .click();
    await page.getByRole("heading", { name: "Agenda", exact: true }).waitFor();
    await page.getByRole("button", { name: "Semana", exact: true }).click();
    await page.locator(".week-day").first().waitFor();
    assert.equal(await page.locator(".week-day").count(), 7);
    await page.screenshot({
      path: "docs/evidencias/agenda.png",
      fullPage: true,
    });
  });
  await passo(
    "Pesquisa de pacientes e bloqueio de aba clínica administrativa",
    async () => {
      await page
        .locator("nav")
        .getByRole("button", { name: "Pacientes", exact: true })
        .click();
      await page
        .getByPlaceholder("Pesquisar por nome ou CPF…")
        .fill("Ana Clara");
      await page.getByRole("button", { name: "Ver paciente" }).first().click();
      await page
        .getByRole("heading", { name: "Ana Clara Martins", exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Prontuário", exact: true })
          .count(),
        0,
      );
    },
  );
  await passo(
    "Formulário real de paciente com validação e persistência",
    async () => {
      await page
        .locator("nav")
        .getByRole("button", { name: "Pacientes", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Novo paciente", exact: true })
        .click();
      await page
        .getByLabel("Nome completo")
        .fill("Paciente de teste da interface");
      await page.locator("dialog [name=cpf]").fill("98765432100");
      await page.getByLabel("Data de nascimento").fill("1995-05-20");
      await page.locator("dialog [name=telefone]").fill("(11) 90000-9999");
      await page.locator("dialog [name=email]").fill("interface@exemplo.local");
      await page
        .locator('dialog [name=sexo]')
        .selectOption("NAO_INFORMADO");
      await page.getByLabel("Endereço").fill("Rua de teste, 10");
      await page.getByRole("button", { name: "Salvar registro" }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page
        .getByPlaceholder("Pesquisar por nome ou CPF…")
        .fill("Paciente de teste da interface");
      await page
        .getByText("Paciente de teste da interface", { exact: true })
        .waitFor();
    },
  );
  await passo("Relatórios e exportação CSV", async () => {
    await page
      .locator("nav")
      .getByRole("button", { name: "Relatórios", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Relatórios", exact: true })
      .waitFor();
    await page.getByText("Faturamento por médico", { exact: true }).waitFor();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    assert.ok((await download).suggestedFilename().endsWith(".csv"));
    await page.screenshot({
      path: "docs/evidencias/relatorios.png",
      fullPage: true,
    });
  });
  await passo(
    "Médico acessa histórico e prescreve dois itens pela interface",
    async () => {
      await page.getByRole("button", { name: "Sair da conta" }).click();
      await login("medico");
      await page
        .locator("nav")
        .getByRole("button", { name: "Pacientes", exact: true })
        .click();
      await page
        .getByPlaceholder("Pesquisar por nome ou CPF…")
        .fill("Ana Clara");
      await page.getByRole("button", { name: "Ver paciente" }).first().click();
      await page
        .getByRole("button", { name: "Consultas", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Prescrever medicamentos" })
        .first()
        .click();
      await page.getByLabel("Quantidade de medicamentos").fill("2");
      await page.getByRole("button", { name: "Preparar itens" }).click();
      await page
        .getByRole("heading", { name: "Itens da prescrição" })
        .waitFor();
      for (let i = 0; i < 2; i++) {
        await page
          .locator(`[name=medicamentoId${i}]`)
          .selectOption({ index: 1 });
        await page.locator(`[name=quantidade${i}]`).fill("1");
        await page.locator(`[name=dose${i}]`).fill("Fictícia");
        await page.locator(`[name=frequencia${i}]`).fill("Demonstrativa");
        await page.locator(`[name=duracao${i}]`).fill("Demonstrativa");
      }
      await page.getByRole("button", { name: "Salvar registro" }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page
        .getByRole("button", { name: "Prescrições", exact: true })
        .click();
      await page.locator(".prescription").first().waitFor();
      await page.screenshot({
        path: "docs/evidencias/prontuario.png",
        fullPage: true,
      });
    },
  );
  await passo("Responsividade a 390 px e navegação por menu", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page
      .locator("nav")
      .getByRole("button", { name: "Visão geral" })
      .click();
    await page
      .getByRole("heading", { name: "Visão geral", exact: true })
      .waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: "docs/evidencias/mobile.png",
      fullPage: true,
    });
    const dimensoes = await page.evaluate(() => ({
      largura: innerWidth,
      documento: document.documentElement.scrollWidth,
    }));
    assert.ok(
      dimensoes.documento <= dimensoes.largura,
      JSON.stringify(dimensoes),
    );
  });
  await passo(
    "Verificação automatizada de acessibilidade do dashboard",
    async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      await writeFile(
        "docs/evidencias/acessibilidade.json",
        JSON.stringify(
          {
            violacoes: resultado.violations,
            incompletos: resultado.incomplete.map((i) => ({
              id: i.id,
              descricao: i.description,
            })),
            aprovados: resultado.passes.length,
          },
          null,
          2,
        ),
      );
      assert.equal(
        resultado.violations.length,
        0,
        resultado.violations
          .map(
            (v) =>
              v.id + ": " + v.nodes.map((n) => n.target.join(" ")).join(", "),
          )
          .join("\n"),
      );
    },
  );
  assert.deepEqual(erros, [], "Erros JavaScript no navegador");
  await writeFile(
    "docs/evidencias/interface.json",
    JSON.stringify(
      {
        data: new Date().toISOString(),
        navegador: "Microsoft Edge headless via Playwright",
        resultados,
        erros,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
