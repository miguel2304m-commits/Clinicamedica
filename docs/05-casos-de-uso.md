# 5. Casos de uso

Fonte completa: [casos-de-uso.puml](diagramas/casos-de-uso.puml). Todos os casos pressupõem autorização no servidor, salvo autenticação. O retângulo representa o sistema; banco de dados não é ator. `include` expressa comportamento obrigatório reutilizado. `extend` é usado apenas para divisão de cobertura quando o atendimento possui valor coberto.

## UC01 — Autenticar e encerrar sessão

- **Atores:** todos os perfis.
- **Objetivo:** estabelecer uma sessão individual.
- **Pré-condições:** conta cadastrada e ativa; navegador com cookies.
- **Fluxo:** usuário informa e-mail/senha → API valida → compara hash → cria sessão de 8h → define cookie → retorna dados públicos do usuário → interface exibe módulos autorizados.
- **Alternativas:** credencial inválida/inativo: 401 sem revelar existência da conta; excesso de tentativas: 429; origem/cabeçalho inadequados: 403; sessão expirada: novo login.
- **Pós-condições:** sessão persistida por hash e login auditado. Logout elimina a sessão e o cookie.

## UC02/UC26 — Manter/cadastrar paciente

- **Atores:** administrador ou recepcionista.
- **Objetivo:** identificar paciente e iniciar seu prontuário único.
- **Pré-condições:** conta autorizada; dados fictícios válidos na demonstração.
- **Fluxo:** pesquisar nome/CPF → abrir cadastro → informar campos → validar CPF/nascimento → criar Paciente e Prontuario na mesma transação → auditar → atualizar lista.
- **Alternativas:** CPF inválido ou nascimento futuro: 422; CPF existente: 409; falha na criação do prontuário reverte o paciente. Edição atualiza dados, preservando prontuário e histórico.
- **Pós-condições:** um paciente com exatamente um prontuário. UC26 inclui obrigatoriamente UC22, abrir prontuário único.

## UC03/UC19 — Manter estrutura, profissionais e catálogos

- **Ator:** administrador.
- **Objetivo:** disponibilizar oferta e recursos referenciáveis por atendimentos.
- **Pré-condições:** unidades/especialidades necessárias criadas antes do profissional.
- **Fluxo:** selecionar módulo → cadastrar campos → definir associações → se médico, informar CRM/UF e especialidades → validar → persistir e auditar.
- **Alternativas:** CRM/UF, CPF ou CNPJ duplicado: 409; ausência de especialidade médica: 422; FK inexistente: 422. Remover especialização de um médico existente é recusado.
- **Pós-condições:** catálogos e vínculos atualizados. Alterar preço padrão não reescreve valores realizados. Criar profissional não cria usuário.

## UC04 — Gerenciar convênios e vínculos

- **Atores:** administrador ou recepcionista.
- **Objetivo:** registrar a adesão individual do paciente.
- **Pré-condições:** paciente e convênio cadastrados.
- **Fluxo:** abrir paciente → aba Cadastro e convênios → informar convênio, carteirinha e adesão → criar vínculo → usar seu código ao agendar.
- **Alternativas:** mesma associação/carteirinha duplicada: 409; convênio ausente: 422. Desativação muda apenas `ativo`; não exclui vínculo.
- **Pós-condições:** associação histórica preservada; novos atendimentos não podem usar vínculo inativo.

## UC05/UC25 — Agendar/reagendar

- **Atores:** administrador ou recepcionista.
- **Objetivo:** reservar um intervalo compatível com a oferta do médico.
- **Pré-condições:** paciente, médico, unidade e especialidade cadastrados; no reagendamento, estado ativo.
- **Fluxo:** selecionar vínculos e início/fim → incluir UC21 (validar oferta, convênio e sobreposição) → salvar AGENDADO → auditar → exibir na agenda.
- **Alternativas:** sobreposição entre quaisquer unidades: 409; médico/unidade/especialidade inconsistentes: 422; duração inválida: 422; convênio alheio/inativo: 422; concorrência gera somente uma reserva. Reagendamento de terminal: 409.
- **Pós-condições:** intervalo persistido; reagendamento substitui intervalo e volta a AGENDADO; snapshot de convênio atualizado enquanto o atendimento não ocorreu.

