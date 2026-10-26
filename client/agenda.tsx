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
      // Reconsulta ao abrir: evita opções antigas ou ainda carregando após um cadastro.
      const [pacientes, profissionais, unidades, especialidades] =
        await Promise.all([
          listaCompleta("/pacientes?tamanho=100"),
          listaCompleta("/profissionais?tamanho=100"),
          listaCompleta("/catalogos/unidades?tamanho=100"),
          listaCompleta("/catalogos/especialidades?tamanho=100"),
        ]);
      const admin = ctx.u.perfil === "ADMINISTRADOR";
      const referencias: Record<string, any[]> = {
        pacienteId: pacientes.itens,
        medicoId: profissionais.itens.filter((p: any) => p.medico),
        unidadeId: unidades.itens,
        especialidadeId: especialidades.itens,
      };
      const escolha = (nome: string, titulo: string) => ({
        ...selecionar(nome, titulo, opcoes(referencias[nome])),
        ...(admin
          ? {
              type: "livre",
              help: "Escolha uma sugestão ou digite livremente.",
            }
          : {}),
      });
      ctx.abrir({
        titulo: a ? "Reagendar atendimento" : "Novo agendamento",
        campos: [
          escolha("pacienteId", "Paciente"),
          escolha("medicoId", "Médico"),
          escolha("unidadeId", "Unidade"),
          escolha("especialidadeId", "Especialidade"),
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
          ? {
              ...a,
              ...(admin
                ? {
                    pacienteId: a.paciente.nome,
                    medicoId: a.medico.profissional.nome,
                    unidadeId: a.unidade.nome,
                    especialidadeId: a.especialidade.nome,
                  }
                : {}),
              inicio: localData(a.inicio),
              fim: localData(a.fim),
            }
          : { inicio: data + "T09:00", fim: data + "T09:30" },
        submit: (v) => {
          const ids: Record<string, number | undefined> = {};
          for (const [chave, registros] of Object.entries(referencias)) {
            const encontrados = registros.filter(
              (r) =>
                r.nome.trim().toLowerCase() ===
                String(v[chave]).trim().toLowerCase(),
            );
            if (admin && encontrados.length > 1)
              throw new Error(
                "Há cadastros com nomes iguais. Diferencie os nomes no cadastro antes de agendar.",
              );
            ids[chave] = admin ? encontrados[0]?.id : Number(v[chave]);
          }
          if (admin && (a?.livre || Object.values(ids).some((id) => !id))) {
            if (a && !a.livre)
              throw new Error(
                "Para alterar um atendimento vinculado, use nomes já cadastrados. Para nomes novos, crie um novo agendamento.",
              );
            if (v.pacienteConvenioId)
              throw new Error(
                "Vincule os cadastros antes de informar um convênio.",
              );
            return api(
              "/agendamentos-livres" + (a ? "/" + a.id : ""),
              a ? "PUT" : "POST",
              {
                pacienteNome: v.pacienteId,
                medicoNome: v.medicoId,
                unidadeNome: v.unidadeId,
                especialidadeNome: v.especialidadeId,
                inicio: instante(v.inicio),
                fim: instante(v.fim),
                observacoes: v.observacoes,
              },
            );
          }
          return api(
            "/agendamentos" + (a ? "/" + a.id : ""),
            a ? "PUT" : "POST",
            {
              ...v,
              ...ids,
              pacienteConvenioId: v.pacienteConvenioId || null,
              inicio: instante(v.inicio),
              fim: instante(v.fim),
            },
          );
        },
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
      api(
        (a.livre ? "/agendamentos-livres/" : "/agendamentos/") +
          a.id +
          "/situacao",
        "PATCH",
        { situacao: s },
      ),
    );
  const card = (a: any) => (
    <div className="schedule-card" key={(a.livre ? "livre-" : "") + a.id}>
      <div className="schedule-top">
        <span>
          {hora(a.inicio)} – {hora(a.fim)}
        </span>
        <Badge value={a.situacao} />
      </div>
      <button
        className="patient-link"
        onClick={() => !a.livre && ctx.navegar("paciente", a.pacienteId)}
        disabled={a.livre}
      >
        {a.paciente.nome}
        <ArrowUpRight size={15} />
      </button>
      <p>{a.especialidade.nome}</p>
      {a.livre && <p>Pré-agendamento · cadastros pendentes</p>}
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
                    api(
                      (a.livre ? "/agendamentos-livres/" : "/agendamentos/") +
                        a.id +
                        "/situacao",
                      "PATCH",
                      {
                        situacao: "CANCELADO",
                      },
                    ),
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
