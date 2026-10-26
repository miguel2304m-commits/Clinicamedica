# 7. Modelagem do banco

Arquivos canônicos: [schema Prisma](../prisma/schema.prisma), [migration inicial](../prisma/migrations/202610260001_inicial/migration.sql), [integridade adicional](../prisma/migrations/202610260002_integridade/migration.sql), [seed fictício](../prisma/seed.ts), [dicionário completo](dicionario-dados.md) e [DER PlantUML](diagramas/entidade-relacionamento.puml).

## Modelo relacional por domínio

| Domínio | Relações |
|---|---|
| Pessoas | Paciente, Prontuario, Alergia, PacienteAlergia, Profissional, Medico |
| Oferta | Especialidade, MedicoEspecialidade, Unidade, ProfissionalUnidade, UnidadeEspecialidade |
| Convênios | Convenio, PacienteConvenio |
| Atendimento | Agendamento, Consulta, AnotacaoEnfermagem |
| Exames | Exame, SolicitacaoExame |
| Prescrição | Medicamento, Prescricao, ItemPrescricao |
| Procedimentos | Procedimento, ProcedimentoRealizado |
| Financeiro | Cobranca, Pagamento |
| Segurança | Usuario, Sessao, Auditoria |

O dicionário lista **cada coluna**, tipo, nulabilidade, PK, UNIQUE, FK, valores iniciais e índices declarados. As tabelas são normalizadas para separar dados comuns e associações N:N. A redundância intencional dos vínculos em Consulta permite consulta histórica e é validada contra Agendamento. A redundância de paciente em SolicitacaoExame é protegida pela FK composta `(consultaId,pacienteId)`.

## Restrições e índices relevantes

1. CPFs únicos por tabela e VARCHAR(11); CNPJ VARCHAR(14) único; CRM+UF único. Dígitos verificadores validados na API.
2. Prontuario.pacienteId único, com trigger diferida de existência; o paciente e o prontuário são criados atomicamente.
3. Consulta.agendamentoId único; paciente/consulta consistente para solicitações de exame.
4. Exclusão GiST em médico + `tstzrange(inicio,fim,'[)')`, filtrada por estados que reservam horário. Requer extensão `btree_gist` incluída na migration.
5. Índices de agenda por médico/intervalo, paciente/início e unidade/início; consulta por data/unidade/especialidade; exames por paciente/situação; procedimentos por data; cobrança por emissão/situação; pagamento por data/situação; auditoria por data.
6. Decimal(12,2) para todos os valores monetários; nenhum cálculo de domínio financeiro usa ponto flutuante. Somente formatação/gráficos no cliente convertem para Number.
7. CHECKs para duração, positivos/não negativos, quantidade e coerência de resultado/pagador. Triggers diferidas para mínimo de especialidade médica e de itens de prescrição.
8. Não existem rotas de DELETE físico. Histórico de convênio é preservado por FK e snapshot do nome/carteirinha. Edições de catálogo não alteram valores históricos.

## Transações e concorrência

Mutações usam `transacao()` com isolamento Serializable, timeout de 15s e até três novas tentativas apenas em conflitos P2034. A verificação de saldo e a inserção de pagamento ocorrem na mesma transação. A reserva de horário possui adicionalmente exclusão nativa no banco. Uma violação aborta todos os efeitos, incluindo alteração de estado, registro e auditoria de sucesso.

O seed utiliza transação única. Ele é idempotente por inicialização: se já houver usuário, não insere novamente nem reinicia o banco. As migrations nunca usam `db push` como substituto do histórico de alterações.

## Dados demonstrativos

São criados dois médicos, uma profissional de enfermagem, seis contas, duas unidades, oito pacientes com CPFs sintéticos, seis especialidades, convênio fictício, catálogos, alergia, agenda para o dia de execução e uma consulta histórica com exames, prescrição, procedimento, cobranças e pagamento parcial.

Valores iniciais da demonstração: consulta faturada em R$300, sendo R$100 do paciente e R$200 previstos do convênio; R$40 recebidos do paciente; saldo R$260. O procedimento histórico de R$100 ainda não foi faturado, demonstrando que realização e cobrança são conceitos distintos. Os dados do banco de testes modificam esses totais intencionalmente; capturas de testes exibem seus próprios cenários.

## Backup e restauração

Para operação real, instalar clientes PostgreSQL compatíveis (`pg_dump` e `pg_restore`) ou usar o contêiner. Fazer dump custom com usuário de backup e armazenar em local cifrado separado do banco. No Docker:

```powershell
docker compose exec -T postgres pg_dump -U clinica -d clinica -Fc -f /tmp/clinica.dump
docker compose cp postgres:/tmp/clinica.dump ./clinica.dump
```

Restaurar primeiro em banco **novo e isolado**, nunca sobre a demonstração ou produção sem plano aprovado:

```powershell
docker compose exec -T postgres createdb -U clinica clinica_restauracao
docker compose cp ./clinica.dump postgres:/tmp/clinica-restauracao.dump
docker compose exec -T postgres pg_restore -U clinica -d clinica_restauracao --no-owner /tmp/clinica-restauracao.dump
```

Conferir contagens por tabela, uma consulta com vínculos, saldos e possibilidade de autenticação no ambiente isolado. Registrar duração, checksum do arquivo e resultado. RPO/RTO são metas RNF09; esta entrega **não executou ensaio operacional completo de backup/restauração nem agendamento de cópias externas**. Não copie a pasta `.postgres` com o servidor rodando como se fosse um backup transacional.
