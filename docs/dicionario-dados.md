# Dicionário de dados e modelo relacional

Gerado de `prisma/schema.prisma` pelo comando `npm run docs`. Campos de navegação do ORM não são colunas. PKs inteiras são códigos sequenciais internos; não representam documentos civis. Não há exclusão física exposta pela API.

Tipos: `Int` → integer; `String` → text (salvo @db.VarChar); `DateTime` → timestamp(3), com @db.Date ou @db.Timestamptz quando indicado; `Decimal` → numeric(12,2); `Boolean` → boolean. Datas de nascimento, adesão e vencimento não representam instantes. Valores de atendimento são instantes UTC exibidos em America/Sao_Paulo.

## Paciente

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| cpf | @db.VarChar(11) | Não | UNIQUE |
| nome | String | Não | — |
| nascimento | @db.Date | Não | — |
| sexo | String | Não | — |
| telefone | String | Não | — |
| email | String | Não | — |
| endereco | String | Não | — |
| criadoEm | DateTime | Não | @default(now()) |

Chaves e índices: `@@index([nome])`.

## Prontuario

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| pacienteId | Int | Não | UNIQUE |
| criadoEm | DateTime | Não | @default(now()) |

FK: pacienteId → Paciente(id). Exclusão: Restrict.

## Alergia

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | UNIQUE |
| descricao | String | Não | — |

## PacienteAlergia

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| pacienteId | Int | Não | — |
| alergiaId | Int | Não | — |
| observacoes | String | Não | — |

Chaves e índices: `@@id([pacienteId, alergiaId])`.