## UC06 — Atualizar situação da agenda

- **Atores:** administrador ou recepcionista.
- **Objetivo:** acompanhar confirmação, cancelamento e ausência.
- **Pré-condições:** agendamento AGENDADO ou CONFIRMADO.
- **Fluxo:** selecionar ação → servidor verifica transição → altera situação → audita → atualiza a agenda.
- **Alternativas:** ausência antes do término: 422; transição terminal ou confirmação repetida: 409; tentativa de REALIZADO nesta rota: 422.
- **Pós-condições:** situação atualizada. REALIZADO ocorre apenas em UC07.

## UC07 — Realizar consulta

- **Ator:** médico responsável.
- **Objetivo:** documentar atendimento ocorrido.
- **Pré-condições:** agendamento ativo, do médico logado e com início já alcançado.
- **Fluxo:** abrir Atender paciente → informar queixa, observações, diagnóstico e conduta → servidor deriva vínculos da agenda → cria Consulta → muda agenda para REALIZADO → audita e confirma a transação.
- **Alternativas:** médico diferente: 403; agendamento cancelado/não comparecimento/realizado: 409; campos faltantes: 422; tentativa concorrente: no máximo uma consulta persiste.
- **Pós-condições:** Consulta e estado REALIZADO coerentes; paciente pode receber novos atos clínicos nessa consulta.

## UC08/UC13 — Consultar prontuário e registrar alergia/anotação

- **Atores:** médico e enfermagem, com escopos distintos.
- **Objetivo:** consultar informações necessárias e registrar alergias/notas identificadas.
- **Pré-condições:** paciente vinculado ao médico ou a uma unidade da enfermagem.
- **Fluxo:** abrir paciente → selecionar aba disponível → API verifica escopo → lê dados → grava auditoria → responde. Registrar alergia cria/atualiza associação; anotação de enfermagem registra profissional/data/texto.
- **Alternativas:** administrador/recepção/financeiro tentando ler: 403; paciente fora do escopo: 403. Enfermagem não acessa histórico completo, resultados ou prescrições.
- **Pós-condições:** leitura rastreada; novas informações ligadas ao prontuário correto. Não há exclusão de nota pela UI.

## UC09/UC10 — Solicitar e acompanhar exame

- **Atores:** médico; enfermagem apenas no agendamento.
- **Objetivo:** distinguir catálogo, solicitação, realização e resultado.
- **Pré-condições:** consulta realizada; médico da consulta para solicitar ou registrar resultado.
- **Fluxo:** selecionar exame em consulta → confirmar paciente → criar SOLICITADO → opcionalmente AGENDADO → registrar resultado e data → REALIZADO.
- **Alternativas:** paciente divergente: 422 na API e FK composta no banco; resultado/data ausentes: 422; cancelamento permitido nos estados ativos; cancelado não aparece como pendente; outra solicitação do mesmo exame é válida.
- **Pós-condições:** solicitação individual preservada no histórico; enfermagem nunca recebe o texto do resultado.

## UC11 — Prescrever medicamentos

- **Ator:** médico da consulta.
- **Objetivo:** gravar uma prescrição com instruções por item.
- **Pré-condições:** consulta própria; medicamentos no catálogo.
- **Fluxo:** escolher quantidade de itens na UI → informar medicamento, quantidade, dose, frequência, duração e observações para cada item → criar Prescricao e ItemPrescricao em uma transação → auditar.
- **Alternativas:** lista vazia, quantidade não positiva ou campo obrigatório ausente: 422; medicamento inexistente: 422; outro médico: 403. A API permite 1–30 itens; a UI prepara 1–10 itens por prescrição, e permite várias prescrições por consulta.
- **Pós-condições:** prescrição disponível na consulta e na aba Prescrições, com itens completos.

