CREATE TABLE "AgendamentoLivre" (
  "id" SERIAL PRIMARY KEY,
  "pacienteNome" TEXT NOT NULL,
  "medicoNome" TEXT NOT NULL,
  "medicoChave" TEXT NOT NULL,
  "unidadeNome" TEXT NOT NULL,
  "especialidadeNome" TEXT NOT NULL,
  "inicio" TIMESTAMPTZ(3) NOT NULL,
  "fim" TIMESTAMPTZ(3) NOT NULL,
  "situacao" "SituacaoAgenda" NOT NULL DEFAULT 'AGENDADO',
  "observacoes" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "livre_intervalo" CHECK ("fim" > "inicio" AND "fim" <= "inicio" + interval '4 hours'),
  CONSTRAINT "livre_nao_clinico" CHECK ("situacao" <> 'REALIZADO'),
  CONSTRAINT "livre_sem_sobreposicao" EXCLUDE USING gist
    ("medicoChave" WITH =, tstzrange("inicio", "fim", '[)') WITH &&)
    WHERE ("situacao" IN ('AGENDADO', 'CONFIRMADO'))
);
CREATE INDEX "AgendamentoLivre_inicio_idx" ON "AgendamentoLivre"("inicio");
