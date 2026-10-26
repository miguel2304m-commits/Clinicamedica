import type { RequestHandler } from "express";
import { exigir } from "./db.js";

type Ambiente = Record<string, string | undefined>;
export const ORIGEM_OFICIAL = "https://clinica-medica-xi-eight.vercel.app";
export const ambientePublicado = (env: Ambiente) =>
  env.NODE_ENV === "production" ||
  env.VERCEL === "1" ||
  ["production", "preview"].includes(env.VERCEL_ENV ?? "");

function normalizar(valor: string | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function origensPermitidas(env: Ambiente): Set<string> {
  const publicado = ambientePublicado(env);
  // Domínio explicitamente autorizado. Nunca confie em Host/X-Forwarded-Host.
  const origens = new Set([ORIGEM_OFICIAL]);
  const adicionar = (valor?: string) => {
    const origem = normalizar(valor);
    if (
      origem &&
      (!publicado ||
        (origem.startsWith("https://") &&
          !["localhost", "127.0.0.1", "[::1]"].includes(
            new URL(origem).hostname,
          )))
    )
      origens.add(origem);
  };
  adicionar(env.APP_ORIGIN);
  if (env.VERCEL === "1") {
    if (env.VERCEL_PROJECT_PRODUCTION_URL)
      adicionar("https://" + env.VERCEL_PROJECT_PRODUCTION_URL);
    if (env.VERCEL_ENV === "preview" && env.VERCEL_URL)
      adicionar("https://" + env.VERCEL_URL);
  }
  if (!publicado)
    for (const host of ["localhost", "127.0.0.1"])
      for (const porta of [3001, 5173]) origens.add(`http://${host}:${porta}`);
  return origens;
}

export function protegerOrigem(env: Ambiente = process.env): RequestHandler {
  return (req, _res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const recebida = req.get("origin");
      const origem = normalizar(recebida);
      exigir(
        recebida === undefined ||
          (origem && origensPermitidas(env).has(origem)),
        "Origem da requisição não permitida.",
        403,
      );
      exigir(
        req.get("sec-fetch-site") !== "cross-site",
        "Requisição entre sites não permitida.",
        403,
      );
      exigir(
        req.get("x-clinica-client") === "web",
        "Cabeçalho de proteção obrigatório.",
        403,
      );
    }
    // API e interface compartilham origem: não habilitar CORS curinga/credenciais.
    next();
  };
}
