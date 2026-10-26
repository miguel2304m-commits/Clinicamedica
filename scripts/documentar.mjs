import { Prisma } from "@prisma/client";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const { models, enums } = Prisma.dmmf.datamodel;
const schema = await readFile("prisma/schema.prisma", "utf8");
await mkdir("docs/diagramas", { recursive: true });
const associativas = [
  "PacienteAlergia",
  "MedicoEspecialidade",
  "ProfissionalUnidade",
  "UnidadeEspecialidade",
  "PacienteConvenio",
];
const header =
  "@startuml\n!pragma layout smetana\nskinparam backgroundColor #FFFFFF\nskinparam classAttributeIconSize 0\nskinparam shadowing false\nskinparam linetype ortho\nskinparam class {\n BackgroundColor #F0F7F3\n BorderColor #598574\n}\nhide empty methods\n";
let classes = header + "title Clínica Integrada — visão completa de classes\n";
let er = header + "title Clínica Integrada — modelo relacional completo\n";
let dicionario =
  "# Dicionário de dados e modelo relacional\n\nGerado de `prisma/schema.prisma` pelo comando `npm run docs`. Campos de navegação do ORM não são colunas. PKs inteiras são códigos sequenciais internos; não representam documentos civis. Não há exclusão física exposta pela API.\n\nTipos: `Int` → integer; `String` → text (salvo @db.VarChar); `DateTime` → timestamp(3), com @db.Date ou @db.Timestamptz quando indicado; `Decimal` → numeric(12,2); `Boolean` → boolean. Datas de nascimento, adesão e vencimento não representam instantes. Valores de atendimento são instantes UTC exibidos em America/Sao_Paulo.\n\n";