FK: pacienteId → Paciente(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: alergiaId → Alergia(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Profissional

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | — |
| cpf | @db.VarChar(11) | Não | UNIQUE |
| telefone | String | Não | — |
| email | String | Não | — |
| nascimento | @db.Date | Não | — |
| registro | String | Não | — |

## Medico

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| profissionalId | Int | Não | PK |
| crm | String | Não | — |
| ufCrm | @db.VarChar(2) | Não | — |

Chaves e índices: `@@unique([crm, ufCrm])`.

FK: profissionalId → Profissional(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Especialidade

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | UNIQUE |
| descricao | String | Não | — |

## MedicoEspecialidade

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| medicoId | Int | Não | — |
| especialidadeId | Int | Não | — |

Chaves e índices: `@@id([medicoId, especialidadeId])`.

FK: medicoId → Medico(profissionalId). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: especialidadeId → Especialidade(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Unidade

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | — |
| endereco | String | Não | — |
| telefone | String | Não | — |
| horario | String | Não | — |

## ProfissionalUnidade

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| profissionalId | Int | Não | — |
| unidadeId | Int | Não | — |

Chaves e índices: `@@id([profissionalId, unidadeId])`.

FK: profissionalId → Profissional(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: unidadeId → Unidade(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## UnidadeEspecialidade

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| unidadeId | Int | Não | — |
| especialidadeId | Int | Não | — |

Chaves e índices: `@@id([unidadeId, especialidadeId])`.

FK: unidadeId → Unidade(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: especialidadeId → Especialidade(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Convenio

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | — |
| cnpj | @db.VarChar(14) | Não | UNIQUE |
| telefone | String | Não | — |

## PacienteConvenio

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| pacienteId | Int | Não | — |
| convenioId | Int | Não | — |
| carteirinha | String | Não | — |
| adesao | @db.Date | Não | — |
| ativo | Boolean | Não | @default(true) |

Chaves e índices: `@@unique([pacienteId, convenioId, carteirinha])`.

FK: pacienteId → Paciente(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: convenioId → Convenio(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Agendamento

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| pacienteId | Int | Não | — |
| medicoId | Int | Não | — |
| unidadeId | Int | Não | — |
| especialidadeId | Int | Não | — |
| pacienteConvenioId | Int | Sim | — |
| convenioHistorico | String | Sim | — |
| inicio | @db.Timestamptz(3) | Não | — |
| fim | @db.Timestamptz(3) | Não | — |
| situacao | SituacaoAgenda | Não | @default(AGENDADO) |
| observacoes | String | Não | @default("") |

Chaves e índices: `@@index([medicoId, inicio, fim])`, `@@index([pacienteId, inicio])`, `@@index([unidadeId, inicio])`.

FK: pacienteId → Paciente(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: medicoId → Medico(profissionalId). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: unidadeId → Unidade(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: especialidadeId → Especialidade(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: pacienteConvenioId → PacienteConvenio(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Consulta

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| agendamentoId | Int | Não | UNIQUE |
| pacienteId | Int | Não | — |
| medicoId | Int | Não | — |
| unidadeId | Int | Não | — |
| especialidadeId | Int | Não | — |
| data | @db.Timestamptz(3) | Não | @default(now()) |
| queixa | String | Não | — |
| observacoes | String | Não | — |
| diagnostico | String | Não | — |
| conduta | String | Não | — |

Chaves e índices: `@@unique([id, pacienteId])`, `@@index([data, unidadeId, especialidadeId])`.

FK: agendamentoId → Agendamento(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: pacienteId → Paciente(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: medicoId → Medico(profissionalId). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: unidadeId → Unidade(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: especialidadeId → Especialidade(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Exame

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | — |
| descricao | String | Não | — |
| tipo | String | Não | — |

## SolicitacaoExame

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| pacienteId | Int | Não | — |
| consultaId | Int | Não | — |
| exameId | Int | Não | — |
| solicitadoEm | @db.Timestamptz(3) | Não | @default(now()) |
| situacao | SituacaoExame | Não | @default(SOLICITADO) |
| realizadoEm | @db.Timestamptz(3) | Sim | — |
| resultado | String | Sim | — |

Chaves e índices: `@@index([pacienteId, situacao])`.

FK: pacienteId → Paciente(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: consultaId, pacienteId → Consulta(id, pacienteId). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: exameId → Exame(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Medicamento

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | — |
| principioAtivo | String | Não | — |
| fabricante | String | Não | — |
| apresentacao | String | Não | — |

## Prescricao

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| consultaId | Int | Não | — |
| data | DateTime | Não | @default(now()) |

FK: consultaId → Consulta(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## ItemPrescricao

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| prescricaoId | Int | Não | — |
| medicamentoId | Int | Não | — |
| quantidade | Int | Não | — |
| dose | String | Não | — |
| frequencia | String | Não | — |
| duracao | String | Não | — |
| observacoes | String | Não | — |

FK: prescricaoId → Prescricao(id). Exclusão: Cascade.

FK: medicamentoId → Medicamento(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Procedimento

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | — |
| descricao | String | Não | — |
| valorPadrao | @db.Decimal(12, 2) | Não | — |

## ProcedimentoRealizado

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| consultaId | Int | Não | — |
| procedimentoId | Int | Não | — |
| profissionalId | Int | Não | — |
| data | @db.Timestamptz(3) | Não | @default(now()) |
| valorCobrado | @db.Decimal(12, 2) | Não | — |

Chaves e índices: `@@index([data])`.

FK: consultaId → Consulta(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: procedimentoId → Procedimento(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: profissionalId → Profissional(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Cobranca

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| consultaId | Int | Não | — |
| procedimentoRealizadoId | Int | Sim | — |
| pacienteConvenioId | Int | Sim | — |
| grupo | String | Não | — |
| origem | String | Não | — |
| valor | @db.Decimal(12, 2) | Não | — |
| responsavel | Responsavel | Não | — |
| vencimento | @db.Date | Não | — |
| emitidaEm | @db.Timestamptz(3) | Não | @default(now()) |
| situacao | SituacaoCobranca | Não | @default(ABERTA) |

Chaves e índices: `@@unique([grupo, responsavel])`, `@@index([emitidaEm, situacao])`.

FK: consultaId → Consulta(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: procedimentoRealizadoId → ProcedimentoRealizado(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: pacienteConvenioId → PacienteConvenio(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Pagamento

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| cobrancaId | Int | Não | — |
| data | @db.Timestamptz(3) | Não | @default(now()) |
| valor | @db.Decimal(12, 2) | Não | — |
| forma | FormaPagamento | Não | — |
| situacao | SituacaoPagamento | Não | @default(RECEBIDO) |
| chave | String | Não | UNIQUE |

Chaves e índices: `@@index([data, situacao])`.

FK: cobrancaId → Cobranca(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Usuario

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| nome | String | Não | — |
| email | String | Não | UNIQUE |
| senhaHash | String | Não | — |
| perfil | Perfil | Não | — |
| ativo | Boolean | Não | @default(true) |
| profissionalId | Int | Sim | UNIQUE |

FK: profissionalId → Profissional(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Sessao

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | String | Não | PK |
| usuarioId | Int | Não | — |
| expiraEm | DateTime | Não | — |

FK: usuarioId → Usuario(id). Exclusão: Cascade.

## Auditoria

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| usuarioId | Int | Sim | — |
| acao | String | Não | — |
| recurso | String | Não | — |
| recursoId | String | Sim | — |
| data | DateTime | Não | @default(now()) |

Chaves e índices: `@@index([data])`.

FK: usuarioId → Usuario(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## AnotacaoEnfermagem

| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |
|---|---|---|---|
| id | Int | Não | PK; @default(autoincrement()) |
| prontuarioId | Int | Não | — |
| profissionalId | Int | Não | — |
| texto | String | Não | — |
| data | DateTime | Não | @default(now()) |

FK: prontuarioId → Prontuario(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

FK: profissionalId → Profissional(id). Exclusão: Restrict/SetNull conforme nulabilidade; consulte migration SQL.

## Restrições complementares

A migration 002 acrescenta exclusão GiST de intervalos ativos de um mesmo médico, duração positiva de até quatro horas, valores monetários positivos/não negativos, quantidade de itens positiva, pagador coerente com vínculo de convênio e resultado coerente com a situação do exame. Triggers diferidas exigem um prontuário por paciente, ao menos um item por prescrição, uma especialidade por médico e consulta coerente com seu agendamento. A FK composta de SolicitacaoExame garante o par consulta/paciente. O restante das regras, incluindo permissões, transições, repasses, parcelas e vínculos operacionais, está nos serviços transacionais da API.

Todas as operações financeiras e de agendamento usam isolamento Serializable com até três novas tentativas em P2034. O banco não é uma API pública; credenciais administrativas de demonstração não devem ser compartilhadas com usuários finais.
