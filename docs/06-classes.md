# 6. Diagrama de classes

Fontes: [visão completa PlantUML](diagramas/classes.puml) e [DER completo](diagramas/entidade-relacionamento.puml). O comando `npm run docs` usa o metamodelo do cliente Prisma gerado para manter atributos, tipos, identificadores e relações coerentes com o schema. Métodos de domínio são apresentados em serviços correspondentes aos handlers/funções, sem sugerir classes TypeScript que não existem.

## Decisões UML

- **Paciente 1 — 1 Prontuario:** a referência inversa é opcional na tipagem Prisma por limitação da modelagem de FK inversa, mas `UNIQUE(pacienteId)` e trigger diferida impõem exatamente um ao final da transação.
- **Agendamento 1 — 0..1 Consulta:** `Consulta.agendamentoId` é único. A consulta só é criada ao realizar o atendimento.
- **Medico especializa Profissional:** mapeamento por PK compartilhada `Medico.profissionalId`; os campos comuns ficam em Profissional. Não há duplicação de CPF/nome/telefone nem herança de objeto no ORM.
- **Associações explícitas:** PacienteAlergia, MedicoEspecialidade, ProfissionalUnidade, UnidadeEspecialidade e PacienteConvenio. As quatro primeiras usam PK composta; PacienteConvenio possui código próprio para referência histórica e UNIQUE de paciente/convênio/carteirinha.
- **Composição Prescricao–ItemPrescricao:** o item não possui ciclo de vida independente; FK com cascade e obrigação de ao menos um item. Nenhuma composição foi usada para pessoas, convênios, consultas ou catálogos.
- **Catálogo ≠ ocorrência:** Exame/SolicitacaoExame; Procedimento/ProcedimentoRealizado; Medicamento/ItemPrescricao. Repetição de exame/procedimento é válida.
- **Cobranca 1 — 0..* Pagamento:** cada pagamento atende uma cobrança; não há rateio de um pagamento entre múltiplas cobranças. Grupo de emissão identifica a divisão entre pagadores.
- **Usuario 0..1 — 0..1 Profissional:** contas administrativas não precisam de profissional; o domínio obriga contas clínicas a ter um. Sessao e Auditoria são classes auxiliares de segurança.
- **AnotacaoEnfermagem:** pertence ao prontuário, identifica profissional e data. Não concede acesso ao diagnóstico médico.

Enumerações: Perfil, SituacaoAgenda, SituacaoExame, Responsavel, FormaPagamento, SituacaoPagamento e SituacaoCobranca. Sexo é um domínio validado na API com F/M/OUTRO/NAO_INFORMADO; situação de vínculo é booleana (`ativo`).

## Serviços

`ServicoAgenda` representa `validarAgenda` e handlers de reagendamento/consulta em `server/agenda.ts`. `ServicoFinanceiro` representa `saldo` e handlers de cobrança, pagamento e estorno em `server/financeiro.ts`. `ControleAcesso` representa `escopoPaciente`, `consultaPropria` e `auditar` em `server/auth.ts`.

O diagrama completo foi priorizado para rastreabilidade. A imagem vetorial pode exigir zoom devido às 28 entidades; os módulos e cardinalidades também estão descritos no dicionário e nas migrations.