## UC12 — Registrar procedimento

- **Ator:** médico da consulta.
- **Objetivo:** identificar procedimento realizado, executor e preço histórico.
- **Pré-condições:** consulta própria; catálogo e profissional válidos.
- **Fluxo:** selecionar procedimento/executor → informar data e preço efetivo → validar vínculo do executor à unidade → persistir realização → auditar.
- **Alternativas:** executor fora da unidade ou data fora do intervalo consulta/agora: 422; preço negativo: 422; catálogo inexistente: 422.
- **Pós-condições:** registro histórico independente do valor padrão; cobrança financeira ainda deve ser emitida.

## UC14/UC24 — Emitir cobrança com cobertura

- **Atores:** financeiro ou administrador.
- **Objetivo:** reconhecer valores devidos por pagador.
- **Pré-condições:** consulta realizada; vínculo histórico de convênio se houver cobertura.
- **Fluxo:** selecionar consulta/origem → informar total, cobertura e vencimento → se cobertura positiva, UC24 estende a emissão → criar parcela de paciente e/ou convênio com chave de grupo → auditar.
- **Alternativas:** cobertura maior que total/sem convênio: 422; procedimento de outra consulta ou total diferente de seu preço: 422; procedimento já faturado: 409; repetição da mesma chave representa a mesma operação.
- **Pós-condições:** soma das cobranças igual ao total; recebimento inalterado; cobertura não contada novamente.

## UC15/UC23 — Receber e estornar pagamento

- **Atores:** financeiro ou administrador.
- **Objetivo:** registrar caixa/repasse e atualizar saldo.
- **Pré-condições:** cobrança ativa com saldo; pagamento existente para estorno.
- **Fluxo:** informar valor/forma → incluir UC23, calcular saldo → validar pagador e limite → gravar pagamento com chave única → atualizar PARCIAL/QUITADA → auditar.
- **Alternativas:** excesso ou forma incompatível: 422; cobrança cancelada: 409; mesma chave e dados não duplica; concorrência não supera saldo. Estorno marca ESTORNADO e recalcula ABERTA/PARCIAL; não elimina o pagamento.
- **Pós-condições:** saldo exato por Decimal; repasse recebido separado de cobertura prevista.

## UC16 — Consultar indicadores e relatórios

- **Atores:** administrador/financeiro para relatórios; demais perfis apenas dashboard operacional autorizado.
- **Objetivo:** apresentar informação calculada do banco.
- **Pré-condições:** sessão/perfil; intervalo válido de até 366 dias para relatórios.
- **Fluxo:** informar datas inclusivas na UI e filtros → API converte fim para limite exclusivo → calcula cobranças/pagamentos com critérios próprios → agrupa dimensões → exibe pendências, consultas e procedimentos → opcionalmente exporta CSV.
- **Alternativas:** período inválido: 422; nenhuma ocorrência: listas vazias e totais zero; perfil incompatível: 403.
- **Pós-condições:** relatório reproduzível na posição atual; nenhum lançamento modificado.

## UC17/UC18 — Administrar contas e consultar auditoria

- **Ator:** administrador.
- **Objetivo:** atribuir acesso e inspecionar rastros.
- **Pré-condições:** conta administrativa ativa.
- **Fluxo:** cadastrar/editar conta → atribuir perfil e profissional quando clínico → validar e salvar → revogar sessões alteradas → registrar auditoria. Consultar logs por paginação.
- **Alternativas:** clínico sem profissional: 422; médico sem cadastro Medico: 422; auto-rebaixamento/desativação: 422; e-mail duplicado: 409; demais perfis: 403.
- **Pós-condições:** conta independente do cadastro profissional; trilha consultável sem dados clínicos copiados.
