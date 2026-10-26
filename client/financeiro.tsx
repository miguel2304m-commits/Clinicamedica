import { useState } from "react";
import { Download, Wallet } from "lucide-react";
import { type Contexto, Metrica } from "./main";
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
  moeda,
  dia,
  Badge,
  hoje,
  maisDias,
  nomes,
  listaCompleta,
} from "./lib";
export function Financeiro({
  ctx,
  pacienteId,
}: {
  ctx: Contexto;
  pacienteId?: number;
}) {
  const [busca, setBusca] = useState(""),
    [pagina, setPagina] = useState(1),
    [situacao, setSituacao] = useState("");
  const { data, erro, carregando } = useApi(
    `/cobrancas?pagina=${pagina}&busca=${encodeURIComponent(busca)}${pacienteId ? "&pacienteId=" + pacienteId : ""}${situacao ? "&situacao=" + situacao : ""}`,
    ctx.versao,
  );
  async function cobrar() {
    await ctx.acao(async () => {
      const consultas = (
        await listaCompleta("/consultas-faturaveis?tamanho=100")
      ).itens;
      const chave = crypto.randomUUID();
      ctx.abrir({
        titulo: "Emitir cobrança",
        campos: [
          selecionar(
            "consultaId",
            "Consulta",
            consultas.map((c: any) => ({
              value: c.id,
              label: `#${c.id} · ${c.paciente.nome} · ${dia(c.data)} · ${c.agendamento.convenioHistorico ?? "Particular"}`,
            })),
          ),
          campo("origem", "Descrição da origem"),
          {
            ...campo(
              "procedimentoRealizadoId",
              "Código do procedimento realizado",
              "number",
              false,
            ),
            help: "Opcional. Na cobrança de procedimento, informe o código exibido no histórico e seu valor efetivo.",
          },
          campo("valorTotal", "Valor total (R$)", "number"),
          {
            ...campo(
              "valorCoberto",
              "Valor previsto do convênio (R$)",
              "number",
            ),
            value: 0,
          },
          { ...campo("vencimento", "Vencimento", "date"), value: hoje() },
        ],
        submit: (v) => api("/cobrancas", "POST", { ...v, chave }),
      });
    }, "");
  }
  function pagar(c: any) {
    const chave = crypto.randomUUID();
    ctx.abrir({
      titulo: "Receber pagamento · cobrança #" + c.id,
      campos: [
        { ...campo("valor", "Valor recebido (R$)", "number"), value: c.saldo },
        selecionar(
          "forma",
          "Forma de pagamento",
          (c.responsavel === "CONVENIO"
            ? ["CONVENIO"]
            : ["PIX", "DINHEIRO", "CREDITO", "DEBITO"]
          ).map((value) => ({ value, label: nomes[value] })),
        ),
      ],
      submit: (v) =>
        api("/cobrancas/" + c.id + "/pagamentos", "POST", { ...v, chave }),
    });
  }
  return (
    <>
      {!pacienteId && (
        <Titulo
          titulo="Financeiro"
          sub="Acompanhe cobranças, recebimentos e o que ainda está em aberto."
        >
          <Novo onClick={cobrar}>Emitir cobrança</Novo>
        </Titulo>
      )}
      <section className="panel">
        <div className="toolbar wrap">
          <Busca
            value={busca}
            onChange={(v) => {
              setBusca(v);
              setPagina(1);
            }}
            placeholder="Pesquisar paciente…"
          />
          <div className="actions">
            <select
              aria-label="Situação da cobrança"
              value={situacao}
              onChange={(e) => {
                setSituacao(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todas as situações</option>
              {["ABERTA", "PARCIAL", "QUITADA", "CANCELADA"].map((v) => (
                <option value={v} key={v}>
                  {nomes[v]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Estado erro={erro} carregando={carregando} vazio={data?.total === 0} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Paciente / origem</th>
                <th>Responsável</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Recebido</th>
                <th>Saldo</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.itens.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.consulta.paciente.nome}</strong>
                    <small>
                      #{c.id} · {c.origem} · Consulta #{c.consultaId}
                    </small>
                    <details>
                      <summary>Pagamentos ({c.pagamentos.length})</summary>
                      {c.pagamentos.map((p: any) => (
                        <div className="payment-detail" key={p.id}>
                          <span>
                            {dia(p.data)} · {moeda(p.valor)} · {nomes[p.forma]}{" "}
                            · {nomes[p.situacao]}
                          </span>
                          {p.situacao === "RECEBIDO" && (
                            <button
                              className="text-btn"
                              onClick={() =>
                                ctx.abrir({
                                  titulo: "Estornar pagamento #" + p.id + "?",
                                  campos: [],
                                  botao: "Confirmar estorno",
                                  submit: () =>
                                    api(
                                      "/pagamentos/" + p.id + "/estorno",
                                      "POST",
                                    ),
                                })
                              }
                            >
                              Estornar
                            </button>
                          )}
                        </div>
                      ))}
                    </details>
                  </td>
                  <td>
                    {nomes[c.responsavel]}
                    {c.responsavel === "CONVENIO" && (
                      <small>{c.consulta.agendamento.convenioHistorico}</small>
                    )}
                  </td>
                  <td>{dia(c.vencimento.slice(0, 10) + "T12:00:00-03:00")}</td>
                  <td>{moeda(c.valor)}</td>
                  <td>{moeda(c.recebido)}</td>
                  <td>
                    <strong>{moeda(c.saldo)}</strong>
                  </td>
                  <td>
                    <Badge value={c.situacao} />
                  </td>
                  <td>
                    {["ABERTA", "PARCIAL"].includes(c.situacao) && (
                      <button className="text-btn" onClick={() => pagar(c)}>
                        Receber
                      </button>
                    )}
                    {c.situacao === "ABERTA" && (
                      <button
                        className="text-btn muted"
                        onClick={() =>
                          ctx.abrir({
                            titulo: "Cancelar cobrança #" + c.id + "?",
                            campos: [],
                            botao: "Confirmar cancelamento",
                            submit: () =>
                              api(
                                "/cobrancas/" + c.id + "/cancelamento",
                                "POST",
                              ),
                          })
                        }
                      >
                        Cancelar
                      </button>
                    )}
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
      <p className="footnote">
        Cobertura de convênio é uma previsão. O valor só entra em recebimentos
        após registrar o repasse.
      </p>
    </>
  );
}
export function Relatorios({ ctx }: { ctx: Contexto }) {
  const [inicio, setInicio] = useState(hoje().slice(0, 7) + "-01"),
    [fim, setFim] = useState(hoje()),
    [unidade, setUnidade] = useState(""),
    [medico, setMedico] = useState(""),
    [especialidade, setEspecialidade] = useState("");
  const uni = useApi("/catalogos/unidades?tamanho=100"),
    prof = useApi("/profissionais?tamanho=100"),
    esp = useApi("/catalogos/especialidades?tamanho=100");
  const { data, erro, carregando } = useApi(
    `/relatorios?inicio=${inicio}T00:00:00-03:00&fim=${maisDias(fim, 1)}T00:00:00-03:00${unidade ? "&unidadeId=" + unidade : ""}${medico ? "&medicoId=" + medico : ""}${especialidade ? "&especialidadeId=" + especialidade : ""}`,
    ctx.versao,
  );
  function exportar() {
    const linhas = [
      ["Indicador", "Valor"],
      ["Faturamento", data.faturamento],
      ["Recebimentos", data.recebido],
      ["Saldo atual das cobranças do período", data.aberto],
      ["Cobertura prevista", data.coberturaPrevista],
      ["Repasse recebido", data.repasseRecebido],
      [],
      ["Paciente", "Saldo paciente", "Saldo convênio"],
      ...data.pendentes.map((p: any) => [p.nome, p.paciente, p.convenio]),
    ];
    const csv =
      "\uFEFF" +
      linhas
        .map((l) =>
          l
            .map(
              (v: any) =>
                '"' +
                String(v ?? "")
                  .replaceAll('"', '""')
                  .replace(/^[=+@-]/, "'$&") +
                '"',
            )
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${inicio}-${fim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Titulo
        titulo="Relatórios"
        sub="Transforme os registros da clínica em uma visão clara dos resultados."
      >
        <button
          className="btn secondary"
          disabled={!data || carregando || !!erro}
          onClick={exportar}
        >
          <Download size={17} />
          Exportar CSV
        </button>
      </Titulo>
      <section className="panel report-filters">
        <label>
          De
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </label>
        <label>
          Até
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </label>
        {[
          [unidade, setUnidade, uni.data?.itens, "Unidade"],
          [
            medico,
            setMedico,
            prof.data?.itens.filter((p: any) => p.medico),
            "Médico",
          ],
          [especialidade, setEspecialidade, esp.data?.itens, "Especialidade"],
        ].map(([v, set, rows, label]: any) => (
          <label key={label}>
            {label}
            <select value={v} onChange={(e) => set(e.target.value)}>
              <option value="">Todos</option>
              {rows?.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>
      <Estado erro={erro} carregando={carregando} />
      {data && !erro && (
        <>
          <div className="metrics">
            <Metrica
              titulo="Faturamento"
              valor={moeda(data.faturamento)}
              nota="Cobranças emitidas no período"
              icon={<Wallet />}
            />
            <Metrica
              titulo="Recebimentos"
              valor={moeda(data.recebido)}
              nota="Pagamentos recebidos no período"
            />
            <Metrica
              titulo="Saldo em aberto"
              valor={moeda(data.aberto)}
              nota="Saldo atual das cobranças do período"
            />
            <Metrica
              titulo="Cobertura prevista"
              valor={moeda(data.coberturaPrevista)}
              nota={"Repasse recebido: " + moeda(data.repasseRecebido)}
            />
          </div>
          <div className="report-grid">
            {Object.entries(data.grupos).map(([k, grupos]: any) => (
              <section className="panel padded" key={k}>
                <h2>
                  Faturamento por{" "}
                  {
                    (
                      {
                        medicos: "médico",
                        especialidades: "especialidade",
                        unidades: "unidade",
                      } as Record<string, string>
                    )[k]
                  }
                </h2>
                <Estado vazio={!Object.keys(grupos).length} />
                {Object.entries(grupos).map(([nome, valor]: any) => (
                  <div className="bar-row" key={nome}>
                    <div>
                      <span>{nome}</span>
                      <strong>{moeda(valor)}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        style={{
                          width:
                            Math.max(
                              2,
                              (Number(valor) /
                                Math.max(1, Number(data.faturamento))) *
                                100,
                            ) + "%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="panel padded">
              <h2>Pacientes com pendências</h2>
              <p className="muted">
                O saldo do convênio é separado da dívida do paciente.
              </p>
              <Estado vazio={!data.pendentes.length} />
              {data.pendentes.map((p: any) => (
                <div className="record" key={p.pacienteId}>
                  <button
                    className="patient-link"
                    onClick={() => ctx.navegar("paciente", p.pacienteId)}
                  >
                    {p.nome}
                  </button>
                  <p>
                    Paciente: {moeda(p.paciente)} · Convênio:{" "}
                    {moeda(p.convenio)}
                  </p>
                </div>
              ))}
            </section>
            <section className="panel padded">
              <h2>Consultas por especialidade</h2>
              <Estado vazio={!data.consultas.length} />
              {data.consultas.map((c: any) => (
                <div className="record flex" key={c.especialidade}>
                  <span>{c.especialidade}</span>
                  <strong>{c.quantidade}</strong>
                </div>
              ))}
            </section>
          </div>
          <section className="panel padded">
            <h2>Procedimentos realizados no período</h2>
            <Estado vazio={!data.procedimentos.length} />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Procedimento</th>
                    <th>Paciente</th>
                    <th>Responsável</th>
                    <th>Data</th>
                    <th>Valor efetivo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.procedimentos.map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.procedimento.nome}</td>
                      <td>{p.consulta.paciente.nome}</td>
                      <td>{p.profissional.nome}</td>
                      <td>{dia(p.data)}</td>
                      <td>{moeda(p.valorCobrado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <div className="notice">
        Faturamento considera a emissão das cobranças ativas. Recebimentos
        consideram a data dos pagamentos não estornados, mesmo de cobranças
        antigas. Saldo é a posição atual das cobranças emitidas no período; não
        representa um fechamento histórico. Procedimentos só compõem o
        faturamento quando geram uma cobrança.
      </div>
    </>
  );
}
