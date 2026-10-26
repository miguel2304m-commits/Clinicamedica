# 3. Squads e aplicação do Scrum

Esta é uma **proposta acadêmica de organização**, sem atribuição de trabalho a pessoas reais e sem afirmação de que seis Sprints já ocorreram. A implementação entregue e as verificações presentes são fatos distintos do calendário planejado.

## Objetivo do produto

Ao fim do ciclo, demonstrar um atendimento completo em múltiplas unidades, com rastreabilidade clínica, proteção por perfil e conciliação de valores devidos/recebidos, usando exclusivamente dados fictícios.

## Responsabilidades formais

- **Product Owner (PO-01):** responsável por maximizar valor, explicitar objetivo do produto, ordenar e tornar transparente o Product Backlog, esclarecer regras com os interessados e avaliar o resultado nas Reviews. Não atribui tarefas diárias individuais.
- **Scrum Master (SM-01):** responsável pela eficácia da aplicação de Scrum, facilita compreensão dos eventos e compromissos, apoia a remoção de impedimentos e a autogestão, sem exercer papel de chefe técnico.
- **Developers:** responsáveis pelo Sprint Backlog, plano de trabalho, qualidade segundo a Definition of Done, adaptação diária e criação de um incremento utilizável.

Scrum usa essas três responsabilidades. As squads abaixo são uma divisão proposta de competências e foco do produto; “líder de squad”, front-end, UX ou DBA não se tornam responsabilidades formais adicionais do Scrum. Para o exercício, propõe-se um Scrum Team com um PO, um SM e seis Developers, organizados em três pares de foco. Os pares colaboram entre si, não são departamentos que transferem etapas sequenciais.

| Squad | Integrantes genéricos | Responsabilidades e colaboração |
|---|---|---|
| Atendimento e Cadastros | DEV-A1 e DEV-A2 | A1: React, UX e acessibilidade; A2: API, validações e cadastro relacional. Ambos: testes funcionais e integração de agenda. |
| Gestão Clínica | DEV-C1 e DEV-C2 | C1: experiência de prontuário/atendimento e testes de UI; C2: regras clínicas, modelagem e testes de integridade. Ambos: revisão de privacidade com A2. |
| Financeiro e Relatórios | DEV-F1 e DEV-F2 | F1: telas/relatórios, visualização e UX; F2: transações, decimais, banco e testes concorrentes. Ambos: integração e manutenção da documentação de cálculo. |

A competência em banco não é exclusiva: A2, C2 e F2 revisam migrations conjuntamente. UX é compartilhado por A1, C1 e F1. Todos escrevem testes daquilo que alteram, revisam outro módulo e mantêm documentação. O SM apoia a integração; o PO define prioridade de valor.

## Artefatos e compromissos

**Product Backlog:** histórias HU01–HU18, com prioridade, critérios e rastreabilidade. Compromisso: objetivo do produto. É ordenado e refinado continuamente.

**Sprint Backlog:** objetivo da Sprint, itens selecionados e plano dos Developers. As tabelas do cronograma representam a seleção inicial proposta; tarefas técnicas são decompostas durante Planning e adaptadas sem comprometer o objetivo.

**Incremento:** código integrado, banco migrável, interface utilizável, documentação coerente e evidências de teste. Compromisso: Definition of Done. Um item incompleto retorna ao Product Backlog, sem ser apresentado como concluído.

## Eventos propostos para Sprints de duas semanas

| Evento | Proposta acadêmica | Resultado esperado |
|---|---|---|
| Sprint Planning | Segunda inicial, até 4h | Definir por que a Sprint importa, o que cabe e como executar; explicitar dependências/capacidade. |
| Daily Scrum | Cada dia útil, 15min, Developers | Inspecionar avanço ao objetivo, adaptar o plano e identificar necessidade de colaboração. |
| Sprint Review | Última sexta útil, até 2h | Inspecionar incremento com PO e interessados, executar fluxo demonstrável e ajustar Product Backlog. |
| Sprint Retrospective | Após Review, até 90min | Identificar melhoria de eficácia/qualidade e selecionar uma ação para a próxima Sprint. |
| Refinamento | Atividade contínua, não evento formal adicional | Dividir histórias, esclarecer aceite, estimar e reduzir incertezas. |

As durações acima são escolhas deste projeto para Sprints de duas semanas. Feriados, recessos e disponibilidade devem reduzir capacidade planejada, sobretudo nas Sprints 5 e 6, sem inventar entregas realizadas.

## Definition of Done

1. Critérios da história exercitados com dados fictícios e evidências registradas.
2. Interface e API integradas; persistência e regras críticas também no servidor.
3. Rotas com autenticação, autorização e validação adequadas; auditoria quando aplicável.
4. Migração aplicável em banco vazio e sem modificação retroativa de migrations entregues.
5. `npm run build` e testes relevantes aprovados; falhas novas resolvidas.
6. Sem segredos reais versionados; tratamento explícito dos achados de dependências.
7. Estados de carregamento, erro e vazio; rótulos e foco; revisão em desktop e celular.
8. API, dicionário, diagramas e matriz atualizados junto do código.
9. Revisão por outro Developer proposta para o trabalho em equipe; nesta entrega individual, não é simulada como se tivesse acontecido.
10. Limites de homologação registrados. Metas operacionais não medidas não recebem aprovação fictícia.

Referência de responsabilidades, artefatos e eventos: [Guia oficial do Scrum](https://scrumguides.org/download.html). A composição, duração dos encontros, backlog, calendário e DoD acima são propostas específicas deste projeto acadêmico.
