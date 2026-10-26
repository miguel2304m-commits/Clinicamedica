import { readdir,readFile,stat } from 'node:fs/promises';
import path from 'node:path';
const arquivos=['README.md',...(await readdir('docs')).filter(n=>n.endsWith('.md')).map(n=>'docs/'+n)];
let links=0;
for(const arquivo of arquivos){const conteudo=await readFile(arquivo,'utf8');for(const match of conteudo.matchAll(/\]\(([^)]+)\)/g)){const alvo=match[1];if(/^(https?:|#)/.test(alvo))continue;await stat(path.resolve(path.dirname(arquivo),alvo.split('#')[0]));links++;}}
for(const nome of ['classes','casos-de-uso','entidade-relacionamento']){const svg=await readFile('docs/diagramas/'+nome+'.svg','utf8');if(!svg.includes('<svg')||/Syntax Error|An error has occurred/.test(svg))throw new Error('Diagrama inválido: '+nome);}
console.log(`${arquivos.length} documentos, ${links} links locais e 3 diagramas SVG verificados.`);
