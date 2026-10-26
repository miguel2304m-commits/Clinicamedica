# 11. Matriz final de rastreabilidade e cobertura

Estado **I** = implementado em código. **T** = há evidência automatizada específica; não significa cobertura exaustiva. **D** = documentação produzida/revisada. Sprints são o planejamento de alocação, não datas de entrega realizadas. Arquivos de teste/evidências estão em [Testes](09-testes.md).

| Requisito | Regras | História | Casos de uso | Entidades principais | Sprint | Implementação/evidência | Estado |
|---|---|---|---|---|---|---|---|
| RF01 Acesso | RN03, RN14, RN18 | HU01 | UC01, UC17 | Usuario, Sessao, Profissional | 1, 6 | auth/app/cadastros; testes 401/403, revogação, outro médico; login UI | I/T |
| RF02 Pacientes | RN01 | HU02 | UC02, UC22, UC26 | Paciente, Prontuario | 1 | cadastros; CPF, prontuário único; criação UI | I/T |
| RF03 Profissionais | RN02–RN04 | HU03 | UC03 | Profissional, Medico, MedicoEspecialidade, ProfissionalUnidade | 1 | cadastros/schema; médico sem especialidade e vínculos de agenda testados | I/T |
| RF04 Oferta | RN02, RN04 | HU04 | UC03 | Unidade, Especialidade, UnidadeEspecialidade | 1 | cadastros/seed; seis especialidades; vínculos em testes de agenda | I/T |
| RF05 Convênios | RN06, RN16 | HU05 | UC04 | Convenio, PacienteConvenio, Agendamento | 2 | cadastros/agenda; paciente divergente e histórico após desativação | I/T |
| RF06 Agenda | RN04–RN06 | HU06 | UC05, UC20, UC21 | Agendamento e vínculos | 2 | agenda; concorrência, adjacência e conflito; UI dia/semana | I/T |
| RF07 Situações | RN07 | HU07 | UC06, UC25 | Agendamento | 2 | agenda; reagendamento, cancelado, ausência futura/terminal | I/T |
| RF08 Consulta | RN08, RN14, RN17 | HU08 | UC07, UC08 | Consulta, Agendamento, Paciente, Medico | 3 | agenda/clinica; origem inválida, duplicação, proprietário | I/T |
| RF09 Exames | RN09, RN10, RN14 | HU09 | UC09, UC10 | Exame, SolicitacaoExame | 3 | clinica; divergência na API/FK, repetição, cancelado/pendente, resultado | I/T |
| RF10 Prescrição | RN11, RN14 | HU10 | UC11, UC19 | Medicamento, Prescricao, ItemPrescricao | 4 | clinica; lista vazia/múltipla, trigger; dois itens pela UI | I/T |
| RF11 Procedimentos | RN11, RN16 | HU11 | UC12, UC19 | Procedimento, ProcedimentoRealizado, Profissional | 4 | clinica/financeiro; preço histórico testado; relatório implementado | I/T |
| RF12 Cobrança | RN12, RN15, RN16 | HU12 | UC14, UC24 | Cobranca, Consulta, PacienteConvenio | 5 | financeiro; divisão, excesso e idempotência testados | I/T |
| RF13 Pagamento | RN13, RN15–RN17 | HU13 | UC15, UC23 | Pagamento, Cobranca | 5 | financeiro; parcial, concorrência, excesso, repasse e estorno | I/T |
| RF14 Indicadores | RN15 | HU14 | UC16 | Consulta, Cobranca, Pagamento, ProcedimentoRealizado | 6 | dashboard/relatórios; valores conferidos, CSV no navegador | I/T |
| RF15 Interface | RN14 | HU15 | UC01–UC20, UC25–UC26 | Dados dos módulos conforme perfil | 2–6 | Sete fluxos de navegador e verificação axe-core; 390/1440px | I/T; acessibilidade integral não homologada |
| RF16 Auditoria | RN17 | HU16 | UC18 | Auditoria, Usuario | 3, 6 | auth/cadastros; leitura auditada testada | I/T |
| RF17 Entrega | Todas | HU17 | Todos | Todas as 28 entidades | 1, 6 | README, docs, schema, migrations, .env.example, testes, diagramas SVG/PlantUML | D/T build/modelos |
| RF18 Prontuário/alergia | RN01, RN14, RN17 | HU18 | UC08, UC13 | Prontuario, Alergia, PacienteAlergia, AnotacaoEnfermagem | 3 | clinica; acesso por unidade testado; registro de nota/alergia implementado | I/T parcial |

