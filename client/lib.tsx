import { useEffect, useState, useRef, type ReactNode } from "react";
import {
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  LoaderCircle,
} from "lucide-react";
export type Usuario = {
  id: number;
  nome: string;
  perfil: string;
  email: string;
  profissionalId: number | null;
};
export const nomes: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  RECEPCIONISTA: "Recepção",
  MEDICO: "Médico",
  ENFERMAGEM: "Enfermagem",
  FINANCEIRO: "Financeiro",
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  REALIZADO: "Realizado",
  CANCELADO: "Cancelado",
  NAO_COMPARECEU: "Não compareceu",
  SOLICITADO: "Solicitado",
  ABERTA: "Em aberto",
  PARCIAL: "Parcial",
  QUITADA: "Quitada",
  CANCELADA: "Cancelada",
  PACIENTE: "Paciente",
  CONVENIO: "Convênio",
  RECEBIDO: "Recebido",
  ESTORNADO: "Estornado",
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  CREDITO: "Cartão de crédito",
  DEBITO: "Cartão de débito",
};
export const moeda = (n: any) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(n ?? 0),
  );
export const dia = (s: any) =>
  s
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date(s))
    : "—";
export const hora = (s: any) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));
export const hoje = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
export const instante = (s: string) =>
  (s.length === 16 ? s + ":00" : s) + "-03:00";
