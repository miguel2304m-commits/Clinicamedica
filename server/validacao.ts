import { z } from "zod";
z.config(z.locales.pt());
export const id = z.coerce.number().int().positive();
export const texto = z.string().trim().min(1).max(300);
export const longo = z.string().trim().max(10000).default("");
export const data = z.coerce.date().refine((d) => !isNaN(+d), "Data inválida");
export const nascimento = data.refine(
  (d) => d <= new Date(),
  "Nascimento não pode estar no futuro",
);
export const dinheiro = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (s) => /^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(s),
    "Informe um valor positivo com até duas casas decimais",
  );
export function documentoValido(valor: string, tipo: "cpf" | "cnpj") {
  if (/^(\d)\1+$/.test(valor)) return false;
  const digito = (base: string, pesos: number[]) => {
    const resto = [...base].reduce((s, n, i) => s + +n * pesos[i], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  if (tipo === "cpf")
    return (
      valor.length === 11 &&
      digito(valor.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) === +valor[9] &&
      digito(valor.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) ===
        +valor[10]
    );
  return (
    valor.length === 14 &&
    digito(valor.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      +valor[12] &&
    digito(valor.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      +valor[13]
  );
}
export const cpf = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => documentoValido(v, "cpf"), "CPF inválido");
export const cnpj = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => documentoValido(v, "cnpj"), "CNPJ inválido");
export const pessoa = z.object({
  nome: texto,
  cpf,
  nascimento,
  telefone: texto,
  email: z.string().email(),
  endereco: texto,
  sexo: z.enum(["F", "M", "OUTRO", "NAO_INFORMADO"]),
});
export const agenda = z
  .object({
    pacienteId: id,
    medicoId: id,
    unidadeId: id,
    especialidadeId: id,
    pacienteConvenioId: id.nullable().optional(),
    inicio: data,
    fim: data,
    observacoes: longo,
  })
  .strict();
export const consulta = z
  .object({
    agendamentoId: id,
    queixa: texto,
    observacoes: longo,
    diagnostico: texto,
    conduta: texto,
  })
  .strict();
export const paginar = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(100).default(10),
  busca: z.string().max(100).default(""),
});
export const profissional = z.object({
  nome: texto,
  cpf,
  nascimento,
  telefone: texto,
  email: z.string().email(),
  registro: texto,
  unidades: z.array(id).min(1),
  medico: z
    .object({
      crm: texto,
      ufCrm: z.enum([
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
      ]),
      especialidades: z.array(id).min(1),
    })
    .optional(),
});