## Rastreabilidade dos RNFs

| RNF | Onde atendido | Verificação/limite | Sprint |
|---|---|---|---|
| RNF01 Segurança | app/auth, Usuario/Sessao | Autenticação, CSRF e revogação testados; limitador por processo | 1, 6 |
| RNF02 Acesso | auth e guardas de todos os módulos | Testes negativos de perfil/paciente/unidade | 1–6 |
| RNF03 Privacidade | respostas com selects, auditoria sem payload, fontes locais | Inspeção e teste de resultado oculto; governança pendente | 1–6 |
| RNF04 Auditoria | auditar e transações | Leitura clínica e mutações; não WORM | 3, 6 |
| RNF05 Desempenho | índices, paginação e limites de período | Meta de carga não medida | 6 |
| RNF06 Acessibilidade | elementos semânticos, rótulos, foco, dialog, aria-live | Fluxos de navegador; homologação integral pendente | 2–6 |
| RNF07 Responsividade | CSS, rolagem de tabelas/semana | 390px e 1440px verificados | 6 |
| RNF08 Integridade | migrations, transacao, validação | Concorrência, FK, únicos e triggers testados | 1–6 |
| RNF09 Backup | procedimento em 07-banco | Operação externa/restauração completa pendentes | 6 |
| RNF10 Manutenção | módulos, lockfile, build, scripts docs/testes | Build, geração e testes executados | 1–6 |
| RNF11 Disponibilidade | /api/saude | Endpoint implementado; SLA/monitoramento não implantados | 6 |
| RNF12 LGPD | requisitos e matriz de acesso | Processo jurídico/organizacional não realizado | 1, 6 |

## Cobertura dos itens do enunciado

| Item original | Local da entrega |
|---|---|
| 1 Objetivo/tecnologias | 01-visao-geral, package.json, código |
| 2 Perfis | 02-requisitos, auth.ts, testes |
| 3 Cadastros/relacionamentos | cadastros.ts, schema, UI, dicionário |
| 4 Agendamentos/consultas | agenda.ts, UI de agenda/atendimento, RN04–RN08 |
| 5 Exames | clinica.ts, Exame/SolicitacaoExame, UI Exames |
| 6 Medicamentos/prescrição | catálogo, Prescricao/ItemPrescricao, UI da consulta |
| 7 Procedimentos | catálogo/realização, valores históricos, relatório |
| 8 Financeiro | financeiro.ts, UI, critérios de cálculo em 01/08 |
| 9 Interface | client/, capturas e script de navegador |
| 10 Requisitos/histórias/matriz | 02, 04 e este documento |
| 11 Scrum | 03 e 04, seis períodos exatos |
| 12 Casos de uso | 05, PlantUML e SVG |
| 13 Classes | 06, fonte completa, SVG e geração do schema |
| 14 Banco/implementação/testes | 07–10, migrations, seed, .env.example |
| 15 Organização final | README e documentos 01–11 |

## Pendências explicitamente preservadas

Não há módulo principal entregue apenas como tela estática. Permanecem pendentes de homologação operacional os RNFs de carga, backup, disponibilidade, acessibilidade integral e governança legal. Integrações reais, anexos, assinatura digital, faturamento fiscal, comunicação automática, permissões arbitrárias editáveis e fechamento contábil histórico não foram implementados e estão identificados como limites/decisões complementares, sem serem apresentados como requisitos concluídos do núcleo.
