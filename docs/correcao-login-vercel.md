# Login, Origin e Vercel

O middleware anterior comparava o cabeçalho Origin com APP_ORIGIN literalmente e quatro URLs locais. APP_ORIGIN ausente, local ou com barra final podia recusar o domínio publicado antes de validar a senha. O `.env` local inspecionado contém APP_ORIGIN=http://localhost:5173; as variáveis do painel da Vercel não foram acessadas.

No diagnóstico HTTP do domínio público, POST /api/login com Origin oficial, cabeçalho X-Clinica-Client e corpo vazio retornou **422 por campos ausentes**, demonstrando que essa chamada já ultrapassava a validação de origem. Não foi reproduzido um 403 nessa chamada; isso não permite afirmar qual valor de APP_ORIGIN estava ativo no deploy quando o erro do usuário ocorreu. Nenhuma senha foi enviada ao site publicado para testar.

## Correção

- `server/origens.ts`: autoriza explicitamente https://clinica-medica-xi-eight.vercel.app; normaliza APP_ORIGIN (espaços e barra final); usa comparação exata de protocolo/domínio/porta. Não usa Host ou X-Forwarded-Host nem libera *.vercel.app.
- Em produção, não autoriza HTTP ou localhost, mesmo que APP_ORIGIN tenha sido copiado do ambiente local.
- Variáveis do servidor VERCEL_PROJECT_PRODUCTION_URL e, somente em preview, VERCEL_URL permitem os hosts exatos do projeto/deploy. Não são obtidas de cabeçalhos do cliente.
- `server/app.ts`: aplica o middleware; cookie Secure em produção ou Vercel, preservando HttpOnly e SameSite=Strict.
- Mutações continuam exigindo X-Clinica-Client:web. Origin externo/null/malformado é recusado. Sec-Fetch-Site:cross-site é recusado, inclusive sem Origin. Clientes não navegador sem Origin ainda exigem o cabeçalho obrigatório.
- CORS não é aberto: interface e API utilizam a mesma origem, com chamadas relativas a /api. Não há Access-Control-Allow-Origin curinga nem credenciais para origens externas.

Referência das variáveis de sistema, disponíveis em runtime e fornecidas sem protocolo: [documentação oficial da Vercel](https://vercel.com/docs/environment-variables/system-environment-variables). O reconhecimento de preview depende de essas variáveis de sistema estarem habilitadas; o domínio oficial não depende delas.

## Configuração de produção

Na Vercel, em Settings → Environment Variables → Production, configure:

```text
APP_ORIGIN=https://clinica-medica-xi-eight.vercel.app
NODE_ENV=production
```

Não copie NODE_ENV=development nem APP_ORIGIN local do `.env.example` para produção. O domínio oficial é autorizado explicitamente mesmo se APP_ORIGIN estiver ausente ou incorretamente local, mas recomenda-se manter a variável correta. Após enviar o código, faça novo deploy. Este trabalho não alterou variáveis no painel nem publicou um deploy.

Nenhuma migration é necessária. Senhas e registros da Neon não foram modificados. Os testes de autenticação com credenciais válidas usam somente fixtures em schema novo do PostgreSQL local.

## Arquivos

Alterados: `server/app.ts`, `.env.example`, `tests/regras.test.ts`, `scripts/testar-local.mjs`.
Adicionados: `server/origens.ts`, `tests/origens.test.ts` e este relatório.

Testes cobrem domínio oficial, APP_ORIGIN ausente/local/com barra final, produção e preview simulados, origens hostis, localhost/HTTP recusados em produção, cabeçalhos forjados, CSRF, ausência de CORS aberto e cookie seguro no login.

Resultado executado: **59 testes aprovados, zero falhas; build TypeScript/Vite aprovado**. A configuração de produção foi simulada nos testes; o código corrigido ainda não foi publicado na Vercel.
