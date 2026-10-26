# 1. Visão geral e decisões de escopo

## Objetivo

Centralizar o atendimento de uma clínica particular com múltiplas unidades. O fluxo demonstrável é paciente → vínculo de convênio → agendamento → consulta → exames/prescrições/procedimentos → cobranças por pagador → pagamentos parciais → relatórios. Todos os módulos persistem no mesmo banco relacional.

## Tecnologias e organização

| Camada | Implementação |
|---|---|
| Interface | React 19, TypeScript, Vite, CSS responsivo, ícones Lucide, fontes locais |
| API | Node.js, Express 5, validação Zod, JSON REST |
| Persistência | PostgreSQL 17, Prisma 6.19, migrations versionadas |
| Autenticação | Senha bcrypt custo 12; sessão opaca, hash SHA-256 do token no banco; cookie HttpOnly/SameSite |
| Integridade | FKs, índices únicos, checks, triggers diferidas, exclusão GiST e transações Serializable |
| Testes | Node test runner, Supertest, Playwright com Microsoft Edge |

O uso de Prisma 6.19 é uma decisão de reprodutibilidade, com versões fixas e lockfile. As dependências transitivas `effect` e `deepmerge-ts` receberam overrides para versões corrigidas; geração, migrations, compilação e testes foram executados com eles. O PostgreSQL incorporado é apenas um lançador de binários locais, não um substituto de banco nem uma emulação em memória. Alternativamente, `compose.yaml` usa PostgreSQL 17.

## Origem das decisões

**Expressos no enunciado:** stack preferencial, cinco perfis, multiunidade, cardinalidades, ciclos de agenda/exames, financeiro separado, interface, documentação, UML e seis Sprints.

**Complementares adotados para viabilização:**

- D01: instantes armazenados em UTC e apresentados em America/Sao_Paulo; campos de data civil sem fuso. A UI acrescenta o deslocamento de Brasília ao horário digitado.
- D02: intervalo do atendimento fechado no início e aberto no fim, com duração entre 1 milissegundo e quatro horas. O horário da unidade é informativo; feriados e escalas individuais não foram definidos no enunciado e não bloqueiam a agenda.
- D03: só o médico responsável registra uma consulta e seus atos; outros médicos vinculados ao paciente podem ler o histórico completo para continuidade. O vínculo de atendimento pode ser passado ou futuro ativo; esse critério deve ser revisto antes do uso real.
- D04: enfermagem e profissionais de apoio usam o perfil ENFERMAGEM, limitado a pacientes atendidos nas unidades do profissional. Podem registrar alergias/anotações e agendar exames. Não acessam diagnósticos, resultados ou prescrições.
- D05: situações terminais não reabrem. Novo atendimento exige novo agendamento. Reagendar um atendimento confirmado retorna a AGENDADO. Ausência só depois do fim previsto; consulta não pode ocorrer antes do início.
- D06: conta de usuário e profissional são entidades separadas. Médicos exigem CRM/UF e especialidade; contas clínicas exigem vínculo profissional. Perfis são fixos no código; o administrador atribui o perfil, ativa/desativa a conta e troca sua senha. Não há editor de permissões arbitrárias.
- D07: prescrições e consultas são registros preservados, sem edição destrutiva após gravação. Retificações clínicas assinadas e cancelamento de prescrição não fazem parte desta versão.
- D08: cada pagamento liquida uma única cobrança. Um pagamento para múltiplas cobranças deve ser registrado em parcelas distintas. Estorno é integral por pagamento; um novo pagamento pode registrar o valor correto.
- D09: uma emissão cria uma cobrança do paciente e/ou uma do convênio. A soma é o valor total informado. O vínculo original permanece no agendamento junto de um texto histórico de nome/carteirinha.
- D10: preços de catálogo não criam faturamento automaticamente. Uma realização guarda o preço efetivo; o financeiro emite sua cobrança, com proteção contra duplicar a cobrança do mesmo procedimento ativo.
- D11: não há exclusão física na API. Catálogos podem ser editados; inativação está disponível para contas e vínculos de convênio. Os valores monetários históricos são imutáveis pelas rotas existentes.
- D12: API de listagem paginada; listas de seleção percorrem páginas de até 100 registros. Relatórios aceitam até 366 dias e agenda até 93 dias por consulta. Para grandes volumes, seleção remota por busca pode reduzir o carregamento inicial das opções.
- D13: publicação pública e serviços externos não integram esta entrega local. Apenas registros fictícios foram utilizados.

## Indicadores financeiros

Faturamento = soma de cobranças não canceladas emitidas no período. Cobertura prevista = subconjunto das cobranças cujo responsável é CONVENIO. Não se soma cobertura ao faturamento novamente. Recebimentos = pagamentos RECEBIDO pela data de recebimento; valores ESTORNADO não entram. Repasse = subconjunto de recebimentos pela forma CONVENIO. Saldo em aberto = valor das cobranças do período menos seus pagamentos atualmente recebidos, mesmo que o pagamento tenha ocorrido depois do período. Assim, faturamento − recebimentos do período não é necessariamente o saldo.

O relatório agrupa faturamento pelos vínculos de médico, unidade e especialidade da consulta. Consultas são contadas pela sua data de realização. Procedimentos são filtrados pela data da realização e mostram o valor efetivo, que só integra o faturamento quando cobrado. Dívidas do convênio e do paciente são exibidas separadamente.

## Referências técnicas

O isolamento e as novas tentativas seguem os recursos documentados para [transações do Prisma 6](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions). O lançador local utiliza o projeto [embedded-postgres](https://github.com/leinelissen/embedded-postgres). As restrições e o domínio específico da clínica são decisões desta implementação.

