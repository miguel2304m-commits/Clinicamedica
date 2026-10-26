# 2. Requisitos, regras e permissões

E = expresso no enunciado; C = decisão complementar. Critérios são verificáveis, não declarações automáticas de certificação.

## Requisitos funcionais

| ID | Origem | Requisito e critério de aceite |
|---|---|---|
| RF01 | E | Autenticar, encerrar sessão e atribuir acesso por perfil. Sem sessão retorna 401; perfil incompatível retorna 403; usuário inativo não entra. |
| RF02 | E | Cadastrar, alterar, pesquisar e paginar pacientes com todos os campos exigidos. CPF único e válido; exatamente um prontuário criado na transação. |
| RF03 | E | Cadastrar profissionais e especialização médica sem duplicar os dados comuns; médico tem CRM/UF e ao menos uma especialidade; vínculo com uma ou mais unidades. |
| RF04 | E | Manter unidades e especialidades N:N; consultar profissionais por unidade; incluir seis especialidades demonstrativas. |
| RF05 | E | Manter convênios e vínculos paciente/convênio com carteirinha, adesão e situação; histórico continua após desativar o vínculo. |
| RF06 | E | Criar e consultar agenda diária/semanal com paciente, médico, unidade, especialidade, intervalo, situação e observações; impedir sobreposição global do médico. |
| RF07 | E | Confirmar, reagendar, cancelar e marcar ausência somente nas transições permitidas. Não comparecimento distinguível por filtro. |
| RF08 | E | Registrar consulta realizada a partir de agendamento válido, com queixa, observações, diagnóstico e conduta; impedir duplicação e acesso de outro médico à escrita. |
| RF09 | E | Separar catálogo de exames das solicitações; solicitar repetidamente, agendar, cancelar, registrar realização/resultado e filtrar pendentes por paciente. |
| RF10 | E | Manter medicamentos e registrar zero ou mais prescrições por consulta; cada prescrição tem um ou mais itens com quantidade, dose, frequência, duração e observações. |
| RF11 | E | Manter catálogo de procedimentos e registrar realizações com consulta, data, responsável e preço efetivo independente do preço padrão. Consultar por período. |
| RF12 | E | Emitir cobranças por consulta e origem, com pagador, valor e vencimento; dividir cobertura; preservar vínculo utilizado; cancelar apenas sem recebimentos ativos. |
| RF13 | E | Registrar pagamentos parciais, formas e situação, calcular saldo e separar previsão de repasse. Estorno integral e idempotência são complementos C. |
| RF14 | E | Dashboard e relatórios por período/médico/especialidade/unidade; recebimentos, saldo, pendências por pagador, contagem de consultas e procedimentos; CSV como complemento C. |
| RF15 | E | Interface responsiva, login, menu, pesquisa, filtros, paginação, abas de paciente e mensagens de erro/sucesso/carregamento/vazio. |
| RF16 | E | Auditar alterações e leitura clínica com usuário, ação, recurso e momento, sem copiar prontuário para o log. |
| RF17 | E | Entregar código, schema, migrations, seed, documentação da API, requisitos, Scrum, UML/DER, rastreabilidade, manual e testes reproduzíveis. |
| RF18 | E/C | Associar alergias N:N e consultar prontuário. Anotação de enfermagem identificada e datada como complemento à atividade clínica. |

## Regras de negócio

