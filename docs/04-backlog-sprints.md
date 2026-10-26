# 4. Product Backlog, histórias e cronograma

Planejamento acadêmico: seis Sprints de **14 dias corridos**, início na segunda e término inclusivo no domingo, de 26/10/2026 a 17/01/2027. As datas não são um histórico de entregas. Pontos são estimativas relativas propostas e devem ser ajustados com a equipe.

## Product Backlog ordenado

| HU | História de usuário | Critérios verificáveis | Prioridade / pontos | RF |
|---|---|---|---|---|
| HU01 | Como usuário, quero entrar com minha conta para acessar apenas minha função. | Credencial correta cria sessão; inválida retorna 401; sem sessão retorna 401; logout invalida token. | P0 / 5 | RF01 |
| HU02 | Como recepcionista, quero cadastrar pacientes para identificá-los sem duplicação. | Campos obrigatórios validados; CPF inválido/duplicado recusado; transação cria um prontuário; pesquisa/paginação retornam registros. | P0 / 5 | RF02 |
| HU03 | Como administrador, quero cadastrar profissionais para organizar a equipe. | Dados comuns só em Profissional; médico exige CRM/UF/especialidade; unidades N:N; conta não criada implicitamente. | P0 / 5 | RF03 |
| HU04 | Como administrador, quero definir unidades e especialidades para consultar a oferta. | Unidade admite múltiplas especialidades; listagem mostra profissionais; seed inclui as seis solicitadas. | P0 / 3 | RF04 |
| HU05 | Como recepcionista, quero vincular convênios para registrar a forma de atendimento. | Vários vínculos por paciente com carteirinha/adesão; inativação preserva agendamentos antigos; vínculo alheio recusado. | P0 / 5 | RF05 |
| HU06 | Como recepcionista, quero agendar com duração definida para evitar conflito. | Sobreposição entre unidades recusada; horários adjacentes aceitos; dois pedidos simultâneos não reservam o mesmo intervalo. | P0 / 8 | RF06 |
| HU07 | Como recepcionista, quero acompanhar a situação para organizar comparecimentos. | Confirmar/reagendar/cancelar funcionam; ausência antes do fim recusada; estados terminais não reabrem. | P0 / 5 | RF07 |
| HU08 | Como médico, quero registrar a consulta efetiva para documentar o atendimento. | Somente responsável; origem válida; paciente/unidade/especialidade derivados; gravação e REALIZADO atômicos; repetição não duplica. | P0 / 8 | RF08 |
| HU09 | Como médico, quero solicitar e acompanhar exames para registrar sua evolução. | Mesmo exame pode se repetir; paciente divergente rejeitado; cancelado fora dos pendentes; realizado exige data/resultado. | P0 / 5 | RF09 |
| HU10 | Como médico, quero prescrever itens com instruções específicas por medicamento. | Prescrição vazia recusada; duas linhas persistem com todos os campos; consulta de origem preservada. | P0 / 5 | RF10 |
| HU11 | Como médico, quero registrar procedimentos executados e seus valores. | Responsável atua na unidade; valor efetivo permanece após editar catálogo; relatório filtra data da realização. | P0 / 5 | RF11 |
| HU12 | Como financeiro, quero emitir cobranças por pagador para separar responsabilidades. | Total 300 e cobertura 200 gera cobranças 100/200, sem pagamento automático; cobertura acima do total recusada. | P0 / 8 | RF12 |
| HU13 | Como financeiro, quero receber parcelas e repasses para calcular saldos. | Receber 40,10 de 100 deixa 59,90; repetir chave não duplica; excesso recusado; estorno reabre saldo; repasse identificado. | P0 / 8 | RF13 |
| HU14 | Como gestor, quero analisar resultados por período e dimensão. | Faturamento por emissão e recebimento por pagamento; filtros combináveis; consultas/procedimentos por realização; pendências por pagador; CSV. | P1 / 8 | RF14 |
| HU15 | Como usuário, quero navegar em desktop/celular e receber mensagens claras. | Agenda dia/semana; busca/paginação; abas por permissão; erros visíveis; modal operável por teclado; sem overflow global a 390px. | P0 / 5 | RF15 |
| HU16 | Como administrador, quero rastrear acessos e alterações para prestar contas. | Ação identificada com data/usuário/recurso; leitura clínica auditada; nenhum conteúdo de prontuário no log. | P0 / 5 | RF16 |
| HU17 | Como avaliador, quero reproduzir e rastrear a entrega acadêmica. | Manual em banco vazio; diagramas e schema consistentes; seis datas exatas; testes e limitações reais registrados. | P1 / 5 | RF17 |
| HU18 | Como equipe clínica, quero registrar alergias e anotações necessárias ao cuidado. | Paciente pode ter várias alergias, compartilhadas com outros pacientes; profissional de outra unidade não lê; nota identifica autor/data. | P0 / 5 | RF18 |

## Calendário e Sprint Backlogs propostos

### Sprint 1 — 26/10/2026 a 08/11/2026

- **Objetivo:** estabelecer acesso individual e base de cadastros multiunidade.
- **Seleção:** RF01–RF04; HU01–HU04. Iniciar RF17/HU17 com repositório, arquitetura e modelo.
- **Responsável:** Atendimento e Cadastros; apoio das demais squads na revisão do banco e permissões.
- **Dependências:** decisões de stack, identidade e campos; nenhuma Sprint anterior.
- **Plano técnico:** migrations iniciais, seed, sessão, guardas, pacientes/prontuário, profissionais/especialidades/unidades e telas de cadastro.
- **Entregáveis:** login e quatro módulos conectados ao banco; schema e diagrama inicial.
- **Aceite:** CPF duplicado rejeitado; paciente com um prontuário; médico com especialidade e CRM; administrador sem leitura clínica.
- **Validação prevista:** testes de criação/integridade/acesso; instalação em banco limpo; Review com navegação nos cadastros.

