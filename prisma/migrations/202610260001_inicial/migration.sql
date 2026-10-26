-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'RECEPCIONISTA', 'MEDICO', 'ENFERMAGEM', 'FINANCEIRO');

-- CreateEnum
CREATE TYPE "SituacaoAgenda" AS ENUM ('AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO', 'NAO_COMPARECEU');

-- CreateEnum
CREATE TYPE "SituacaoExame" AS ENUM ('SOLICITADO', 'AGENDADO', 'REALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Responsavel" AS ENUM ('PACIENTE', 'CONVENIO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'CREDITO', 'DEBITO', 'PIX', 'CONVENIO');

-- CreateEnum
CREATE TYPE "SituacaoPagamento" AS ENUM ('RECEBIDO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "SituacaoCobranca" AS ENUM ('ABERTA', 'PARCIAL', 'QUITADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Paciente" (
    "id" SERIAL NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "nome" TEXT NOT NULL,
    "nascimento" DATE NOT NULL,
    "sexo" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prontuario" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prontuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alergia" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "Alergia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacienteAlergia" (
    "pacienteId" INTEGER NOT NULL,
    "alergiaId" INTEGER NOT NULL,
    "observacoes" TEXT NOT NULL,

    CONSTRAINT "PacienteAlergia_pkey" PRIMARY KEY ("pacienteId","alergiaId")
);

-- CreateTable
CREATE TABLE "Profissional" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nascimento" DATE NOT NULL,
    "registro" TEXT NOT NULL,

    CONSTRAINT "Profissional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medico" (
    "profissionalId" INTEGER NOT NULL,
    "crm" TEXT NOT NULL,
    "ufCrm" VARCHAR(2) NOT NULL,

    CONSTRAINT "Medico_pkey" PRIMARY KEY ("profissionalId")
);

-- CreateTable
CREATE TABLE "Especialidade" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "Especialidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicoEspecialidade" (
    "medicoId" INTEGER NOT NULL,
    "especialidadeId" INTEGER NOT NULL,

    CONSTRAINT "MedicoEspecialidade_pkey" PRIMARY KEY ("medicoId","especialidadeId")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "horario" TEXT NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfissionalUnidade" (
    "profissionalId" INTEGER NOT NULL,
    "unidadeId" INTEGER NOT NULL,

    CONSTRAINT "ProfissionalUnidade_pkey" PRIMARY KEY ("profissionalId","unidadeId")
);

-- CreateTable
CREATE TABLE "UnidadeEspecialidade" (
    "unidadeId" INTEGER NOT NULL,
    "especialidadeId" INTEGER NOT NULL,

    CONSTRAINT "UnidadeEspecialidade_pkey" PRIMARY KEY ("unidadeId","especialidadeId")
);

-- CreateTable
CREATE TABLE "Convenio" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "telefone" TEXT NOT NULL,

    CONSTRAINT "Convenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacienteConvenio" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "convenioId" INTEGER NOT NULL,
    "carteirinha" TEXT NOT NULL,
    "adesao" DATE NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PacienteConvenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "medicoId" INTEGER NOT NULL,
    "unidadeId" INTEGER NOT NULL,
    "especialidadeId" INTEGER NOT NULL,
    "pacienteConvenioId" INTEGER,
    "convenioHistorico" TEXT,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3) NOT NULL,
    "situacao" "SituacaoAgenda" NOT NULL DEFAULT 'AGENDADO',
    "observacoes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" SERIAL NOT NULL,
    "agendamentoId" INTEGER NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "medicoId" INTEGER NOT NULL,
    "unidadeId" INTEGER NOT NULL,
    "especialidadeId" INTEGER NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queixa" TEXT NOT NULL,
    "observacoes" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "conduta" TEXT NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exame" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "Exame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoExame" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "consultaId" INTEGER NOT NULL,
    "exameId" INTEGER NOT NULL,
    "solicitadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "situacao" "SituacaoExame" NOT NULL DEFAULT 'SOLICITADO',
    "realizadoEm" TIMESTAMPTZ(3),
    "resultado" TEXT,

    CONSTRAINT "SolicitacaoExame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "principioAtivo" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "apresentacao" TEXT NOT NULL,

    CONSTRAINT "Medicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescricao" (
    "id" SERIAL NOT NULL,
    "consultaId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescricao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPrescricao" (
    "id" SERIAL NOT NULL,
    "prescricaoId" INTEGER NOT NULL,
    "medicamentoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "dose" TEXT NOT NULL,
    "frequencia" TEXT NOT NULL,
    "duracao" TEXT NOT NULL,
    "observacoes" TEXT NOT NULL,

    CONSTRAINT "ItemPrescricao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedimento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorPadrao" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Procedimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedimentoRealizado" (
    "id" SERIAL NOT NULL,
    "consultaId" INTEGER NOT NULL,
    "procedimentoId" INTEGER NOT NULL,
    "profissionalId" INTEGER NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorCobrado" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ProcedimentoRealizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" SERIAL NOT NULL,
    "consultaId" INTEGER NOT NULL,
    "procedimentoRealizadoId" INTEGER,
    "pacienteConvenioId" INTEGER,
    "grupo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "responsavel" "Responsavel" NOT NULL,
    "vencimento" DATE NOT NULL,
    "emitidaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "situacao" "SituacaoCobranca" NOT NULL DEFAULT 'ABERTA',

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" SERIAL NOT NULL,
    "cobrancaId" INTEGER NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor" DECIMAL(12,2) NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "situacao" "SituacaoPagamento" NOT NULL DEFAULT 'RECEBIDO',
    "chave" TEXT NOT NULL,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "profissionalId" INTEGER,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessao" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "acao" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recursoId" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnotacaoEnfermagem" (
    "id" SERIAL NOT NULL,
    "prontuarioId" INTEGER NOT NULL,
    "profissionalId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnotacaoEnfermagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_key" ON "Paciente"("cpf");

-- CreateIndex
CREATE INDEX "Paciente_nome_idx" ON "Paciente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Prontuario_pacienteId_key" ON "Prontuario"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Alergia_nome_key" ON "Alergia"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Profissional_cpf_key" ON "Profissional"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Medico_crm_ufCrm_key" ON "Medico"("crm", "ufCrm");

-- CreateIndex
CREATE UNIQUE INDEX "Especialidade_nome_key" ON "Especialidade"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Convenio_cnpj_key" ON "Convenio"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "PacienteConvenio_pacienteId_convenioId_carteirinha_key" ON "PacienteConvenio"("pacienteId", "convenioId", "carteirinha");

-- CreateIndex
CREATE INDEX "Agendamento_medicoId_inicio_fim_idx" ON "Agendamento"("medicoId", "inicio", "fim");

-- CreateIndex
CREATE INDEX "Agendamento_pacienteId_inicio_idx" ON "Agendamento"("pacienteId", "inicio");

-- CreateIndex
CREATE INDEX "Agendamento_unidadeId_inicio_idx" ON "Agendamento"("unidadeId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Consulta_agendamentoId_key" ON "Consulta"("agendamentoId");

-- CreateIndex
CREATE INDEX "Consulta_data_unidadeId_especialidadeId_idx" ON "Consulta"("data", "unidadeId", "especialidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Consulta_id_pacienteId_key" ON "Consulta"("id", "pacienteId");

-- CreateIndex
CREATE INDEX "SolicitacaoExame_pacienteId_situacao_idx" ON "SolicitacaoExame"("pacienteId", "situacao");

-- CreateIndex
CREATE INDEX "ProcedimentoRealizado_data_idx" ON "ProcedimentoRealizado"("data");

-- CreateIndex
CREATE INDEX "Cobranca_emitidaEm_situacao_idx" ON "Cobranca"("emitidaEm", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "Cobranca_grupo_responsavel_key" ON "Cobranca"("grupo", "responsavel");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_chave_key" ON "Pagamento"("chave");

-- CreateIndex
CREATE INDEX "Pagamento_data_situacao_idx" ON "Pagamento"("data", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_profissionalId_key" ON "Usuario"("profissionalId");

-- CreateIndex
CREATE INDEX "Auditoria_data_idx" ON "Auditoria"("data");

-- AddForeignKey
ALTER TABLE "Prontuario" ADD CONSTRAINT "Prontuario_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteAlergia" ADD CONSTRAINT "PacienteAlergia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteAlergia" ADD CONSTRAINT "PacienteAlergia_alergiaId_fkey" FOREIGN KEY ("alergiaId") REFERENCES "Alergia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medico" ADD CONSTRAINT "Medico_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicoEspecialidade" ADD CONSTRAINT "MedicoEspecialidade_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Medico"("profissionalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicoEspecialidade" ADD CONSTRAINT "MedicoEspecialidade_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "Especialidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfissionalUnidade" ADD CONSTRAINT "ProfissionalUnidade_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfissionalUnidade" ADD CONSTRAINT "ProfissionalUnidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeEspecialidade" ADD CONSTRAINT "UnidadeEspecialidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeEspecialidade" ADD CONSTRAINT "UnidadeEspecialidade_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "Especialidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteConvenio" ADD CONSTRAINT "PacienteConvenio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteConvenio" ADD CONSTRAINT "PacienteConvenio_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "Convenio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Medico"("profissionalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "Especialidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_pacienteConvenioId_fkey" FOREIGN KEY ("pacienteConvenioId") REFERENCES "PacienteConvenio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Medico"("profissionalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "Especialidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoExame" ADD CONSTRAINT "SolicitacaoExame_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoExame" ADD CONSTRAINT "SolicitacaoExame_consultaId_pacienteId_fkey" FOREIGN KEY ("consultaId", "pacienteId") REFERENCES "Consulta"("id", "pacienteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoExame" ADD CONSTRAINT "SolicitacaoExame_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescricao" ADD CONSTRAINT "Prescricao_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPrescricao" ADD CONSTRAINT "ItemPrescricao_prescricaoId_fkey" FOREIGN KEY ("prescricaoId") REFERENCES "Prescricao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPrescricao" ADD CONSTRAINT "ItemPrescricao_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedimentoRealizado" ADD CONSTRAINT "ProcedimentoRealizado_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedimentoRealizado" ADD CONSTRAINT "ProcedimentoRealizado_procedimentoId_fkey" FOREIGN KEY ("procedimentoId") REFERENCES "Procedimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedimentoRealizado" ADD CONSTRAINT "ProcedimentoRealizado_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_procedimentoRealizadoId_fkey" FOREIGN KEY ("procedimentoRealizadoId") REFERENCES "ProcedimentoRealizado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_pacienteConvenioId_fkey" FOREIGN KEY ("pacienteConvenioId") REFERENCES "PacienteConvenio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_cobrancaId_fkey" FOREIGN KEY ("cobrancaId") REFERENCES "Cobranca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnotacaoEnfermagem" ADD CONSTRAINT "AnotacaoEnfermagem_prontuarioId_fkey" FOREIGN KEY ("prontuarioId") REFERENCES "Prontuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnotacaoEnfermagem" ADD CONSTRAINT "AnotacaoEnfermagem_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