| ID | Regra |
|---|---|
| RN01 | CPF único por cadastro de paciente/profissional; paciente tem exatamente um prontuário. A mesma pessoa pode existir como paciente e profissional. |
| RN02 | Médico especializa Profissional por PK compartilhada; CRM+UF único; ao menos uma especialidade. |
| RN03 | Profissional e conta são independentes; uma conta pode vincular um profissional; perfis clínicos exigem vínculo. |
| RN04 | Agendar/reagendar exige médico vinculado à unidade, à especialidade e oferta dessa especialidade pela unidade. |
| RN05 | Intervalos [início,fim) do mesmo médico não podem se sobrepor em AGENDADO, CONFIRMADO ou REALIZADO, mesmo em unidades distintas; fim maior que início; máximo 4h. |
| RN06 | Convênio utilizado pertence ao paciente, está ativo e possui adesão anterior ao atendimento; referência e snapshot permanecem no histórico. |
| RN07 | AGENDADO → CONFIRMADO/CANCELADO/NAO_COMPARECEU/REALIZADO; CONFIRMADO → CANCELADO/NAO_COMPARECEU/REALIZADO. REALIZADO apenas pelo registro de consulta; reagendar retorna a AGENDADO; terminais não reabrem. |
| RN08 | Agendamento possui zero ou uma consulta. Consulta copia paciente/médico/unidade/especialidade de sua origem; somente responsável registra, e não antes do início previsto. |
| RN09 | Solicitação pertence ao mesmo paciente da consulta. Pendentes = SOLICITADO ou AGENDADO. Cancelados não são pendentes. |
| RN10 | SOLICITADO → AGENDADO/REALIZADO/CANCELADO; AGENDADO → REALIZADO/CANCELADO; realização exige resultado e data não futura nem anterior à solicitação. |
| RN11 | Prescrição exige ao menos um ItemPrescricao com quantidade positiva. Realização de procedimento guarda preço próprio e responsável vinculado à unidade. |
| RN12 | Cobertura prevista entre zero e o total. Cobranças dos pagadores somam exatamente o total. Cobertura positiva exige convênio na origem; não altera recebimentos. |
| RN13 | Pagamento positivo, com até duas casas decimais, não supera saldo. Forma CONVENIO só para pagador CONVENIO. Recebido integral → QUITADA; parcial → PARCIAL; estorno reabre saldo; cancelamento exige recebido zero. |
| RN14 | Dados clínicos por necessidade: médico dos pacientes atendidos; enfermagem das unidades de atuação, apenas subconjunto; demais perfis sem prontuário. Escrita de atos médicos só na própria consulta. |
| RN15 | Faturamento por emissão, recebimento por data do pagamento, contagem de consulta por realização e procedimento por execução; cobertura não adicionada duas vezes. |
| RN16 | Não eliminar registros históricos pela API. Não modificar valor de pagamento/cobrança gravada; usar estorno/cancelamento. Preço novo de catálogo não afeta realização antiga. |
| RN17 | Todas as mutações de domínio e suas auditorias são atômicas. Leitura clínica exige auditoria antes de responder. |
| RN18 | Usuário não desativa/rebaixa a própria conta administrativa; alteração de conta revoga sessões existentes. |

## Matriz de permissões

| Recurso | Administrador | Recepção | Médico | Enfermagem/apoio | Financeiro |
|---|---|---|---|---|---|
| Paciente administrativo | Ler/criar/editar | Ler/criar/editar | Ler sob atendimento | Ler nas unidades | Ler para cobrança |
| Profissional/unidade/catálogos | Manter | Ler | Ler | Ler | Ler |
| Convênio e associação | Manter | Manter | Ler do paciente autorizado | Ler do paciente autorizado | Ler |
| Agenda | Gerenciar | Gerenciar | Ler própria | Ler das unidades | Sem agenda individual |
| Prontuário/alergias | Negado | Negado | Ler/registrar alergia | Ler/registrar alergia e anotação | Negado |
| Histórico clínico completo | Negado | Negado | Ler de pacientes vinculados | Negado | Negado |
| Consulta/prescrição/procedimento | Negado | Negado | Registrar própria | Negado | Negado |
| Exames | Catálogo | Negado ao histórico | Solicitar/resultado na própria consulta | Ler sem resultado; agendar nas unidades | Catálogo |
| Cobrança/pagamento/relatório financeiro | Gerenciar | Negado | Negado | Negado | Gerenciar |
| Dashboard operacional | Sim | Sim | Próprio | Unidades | Contagens gerais sem clínica |
| Contas/perfis/auditoria | Gerenciar/ler | Negado | Negado | Negado | Negado |

