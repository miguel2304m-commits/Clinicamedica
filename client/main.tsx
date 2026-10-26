import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  Wallet,
  ChartNoAxesCombined,
  Settings2,
  LogOut,
  ShieldCheck,
  ArrowUpRight,
  Building2,
  Menu,
  ClipboardList,
  HeartPulse,
} from "lucide-react";
import {
  api,
  useApi,
  Estado,
  Titulo,
  moeda,
  nomes,
  hoje,
  hora,
  Badge,
  type Usuario,
  type Formulario,
  Modal,
} from "./lib";
import { Pacientes, PacienteDetalhe } from "./pacientes";
import { Agenda } from "./agenda";
import { Cadastros, Usuarios, Auditoria } from "./cadastros";
import { Financeiro, Relatorios } from "./financeiro";
import "./style.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
export type Contexto = {
  u: Usuario;
  versao: number;
  abrir: (f: Formulario) => void;
  acao: (fn: () => Promise<any>, msg?: string) => Promise<void>;
  navegar: (pagina: string, id?: number) => void;
};
function Login({ onLogin }: { onLogin: (u: Usuario) => void }) {
  const [erro, setErro] = useState(""),
    [loading, setLoading] = useState(false);
  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="brand">
          <span className="brand-mark">
            <Activity />
          </span>
          clínica<span>integrada</span>
        </div>
        <div>
          <span className="eyebrow">GESTÃO QUE APROXIMA</span>
          <h1>
            Mais tempo
            <br />
            para cuidar.
          </h1>
          <p>
            Uma visão completa da sua clínica.
            <br />
            Do primeiro agendamento ao próximo encontro.
          </p>
          <div className="login-art" aria-hidden="true">
            <HeartPulse size={110} />
            <div className="orb a" />
            <div className="orb b" />
          </div>
        </div>
        <small>Projeto acadêmico · Dados exclusivamente fictícios</small>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">BEM-VINDO DE VOLTA</span>
          <h2>Acesse sua clínica</h2>
          <p>Entre com sua conta para continuar.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setErro("");
              const fd = new FormData(e.currentTarget);
              try {
                onLogin(await api("/login", "POST", Object.fromEntries(fd)));
              } catch (e: any) {
                setErro(e.message);
              } finally {
                setLoading(false);
              }
            }}
          >
            <label>
              E-mail
              <input
                type="email"
                name="email"
                required
                autoComplete="username"
                placeholder="seu.nome@clinica.local"
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                name="senha"
                required
                autoComplete="current-password"
                placeholder="Sua senha"
              />
            </label>
            {erro && (
              <div role="alert" className="notice error">
                {erro}
              </div>
            )}
            <button className="btn" disabled={loading}>
              {loading ? "Entrando…" : "Entrar na plataforma"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <div className="demo-box">
            <strong>Ambiente de demonstração</strong>
            <p>admin@clinica.local · Clinica@2026</p>
            <small>
              Contas de recepção, médico, enfermagem e financeiro no manual do
              projeto.
            </small>
          </div>
          <div className="secure">
            <ShieldCheck size={16} /> Acesso individual com permissões por
            perfil
          </div>
        </div>
      </section>
    </div>
  );
}
function Dashboard({ ctx }: { ctx: Contexto }) {
  const { data, erro, carregando } = useApi("/dashboard", ctx.versao);
  const agenda = useApi(
    ctx.u.perfil === "FINANCEIRO"
      ? "/dashboard"
      : `/agendamentos?inicio=${hoje()}T00:00:00-03:00&fim=${hoje()}T23:59:59-03:00`,
    ctx.versao,
  );
  if (!data) return <Estado erro={erro} carregando={carregando} />;
  return (
    <>
      <Titulo
        titulo="Visão geral"
        sub="Acompanhe o dia a dia da clínica em um só lugar."
      >
        <span className="date-chip">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "long",
            timeZone: "America/Sao_Paulo",
          }).format(new Date())}
        </span>
      </Titulo>
      <div className="welcome">
        <div>
          <span className="eyebrow">CUIDADO EM CADA ETAPA</span>
          <h2>Olá, {ctx.u.nome.split(" ")[0]}.</h2>
          <p>Sua equipe conectada. Seus atendimentos organizados.</p>
          <button
            onClick={() =>
              ctx.navegar(
                ctx.u.perfil === "FINANCEIRO" ? "financeiro" : "agenda",
              )
            }
          >
            {" "}
            {ctx.u.perfil === "FINANCEIRO"
              ? "Acompanhar cobranças"
              : "Acompanhar a agenda"}{" "}
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="welcome-icon" aria-hidden="true">
          <HeartPulse size={88} />
        </div>
      </div>
      <div className="metrics">
        <Metrica
          titulo="Atendimentos previstos"
          valor={data.agendamentos}
          nota="Agendados e confirmados hoje"
          icon={<CalendarDays />}
        />
        <Metrica
          titulo="Consultas realizadas"
          valor={data.realizadas}
          nota="Atendimentos concluídos hoje"
          icon={<Stethoscope />}
        />
        <Metrica
          titulo="Não compareceram"
          valor={data.ausencias}
          nota="Ausências registradas hoje"
          icon={<Users />}
        />
        <Metrica
          titulo={data.financeiro ? "Saldo em aberto" : "Seu acesso"}
          valor={
            data.financeiro
              ? moeda(data.financeiro.aberto)
              : nomes[ctx.u.perfil]
          }
          nota={
            data.financeiro
              ? "Todas as cobranças ativas"
              : "Informações conforme seu perfil"
          }
          icon={<Wallet />}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {ctx.u.perfil === "FINANCEIRO"
                  ? "Resumo financeiro"
                  : "Agenda de hoje"}
              </h2>
              <p>
                {ctx.u.perfil === "FINANCEIRO"
                  ? "Valores acumulados da clínica"
                  : "Um olhar sobre os próximos encontros"}
              </p>
            </div>
            <button
              className="text-btn"
              onClick={() =>
                ctx.navegar(
                  ctx.u.perfil === "FINANCEIRO" ? "financeiro" : "agenda",
                )
              }
            >
              Ver todos <ArrowUpRight size={15} />
            </button>
          </div>
          {ctx.u.perfil === "FINANCEIRO" ? (
            <div className="money-summary">
              <p>
                Faturamento <strong>{moeda(data.financeiro.faturado)}</strong>
              </p>
              <p>
                Recebimentos <strong>{moeda(data.financeiro.recebido)}</strong>
              </p>
              <p>
                Em aberto <strong>{moeda(data.financeiro.aberto)}</strong>
              </p>
            </div>
          ) : (
            <>
              <Estado
                erro={agenda.erro}
                carregando={agenda.carregando}
                vazio={agenda.data?.length === 0}
              />
              {agenda.data?.slice(0, 5).map((a: any) => (
                <div className="appointment-row" key={a.id}>
                  <span className="time">{hora(a.inicio)}</span>
                  <span className="avatar">{a.paciente.nome.slice(0, 1)}</span>
                  <div className="grow">
                    <strong>{a.paciente.nome}</strong>
                    <small>
                      {a.especialidade.nome} · {a.medico.profissional.nome}
                    </small>
                  </div>
                  <Badge value={a.situacao} />
                </div>
              ))}
            </>
          )}
        </section>
        <section className="panel shortcuts">
          <div className="panel-heading">
            <div>
              <h2>Acesso rápido</h2>
              <p>O que você precisa, por perto</p>
            </div>
          </div>
          {[
            ["pacientes", "Pacientes", "Cadastros e histórico", Users],
            ...(ctx.u.perfil !== "FINANCEIRO"
              ? [
                  [
                    "agenda",
                    "Agenda",
                    "Atendimentos e confirmações",
                    CalendarDays,
                  ],
                ]
              : []),
            ...(["ADMINISTRADOR", "FINANCEIRO"].includes(ctx.u.perfil)
              ? [
                  [
                    "relatorios",
                    "Relatórios",
                    "Indicadores da clínica",
                    ChartNoAxesCombined,
                  ],
                ]
              : []),
          ].map(([pag, tit, sub, Icon]: any) => (
            <button key={pag} onClick={() => ctx.navegar(pag)}>
              <span className="shortcut-icon">
                <Icon size={20} />
              </span>
              <span className="grow">
                <strong>{tit}</strong>
                <small>{sub}</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          ))}
          <div className="info-card">
            <ShieldCheck size={22} />
            <strong>Informações protegidas</strong>
            <p>Cada perfil acessa os dados necessários à sua atividade.</p>
          </div>
        </section>
      </div>
    </>
  );
}
export function Metrica({
  titulo,
  valor,
  nota,
  icon,
}: {
  titulo: string;
  valor: any;
  nota: string;
  icon?: React.ReactNode;
}) {
  return (
    <article className="metric">
      <div>
        <span>{titulo}</span>
        {icon}
      </div>
      <strong>{valor}</strong>
      <small>{nota}</small>
    </article>
  );
}
function App() {
  const [u, setU] = useState<Usuario | null>(null),
    [iniciando, setIniciando] = useState(true),
    [pagina, setPagina] = useState("dashboard"),
    [pacienteId, setPacienteId] = useState<number>(),
    [versao, setVersao] = useState(0),
    [form, setForm] = useState<Formulario | null>(null),
    [toast, setToast] = useState(""),
    [erro, setErro] = useState(""),
    [menu, setMenu] = useState(false);
  useEffect(() => {
    api("/me")
      .then(setU)
      .catch(() => {})
      .finally(() => setIniciando(false));
    const expirar = () => {
      setU(null);
      setForm(null);
    };
    window.addEventListener("sessao-expirada", expirar);
    return () => window.removeEventListener("sessao-expirada", expirar);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  if (iniciando) return <Estado carregando />;
  if (!u)
    return (
      <Login
        onLogin={(v) => {
          setU(v);
          setPagina("dashboard");
          setErro("");
        }}
      />
    );
  const navegar = (p: string, id?: number) => {
    setPagina(p);
    setPacienteId(id);
    setMenu(false);
    setErro("");
  };
  const ctx: Contexto = {
    u,
    versao,
    abrir: setForm,
    navegar,
    acao: async (fn, msg = "Alteração salva com sucesso.") => {
      try {
        await fn();
        setVersao((v) => v + 1);
        setToast(msg);
        setErro("");
      } catch (e: any) {
        setErro(e.message);
      }
    },
  };
  const itens: any[] = [
    ["dashboard", "Visão geral", LayoutDashboard],
    ...(u.perfil !== "FINANCEIRO" ? [["agenda", "Agenda", CalendarDays]] : []),
    ["pacientes", "Pacientes", Users],
    ...(["ADMINISTRADOR", "FINANCEIRO"].includes(u.perfil)
      ? [
          ["financeiro", "Financeiro", Wallet],
          ["relatorios", "Relatórios", ChartNoAxesCombined],
        ]
      : []),
    ["cadastros", "Cadastros", Building2],
    ...(u.perfil === "ADMINISTRADOR"
      ? [
          ["usuarios", "Usuários e acesso", Settings2],
          ["auditoria", "Auditoria", ClipboardList],
        ]
      : []),
  ];
  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">
            <Activity />
          </span>
          <div>
            clínica<small>integrada</small>
          </div>
        </div>
        <span className="nav-label">ESPAÇO DE TRABALHO</span>
        <nav>
          {itens.map(([p, t, I]) => (
            <button
              className={
                pagina === p || (pagina === "paciente" && p === "pacientes")
                  ? "active"
                  : ""
              }
              key={p}
              onClick={() => navegar(p)}
            >
              <I size={19} />
              {t}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <span className="live-dot" /> Ambiente acadêmico
            <small>Dados fictícios de demonstração</small>
          </div>
          <button
            onClick={() =>
              ctx.acao(async () => {
                await api("/logout", "POST");
                setU(null);
              }, "Sessão encerrada.")
            }
          >
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="actions">
            <button
              aria-label="Abrir menu"
              className="icon-btn mobile-menu"
              onClick={() => setMenu(!menu)}
            >
              <Menu />
            </button>
            <span>
              Clínica Integrada{" "}
              <span className="breadcrumb">
                /{" "}
                {itens.find((i) => i[0] === pagina)?.[1] ??
                  "Perfil do paciente"}
              </span>
            </span>
          </div>
          <div className="user">
            <span className="avatar">{u.nome.slice(0, 1)}</span>
            <div>
              <strong>{u.nome}</strong>
              <small>{nomes[u.perfil]}</small>
            </div>
          </div>
        </header>
        <main id="conteudo">
          {erro && (
            <div className="notice error" role="alert">
              {erro}
              <button className="text-btn" onClick={() => setErro("")}>
                Fechar
              </button>
            </div>
          )}
          {pagina === "dashboard" ? (
            <Dashboard ctx={ctx} />
          ) : pagina === "agenda" ? (
            <Agenda ctx={ctx} />
          ) : pagina === "pacientes" ? (
            <Pacientes ctx={ctx} />
          ) : pagina === "paciente" ? (
            <PacienteDetalhe ctx={ctx} id={pacienteId!} />
          ) : pagina === "cadastros" ? (
            <Cadastros ctx={ctx} />
          ) : pagina === "usuarios" ? (
            <Usuarios ctx={ctx} />
          ) : pagina === "auditoria" ? (
            <Auditoria ctx={ctx} />
          ) : pagina === "financeiro" ? (
            <Financeiro ctx={ctx} />
          ) : (
            <Relatorios ctx={ctx} />
          )}
          <footer className="page-footer">
            Clínica Integrada <span>Gestão próxima. Cuidado completo.</span>
          </footer>
        </main>
      </div>
      {form && (
        <Modal
          form={form}
          onClose={() => setForm(null)}
          onSuccess={() => {
            setForm(null);
            setVersao((v) => v + 1);
            setToast("Registro salvo com sucesso.");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
