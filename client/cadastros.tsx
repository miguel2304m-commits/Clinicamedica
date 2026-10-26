import { useState } from "react";
import { Pencil, ArrowUpRight } from "lucide-react";
import type { Contexto } from "./main";
import {
  api,
  useApi,
  Estado,
  Titulo,
  Busca,
  Novo,
  Paginacao,
  campo,
  selecionar,
  opcoes,
  nomes,
  dia,
  moeda,
  type Campo,
} from "./lib";
const tipos: Record<
  string,
  { titulo: string; campos: Campo[]; colunas: string[] }
> = {
  unidades: {
    titulo: "Unidades",
    campos: [
      campo("nome", "Nome"),
      campo("endereco", "Endereço"),
      campo("telefone", "Telefone"),
      campo("horario", "Horário de funcionamento"),
    ],
    colunas: ["endereco", "telefone", "horario"],
  },
  especialidades: {
    titulo: "Especialidades",
    campos: [
      campo("nome", "Nome"),
      campo("descricao", "Descrição", "textarea", false),
    ],
    colunas: ["descricao"],
  },
  convenios: {
    titulo: "Convênios",
    campos: [
      campo("nome", "Nome"),
      campo("cnpj", "CNPJ"),
      campo("telefone", "Telefone"),
    ],
    colunas: ["cnpj", "telefone"],
  },
  alergias: {
    titulo: "Alergias",
    campos: [
      campo("nome", "Nome"),
      campo("descricao", "Descrição", "textarea", false),
    ],
    colunas: ["descricao"],
  },
  exames: {
    titulo: "Exames",
    campos: [
      campo("nome", "Nome"),
      campo("tipo", "Tipo"),
      campo("descricao", "Descrição", "textarea", false),
    ],
    colunas: ["tipo", "descricao"],
  },
  medicamentos: {
    titulo: "Medicamentos",
    campos: [
      campo("nome", "Nome"),
      campo("principioAtivo", "Princípio ativo"),
      campo("fabricante", "Fabricante"),
      campo("apresentacao", "Apresentação"),
    ],
    colunas: ["principioAtivo", "fabricante", "apresentacao"],
  },
  procedimentos: {
    titulo: "Procedimentos",
    campos: [
      campo("nome", "Nome"),
      campo("descricao", "Descrição", "textarea", false),
      campo("valorPadrao", "Valor padrão (R$)", "number"),
    ],
    colunas: ["descricao", "valorPadrao"],
  },
};
export const pessoaCampos = [
  campo("nome", "Nome completo"),
  campo("cpf", "CPF"),
  campo("nascimento", "Data de nascimento", "date"),
  campo("telefone", "Telefone"),
  campo("email", "E-mail", "email"),
];
const rotulos: Record<string, string> = {
  endereco: "Endereço",
  telefone: "Telefone",
  horario: "Funcionamento",
  descricao: "Descrição",
  cnpj: "CNPJ",
  tipo: "Tipo",
  principioAtivo: "Princípio ativo",
  fabricante: "Fabricante",
  apresentacao: "Apresentação",
  valorPadrao: "Valor padrão",
};
export function Cadastros({ ctx }: { ctx: Contexto }) {
  const [tipo, setTipo] = useState("unidades"),
    [busca, setBusca] = useState(""),
    [pagina, setPagina] = useState(1);
  const prof = tipo === "profissionais",
    config = tipos[tipo];
  const { data, erro, carregando } = useApi(
    `${prof ? "/profissionais" : "/catalogos/" + tipo}?busca=${encodeURIComponent(busca)}&pagina=${pagina}`,
    ctx.versao,
  );
  const especiais = useApi("/catalogos/especialidades?tamanho=100", ctx.versao),
    unidades = useApi("/catalogos/unidades?tamanho=100", ctx.versao);
  const pode =
    ctx.u.perfil === "ADMINISTRADOR" ||
    (tipo === "convenios" && ctx.u.perfil === "RECEPCIONISTA");
  function editar(row?: any) {
    if (prof) {
      ctx.abrir({
        titulo: row ? "Editar profissional" : "Cadastrar profissional",
        campos: [
          ...pessoaCampos,
          campo("registro", "Registro profissional"),
          {
            ...selecionar(
              "unidades",
              "Unidades de atuação",
              opcoes(unidades.data?.itens),
            ),
            type: "multiselect",
            help: "Use Ctrl ou ⌘ para selecionar mais de uma.",
          },
          campo("crm", "CRM (somente médicos)", "text", false),
          selecionar(
            "ufCrm",
            "UF do CRM",
            "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO"
              .split(" ")
              .map((value) => ({ value, label: value })),
            false,
          ),
          {
            ...selecionar(
              "especialidades",
              "Especialidades médicas",
              opcoes(especiais.data?.itens),
              false,
            ),
            type: "multiselect",
          },
        ],
        inicial: row
          ? {
              ...row,
              nascimento: row.nascimento.slice(0, 10),
              unidades: row.unidades.map((u: any) => String(u.unidadeId)),
              crm: row.medico?.crm,
              ufCrm: row.medico?.ufCrm,
              especialidades: row.medico?.especialidades.map((e: any) =>
                String(e.especialidadeId),
              ),
            }
          : undefined,
        submit: (v) => {
          const { crm, ufCrm, especialidades, ...dados } = v;
          return api(
            "/profissionais" + (row ? "/" + row.id : ""),
            row ? "PUT" : "POST",
            {
              ...dados,
              ...(crm ? { medico: { crm, ufCrm, especialidades } } : {}),
            },
          );
        },
      });
      return;
    }
    ctx.abrir({
      titulo: (row ? "Editar " : "Cadastrar ") + config.titulo.toLowerCase(),
      campos: [
        ...config.campos,
        ...(tipo === "unidades"
          ? [
              {
                ...selecionar(
                  "especialidades",
                  "Especialidades disponíveis",
                  opcoes(especiais.data?.itens),
                ),
                type: "multiselect",
                help: "Use Ctrl ou ⌘ para selecionar mais de uma.",
              },
            ]
          : []),
      ],
      inicial: row
        ? {
            ...row,
            especialidades: row.especialidades?.map((e: any) =>
              String(e.especialidadeId),
            ),
          }
        : undefined,
      submit: (v) =>
        api(
          "/catalogos/" + tipo + (row ? "/" + row.id : ""),
          row ? "PUT" : "POST",
          v,
        ),
    });
  }
  return (
    <>
      <Titulo
        titulo="Cadastros"
        sub="Organize as unidades, os profissionais e os serviços da clínica."
      />
      <div className="tabs">
        {Object.entries({
          ...tipos,
          profissionais: { titulo: "Profissionais" },
        }).map(([k, v]) => (
          <button
            key={k}
            className={tipo === k ? "selected" : ""}
            onClick={() => {
              setTipo(k);
              setBusca("");
              setPagina(1);
            }}
          >
            {v.titulo}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="toolbar">
          <Busca
            value={busca}
            onChange={(v) => {
              setBusca(v);
              setPagina(1);
            }}
          />
          {pode && <Novo onClick={() => editar()} />}
        </div>
        <Estado
          erro={erro}
          carregando={carregando}
          vazio={data?.itens.length === 0}
        />
        {data?.itens.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nome / código</th>
                  {prof ? (
                    <>
                      <th>Registro</th>
                      <th>Unidades</th>
                      <th>Especialidades</th>
                    </>
                  ) : (
                    config.colunas.map((c) => <th key={c}>{rotulos[c]}</th>)
                  )}
                  {pode && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {data.itens.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.nome}</strong>
                      <small>#{String(r.id).padStart(4, "0")}</small>
                      {tipo === "unidades" && (
                        <details>
                          <summary>Profissionais e especialidades</summary>
                          {r.profissionais?.map((p: any) => (
                            <p key={p.profissionalId}>{p.profissional.nome}</p>
                          ))}
                          <small>
                            {r.especialidades
                              ?.map((e: any) => e.especialidade.nome)
                              .join(" · ")}
                          </small>
                        </details>
                      )}
                    </td>
                    {prof ? (
                      <>
                        <td>{r.registro}</td>
                        <td>
                          {r.unidades
                            .map((u: any) => u.unidade.nome)
                            .join(", ")}
                        </td>
                        <td>
                          {r.medico?.especialidades
                            .map((e: any) => e.especialidade.nome)
                            .join(", ") ?? "—"}
                        </td>
                      </>
                    ) : (
                      config.colunas.map((c) => (
                        <td key={c}>
                          {c === "valorPadrao" ? moeda(r[c]) : r[c] || "—"}
                        </td>
                      ))
                    )}
                    {pode && (
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={"Editar " + r.nome}
                          onClick={() => editar(r)}
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacao
          pagina={pagina}
          total={data?.total ?? 0}
          onChange={setPagina}
        />
      </section>
    </>
  );
}
export function Usuarios({ ctx }: { ctx: Contexto }) {
  const { data, erro, carregando } = useApi("/usuarios", ctx.versao);
  const pros = useApi("/profissionais?tamanho=100", ctx.versao);
  function editar(r?: any) {
    ctx.abrir({
      titulo: r ? "Editar acesso" : "Criar conta de acesso",
      campos: [
        campo("nome", "Nome"),
        campo("email", "E-mail", "email"),
        campo(
          "senha",
          r
            ? "Nova senha (deixe vazio para manter)"
            : "Senha (mínimo 10 caracteres)",
          "password",
          !r,
        ),
        selecionar(
          "perfil",
          "Perfil de acesso",
          [
            "ADMINISTRADOR",
            "RECEPCIONISTA",
            "MEDICO",
            "ENFERMAGEM",
            "FINANCEIRO",
          ].map((value) => ({ value, label: nomes[value] })),
        ),
        selecionar(
          "profissionalId",
          "Profissional vinculado",
          opcoes(pros.data?.itens),
          false,
        ),
        { ...campo("ativo", "Conta ativa", "checkbox"), value: true },
      ],
      inicial: r,
      submit: (v) =>
        api("/usuarios" + (r ? "/" + r.id : ""), r ? "PUT" : "POST", {
          ...v,
          profissionalId: v.profissionalId ? Number(v.profissionalId) : null,
          senha: v.senha || undefined,
        }),
    });
  }
  return (
    <>
      <Titulo
        titulo="Usuários e acesso"
        sub="Contas individuais, perfis e vínculos com profissionais."
      >
        <Novo onClick={() => editar()}>Novo usuário</Novo>
      </Titulo>
      <div className="notice">
        O perfil define as permissões. Administradores e recepcionistas não
        acessam o conteúdo dos prontuários. Alterar uma conta encerra suas
        sessões.
      </div>
      <section className="panel">
        <Estado erro={erro} carregando={carregando} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.nome}</strong>
                    <small>{r.email}</small>
                  </td>
                  <td>{nomes[r.perfil]}</td>
                  <td>{r.ativo ? "Ativo" : "Inativo"}</td>
                  <td>
                    <button className="text-btn" onClick={() => editar(r)}>
                      Editar acesso <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function Auditoria({ ctx }: { ctx: Contexto }) {
  const [pagina, setPagina] = useState(1);
  const { data, erro, carregando } = useApi(
    "/auditoria?pagina=" + pagina,
    ctx.versao,
  );
  return (
    <>
      <Titulo
        titulo="Auditoria"
        sub="Rastreabilidade de alterações e leituras clínicas, sem conteúdo sensível nos registros."
      />
      <section className="panel">
        <Estado erro={erro} carregando={carregando} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Recurso</th>
              </tr>
            </thead>
            <tbody>
              {data?.itens.map((r: any) => (
                <tr key={r.id}>
                  <td>{dia(r.data)}</td>
                  <td>{r.usuario?.nome ?? "Não autenticado"}</td>
                  <td>{r.acao}</td>
                  <td>
                    {r.recurso} #{r.recursoId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginacao
          pagina={pagina}
          total={data?.total ?? 0}
          onChange={setPagina}
        />
      </section>
    </>
  );
}
