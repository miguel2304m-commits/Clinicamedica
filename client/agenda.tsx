import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import type { Contexto } from "./main";
import {
  api,
  useApi,
  Estado,
  Titulo,
  Novo,
  campo,
  selecionar,
  opcoes,
  hoje,
  maisDias,
  dia,
  hora,
  Badge,
  localData,
  instante,
  listaCompleta,
} from "./lib";
export function Agenda({ ctx }: { ctx: Contexto }) {
  const [data, setData] = useState(hoje()),
    [modo, setModo] = useState("dia"),
    [unidade, setUnidade] = useState(""),
    [situacao, setSituacao] = useState("");
  const dias = modo === "semana" ? 7 : 1;
  const {
    data: rows,
    erro,
    carregando,
  } = useApi(
    `/agendamentos?inicio=${data}T00:00:00-03:00&fim=${maisDias(data, dias)}T00:00:00-03:00${unidade ? "&unidadeId=" + unidade : ""}${situacao ? "&situacao=" + situacao : ""}`,
    ctx.versao,
  );
  const uni = useApi("/catalogos/unidades?tamanho=100", ctx.versao),
    prof = useApi("/profissionais?tamanho=100", ctx.versao),
    esp = useApi("/catalogos/especialidades?tamanho=100", ctx.versao);
  const pode = ["ADMINISTRADOR", "RECEPCIONISTA"].includes(ctx.u.perfil);
  async function editar(a?: any) {
    await ctx.acao(async () => {
      const pacientes = await listaCompleta("/pacientes?tamanho=100");
      ctx.abrir({
        titulo: a ? "Reagendar atendimento" : "Novo agendamento",
        campos: [
          selecionar("pacienteId", "Paciente", opcoes(pacientes.itens)),
          selecionar(
            "medicoId",
            "Médico",
            opcoes(prof.data?.itens.filter((p: any) => p.medico)),
          ),
          selecionar("unidadeId", "Unidade", opcoes(uni.data?.itens)),
          selecionar(
            "especialidadeId",
            "Especialidade",
            opcoes(esp.data?.itens),
          ),
          campo("inicio", "Início (horário de Brasília)", "datetime-local"),
          campo("fim", "Término (horário de Brasília)", "datetime-local"),
          {
            ...campo(
              "pacienteConvenioId",
              "Código do vínculo com o convênio",
              "number",
              false,
            ),
            help: "Opcional. Consulte o código na ficha do paciente. Em branco: particular.",
          },
          campo(
            "observacoes",
            "Observações administrativas",
            "textarea",
            false,
          ),
        ],
        inicial: a
          ? { ...a, inicio: localData(a.inicio), fim: localData(a.fim) }
          : { inicio: data + "T09:00", fim: data + "T09:30" },
        submit: (v) =>
          api("/agendamentos" + (a ? "/" + a.id : ""), a ? "PUT" : "POST", {
            ...v,
            pacienteId: Number(v.pacienteId),
            medicoId: Number(v.medicoId),
            unidadeId: Number(v.unidadeId),
            especialidadeId: Number(v.especialidadeId),
            pacienteConvenioId: v.pacienteConvenioId || null,
            inicio: instante(v.inicio),
            fim: instante(v.fim),
          }),
      });
    }, "");
  }
  function atender(a: any) {
    ctx.abrir({
      titulo: "Atendimento · " + a.paciente.nome,
      campos: [
        campo("queixa", "Queixa principal", "textarea"),
        campo("observacoes", "Observações médicas", "textarea", false),
        campo("diagnostico", "Diagnóstico", "textarea"),
        campo("conduta", "Conduta", "textarea"),
      ],
      botao: "Registrar consulta realizada",
      submit: async (v) => {
        await api("/consultas", "POST", { ...v, agendamentoId: a.id });
        ctx.navegar("paciente", a.pacienteId);
      },
    });
  }
  const mudar = (a: any, s: string) =>
    ctx.acao(() =>
      api("/agendamentos/" + a.id + "/situacao", "PATCH", { situacao: s }),
    );
  const card = (a: any) => (
    <div className="schedule-card" key={a.id}>
      <div className="schedule-top">
        <span>
          {hora(a.inicio)} – {hora(a.fim)}
        </span>
        <Badge value={a.situacao} />
      </div>
      <button
        className="patient-link"
        onClick={() => ctx.navegar("paciente", a.pacienteId)}
      >
        {a.paciente.nome}
        <ArrowUpRight size={15} />
      </button>
      <p>{a.especialidade.nome}</p>
      <small>
        {a.medico.profissional.nome} · {a.unidade.nome}
      </small>
      <div className="card-actions">
        {pode && ["AGENDADO", "CONFIRMADO"].includes(a.situacao) && (
          <>
            {a.situacao === "AGENDADO" && (
              <button onClick={() => mudar(a, "CONFIRMADO")}>Confirmar</button>
            )}
            <button onClick={() => editar(a)}>Reagendar</button>
            <button
              onClick={() =>
                ctx.abrir({
                  titulo: "Cancelar agendamento?",
                  campos: [],
                  botao: "Confirmar cancelamento",
                  submit: () =>
                    api("/agendamentos/" + a.id + "/situacao", "PATCH", {
                      situacao: "CANCELADO",
                    }),
                })
              }
            >
              Cancelar
            </button>
            {new Date(a.fim) < new Date() && (
              <button onClick={() => mudar(a, "NAO_COMPARECEU")}>
                Não compareceu
              </button>
            )}
          </>
        )}
        {ctx.u.perfil === "MEDICO" &&
          ["AGENDADO", "CONFIRMADO"].includes(a.situacao) && (
            <button className="primary-link" onClick={() => atender(a)}>
              Atender paciente <ArrowUpRight size={14} />
            </button>
          )}
        {a.consulta && (
          <button onClick={() => ctx.navegar("paciente", a.pacienteId)}>
            Ver atendimento
          </button>
        )}
      </div>
    </div>
  );
  return (
    <>
      <Titulo
        titulo="Agenda"
        sub="Organize os encontros e acompanhe cada atendimento."
      >
        {pode && <Novo onClick={() => editar()}>Novo agendamento</Novo>}
      </Titulo>
      <section className="panel">
        <div className="toolbar wrap">
          <div className="actions">
            <button
              className="icon-btn"
              aria-label="Período anterior"
              onClick={() => setData(maisDias(data, -dias))}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="date-select">
              <CalendarDays size={17} />
              <input
                aria-label="Data da agenda"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </label>
            <button
              className="icon-btn"
              aria-label="Próximo período"
              onClick={() => setData(maisDias(data, dias))}
            >
              <ChevronRight size={18} />
            </button>
            <button
              className="btn secondary compact"
              onClick={() => setData(hoje())}
            >
              Hoje
            </button>
          </div>
          <div className="actions">
            <select
              aria-label="Filtrar por unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
            >
              <option value="">Todas as unidades</option>
              {uni.data?.itens.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar situação"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
            >
              <option value="">Todas as situações</option>
              {[
                "AGENDADO",
                "CONFIRMADO",
                "REALIZADO",
                "CANCELADO",
                "NAO_COMPARECEU",
              ].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
            <div className="segmented">
              <button
                className={modo === "dia" ? "selected" : ""}
                onClick={() => setModo("dia")}
              >
                Dia
              </button>
              <button
                className={modo === "semana" ? "selected" : ""}
                onClick={() => setModo("semana")}
              >
                Semana
              </button>
            </div>
          </div>
        </div>
        <Estado erro={erro} carregando={carregando} />
        {!carregando &&
          (modo === "semana" ? (
            <div className="week-grid">
              {Array.from({ length: 7 }, (_, i) => maisDias(data, i)).map(
                (d) => (
                  <section className="week-day" key={d}>
                    <h3>
                      {new Intl.DateTimeFormat("pt-BR", {
                        weekday: "short",
                        day: "numeric",
                        month: "numeric",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(d + "T12:00:00-03:00"))}
                    </h3>
                    {rows
                      ?.filter((a: any) => localData(a.inicio).startsWith(d))
                      .map(card)}
                    {!rows?.some((a: any) =>
                      localData(a.inicio).startsWith(d),
                    ) && <p className="muted">Sem agendamentos</p>}
                  </section>
                ),
              )}
            </div>
          ) : (
            <div className="daily-grid">
              {rows?.map(card)}
              <Estado vazio={rows?.length === 0} />
            </div>
          ))}
      </section>
      <p className="footnote">
        Horários de Brasília · {dia(data + "T12:00:00-03:00")} · Consultas
        realizadas são registradas pelo médico responsável.
      </p>
    </>
  );
}
