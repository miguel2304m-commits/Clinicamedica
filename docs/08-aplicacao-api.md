# 8. Aplicação, código-fonte e API REST

## Estrutura

```text
client/                React: interface, formulários, agenda, pacientes, financeiro
server/app.ts          Express, login, proteção HTTP, montagem e erros
server/auth.ts         Sessão, perfis, escopo e auditoria
server/cadastros.ts    Pacientes, profissionais, catálogos, convênios e usuários
server/agenda.ts       Agendamentos, vínculos, sobreposição e consulta
server/clinica.ts      Prontuário, exames, prescrições e procedimentos
server/financeiro.ts   Cobranças, pagamentos, estorno, saldos e relatórios
server/validacao.ts    Schemas Zod e validação de documentos
server/db.ts           Prisma, erros de domínio e transação Serializable
prisma/               Schema, migrations e seed
tests/                Integração com PostgreSQL dedicado
scripts/              Banco local, documentação e verificação de navegador
docs/                 Entrega acadêmica, diagramas e evidências
```

A interface chama `/api` no mesmo domínio. No desenvolvimento, Vite encaminha para a API local; no build, Express serve `dist`. Nenhum dado de negócio usa localStorage ou arrays estáticos como persistência. Sessões são opacas no cookie; conteúdo clínico é filtrado no servidor.

## Convenções

- Base: `http://127.0.0.1:3001/api`.
- Corpo JSON; mutações exigem `Content-Type: application/json` e `X-Clinica-Client: web`.
- Cookie `sessao` recebido no login, enviado em chamadas seguintes. HttpOnly, SameSite=Strict; Secure quando NODE_ENV=production. Produção requer HTTPS no proxy.
- Não há CORS aberto. Se houver Origin, deve corresponder à origem configurada/loopback de desenvolvimento.
- IDs inteiros positivos. Dinheiro como string decimal sem separador de milhar, ex.: `"300.00"`; a API também normaliza números de até duas casas. Sem valores negativos, exponenciais ou acima de nove dígitos inteiros.
- Datas civis: `YYYY-MM-DD`; instantes: ISO 8601 com offset explícito. Intervalos de consulta usam início inclusivo e fim exclusivo.
- Paginação: `pagina` padrão 1; `tamanho` padrão 10, máximo 100; `busca` até 100 caracteres. Resposta `{itens,total,pagina,tamanho}`. Os seletores da UI percorrem as páginas de referência para não truncar opções.
- Erros: `{erro: string, campos?: string[]}`. 400 JSON inválido; 401 sem sessão; 403 sem permissão/origem inadequada; 404 inexistente; 409 duplicação/conflito/transição; 422 validação/vínculos; 429 login excessivo; 500 mensagem genérica.
- Não há DELETE físico. Cada atualização aceita somente campos de seu schema; schemas de entrada de domínio usam `strict`.

## Autenticação e administração

| Método / rota | Perfis | Entrada e saída |
|---|---|---|
| GET /saude | Público | `{status:"ok"}` após SELECT 1 no banco. |
| POST /login | Público | `{email,senha}` → usuário público, cookie, 200. |
| GET /me | Autenticado | `{id,nome,email,perfil,profissionalId}`. |
| POST /logout | Autenticado | Remove sessão atual e cookie. |
| GET /usuarios | Administrador | Lista de contas, perfil, vínculo e ativo, sem senha/hash. |
| POST /usuarios | Administrador | `{nome,email,senha,perfil,profissionalId?,ativo?}`; senha mínima 10 caracteres. |
| PUT /usuarios/:id | Administrador | Mesmo corpo; senha opcional para manter; revoga sessões. |
| GET /auditoria | Administrador | Lista paginada com ação/recurso/data/usuário. |
| GET /dashboard | Autenticado | Contagens do dia no escopo do usuário; resumo financeiro só Admin/Financeiro. |

Perfis válidos: ADMINISTRADOR, RECEPCIONISTA, MEDICO, ENFERMAGEM, FINANCEIRO. Vincular um profissional clínico não concede permissões por si só: o perfil também precisa corresponder.

## Cadastros

