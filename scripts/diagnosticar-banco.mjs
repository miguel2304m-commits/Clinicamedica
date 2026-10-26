import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  const url = new URL(process.env.DATABASE_URL);
  console.log(
    "Destino:",
    url.hostname.endsWith(".neon.tech")
      ? "Neon"
      : ["localhost", "127.0.0.1"].includes(url.hostname)
        ? "PostgreSQL local"
        : "PostgreSQL externo",
  );
  console.log(
    "Tabelas:",
    await db.$queryRaw`SELECT to_regclass('"Agendamento"')::text AS agenda, to_regclass('"AgendamentoLivre"')::text AS livre, to_regclass('"_prisma_migrations"')::text AS migrations`,
  );
  const migrations =
    await db.$queryRaw`SELECT to_regclass('"_prisma_migrations"')::text AS tabela`;
  if (migrations[0].tabela)
    console.log(
      "Migrations:",
      await db.$queryRaw`SELECT migration_name, finished_at IS NOT NULL AS concluida, rolled_back_at IS NOT NULL AS revertida FROM "_prisma_migrations" ORDER BY started_at`,
    );
  for (const [nome, consulta] of [
    [
      "agenda",
      () =>
        db.agendamento.findMany({
          take: 1,
          include: {
            paciente: { select: { id: true, nome: true } },
            medico: { include: { profissional: { select: { nome: true } } } },
            unidade: true,
            especialidade: true,
            consulta: { select: { id: true } },
          },
        }),
    ],
    ["livre", () => db.agendamentoLivre.findMany({ take: 1 })],
  ]) {
    try {
      await consulta();
      console.log(nome + ": OK");
    } catch (e) {
      console.log(nome + ":", e.code ?? e.name);
    }
  }
} catch (e) {
  console.log("Diagnóstico indisponível:", e.code ?? e.name);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
