import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
const schema = "teste_" + randomUUID().replaceAll("-", "");
// Ignora a URL do .env para nunca limpar ou testar o banco publicado na Neon.
const resultado = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", "tests/regras.test.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TEST_SCHEMA: schema,
      DATABASE_URL:
        "postgresql://clinica:clinica_local@127.0.0.1:54329/clinica_test?schema=public",
    },
  },
);
process.exitCode = resultado.status ?? 1;
if (resultado.status === 0) {
  mkdirSync(".tools", { recursive: true });
  writeFileSync(".tools/test-schema.txt", schema);
}