| Método / rota | Perfis | Contrato |
|---|---|---|
| GET /pacientes | Autenticados | Paginação/busca por nome ou CPF e filtro opcional `sexo`; clínicos recebem apenas pacientes de seu escopo. |
| GET /pacientes/:id | Autenticados | Dados administrativos e vínculos de convênio; clínicos sujeitos ao escopo. |
| POST /pacientes | Admin/Recepção | `nome,cpf,nascimento,sexo,telefone,email,endereco`; cria prontuário. |
| PUT /pacientes/:id | Admin/Recepção | Mesmo corpo completo; preserva histórico. |
| POST /pacientes/:id/convenios | Admin/Recepção | `{convenioId,carteirinha,adesao}` → vínculo ativo. |
| PATCH /pacientes/:id/convenios/:vinculoId | Admin/Recepção | `{ativo:boolean}`. |
| GET /profissionais | Autenticados | Paginação; inclui unidades/especialidades. CPF/e-mail/nascimento apenas Admin. |
| POST /profissionais | Admin | `nome,cpf,nascimento,telefone,email,registro,unidades:number[],medico?:{crm,ufCrm,especialidades:number[]}`. |
| PUT /profissionais/:id | Admin | Mesmo corpo; substitui associações em transação; não remove condição de médico existente. |
| GET /catalogos/:tipo | Autenticados | Paginação; tipos e campos abaixo. Unidades incluem profissionais e especialidades. |
| POST /catalogos/:tipo | Admin; Convênio também Recepção | Cria registro do tipo. |
| PUT /catalogos/:tipo/:id | Mesma regra | Atualiza campos completos. |

| Tipo | Campos de criação/edição |
|---|---|
| especialidades | nome, descricao |
| unidades | nome, endereco, telefone, horario, especialidades:number[] (mínimo 1) |
| convenios | nome, cnpj, telefone |
| alergias | nome, descricao |
| exames | nome, descricao, tipo |
| medicamentos | nome, principioAtivo, fabricante, apresentacao |
| procedimentos | nome, descricao, valorPadrao |

Descrições/observações podem ser vazias. Textos básicos até 300 caracteres; textos longos até 10.000. Sexo: F, M, OUTRO, NAO_INFORMADO. CPF/CNPJ aceitam máscara, removem caracteres não numéricos e validam dígitos verificadores.

## Agenda e consulta

| Método / rota | Perfis | Contrato |
|---|---|---|
| GET /agendamentos | Admin/Recepção/Médico/Enfermagem | `inicio,fim` obrigatórios; `unidadeId,medicoId,situacao` opcionais; até 93 dias. Médico: apenas próprio; enfermagem: unidades. |
| POST /agendamentos | Admin/Recepção | `{pacienteId,medicoId,unidadeId,especialidadeId,pacienteConvenioId?,inicio,fim,observacoes?}`. |
| PUT /agendamentos/:id | Admin/Recepção | Corpo completo; reagenda ativo e redefine AGENDADO. |
| PATCH /agendamentos/:id/situacao | Admin/Recepção | `{situacao: CONFIRMADO/CANCELADO/NAO_COMPARECEU}`. |
| POST /consultas | Médico próprio | `{agendamentoId,queixa,observacoes?,diagnostico,conduta}`; vínculos derivados; cria e marca REALIZADO. |

Exemplo de agenda:

```json
{
  "pacienteId": 1,
  "medicoId": 1,
  "unidadeId": 1,
  "especialidadeId": 1,
  "pacienteConvenioId": 1,
  "inicio": "2026-10-27T09:00:00-03:00",
  "fim": "2026-10-27T09:30:00-03:00",
  "observacoes": "Atendimento demonstrativo"
}
```

## Prontuário e atos clínicos

