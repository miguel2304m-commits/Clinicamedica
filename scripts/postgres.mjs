import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";
const dir = path.resolve(".postgres");
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "clinica",
  password: "clinica_local",
  port: 54329,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(path.join(dir, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
for (const nome of ["clinica", "clinica_test"]) {
  const r = await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [
    nome,
  ]);
  if (!r.rowCount) await pg.createDatabase(nome);
}
await client.end();
console.log(
  "PostgreSQL local pronto em 127.0.0.1:54329. Dados persistidos em .postgres. Ctrl+C para encerrar.",
);
let encerrando = false;
async function parar() {
  if (encerrando) return;
  encerrando = true;
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", parar);
process.on("SIGTERM", parar);
setInterval(() => {}, 30000);
