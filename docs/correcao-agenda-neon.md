# Correção da Agenda na Neon/Vercel

## Causa confirmada

O diagnóstico somente de leitura na Neon encontrou `Agendamento` existente e `AgendamentoLivre` ausente. As migrations 001 e 002 estavam concluídas, mas a 003 não havia sido aplicada. A consulta de agenda vinculada funcionava; `prisma.agendamentoLivre.findMany()` retornava **P2021**. Para administradores, GET `/api/agendamentos` consulta as duas tabelas, por isso falhava. O middleware convertia códigos Prisma não previstos em um HTTP 422 genérico, ocultando o problema de schema.

A migration existente **202610260003_agendamento_livre foi aplicada com sucesso ao banco Neon configurado**. Ela somente adiciona a tabela de reservas, índices e restrições. Não foi executado seed, reset, truncate ou exclusão no banco publicado. Não há nova migration criada para esta correção.

## Correções de código

- `server/app.ts`: P2021/P2022 agora retornam HTTP 503, código do erro e orientação sobre migrations; erros inesperados de banco retornam 500. Logs incluem somente o código Prisma, sem URL ou conteúdo de registros.
- `client/agenda.tsx`: os quatro conjuntos de opções são buscados novamente e aguardados ao abrir Novo agendamento. Preserva texto livre e o fluxo vinculado.
- `client/cadastros.tsx`: aguarda especialidades/unidades atualizadas antes de abrir formulários que usam esses vínculos.
- `client/lib.tsx`: dados da resposta ficam associados à URL e à versão da consulta. Corrige o travamento ao trocar de Unidades para Profissionais, quando a tela tentava interpretar registros da aba anterior como profissionais.
- `tests/regras.test.ts`: regressões de parâmetros, tabela ausente e erro 503; remove limpeza de dados e obriga banco local/schema vazio.
- `scripts/testar-local.mjs`, `scripts/servidor-teste.mjs`, `package.json`: testes usam somente PostgreSQL local e um schema novo por execução; não apontam para a Neon nem apagam schemas anteriores. `npm test` usa esse executor seguro.

## Novos scripts

- `scripts/diagnosticar-banco.mjs`: inspeciona existência de tabelas, migrations e consultas Prisma; somente leitura, sem imprimir credenciais ou registros pessoais.
- `scripts/verificar-agenda-neon.ts`: verifica a mesma rota Express usando dados Neon, com intervalo, situação e unidade; somente leitura. É uma verificação interna da rota, não uma chamada ao domínio público da Vercel.
- `scripts/verificar-cadastros-agenda.mjs`: cria especialidade, unidade, médico e paciente pela interface no servidor local de testes; verifica sugestões, agendamento vinculado, persistência e listagem após recarregar.

## Resultado verificado

- Após a migration, as duas consultas Prisma na Neon passaram.
- GET `/api/agendamentos` com Neon respondeu 200 sem filtros opcionais, com situação e com unidade.
- Parâmetros `inicio`, `fim`, `unidadeId` e `situacao` válidos passaram; data inválida, intervalo invertido/excessivo, ID inválido e situação inválida retornaram 422 de validação. Eles não eram a causa do erro de banco observado.
- **37 testes de API aprovados** em schema novo local, com dados existentes preservados.
- **8 verificações do roteiro de navegador aprovadas**, além do novo fluxo completo de quatro cadastros → opções → criação/listagem de agendamento.
- **Build aprovado**.

Arquivos de evidência atualizados pelo roteiro: `docs/evidencias/agenda.png`, `interface.json`, `mobile.png`, `prontuario.png` e `relatorios.png`; demais capturas podem permanecer idênticas. README atualizado com o procedimento de testes seguro e este relatório.

## Publicação

No banco Neon verificado, a migration 003 já está aplicada; não precisa reaplicá-la manualmente. Em outro banco/ambiente, executar `npm run db:migrate` antes de publicar esta versão. É necessário enviar o código alterado e fazer novo deploy na Vercel para disponibilizar as correções de interface e mensagens. Este trabalho não realizou push nem deploy na Vercel.

Para testar sem afetar produção: iniciar `npm run db:local`, executar `npm test`, iniciar `node scripts/servidor-teste.mjs` e rodar os scripts de navegador. Os schemas locais gerados são conservados; as fixtures são inseridas apenas em schema vazio.
