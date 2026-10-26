CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Agendamento" ADD CONSTRAINT "intervalo_valido" CHECK ("fim" > "inicio" AND "fim" <= "inicio" + interval '4 hours');
ALTER TABLE "Agendamento" ADD CONSTRAINT "medico_sem_sobreposicao" EXCLUDE USING gist
  ("medicoId" WITH =, tstzrange("inicio", "fim", '[)') WITH &&)
  WHERE ("situacao" IN ('AGENDADO','CONFIRMADO','REALIZADO'));
ALTER TABLE "Cobranca" ADD CONSTRAINT "valor_cobranca_positivo" CHECK (valor > 0);
ALTER TABLE "Cobranca" ADD CONSTRAINT "pagador_coerente" CHECK ((responsavel = 'CONVENIO' AND "pacienteConvenioId" IS NOT NULL) OR (responsavel = 'PACIENTE' AND "pacienteConvenioId" IS NULL));
ALTER TABLE "Pagamento" ADD CONSTRAINT "valor_pagamento_positivo" CHECK (valor > 0);
ALTER TABLE "Procedimento" ADD CONSTRAINT "preco_nao_negativo" CHECK ("valorPadrao" >= 0);
ALTER TABLE "ProcedimentoRealizado" ADD CONSTRAINT "cobrado_nao_negativo" CHECK ("valorCobrado" >= 0);
ALTER TABLE "ItemPrescricao" ADD CONSTRAINT "quantidade_positiva" CHECK (quantidade > 0);
ALTER TABLE "SolicitacaoExame" ADD CONSTRAINT "resultado_coerente" CHECK ((situacao = 'REALIZADO' AND "realizadoEm" IS NOT NULL AND resultado IS NOT NULL AND length(trim(resultado)) > 0 AND "realizadoEm" >= "solicitadoEm") OR (situacao <> 'REALIZADO' AND "realizadoEm" IS NULL AND resultado IS NULL));

CREATE FUNCTION validar_prontuario() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE codigo integer;
BEGIN
  IF TG_TABLE_NAME = 'Paciente' THEN codigo := NEW.id;
  ELSE codigo := OLD."pacienteId"; END IF;
  IF EXISTS(SELECT 1 FROM "Paciente" WHERE id = codigo) AND NOT EXISTS(SELECT 1 FROM "Prontuario" WHERE "pacienteId" = codigo) THEN
    RAISE EXCEPTION 'Cada paciente deve possuir exatamente um prontuario';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "paciente_tem_prontuario" AFTER INSERT OR UPDATE ON "Paciente" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_prontuario();
CREATE CONSTRAINT TRIGGER "prontuario_obrigatorio" AFTER DELETE OR UPDATE ON "Prontuario" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_prontuario();

CREATE FUNCTION validar_prescricao() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE codigo integer;
BEGIN
  IF TG_TABLE_NAME = 'Prescricao' THEN codigo := NEW.id; ELSE codigo := OLD."prescricaoId"; END IF;
  IF EXISTS(SELECT 1 FROM "Prescricao" WHERE id = codigo) AND NOT EXISTS(SELECT 1 FROM "ItemPrescricao" WHERE "prescricaoId" = codigo) THEN RAISE EXCEPTION 'Prescricao exige ao menos um item'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "prescricao_tem_item" AFTER INSERT OR UPDATE ON "Prescricao" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_prescricao();
CREATE CONSTRAINT TRIGGER "item_obrigatorio" AFTER DELETE OR UPDATE ON "ItemPrescricao" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_prescricao();

CREATE FUNCTION validar_medico() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE codigo integer;
BEGIN
  IF TG_TABLE_NAME = 'Medico' THEN codigo := NEW."profissionalId"; ELSE codigo := OLD."medicoId"; END IF;
  IF EXISTS(SELECT 1 FROM "Medico" WHERE "profissionalId" = codigo) AND NOT EXISTS(SELECT 1 FROM "MedicoEspecialidade" WHERE "medicoId" = codigo) THEN RAISE EXCEPTION 'Medico exige ao menos uma especialidade'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "medico_tem_especialidade" AFTER INSERT OR UPDATE ON "Medico" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_medico();
CREATE CONSTRAINT TRIGGER "especialidade_obrigatoria" AFTER DELETE OR UPDATE ON "MedicoEspecialidade" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_medico();

CREATE FUNCTION validar_consulta() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Agendamento" a WHERE a.id=NEW."agendamentoId" AND a."pacienteId"=NEW."pacienteId" AND a."medicoId"=NEW."medicoId" AND a."unidadeId"=NEW."unidadeId" AND a."especialidadeId"=NEW."especialidadeId" AND a.situacao='REALIZADO') THEN RAISE EXCEPTION 'Consulta inconsistente com agendamento'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "consulta_consistente" AFTER INSERT OR UPDATE ON "Consulta" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_consulta();
