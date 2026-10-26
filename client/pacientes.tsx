import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Phone,
  Mail,
  ShieldCheck,
  Pencil,
} from "lucide-react";
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
  dia,
  moeda,
  Badge,
  hoje,
  localData,
  instante,
} from "./lib";
import { pessoaCampos } from "./cadastros";
import { Financeiro } from "./financeiro";
const campos = [
  ...pessoaCampos,
  selecionar("sexo", "Sexo", [
    { value: "F", label: "Feminino" },
    { value: "M", label: "Masculino" },
    { value: "OUTRO", label: "Outro" },
    { value: "NAO_INFORMADO", label: "Não informado" },
  ]),
  campo("endereco", "Endereço"),
];
function editar(ctx: Contexto, p?: any) {
  ctx.abrir({
    titulo: p ? "Editar paciente" : "Cadastrar paciente",
    campos,
    inicial: p ? { ...p, nascimento: p.nascimento.slice(0, 10) } : undefined,
    submit: (v) =>
      api("/pacientes" + (p ? "/" + p.id : ""), p ? "PUT" : "POST", v),
  });
}
export function Pacientes({ ctx }: { ctx: Contexto }) {
  const [busca, setBusca] = useState(""),
    [sexo, setSexo] = useState(""),
    [pagina, setPagina] = useState(1);
  const { data, erro, carregando } = useApi(
    "/pacientes?pagina=" +
      pagina +
      "&busca=" +
      encodeURIComponent(busca) +
      (sexo ? "&sexo=" + sexo : ""),
    ctx.versao,
  );
  const pode = ["ADMINISTRADOR", "RECEPCIONISTA"].includes(ctx.u.perfil);
  return (
    <>
      <Titulo
        titulo="Pacientes"
        sub="Cada pessoa, uma história. Encontre e acompanhe seus pacientes."
      >
        {pode && <Novo onClick={() => editar(ctx)}>Novo paciente</Novo>}
      </Titulo>
      <section className="panel">
        <div className="toolbar">
          <Busca
            value={busca}
            onChange={(v) => {
              setBusca(v);
              setPagina(1);
            }}
            placeholder="Pesquisar por nome ou CPF…"
          />
          <select
            aria-label="Filtrar pacientes por sexo"
            value={sexo}
            onChange={(e) => {
              setSexo(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos os sexos</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
            <option value="OUTRO">Outro</option>
            <option value="NAO_INFORMADO">Não informado</option>
          </select>
          <span className="muted">
            {data?.total ?? 0} pacientes encontrados
          </span>
        </div>
        <Estado erro={erro} carregando={carregando} vazio={data?.total === 0} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>CPF</th>
                <th>Nascimento</th>
                <th>Contato</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.itens.map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar">{p.nome.slice(0, 1)}</span>
                      <div>
                        <strong>{p.nome}</strong>
                        <small>Paciente #{String(p.id).padStart(4, "0")}</small>
                      </div>
                    </div>
                  </td>
                  <td>{p.cpf}</td>
                  <td>{dia(p.nascimento.slice(0, 10) + "T12:00:00-03:00")}</td>
                  <td>
                    {p.telefone}
                    <small>{p.email}</small>
                  </td>
                  <td>
                    <button
                      className="text-btn"
                      onClick={() => ctx.navegar("paciente", p.id)}
                    >
                      Ver paciente <ArrowUpRight size={16} />
                    </button>
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
export function PacienteDetalhe({ ctx, id }: { ctx: Contexto; id: number }) {
  const { data: p, erro, carregando } = useApi("/pacientes/" + id, ctx.versao);
  const [tab, setTab] = useState("cadastro");
  const medico = ctx.u.perfil === "MEDICO",
    enf = ctx.u.perfil === "ENFERMAGEM",
    administrativo = ["ADMINISTRADOR", "RECEPCIONISTA"].includes(ctx.u.perfil),
    financeiro = ["ADMINISTRADOR", "FINANCEIRO"].includes(ctx.u.perfil);
  const tabs = [
    "cadastro",
    ...(medico || enf ? ["prontuario"] : []),
    ...(medico
      ? ["consultas", "exames", "prescricoes", "procedimentos"]
      : enf
        ? ["exames"]
        : []),
    ...(financeiro ? ["financeiro"] : []),
  ];
  if (!p) return <Estado erro={erro} carregando={carregando} />;
  return (
    <>
      <button
        className="text-btn back"
        onClick={() => ctx.navegar("pacientes")}
      >
        <ArrowLeft size={16} />
        Voltar para pacientes
      </button>
      <Titulo
        titulo={p.nome}
        sub={
          "Paciente #" +
          String(id).padStart(4, "0") +
          " · " +
          dia(p.nascimento.slice(0, 10) + "T12:00:00-03:00")
        }
      >
        {administrativo && (
          <button className="btn secondary" onClick={() => editar(ctx, p)}>
            <Pencil size={16} />
            Editar cadastro
          </button>
        )}
      </Titulo>
      <section className="patient-summary">
        <span className="avatar big">{p.nome.slice(0, 1)}</span>
        <div>
          <strong>{p.nome}</strong>
          <p>CPF {p.cpf}</p>
        </div>
        <span>
          <Phone size={16} />
          {p.telefone}
        </span>
        <span>
          <Mail size={16} />
          {p.email}
        </span>
      </section>
      <div className="tabs">
        {tabs.map((t) => (
          <button
            className={tab === t ? "selected" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {
              {
                cadastro: "Cadastro e convênios",
                prontuario: "Prontuário",
                consultas: "Consultas",
                exames: "Exames",
                prescricoes: "Prescrições",
                procedimentos: "Procedimentos",
                financeiro: "Financeiro",
              }[t]
            }
          </button>
        ))}
      </div>
      {tab === "cadastro" ? (
        <CadastroPaciente ctx={ctx} p={p} />
      ) : tab === "prontuario" ? (
        <Prontuario ctx={ctx} id={id} />
      ) : tab === "exames" ? (
        <Exames ctx={ctx} id={id} />
      ) : tab === "financeiro" ? (
        <Financeiro ctx={ctx} pacienteId={id} />
      ) : (
        <Historico ctx={ctx} id={id} tab={tab} />
      )}
    </>
  );
}
function CadastroPaciente({ ctx, p }: { ctx: Contexto; p: any }) {
  const convenio = useApi("/catalogos/convenios?tamanho=100", ctx.versao);
  const pode = ["ADMINISTRADOR", "RECEPCIONISTA"].includes(ctx.u.perfil);
  return (
    <div className="dashboard-grid">
      <section className="panel padded">
        <h2>Dados do paciente</h2>
        <dl>
          <dt>Nome completo</dt>
          <dd>{p.nome}</dd>
          <dt>Endereço</dt>
          <dd>{p.endereco}</dd>
          <dt>Sexo</dt>
          <dd>
            {
              {
                F: "Feminino",
                M: "Masculino",
                OUTRO: "Outro",
                NAO_INFORMADO: "Não informado",
              }[p.sexo as string]
            }
          </dd>
        </dl>
        <div className="info-card">
          <ShieldCheck />
          <p>
            O conteúdo clínico é exibido exclusivamente aos profissionais
            autorizados.
          </p>
        </div>
      </section>
      <section className="panel padded">
        <div className="panel-heading plain">
          <h2>Convênios vinculados</h2>
          {pode && (
            <Novo
              onClick={() =>
                ctx.abrir({
                  titulo: "Vincular convênio",
                  campos: [
                    selecionar(
                      "convenioId",
                      "Convênio",
                      opcoes(convenio.data?.itens),
                    ),
                    campo("carteirinha", "Número da carteirinha"),
                    {
                      ...campo("adesao", "Data de adesão", "date"),
                      value: hoje(),
                    },
                  ],
                  submit: (v) =>
                    api("/pacientes/" + p.id + "/convenios", "POST", v),
                })
              }
            >
              Vincular
            </Novo>
          )}
        </div>
        <Estado vazio={!p.convenios.length} />
        {p.convenios.map((c: any) => (
          <div className="record" key={c.id}>
            <strong>{c.convenio.nome}</strong>
            <p>Carteirinha {c.carteirinha}</p>
            <small>
              Vínculo #{c.id} · Adesão{" "}
              {dia(c.adesao.slice(0, 10) + "T12:00:00-03:00")} ·{" "}
              {c.ativo ? "Ativo" : "Inativo"}
            </small>
            {pode && (
              <button
                className="text-btn"
                onClick={() =>
                  ctx.acao(() =>
                    api(`/pacientes/${p.id}/convenios/${c.id}`, "PATCH", {
                      ativo: !c.ativo,
                    }),
                  )
                }
              >
                {c.ativo ? "Desativar vínculo" : "Reativar vínculo"}
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
function Prontuario({ ctx, id }: { ctx: Contexto; id: number }) {
  const { data, erro, carregando } = useApi(
    "/pacientes/" + id + "/prontuario",
    ctx.versao,
  );
  const alergias = useApi("/catalogos/alergias?tamanho=100", ctx.versao);
  return (
    <section className="panel padded">
      <div className="panel-heading plain">
        <div>
          <h2>Prontuário #{data?.id}</h2>
          <p>Alergias e registros de enfermagem</p>
        </div>
        <div className="actions">
          <Novo
            onClick={() =>
              ctx.abrir({
                titulo: "Registrar alergia",
                campos: [
                  selecionar(
                    "alergiaId",
                    "Alergia",
                    opcoes(alergias.data?.itens),
                  ),
                  campo("observacoes", "Observações", "textarea", false),
                ],
                submit: (v) => api("/pacientes/" + id + "/alergias", "POST", v),
              })
            }
          >
            Alergia
          </Novo>
          {ctx.u.perfil === "ENFERMAGEM" && (
            <Novo
              onClick={() =>
                ctx.abrir({
                  titulo: "Anotação de enfermagem",
                  campos: [campo("texto", "Registro", "textarea")],
                  submit: (v) =>
                    api("/pacientes/" + id + "/anotacoes", "POST", v),
                })
              }
            >
              Anotação
            </Novo>
          )}
        </div>
      </div>
      <Estado erro={erro} carregando={carregando} />
      <h3>Alergias registradas</h3>
      <Estado vazio={data?.paciente.alergias.length === 0} />
      {data?.paciente.alergias.map((a: any) => (
        <div className="notice" key={a.alergiaId}>
          <strong>{a.alergia.nome}</strong> · {a.observacoes}
        </div>
      ))}
      <h3>Registros de enfermagem</h3>
      <Estado vazio={data?.anotacoes.length === 0} />
      {data?.anotacoes.map((a: any) => (
        <article className="record" key={a.id}>
          <strong>
            {a.profissional.nome} · {dia(a.data)}
          </strong>
          <p>{a.texto}</p>
        </article>
      ))}
    </section>
  );
}
function Exames({ ctx, id }: { ctx: Contexto; id: number }) {
  const [pendentes, setPendentes] = useState(false);
  const { data, erro, carregando } = useApi(
    `/pacientes/${id}/exames?pendentes=${pendentes}`,
    ctx.versao,
  );
  return (
    <section className="panel padded">
      <div className="panel-heading plain">
        <div>
          <h2>Exames solicitados</h2>
          <p>Solicite novos exames pela aba Consultas.</p>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={pendentes}
            onChange={(e) => setPendentes(e.target.checked)}
          />
          Somente pendentes
        </label>
      </div>
      <Estado erro={erro} carregando={carregando} vazio={data?.length === 0} />
      {data?.map((e: any) => (
        <article className="record" key={e.id}>
          <div className="panel-heading plain">
            <h3>{e.exame.nome}</h3>
            <Badge value={e.situacao} />
          </div>
          <small>
            Solicitação #{e.id} · Consulta #{e.consultaId} ·{" "}
            {dia(e.solicitadoEm)}
          </small>
          {e.resultado && <p>{e.resultado}</p>}
          {["SOLICITADO", "AGENDADO"].includes(e.situacao) && (
            <div className="actions">
              {e.situacao === "SOLICITADO" && (
                <button
                  className="text-btn"
                  onClick={() =>
                    ctx.acao(() =>
                      api("/solicitacoes-exames/" + e.id, "PATCH", {
                        situacao: "AGENDADO",
                      }),
                    )
                  }
                >
                  Marcar como agendado
                </button>
              )}
              {ctx.u.perfil === "MEDICO" && (
                <>
                  <button
                    className="text-btn"
                    onClick={() =>
                      ctx.abrir({
                        titulo: "Registrar resultado",
                        campos: [
                          {
                            ...campo(
                              "realizadoEm",
                              "Realizado em (Brasília)",
                              "datetime-local",
                            ),
                            value: localData(new Date().toISOString()),
                          },
                          campo("resultado", "Resultado", "textarea"),
                        ],
                        submit: (v) =>
                          api("/solicitacoes-exames/" + e.id, "PATCH", {
                            situacao: "REALIZADO",
                            resultado: v.resultado,
                            realizadoEm: instante(v.realizadoEm),
                          }),
                      })
                    }
                  >
                    Registrar resultado
                  </button>
                  <button
                    className="text-btn"
                    onClick={() =>
                      ctx.acao(() =>
                        api("/solicitacoes-exames/" + e.id, "PATCH", {
                          situacao: "CANCELADO",
                        }),
                      )
                    }
                  >
                    Cancelar exame
                  </button>
                </>
              )}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
function Historico({
  ctx,
  id,
  tab,
}: {
  ctx: Contexto;
  id: number;
  tab: string;
}) {
  const { data, erro, carregando } = useApi(
    "/pacientes/" + id + "/historico",
    ctx.versao,
  );
  const exames = useApi("/catalogos/exames?tamanho=100", ctx.versao),
    medicamentos = useApi("/catalogos/medicamentos?tamanho=100", ctx.versao),
    procedimentos = useApi("/catalogos/procedimentos?tamanho=100", ctx.versao),
    profissionais = useApi("/profissionais?tamanho=100", ctx.versao);
  function prescrever(c: any) {
    ctx.abrir({
      titulo: "Nova prescrição · consulta #" + c.id,
      campos: [
        {
          ...campo(
            "quantidadeItens",
            "Quantidade de medicamentos (1 a 10)",
            "number",
          ),
          value: 1,
        },
      ],
      botao: "Preparar itens",
      submit: async (v) => {
        const n = Number(v.quantidadeItens);
        if (!Number.isInteger(n) || n < 1 || n > 10)
          throw new Error("Informe de 1 a 10 medicamentos.");
        setTimeout(
          () =>
            ctx.abrir({
              titulo: "Itens da prescrição",
              campos: Array.from({ length: n }, (_, i) => [
                selecionar(
                  "medicamentoId" + i,
                  `Item ${i + 1} · medicamento`,
                  opcoes(medicamentos.data?.itens),
                ),
                campo("quantidade" + i, "Quantidade", "number"),
                campo("dose" + i, "Dose"),
                campo("frequencia" + i, "Frequência"),
                campo("duracao" + i, "Duração"),
                campo("observacoes" + i, "Observações", "textarea", false),
              ]).flat(),
              submit: (v) =>
                api("/consultas/" + c.id + "/prescricoes", "POST", {
                  itens: Array.from({ length: n }, (_, i) => ({
                    medicamentoId: Number(v["medicamentoId" + i]),
                    quantidade: Number(v["quantidade" + i]),
                    dose: v["dose" + i],
                    frequencia: v["frequencia" + i],
                    duracao: v["duracao" + i],
                    observacoes: v["observacoes" + i],
                  })),
                }),
            }),
          0,
        );
      },
    });
  }
  const visiveis = data?.filter(
    (c: any) => tab === "consultas" || c[tab]?.length,
  );
  return (
    <section className="panel padded">
      <div className="panel-heading plain">
        <h2>
          {
            {
              consultas: "Histórico de consultas",
              prescricoes: "Prescrições",
              procedimentos: "Procedimentos realizados",
            }[tab]
          }
        </h2>
        <span className="muted">Registros preservados por atendimento</span>
      </div>
      <Estado
        erro={erro}
        carregando={carregando}
        vazio={visiveis?.length === 0}
      />
      {visiveis?.map((c: any) => (
        <article className="record consultation" key={c.id}>
          <div className="panel-heading plain">
            <div>
              <h3>
                {c.especialidade.nome} · {dia(c.data)}
              </h3>
              <small>
                Consulta #{c.id} · {c.medico.profissional.nome} ·{" "}
                {c.unidade.nome}
              </small>
            </div>
            <Badge value="REALIZADO" />
          </div>
          {tab === "consultas" && (
            <>
              <dl className="clinical-details">
                <dt>Queixa principal</dt>
                <dd>{c.queixa}</dd>
                <dt>Observações</dt>
                <dd>{c.observacoes || "—"}</dd>
                <dt>Diagnóstico</dt>
                <dd>{c.diagnostico}</dd>
                <dt>Conduta</dt>
                <dd>{c.conduta}</dd>
                <dt>Convênio no atendimento</dt>
                <dd>{c.agendamento.convenioHistorico ?? "Particular"}</dd>
              </dl>
              {ctx.u.profissionalId === c.medicoId && (
                <div className="actions wrap">
                  <button
                    className="btn secondary compact"
                    onClick={() =>
                      ctx.abrir({
                        titulo: "Solicitar exame",
                        campos: [
                          selecionar(
                            "exameId",
                            "Exame",
                            opcoes(exames.data?.itens),
                          ),
                        ],
                        submit: (v) =>
                          api("/consultas/" + c.id + "/exames", "POST", {
                            ...v,
                            pacienteId: id,
                          }),
                      })
                    }
                  >
                    Solicitar exame
                  </button>
                  <button
                    className="btn secondary compact"
                    onClick={() => prescrever(c)}
                  >
                    Prescrever medicamentos
                  </button>
                  <button
                    className="btn secondary compact"
                    onClick={() =>
                      ctx.abrir({
                        titulo: "Registrar procedimento",
                        campos: [
                          selecionar(
                            "procedimentoId",
                            "Procedimento",
                            opcoes(procedimentos.data?.itens),
                          ),
                          selecionar(
                            "profissionalId",
                            "Profissional responsável",
                            opcoes(profissionais.data?.itens),
                          ),
                          campo(
                            "valorCobrado",
                            "Valor efetivamente cobrado (R$)",
                            "number",
                          ),
                          {
                            ...campo(
                              "data",
                              "Realizado em (Brasília)",
                              "datetime-local",
                            ),
                            value: localData(new Date().toISOString()),
                          },
                        ],
                        submit: (v) =>
                          api("/consultas/" + c.id + "/procedimentos", "POST", {
                            ...v,
                            data: instante(v.data),
                          }),
                      })
                    }
                  >
                    Registrar procedimento
                  </button>
                </div>
              )}
            </>
          )}
          {(tab === "prescricoes" || tab === "consultas") &&
            c.prescricoes.map((p: any) => (
              <div className="prescription" key={p.id}>
                <h4>
                  Prescrição #{p.id} · {dia(p.data)}
                </h4>
                {p.itens.map((i: any) => (
                  <div key={i.id}>
                    <strong>{i.medicamento.nome}</strong>
                    <p>
                      {i.quantidade} unidade(s) · Dose: {i.dose} ·{" "}
                      {i.frequencia} · {i.duracao}
                    </p>
                    <small>{i.observacoes}</small>
                  </div>
                ))}
              </div>
            ))}
          {tab === "procedimentos" &&
            c.procedimentos.map((p: any) => (
              <div className="prescription" key={p.id}>
                <strong>
                  #{p.id} · {p.procedimento.nome} · {moeda(p.valorCobrado)}
                </strong>
                <p>
                  {dia(p.data)} · {p.profissional.nome}
                </p>
              </div>
            ))}
        </article>
      ))}
    </section>
  );
}
