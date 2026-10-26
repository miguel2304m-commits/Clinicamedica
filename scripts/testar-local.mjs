import { spawnSync } from "node:child_process";
// Ignora a URL do .env para nunca limpar ou testar o banco publicado na Neon.
const resultado = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", "tests/regras.test.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL:
        "postgresql://clinica:clinica_local@127.0.0.1:54329/clinica_test?schema=public",
    },
  },
);
process.exitCode = resultado.status ?? 1;
