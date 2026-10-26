import { db } from "../server/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
export async function seed() {
  if (await db.usuario.count()) {
    console.log("Demonstração já inicializada; nenhum dado foi sobrescrito.");
    return;
  }
  const senha = await bcrypt.hash(
    process.env.DEMO_PASSWORD ?? "Clinica@2026",
    12,
  );
  await db.$transaction(
    async (tx) => {
      const especialidades = [];
      for (const nome of [
        "Cardiologia",
        "Dermatologia",
        "Ortopedia",
        "Pediatria",
        "Neurologia",
        "Clínica Geral",
      ])
        especialidades.push(
          await tx.especialidade.create({
            data: { nome, descricao: `Atendimento demonstrativo de ${nome}.` },
          }),
        );
      const unidades = [];
      for (const nome of ["Unidade Jardins", "Unidade Centro"])
        unidades.push(
          await tx.unidade.create({
            data: {
              nome,
              endereco: "Rua Exemplo, 100 — São Paulo / SP",
              telefone: "(11) 3000-0000",
              horario: "Segunda a sexta, 07h às 19h",
              especialidades: {
                create: especialidades.map((e) => ({ especialidadeId: e.id })),
              },
            },
          }),
        );
      const medicos = [];
      for (const [i, nome] of [
        "Dra. Helena Duarte",
        "Dr. Rafael Oliveira",
      ].entries())
        medicos.push(
          await tx.profissional.create({
            data: {
              nome,
              cpf: ["11144477735", "52998224725"][i],
              telefone: "(11) 90000-0000",
              email: `profissional${i + 1}@clinica.local`,
              nascimento: new Date("1983-05-12"),
              registro: `CRM/SP DEMO ${10000 + i}`,
              unidades: { create: unidades.map((u) => ({ unidadeId: u.id })) },
              medico: {
                create: {
                  crm: `DEMO${10000 + i}`,
                  ufCrm: "SP",
                  especialidades: {
                    create: especialidades.map((e) => ({
                      especialidadeId: e.id,
                    })),
                  },
                },
              },
            },
          }),
        );
      const enfermagem = await tx.profissional.create({
        data: {
          nome: "Enf. Camila Santos",
          cpf: "12345678909",
          telefone: "(11) 90000-0001",
          email: "profissional3@clinica.local",
          nascimento: new Date("1990-08-01"),
          registro: "COREN/SP DEMO 300",
          unidades: { create: { unidadeId: unidades[0].id } },
        },
      });
      for (const [nome, email, perfil, profissionalId] of [
        ["Administração", "admin@clinica.local", "ADMINISTRADOR", null],
        ["Recepção", "recepcao@clinica.local", "RECEPCIONISTA", null],
        ["Helena Duarte", "medico@clinica.local", "MEDICO", medicos[0].id],
        ["Rafael Oliveira", "medico2@clinica.local", "MEDICO", medicos[1].id],
        [
          "Camila Santos",
          "enfermagem@clinica.local",
          "ENFERMAGEM",
          enfermagem.id,
        ],
        ["Financeiro", "financeiro@clinica.local", "FINANCEIRO", null],
      ] as const)
        await tx.usuario.create({
          data: { nome, email, perfil, profissionalId, senhaHash: senha },
        });
      const convenio = await tx.convenio.create({
        data: {
          nome: "Vida Plena — fictício",
          cnpj: "11222333000181",
          telefone: "(11) 3000-0002",
        },
      });
      const alergia = await tx.alergia.create({
        data: {
          nome: "Látex",
          descricao: "Registro fictício para demonstração",
        },
      });
      await tx.alergia.create({
        data: {
          nome: "Penicilina",
          descricao: "Registro fictício para demonstração",
        },
      });
      const exames = [];
      for (const [nome, tipo] of [
        ["Hemograma completo", "Laboratorial"],
        ["Eletrocardiograma", "Cardiológico"],
        ["Ultrassonografia", "Imagem"],
      ])
        exames.push(
          await tx.exame.create({
            data: { nome, tipo, descricao: "Exame demonstrativo" },
          }),
        );
      const medicamento = await tx.medicamento.create({
        data: {
          nome: "Medicamento demonstrativo A",
          principioAtivo: "Substância fictícia A",
          fabricante: "Laboratório Exemplo",
          apresentacao: "Caixa demonstrativa",
        },
      });
      const procedimento = await tx.procedimento.create({
        data: {
          nome: "Avaliação funcional",
          descricao: "Procedimento demonstrativo",
          valorPadrao: "120.00",
        },
      });
      await tx.procedimento.create({
        data: {
          nome: "Curativo simples",
          descricao: "Procedimento demonstrativo",
          valorPadrao: "80.00",
        },
      });
      const pacientes = [];
      for (const [i, nome] of [
        "Ana Clara Martins",
        "Bruno Almeida",
        "Carolina Ferreira",
        "Daniel Costa",
        "Elisa Rodrigues",
        "Felipe Lima",
        "Gabriela Souza",
        "Henrique Mendes",
      ].entries()) {
        // CPFs sintéticos com dígitos verificadores, sem referência a pessoas reais.
        const base = String(900000001 + i);
        const dig = (s: string) => {
          const n =
            ([...s].reduce((a, v, j) => a + Number(v) * (s.length + 1 - j), 0) *
              10) %
            11;
          return n === 10 ? 0 : n;
        };
        const dez = base + dig(base);
        const cpf = dez + dig(dez);
        pacientes.push(
          await tx.paciente.create({
            data: {
              nome,
              cpf,
              nascimento: new Date(`${1980 + i * 3}-03-15`),
              sexo: i % 2 ? "M" : "F",
              telefone: `(11) 90000-00${10 + i}`,
              email: `paciente${i + 1}@exemplo.local`,
              endereco: "Rua Fictícia, 10 — São Paulo / SP",
              prontuario: { create: {} },
            },
          }),
        );
      }
      await tx.pacienteAlergia.create({
        data: {
          pacienteId: pacientes[0].id,
          alergiaId: alergia.id,
          observacoes: "Informação fictícia",
        },
      });
      const vinculo = await tx.pacienteConvenio.create({
        data: {
          pacienteId: pacientes[0].id,
          convenioId: convenio.id,
          carteirinha: "DEMO-001",
          adesao: new Date("2025-01-01"),
        },
      });
      const hoje = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date());
      for (let i = 0; i < 8; i++)
        await tx.agendamento.create({
          data: {
            pacienteId: pacientes[i].id,
            medicoId: medicos[i % 2].id,
            unidadeId: unidades[i % 2].id,
            especialidadeId: especialidades[i % 6].id,
            inicio: new Date(
              `${hoje}T${String(8 + i).padStart(2, "0")}:00:00-03:00`,
            ),
            fim: new Date(
              `${hoje}T${String(8 + i).padStart(2, "0")}:30:00-03:00`,
            ),
            situacao: i % 3 === 0 ? "CONFIRMADO" : "AGENDADO",
            ...(i === 0
              ? {
                  pacienteConvenioId: vinculo.id,
                  convenioHistorico: "Vida Plena — fictício • DEMO-001",
                }
              : {}),
          },
        });
      const ontem = new Date(Date.now() - 86400000);
      ontem.setUTCHours(12, 0, 0, 0);
      const a = await tx.agendamento.create({
        data: {
          pacienteId: pacientes[0].id,
          medicoId: medicos[0].id,
          unidadeId: unidades[0].id,
          especialidadeId: especialidades[0].id,
          inicio: ontem,
          fim: new Date(+ontem + 1800000),
          situacao: "REALIZADO",
          pacienteConvenioId: vinculo.id,
          convenioHistorico: "Vida Plena — fictício • DEMO-001",
        },
      });
      const c = await tx.consulta.create({
        data: {
          agendamentoId: a.id,
          pacienteId: a.pacienteId,
          medicoId: a.medicoId,
          unidadeId: a.unidadeId,
          especialidadeId: a.especialidadeId,
          data: ontem,
          queixa: "Acompanhamento demonstrativo",
          observacoes: "Dados inteiramente fictícios.",
          diagnostico: "Registro acadêmico sem finalidade clínica",
          conduta: "Retorno demonstrativo",
        },
      });
      await tx.solicitacaoExame.createMany({
        data: exames.map((e) => ({
          consultaId: c.id,
          pacienteId: c.pacienteId,
          exameId: e.id,
          solicitadoEm: ontem,
        })),
      });
      await tx.prescricao.create({
        data: {
          consultaId: c.id,
          data: ontem,
          itens: {
            create: {
              medicamentoId: medicamento.id,
              quantidade: 1,
              dose: "Exemplo sem uso clínico",
              frequencia: "Demonstrativa",
              duracao: "Demonstrativa",
              observacoes: "Não utilizar como orientação médica",
            },
          },
        },
      });
      await tx.procedimentoRealizado.create({
        data: {
          consultaId: c.id,
          procedimentoId: procedimento.id,
          profissionalId: medicos[0].id,
          valorCobrado: "100.00",
          data: ontem,
        },
      });
      const grupo = randomUUID();
      const cob = await tx.cobranca.create({
        data: {
          consultaId: c.id,
          grupo,
          origem: "Consulta",
          valor: "100.00",
          responsavel: "PACIENTE",
          vencimento: new Date(),
          emitidaEm: ontem,
          situacao: "PARCIAL",
        },
      });
      await tx.cobranca.create({
        data: {
          consultaId: c.id,
          grupo,
          origem: "Consulta",
          valor: "200.00",
          responsavel: "CONVENIO",
          pacienteConvenioId: vinculo.id,
          vencimento: new Date(Date.now() + 15 * 86400000),
          emitidaEm: ontem,
        },
      });
      await tx.pagamento.create({
        data: {
          cobrancaId: cob.id,
          valor: "40.00",
          forma: "PIX",
          chave: randomUUID(),
        },
      });
    },
    { timeout: 30000 },
  );
  console.log(
    "Demonstração criada: 6 contas, 8 pacientes, 2 unidades, agenda e histórico integrado.",
  );
}
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts"))
  seed().finally(() => db.$disconnect());