### Sprint 2 — 09/11/2026 a 22/11/2026

- **Objetivo:** disponibilizar uma agenda consistente com convênios e comparecimento.
- **Seleção:** RF05–RF07 e parte RF15; HU05–HU07 e agenda de HU15.
- **Responsável:** Atendimento e Cadastros; Gestão Clínica revisa vínculo e passagem ao atendimento.
- **Dependências:** pacientes, médicos, unidades e especialidades da Sprint 1.
- **Plano técnico:** associação de convênio, snapshot histórico, agenda com intervalo, índices/exclusão, transições e visão dia/semana.
- **Entregáveis:** vínculo do paciente, agendamento, confirmação, reagendamento, cancelamento e ausência.
- **Aceite:** conflito entre unidades bloqueado; horário adjacente permitido; ausência antes do fim bloqueada; vínculo de outro paciente recusado.
- **Validação prevista:** testes de sobreposição e concorrência; Review do ciclo de agenda e filtros.

### Sprint 3 — 23/11/2026 a 06/12/2026

- **Objetivo:** documentar atendimentos reais com prontuário protegido e exames.
- **Seleção:** RF08, RF09, RF18 e parte RF16; HU08, HU09, HU18 e auditoria de HU16.
- **Responsável:** Gestão Clínica; Atendimento e Cadastros apoia integração da agenda.
- **Dependências:** agenda e perfis das Sprints 1–2.
- **Plano técnico:** consulta atômica, histórico por paciente, alergias/anotações, catálogo/solicitação de exames, estados e resultado, escopo por profissional/unidade.
- **Entregáveis:** tela médica, prontuário e exames integrados; logs de leitura.
- **Aceite:** cancelado não gera consulta; duplicação recusada; paciente de exame consistente; enfermagem sem diagnóstico/resultados; cancelado não é pendente.
- **Validação prevista:** testes negativos da API, FKs compostas, cenários com dois médicos e enfermagem; Review com contas distintas.

### Sprint 4 — 07/12/2026 a 20/12/2026

- **Objetivo:** completar os atos clínicos com prescrições e procedimentos históricos.
- **Seleção:** RF10, RF11; HU10, HU11; continuidade de HU15/HU16.
- **Responsável:** Gestão Clínica; Financeiro e Relatórios define contrato de origem das cobranças.
- **Dependências:** consultas e segurança da Sprint 3.
- **Plano técnico:** catálogos, ItemPrescricao, itens múltiplos, realização de procedimento com valor próprio e autor; abas do paciente.
- **Entregáveis:** prescrição de vários medicamentos, procedimentos registrados e histórico navegável.
- **Aceite:** prescrição vazia impossível; preço padrão novo não muda histórico; profissional deve atuar na unidade; só médico da consulta registra.
- **Validação prevista:** testes relacionais e de preço; teste de formulário com dois itens; Review de atendimento completo sem financeiro.

### Sprint 5 — 21/12/2026 a 03/01/2027

- **Objetivo:** controlar valores devidos e recebidos sem duplicação de cobertura.
- **Seleção:** RF12, RF13; HU12, HU13.
- **Responsável:** Financeiro e Relatórios; Gestão Clínica apoia conciliação das origens.
- **Dependências:** consulta e procedimento das Sprints 3–4; vínculo histórico de convênio da Sprint 2.
- **Plano técnico:** cobranças por pagador, valores Decimal, pagamentos parciais, chave idempotente, estorno, cancelamento e concorrência.
- **Entregáveis:** emissão de cobrança, recebimento por forma, repasse e saldo.
- **Aceite:** divisão 100/200 conserva total 300; cobertura não entra como recebido; excesso e corrida de pagamentos recusados; estorno recalcula estado.
- **Validação prevista:** teste numérico exato e concorrência; Review com parcelas e repasse. Capacidade reduzida pelo recesso deve ser negociada; calendário permanece proposta acadêmica.

### Sprint 6 — 04/01/2027 a 17/01/2027

- **Objetivo:** integrar indicadores, validar a experiência e consolidar a entrega rastreável.
- **Seleção:** RF14–RF17; HU14–HU17, regressão de todas as histórias.
- **Responsável:** Financeiro e Relatórios coordena indicadores; todas as squads concluem UI, documentação e testes.
- **Dependências:** módulos e dados das Sprints anteriores.
- **Plano técnico:** filtros e agrupamentos, CSV, dashboard, revisão de permissões, responsividade, diagramas completos, manual e evidências.
- **Entregáveis:** relatórios, auditoria administrativa, UML/DER/dicionário, documentação REST, matriz, roteiro e relatório de testes.
- **Aceite:** indicadores calculados sem duplicação; build e testes principais passam; execução reproduzível; limitações identificadas; sem declaração de validação não executada.
- **Validação prevista:** regressão API, navegador desktop/celular, auditoria de dependências, revisão cruzada de documentação e demonstração final.

## Riscos do planejamento

As estimativas não são promessa de velocidade. Recessos, indisponibilidade de especialistas e exigências de privacidade podem reduzir capacidade. O PO reordena backlog, e os Developers renegociam escopo sem alterar o objetivo da Sprint unilateralmente. Não existe histórico simulado de burndown, Daily ou aprovação do PO nesta entrega.
