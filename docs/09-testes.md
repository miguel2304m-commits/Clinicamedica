# 9. Testes e resultados efetivamente verificados

Verificação em **26/10/2026**, ambiente Windows x64, Node 24.14.0, PostgreSQL 17.6 local, Prisma 6.19 e Microsoft Edge via Playwright. Dados exclusivamente fictícios. O calendário Scrum é planejamento; os testes abaixo foram realmente executados nesta entrega.

## Resultado da API e banco

**33 testes aprovados, zero falhas**, executados por `npm test` em banco isolado `clinica_test`, com migrations reais e fixtures. Evidência integral: [testes-api.txt](evidencias/testes-api.txt). Fonte: [regras.test.ts](../tests/regras.test.ts).

| Grupo | Verificações realizadas |
|---|---|
| Autenticação/CSRF | Sem sessão 401; mutação sem cabeçalho 403; origem externa 403. |
| Paciente | CPF duplicado 409; CPF inválido/nascimento futuro 422; um prontuário; banco recusa paciente sem prontuário. |
| Agenda | Criação válida; conflito em outra unidade; duas reservas concorrentes; horários adjacentes; vínculo inválido; médico sem unidade; reagendamento retorna a AGENDADO. |
| Consulta | Cancelado/não comparecimento não geram consulta; responsável cria; duplicação recusada; realizado não cancela; ausência futura recusada. |
| Exame | Paciente divergente recusado na API e na FK; repetição de catálogo permitida; cancelado fora de pendentes; resultado/data obrigatórios; enfermagem não recebe resultado. |
| Prescrição/procedimento | Lista vazia recusada; múltiplos itens persistem; banco recusa prescrição sem itens e médico sem especialidade; preço realizado preservado após alterar catálogo. |
| Cobrança | Divisão 100/200 soma 300 sem recebimento automático; cobertura excessiva recusada; mesma chave não duplica; chave com total diferente retorna conflito. |
| Pagamento | Parcela exata com centavos; idempotência; excesso; corrida de pagamentos; forma de repasse; quitação; estorno reabre saldo. |
| Permissões | Admin/recepção/financeiro sem prontuário; outro médico não escreve; enfermagem sem histórico completo e restrita às unidades; sessões revogadas ao alterar conta; auto-rebaixamento bloqueado. |
| Relatórios | Valores de faturamento, cobertura, recebido, repasse e saldo conferidos com cenário conhecido, sem duplicação. |
| Histórico/auditoria | Vínculo de convênio desativado preserva snapshot; leitura clínica gera log sem diagnóstico. |

Os testes de concorrência enviam duas requisições independentes simultâneas. Eles são relevantes porque verificações feitas só na interface ou fora da transação não garantiriam esses resultados.

## Navegador

Roteiro automatizado: [verificar-interface.mjs](../scripts/verificar-interface.mjs). Resultados: [interface.json](evidencias/interface.json).

Fluxos verificados: login/dashboard; agenda diária/semanal; pesquisa e ausência de aba clínica para administrador; criação real de paciente; relatório e download CSV; prescrição com dois itens pela interface médica; navegação responsiva a 390px. Nenhum erro JavaScript de página foi observado nesse roteiro.

Uma oitava verificação executou axe-core no dashboard: **zero violações automáticas**, 14 verificações aprovadas e uma categoria de contraste marcada como inconclusiva, que exige avaliação manual. Os problemas de contraste inicialmente detectados foram corrigidos. Evidência: [acessibilidade.json](evidencias/acessibilidade.json). Esse resultado limitado ao dashboard não certifica a acessibilidade de todas as telas.

Capturas: [dashboard](evidencias/dashboard.png), [agenda](evidencias/agenda.png), [relatórios](evidencias/relatorios.png), [prescrições](evidencias/prontuario.png), [celular](evidencias/mobile.png). As capturas usam o **banco de testes**, com lançamentos adicionais, e portanto não têm necessariamente os mesmos totais do seed de demonstração.

## Build, dependências e modelos

- `npm run build`: TypeScript sem erros e bundle Vite produzido.
- `prisma validate` e `prisma generate`: schema válido e cliente gerado.
- `prisma migrate deploy`: aplicado em banco novo, incluindo extensão e restrições.
- `npm run docs`: 28 modelos e 7 enumerações documentados a partir do schema.
- PlantUML: três fontes renderizadas em SVG com Java/PlantUML, sem erro de sintaxe.
- `npm audit`: zero vulnerabilidades reportadas no conjunto instalado no momento da verificação; isso não é garantia permanente. Evidência: [auditoria-dependencias.txt](evidencias/auditoria-dependencias.txt).

## O que não foi verificado ou homologado

- Não foi medido p95 com 10 mil pacientes, 10 usuários concorrentes ou infraestrutura de produção.
- Não foi realizado ensaio operacional completo de backup/restauração cifrada, RPO/RTO, indisponibilidade ou failover.
- Não houve auditoria integral com leitor de tela nem certificação WCAG. Recursos semânticos/responsivos foram implementados; acessibilidade completa continua sujeita à homologação.
- Não foram testadas integrações com operadoras, laboratórios ou sistemas fiscais, pois não existem nesta versão.
- Não há prova de conformidade LGPD, análise jurídica, pentest independente ou trilha WORM.
- Não foram executadas Sprints reais de duas semanas, Review com participantes reais ou revisão independente de outro Developer. Esses elementos são proposta acadêmica.

A cobertura foi escolhida pelas regras de maior risco; não foi calculado percentual de cobertura de linhas. Uma linha da matriz marcada “implementado” não significa que cada combinação de campos e cada navegador tenha sido testado.
