# 10. Manual de execução e demonstração acadêmica

## Pré-requisitos

- Windows x64 com Node.js 22/24 e npm; verificação realizada em Node 24.14.0.
- Acesso à internet apenas para instalar dependências e baixar binários. Fontes e ícones são servidos localmente após o build.
- Portas livres: 54329 (PostgreSQL local), 3001 (API), 5173 (Vite); 3002 somente para teste de navegador.
- Para o caminho Docker, Docker Compose; não iniciar simultaneamente Docker e banco incorporado na mesma porta.

## Instalação do zero

1. Abrir terminal na pasta do projeto.
2. Executar `npm.cmd ci`.
3. Copiar `.env.example` para `.env` se ainda não existir. Não inserir credenciais reais no código ou no Git.
4. Executar `npm.cmd run db:generate`.
5. Iniciar `npm.cmd run db:local` e manter esse terminal aberto. Alternativa: `docker compose up -d`.
6. Em outro terminal, executar `npm.cmd run db:migrate` e `npm.cmd run db:seed`.
7. Executar `npm.cmd run dev` e abrir `http://127.0.0.1:5173`.
8. Entrar com uma conta da tabela do README e a senha fictícia inicial `Clinica@2026`.

O seed não altera um banco já inicializado. A agenda inicial usa o dia em que o seed foi executado; se a demonstração ocorrer depois, selecione esse dia ou crie novos agendamentos. Não há promessa de “sempre hoje” para registros persistidos.

## Variáveis

| Variável | Finalidade |
|---|---|
| DATABASE_URL | URL PostgreSQL para Prisma. `.env.example` contém apenas credenciais locais fictícias. |
| PORT | Porta da API, padrão 3001. |
| APP_ORIGIN | Origem da interface aceita nas mutações. |
| NODE_ENV | `production` habilita cookie Secure; requer HTTPS para autenticação no navegador. Para demonstração HTTP local, mantenha `development`. |
| DEMO_PASSWORD | Senha somente na criação inicial das contas do seed. Alterar depois não redefine contas existentes. |

O servidor escuta em 127.0.0.1; exposição em rede exige configuração consciente do servidor/proxy, HTTPS, credenciais adequadas e revisão dos RNFs.

## Build e execução integrada

```powershell
npm.cmd run build
npm.cmd start
```

Abrir `http://127.0.0.1:3001`. O banco deve estar ativo. O servidor Express serve os arquivos de `dist` e `/api`. Reiniciar `npm start` após gerar um build novo se o diretório dist não existia na inicialização.

## Roteiro sugerido de apresentação (20–30 minutos)

1. **Arquitetura (2 min):** mostrar schema, separação de profissional/usuário e os dois diagramas. Explicar que o calendário Scrum é planejamento acadêmico.
2. **Administração (3 min):** entrar como admin; dashboard; Cadastros → Unidades mostra especialidades/profissionais; criar ou editar catálogo; Usuários demonstra perfil e vínculo.
3. **Recepção (4 min):** sair e entrar como recepcao; pesquisar Ana Clara; mostrar vínculo de convênio e código; agendar um horário livre no dia atual, em horário que já tenha começado para a demonstração médica; escolher médico, unidade e especialidade compatíveis. Tentar duplicar intervalo em outra unidade e mostrar erro.
4. **Ciclo de agenda (2 min):** confirmar e reagendar; observar retorno a Agendado; mostrar cancelamento/ausência em registros separados. Não usar o agendamento cancelado para o atendimento seguinte.
5. **Médico (6 min):** entrar como medico; localizar atendimento próprio; registrar queixa/diagnóstico/conduta fictícios. Na ficha, Consultas → solicitar exame, prescrever dois medicamentos fictícios e registrar procedimento. Mostrar Prontuário/alergias e histórico de preços. Em Exames, demonstrar filtro de pendentes, agendamento e resultado.
6. **Enfermagem (2 min):** entrar como enfermagem; abrir paciente de sua unidade; registrar anotação; mostrar que não há aba de diagnóstico/prescrição e que o resultado não é retornado pela API.
7. **Financeiro (5 min):** entrar como financeiro; emitir consulta de R$300 com R$200 de cobertura, usando agendamento com convênio; mostrar cobranças 100/200; receber R$40 via PIX; saldo do paciente R$60; mostrar que R$200 ainda não foram recebidos; registrar repasse separadamente; estornar um pagamento para demonstrar rastreio.
8. **Relatórios e qualidade (3 min):** filtrar período/unidade, mostrar faturamento versus recebimentos, pendências e exportação. Exibir resultados dos testes e limites documentados.

Os medicamentos e instruções demonstrativos não têm finalidade assistencial. Não usar dados de pacientes reais na apresentação.

## Testes reproduzíveis

```powershell
npm.cmd test
```

Esse comando aponta deliberadamente para o banco `clinica_test`, aplica migrations, limpa suas tabelas e cria fixtures. O banco `clinica` permanece intacto. Para usar PostgreSQL externo, o banco `clinica_test` precisa existir e o usuário precisa das permissões de migration; o lançador local já cria ambos.

Em outro terminal:

```powershell
node scripts/servidor-teste.mjs
```

Depois:

```powershell
node scripts/verificar-interface.mjs
```

Os testes de UI usam as fixtures criadas por `npm test` e acrescentam registros no banco de teste. Antes de repetir o roteiro inteiro, rode `npm test` novamente. Não deixe o servidor de teste sendo usado por outra pessoa enquanto o banco é reiniciado.

## Diagramas e dicionário

```powershell
npm.cmd run db:generate
npm.cmd run docs
java -jar .tools/plantuml.jar -tsvg -charset UTF-8 docs/diagramas/*.puml
```

O JAR é uma ferramenta local opcional, obtida no [projeto oficial PlantUML](https://github.com/plantuml/plantuml/releases). Os fontes `.puml` e as imagens renderizadas estão entregues; não é preciso Java para executar a clínica. Alterar o schema exige regenerar cliente/documentação e criar nova migration.

## Encerramento e problemas comuns

- Parar interface/API com Ctrl+C; depois parar o processo do banco com Ctrl+C. Não apagar `.postgres` para encerrar.
- **Porta ocupada:** encerrar apenas a instância que você iniciou, ou escolher novas portas e atualizar `.env`/proxy. Não iniciar dois bancos na mesma porta.
- **Banco indisponível:** iniciar Terminal 1; conferir URL/porta; testar `/api/saude`.
- **Sessão não persiste em HTTP:** conferir se NODE_ENV não foi configurado como production sem HTTPS.
- **Acesso negado:** entrar com o perfil correto; para profissionais, conferir vínculos e médico da consulta. Não conceder acesso clínico irrestrito para contornar o erro.
- **Agenda vazia:** conferir data/unidade/situação e escopo da conta. Seed tem data fixa de inicialização.
- **Horário em conflito:** verificar agenda do médico também na outra unidade; fim de um atendimento pode coincidir com início do seguinte.
- **Prisma acusa drift:** não usar `db push` no banco migrado. Criar migration nova ou usar um banco novo de demonstração, conservando dados existentes.

Backup, restauração, critérios de produção e seus limites constam em [Modelagem do banco](07-banco.md) e [Requisitos](02-requisitos.md).