Os cadastros de catálogos são administrativos; a leitura de nomes de exames/medicamentos não dá acesso a resultados ou prescrições de pacientes. O perfil não é confiado ao cliente: vem da sessão lida do banco a cada requisição.

## Requisitos não funcionais

| ID | Critério mensurável e condição de verificação | Estado nesta entrega |
|---|---|---|
| RNF01 Segurança | Senhas nunca em texto no banco; bcrypt custo 12; sessão aleatória de 256 bits, TTL 8h; cookie HttpOnly/SameSite, Secure em produção; 20 tentativas de login/15min/IP. | Implementado; autenticação e cabeçalho/origem testados; limitação distribuída não implementada. |
| RNF02 Autorização | 100% das rotas clínicas e financeiras protegidas no servidor; tentativa cruzada retorna 403; escopo por paciente/unidade. | Testes negativos automatizados nos fluxos críticos. |
| RNF03 Privacidade | Logs sem senha, token ou conteúdo clínico; fontes locais; ambiente demo sem dados reais; acesso a exportação financeira restrito. | Implementado; não substitui governança LGPD. |
| RNF04 Auditoria | Toda mutação confirmada produz log na mesma transação; leitura de histórico/exames/prontuário produz log identificado. | Implementado e testado em leitura/mutações. Não é armazenamento inviolável/WORM. |
| RNF05 Desempenho | Meta p95 <500ms para listagens de 10 itens e <2s para relatórios de 12 meses, com 10 usuários e 10 mil pacientes em máquina 4 vCPU/8GB. | Meta de homologação; teste de carga nessa escala não executado. |
| RNF06 Acessibilidade | Alvo WCAG 2.2 AA: formulários rotulados, teclado sem armadilha, foco visível, modal nativo, estados anunciados, conteúdo não depende só de cor. Contraste alvo 4,5:1 para texto. | Navegação verificada; axe-core no dashboard sem violações automáticas e com contraste parcialmente inconclusivo. Auditoria integral manual/leitor de tela pendente. |
| RNF07 Responsividade | Sem transbordamento horizontal da página a 390px e 1440px; tabelas e semana podem ter rolagem local. | Testado no Edge automatizado e capturas salvas. |
| RNF08 Integridade | Zero consulta duplicada, exame com paciente divergente ou agenda ativa sobreposta; pagamentos concorrentes não excedem saldo. | Testado no PostgreSQL real com concorrência. |
| RNF09 Backup | Meta RPO 24h e RTO 4h, cópia cifrada externa diária, retenção definida pelo controlador; ensaio mensal de restauração com contagem/conferência. | Procedimento documentado; agendamento externo, criptografia operacional e ensaio completo ainda pendentes. |
| RNF10 Manutenção | Build TypeScript sem erros, migrations reproduzíveis, lockfile, módulos por domínio; testes principais passando antes de integrar. | Verificado. |
| RNF11 Disponibilidade | Meta operacional 99,5% mensal, health endpoint e monitoramento a cada 60s; medir fora das manutenções aprovadas. | Health implementado; monitoramento/hospedagem e SLA não implantados. |
| RNF12 Proteção de dados de saúde | Antes de produção: documentar finalidade, base legal, minimização, retenção, responsáveis, atendimento ao titular e incidentes; revisão formal registrada. | Requisito de implantação; não executado como processo jurídico/organizacional. |

Dados de saúde integram a categoria de dados pessoais sensíveis da LGPD; as medidas técnicas aqui propostas não garantem conformidade por si mesmas. A análise da hipótese legal, retenção e responsabilidades deve considerar a operação real. Referência: [texto oficial da Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm). Estes são requisitos do projeto acadêmico, não uma conclusão jurídica sobre uma clínica real.