export async function listaCompleta(url: string) {
  const primeiro = await api(url);
  let itens = [...primeiro.itens];
  for (let pagina = 2; itens.length < primeiro.total; pagina++) {
    const proxima = await api(url + "&pagina=" + pagina);
    if (!proxima.itens.length) break;
    itens.push(...proxima.itens);
  }
  return { ...primeiro, itens };
}
export const maisDias = (s: string, n: number) =>
  new Date(new Date(s + "T12:00:00-03:00").getTime() + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const localData = (s: string) =>
  s
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .format(new Date(s))
        .replace(" ", "T")
    : "";
export async function api(url: string, method = "GET", body?: unknown) {
  const r = await fetch("/api" + url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-Clinica-Client": "web" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401 && url !== "/login" && url !== "/me")
      window.dispatchEvent(new Event("sessao-expirada"));
    throw new Error(
      data.erro + (data.campos ? " " + data.campos.join(" • ") : ""),
    );
  }
  return data;
}
export function useApi(url: string, versao = 0) {
  const chave = JSON.stringify([url, versao]);
  const [estado, setEstado] = useState<{
    chave: string;
    data: any;
    erro: string;
    carregando: boolean;
  }>({ chave: "", data: null, erro: "", carregando: true });
  useEffect(() => {
    let ativo = true;
    setEstado({ chave, data: null, erro: "", carregando: true });
    (url.includes("tamanho=100") ? listaCompleta(url) : api(url))
      .then((d) => {
        if (ativo) setEstado({ chave, data: d, erro: "", carregando: false });
      })
      .catch((e) => {
        if (ativo)
          setEstado({ chave, data: null, erro: e.message, carregando: false });
      });
    return () => {
      ativo = false;
    };
  }, [url, versao]);
  return estado.chave === chave
    ? estado
    : { data: null, erro: "", carregando: true };
}
export function Estado({
  erro,
  carregando,
  vazio = false,
}: {
  erro?: string;
  carregando?: boolean;
  vazio?: boolean;
}) {
  if (erro)
    return (
      <div className="notice error" role="alert">
        {erro}
      </div>
    );
  if (carregando)
    return (
      <div className="empty" role="status">
        <LoaderCircle className="spin" /> Carregando informações…
      </div>
    );
  if (vazio)
    return (
      <div className="empty">Nenhum registro encontrado para esta seleção.</div>
    );
  return null;
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value.toLowerCase()}>
      <span />
      {nomes[value] ?? value}
    </span>
  );
}
export function Titulo({
  titulo,
  sub,
  children,
}: {
  titulo: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{titulo}</h1>
        <p>{sub}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Busca({
  value,
  onChange,
  placeholder = "Pesquisar por nome…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Paginacao({
  pagina,
  total,
  tamanho = 10,
  onChange,
}: {
  pagina: number;
  total: number;
  tamanho?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total} registro(s) · página {pagina} de{" "}
        {Math.max(1, Math.ceil(total / tamanho))}
      </span>
      <div className="actions">
        <button
          className="icon-btn"
          aria-label="Página anterior"
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-btn"
          aria-label="Próxima página"
          disabled={pagina * tamanho >= total}
          onClick={() => onChange(pagina + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
export type Campo = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: any; label: string }[];
  value?: any;
  full?: boolean;
  help?: string;
};
export type Formulario = {
  titulo: string;
  campos: Campo[];
  inicial?: any;
  submit: (v: any) => Promise<any>;
  botao?: string;
};
export function Modal({
  form,
  onClose,
  onSuccess,
}: {
  form: Formulario;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [erro, setErro] = useState(""),
    [salvando, setSalvando] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const antes = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => antes?.focus();
  }, []);
  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const fd = new FormData(e.currentTarget);
    const v: any = {};
    for (const c of form.campos) {
      if (c.type === "multiselect") v[c.name] = fd.getAll(c.name).map(Number);
      else if (c.type === "checkbox") v[c.name] = fd.has(c.name);
      else if (c.type === "number")
        v[c.name] = fd.get(c.name) === "" ? undefined : Number(fd.get(c.name));
      else v[c.name] = fd.get(c.name);
    }
    try {
      await form.submit(v);
      onSuccess();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        if (salvando) e.preventDefault();
        else onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">CLÍNICA INTEGRADA</span>
          <h2>{form.titulo}</h2>
        </div>
        <button
          className="icon-btn"
          disabled={salvando}
          aria-label="Fechar formulário"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <form onSubmit={enviar}>
        <div className="form-grid">
          {form.campos.map((c) => (
            <label className={c.full ? "full" : ""} key={c.name}>
              {c.label}
              {c.required !== false && c.type !== "checkbox" && (
                <span className="required"> *</span>
              )}
              {c.type === "select" || c.type === "multiselect" ? (
                <select
                  name={c.name}
                  required={c.required !== false}
                  multiple={c.type === "multiselect"}
                  defaultValue={
                    form.inicial?.[c.name] ??
                    c.value ??
                    (c.type === "multiselect" ? [] : "")
                  }
                >
                  {c.type !== "multiselect" && (
                    <option value="">Selecione…</option>
                  )}
                  {c.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : c.type === "textarea" ? (
                <textarea
                  name={c.name}
                  required={c.required !== false}
                  defaultValue={form.inicial?.[c.name] ?? c.value ?? ""}
                  rows={3}
                />
              ) : (
                <input
                  list={c.type === "livre" ? "opcoes-" + c.name : undefined}
                  name={c.name}
                  type={c.type === "livre" ? "text" : (c.type ?? "text")}
                  step={
                    c.type === "number"
                      ? "0.01"
                      : c.type === "datetime-local"
                        ? "1"
                        : undefined
                  }
                  required={
                    c.type === "checkbox" ? false : c.required !== false
                  }
                  defaultChecked={
                    c.type === "checkbox"
                      ? (form.inicial?.[c.name] ?? c.value)
                      : undefined
                  }
                  defaultValue={
                    c.type === "checkbox"
                      ? undefined
                      : (form.inicial?.[c.name] ?? c.value ?? "")
                  }
                  min={c.type === "number" ? "0" : undefined}
                />
              )}{" "}
              {c.type === "livre" && (
                <datalist id={"opcoes-" + c.name}>
                  {c.options?.map((o) => (
                    <option key={o.value} value={o.label} />
                  ))}
                </datalist>
              )}
              {c.help && <small>{c.help}</small>}
            </label>
          ))}
        </div>
        {erro && (
          <div className="notice error" role="alert">
            {erro}
          </div>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="btn secondary"
            disabled={salvando}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="btn" disabled={salvando}>
            {salvando ? "Salvando…" : (form.botao ?? "Salvar registro")}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
export function Novo({
  onClick,
  children = "Novo registro",
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button className="btn" onClick={onClick}>
      <Plus size={17} />
      {children}
    </button>
  );
}
export const opcoes = (rows: any[], label = "nome", key = "id") =>
  (rows ?? []).map((r) => ({ value: r[key], label: r[label] }));
export const campo = (
  name: string,
  label: string,
  type = "text",
  required = true,
): Campo => ({ name, label, type, required });
export const selecionar = (
  name: string,
  label: string,
  options: Campo["options"],
  required = true,
): Campo => ({ name, label, type: "select", options, required });