| Método / rota | Perfis | Contrato |
|---|---|---|
| GET /pacientes/:id/prontuario | Médico/Enfermagem no escopo | Prontuário, alergias, notas e autores; auditado. |
| GET /pacientes/:id/historico | Médico no escopo | Consultas com exames, prescrições/itens, procedimentos e convênio histórico; auditado. |
| POST /pacientes/:id/alergias | Médico/Enfermagem no escopo | `{alergiaId,observacoes?}`; upsert da associação. |
| POST /pacientes/:id/anotacoes | Enfermagem no escopo | `{texto}` até 5000 caracteres; autor vem da sessão. |
| GET /pacientes/:id/exames | Médico/Enfermagem no escopo | `pendentes=true` opcional; enfermagem não recebe resultado. |
| POST /consultas/:id/exames | Médico da consulta | `{pacienteId,exameId}`; mesmo paciente da origem. |
| PATCH /solicitacoes-exames/:id | Médico da consulta; Enfermagem só AGENDADO | `{situacao,realizadoEm?,resultado?}`; REALIZADO exige data/resultado; outros estados não aceitam esses campos. |
| POST /consultas/:id/prescricoes | Médico da consulta | `{itens:[{medicamentoId,quantidade,dose,frequencia,duracao,observacoes?}]}`; 1–30 itens. |
| POST /consultas/:id/procedimentos | Médico da consulta | `{procedimentoId,profissionalId,data,valorCobrado}`. |

Não se aceita `pacienteId` informado pelo cliente ao criar consulta/prescrição/procedimento: o vínculo vem da origem. A API de solicitação de exame aceita-o explicitamente para verificar a consistência exigida no enunciado; a FK composta reforça a regra.

## Financeiro e relatórios

Todas as rotas seguintes exigem ADMINISTRADOR ou FINANCEIRO.

| Método / rota | Contrato |
|---|---|
| GET /consultas-faturaveis | Lista paginada de identificadores administrativos, paciente, convênio histórico e procedimentos/valores, sem diagnóstico. |
| GET /cobrancas | Paginação/busca; filtros opcionais `pacienteId,situacao`; inclui pagamentos, recebido e saldo calculados. |
| POST /cobrancas | `{consultaId,procedimentoRealizadoId?,origem,valorTotal,valorCoberto?,vencimento,chave:UUID}`; retorna uma ou duas cobranças. |
| POST /cobrancas/:id/pagamentos | `{valor,forma,chave:UUID}`; data é o instante de registro no servidor; idempotente. |
| POST /pagamentos/:id/estorno | Sem corpo de domínio; estorna integralmente e recalcula cobrança. |
| POST /cobrancas/:id/cancelamento | Sem corpo; exige nenhum recebimento ativo. |
| GET /relatorios | `inicio,fim` obrigatórios, até 366 dias; filtros `unidadeId,medicoId,especialidadeId`. |

Formas: DINHEIRO, CREDITO, DEBITO, PIX, CONVENIO. Situações da cobrança: ABERTA, PARCIAL, QUITADA, CANCELADA. Pagamentos: RECEBIDO, ESTORNADO. A data de vencimento não muda a situação para “atrasada”; atraso pode ser identificado comparando o vencimento com a data atual e saldo positivo.

Exemplo de emissão:

```json
{
  "consultaId": 1,
  "origem": "Consulta demonstrativa",
  "valorTotal": "300.00",
  "valorCoberto": "200.00",
  "vencimento": "2026-11-10",
  "chave": "53c12388-cd2e-49a5-8552-92b12bb09065"
}
```

A chave deve ser nova por operação e reutilizada em tentativas da mesma operação. Reusar uma chave com parâmetros divergentes é conflito. A resposta contém R$100 de PACIENTE e R$200 de CONVENIO, sem criar pagamento.

Resposta do relatório: `faturamento,recebido,aberto,coberturaPrevista,repasseRecebido,grupos:{medicos,especialidades,unidades},pendentes:[{pacienteId,nome,paciente,convenio}],consultas:[{especialidade,quantidade}],procedimentos`. Valores Decimal são serializados como strings.

## Garantias e limites de operação

A interface desabilita envio enquanto salva. As transações protegem o banco mesmo com clientes concorrentes. Não há filas, anexos de resultados, serviços de e-mail, SMS, convênio externo ou emissão fiscal. O usuário administrador do PostgreSQL possui capacidade de modificar diretamente o banco: permissões de banco e gestão de infraestrutura devem ser endurecidas antes de produção. O processo local escuta somente em 127.0.0.1.
