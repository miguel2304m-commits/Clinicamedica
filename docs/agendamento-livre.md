# Agendamento com texto livre (administrador)

Paciente, médico, unidade e especialidade aceitam digitação, com sugestões dos cadastros existentes. Quando todos os nomes correspondem a cadastros únicos, o fluxo vinculado continua funcionando. Nomes novos geram um pré-agendamento persistente, visível somente ao administrador, que pode editar, confirmar ou cancelar a reserva. Nenhum CPF, CRM ou paciente fictício é criado automaticamente.

Pré-agendamentos não geram consultas nem cobranças. Para atendimento clínico, complete os cadastros, cancele a reserva e crie o agendamento vinculado. Homônimos exigem diferenciação no cadastro. Conflitos usam o nome do médico normalizado (maiúsculas/minúsculas e espaços); grafias diferentes de nomes livres não comprovam identidade.

## Atualizar a Vercel/Neon

1. Envie o código atualizado ao repositório conectado à Vercel.
2. Com `DATABASE_URL` apontando para o banco desejado, execute `npm run db:migrate` para aplicar a nova tabela. Essa migration adiciona uma tabela e não elimina os dados atuais.
3. Faça um novo deploy. O postinstall existente gera o cliente Prisma.

O build sozinho não aplica migrations. A alteração local não publica automaticamente na Vercel.

Testes locais seguros: com PostgreSQL local iniciado, `node scripts/testar-local.mjs` ignora a URL da Neon e usa exclusivamente `clinica_test` em 127.0.0.1.
