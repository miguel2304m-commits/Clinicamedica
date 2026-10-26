import "dotenv/config";
import { spawn } from "node:child_process";
const url = new URL(process.env.DATABASE_URL);
url.pathname = "/clinica_test";
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