const tipos = new Set(models.map((m) => m.name));
for (const m of models) {
  const scalars = m.fields.filter((f) => f.kind !== "object");
  const bloco =
    schema.match(new RegExp(`model ${m.name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ??
    "";
  const campos = scalars.map((f) => {
    const linha =
      bloco.split("\n").find((l) => l.trim().startsWith(f.name + " ")) ?? "";
    const db = linha.match(/@db\.\w+(?:\([^)]*\))?/g)?.join(" ") ?? "";
    return { f, db, linha };
  });
  const atributos = campos
    .map(
      ({ f, db }) =>
        `  ${f.name}: ${f.type}${f.isRequired ? "" : "?"}${f.isId ? " <<PK>>" : ""}${f.isUnique ? " <<UQ>>" : ""}${db ? " " + db : ""}`,
    )
    .join("\n");
  classes += `class ${m.name}${associativas.includes(m.name) ? " <<associativa>>" : ""} {\n${atributos}\n}\n`;
  er += `entity ${m.name} {\n${atributos}\n}\n`;
  dicionario += `## ${m.name}\n\n| Campo | Tipo PostgreSQL / domínio | Nulo | Restrições e valor inicial |\n|---|---|---|---|\n`;
  for (const { f, db, linha } of campos) {
    const restricoes = [
      f.isId ? "PK" : "",
      f.isUnique ? "UNIQUE" : "",
      linha.match(/@default\(.+/)?.[0]?.replace(/ @.*/, "") ?? "",
    ]
      .filter(Boolean)
      .join("; ");
    dicionario += `| ${f.name} | ${db || f.type} | ${f.isRequired ? "Não" : "Sim"} | ${restricoes || "—"} |\n`;
  }
  const keys = bloco
    .split("\n")
    .filter((l) => l.trim().startsWith("@@"))
    .map((l) => l.trim());
  if (keys.length)
    dicionario +=
      "\nChaves e índices: " +
      keys.map((k) => "`" + k + "`").join(", ") +
      ".\n";
  for (const f of m.fields.filter(
    (f) => f.kind === "object" && f.relationFromFields?.length,
  ))
    dicionario += `\nFK: ${f.relationFromFields.join(", ")} → ${f.type}(${f.relationToFields.join(", ")}). Exclusão: ${f.relationOnDelete ?? "Restrict/SetNull conforme nulabilidade; consulte migration SQL"}.\n`;
  dicionario += "\n";
}
for (const e of enums)
  classes += `enum ${e.name} {\n${e.values.map((v) => "  " + v.name).join("\n")}\n}\n`;
for (const m of models)
  for (const f of m.fields.filter(
    (f) => f.kind === "object" && f.relationFromFields?.length,
  )) {
    const destino = models.find((x) => x.name === f.type);
    const inversa = destino.fields.find(
      (x) =>
        x.type === m.name &&
        x.relationName === f.relationName &&
        !x.relationFromFields?.length,
    );
    let origemMult = inversa?.isList ? "0..*" : "0..1";
    let destinoMult = f.isRequired ? "1" : "0..1";
    if (m.name === "Prontuario" && f.type === "Paciente") origemMult = "1";
    if (m.name === "ItemPrescricao" && f.type === "Prescricao")
      origemMult = "1..*";
    if (m.name === "MedicoEspecialidade" && f.type === "Medico")
      origemMult = "1..*";
    if (m.name === "Medico" && f.type === "Profissional")
      classes +=
        "Medico --|> Profissional : especialização por PK compartilhada\n";
    else if (m.name === "ItemPrescricao" && f.type === "Prescricao")
      classes += `Prescricao "1" *-- "1..*" ItemPrescricao\n`;
    else
      classes += `${m.name} "${origemMult}" -- "${destinoMult}" ${f.type} : ${f.relationFromFields.join(",")}\n`;
    er += `${m.name} "${origemMult}" -- "${destinoMult}" ${f.type} : FK ${f.relationFromFields.join(",")}\n`;
  }
classes += `class ServicoAgenda <<serviço>> {\n +validarAgenda(tx, entrada, ignorarId): Promise\n +reagendar(id, entrada): Agendamento\n +realizarConsulta(entrada): Consulta\n}\nclass ServicoFinanceiro <<serviço>> {\n +saldo(tx, cobrancaId): Saldo\n +emitirCobrancas(entrada): Cobranca[]\n +receberPagamento(entrada): Pagamento\n +estornar(id): Pagamento\n}\nclass ControleAcesso <<serviço>> {\n +escopoPaciente(usuario, pacienteId): void\n +consultaPropria(usuario, consultaId): Consulta\n +auditar(tx, usuario, acao, recurso): void\n}\nServicoAgenda ..> Agendamento\nServicoAgenda ..> Consulta\nServicoFinanceiro ..> Cobranca\nServicoFinanceiro ..> Pagamento\nControleAcesso ..> Usuario\nnote bottom of Prontuario\nExatamente um por paciente, validado por\nUNIQUE + trigger diferida no PostgreSQL.\nend note\nnote bottom of ServicoAgenda\nServiços representam funções e handlers Express,\nnão classes instanciadas do TypeScript.\nend note\n@enduml\n`;
er += "@enduml\n";
dicionario +=
  "## Restrições complementares\n\nA migration 002 acrescenta exclusão GiST de intervalos ativos de um mesmo médico, duração positiva de até quatro horas, valores monetários positivos/não negativos, quantidade de itens positiva, pagador coerente com vínculo de convênio e resultado coerente com a situação do exame. Triggers diferidas exigem um prontuário por paciente, ao menos um item por prescrição, uma especialidade por médico e consulta coerente com seu agendamento. A FK composta de SolicitacaoExame garante o par consulta/paciente. O restante das regras, incluindo permissões, transições, repasses, parcelas e vínculos operacionais, está nos serviços transacionais da API.\n\nTodas as operações financeiras e de agendamento usam isolamento Serializable com até três novas tentativas em P2034. O banco não é uma API pública; credenciais administrativas de demonstração não devem ser compartilhadas com usuários finais.\n";
await Promise.all([
  writeFile("docs/diagramas/classes.puml", classes),
  writeFile("docs/diagramas/entidade-relacionamento.puml", er),
  writeFile("docs/dicionario-dados.md", dicionario),
]);
console.log(
  `Documentados ${models.length} modelos, ${enums.length} enumerações e seus relacionamentos.`,
);
