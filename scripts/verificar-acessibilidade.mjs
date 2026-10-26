import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3002");
  await page.getByLabel("E-mail", { exact: true }).fill("admin@clinica.local");
  await page.getByLabel("Senha", { exact: true }).fill("Clinica@2026");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await page
    .getByRole("heading", { name: "Visão geral", exact: true })
    .waitFor();
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
  console.log(
    JSON.stringify(
      resultado.violations.map((v) => ({
        id: v.id,
        alvos: v.nodes.map((n) => ({
          elemento: n.target,
          detalhe: n.failureSummary,
        })),
      })),
      null,
      2,
    ),
  );
  if (resultado.violations.length) process.exitCode = 1;
} finally {
  await browser.close();
}
