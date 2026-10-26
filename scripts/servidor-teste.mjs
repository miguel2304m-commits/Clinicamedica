import "dotenv/config";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
const schema = readFileSync(".tools/test-schema.txt", "utf8").trim();
if (!/^teste_[a-z0-9_]+$/.test(schema))
  throw new Error("Execute scripts/testar-local.mjs primeiro.");
const url = new URL(
  "postgresql://clinica:clinica_local@127.0.0.1:54329/clinica_test",
);
url.searchParams.set("schema", schema);
const child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: url.toString(),
    PORT: "3002",
    APP_ORIGIN: "http://127.0.0.1:3002",
  },
});
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
