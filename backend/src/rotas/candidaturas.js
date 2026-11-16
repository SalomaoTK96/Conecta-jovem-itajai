const express = require("express");

const banco = require("../banco");
const { exigirLogin, exigirPerfil } = require("../seguranca/porta");
const { situacaoDoPerfil } = require("../jovens/perfil");
const { conferirCandidatura, mensagemDeConfirmacao } = require("../candidaturas/regras");
const { criarNotificacao } = require("../notificacoes/criar");
const { candidaturaParaJovem, linhaDoTempo } = require("../candidaturas/acompanhar");

const rotas = express.Router();

// Só jovem se candidata. O jovem sai do token, nunca do corpo do pedido,
// então não há como se candidatar em nome de outro.
rotas.use(exigirLogin, exigirPerfil("JOVEM"));

function erro(mensagem, extra = {}) {
  return { erros: [{ campo: null, mensagem }], ...extra };
}

function jovemDoUsuario(usuarioId) {
  return banco.jovem.findUnique({
    where: { usuarioId },
    include: { perfil: true, curriculo: { include: { escolaridades: true } } },
  });
}

function lerId(valor) {
  const id = Number.parseInt(valor, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Junta o que a regra precisa: a vaga, o perfil e se já existe candidatura.
async function situacaoDoPedido(jovem, vagaId) {
  const [vaga, existente] = await Promise.all([
    banco.vaga.findUnique({
      where: { id: vagaId },
      include: { empresa: { select: { status: true } } },
    }),
    banco.candidatura.findUnique({ where: { jovemId_vagaId: { jovemId: jovem.id, vagaId } } }),
  ]);

  const perfil = situacaoDoPerfil(jovem.perfil, jovem.curriculo);
  return { vaga, perfil, jaCandidatou: Boolean(existente), existente };
}

// GET /candidaturas/vaga/:vagaId -> a página da vaga pergunta se o jovem já se
// candidatou e se o perfil está completo, para mostrar o botão certo.
rotas.get("/vaga/:vagaId", async (req, res) => {
  const vagaId = lerId(req.params.vagaId);
  if (!vagaId) return res.status(404).json(erro("Vaga não encontrada."));

  try {
    const jovem = await jovemDoUsuario(req.usuario.id);
    if (!jovem) return res.status(401).json(erro("Sessão inválida."));

    const { perfil, existente } = await situacaoDoPedido(jovem, vagaId);

    return res.json({
      jaCandidatou: Boolean(existente),
      candidatura: existente ? { id: existente.id, status: existente.status } : null,
      perfilCompleto: perfil.completo,
      faltando: perfil.faltando,
    });
  } catch (falha) {
    console.error("Falha ao consultar a candidatura:", falha);
    return res.status(500).json(erro("Não foi possível consultar a candidatura."));
  }
});

const DADOS_DA_VAGA = {
  vaga: { select: { id: true, titulo: true, cidade: true, empresa: { select: { razaoSocial: true } } } },
};

// GET /candidaturas -> as candidaturas do jovem logado, a atualização mais
// recente primeiro (US12). Só as dele: o jovem sai do token.
rotas.get("/", async (req, res) => {
  try {
    const jovem = await banco.jovem.findUnique({ where: { usuarioId: req.usuario.id } });
    if (!jovem) return res.status(401).json(erro("Sessão inválida."));

    const candidaturas = await banco.candidatura.findMany({
      where: { jovemId: jovem.id },
      orderBy: [{ atualizadaEm: "desc" }, { id: "desc" }],
      include: DADOS_DA_VAGA,
    });

    return res.json({ candidaturas: candidaturas.map(candidaturaParaJovem) });
  } catch (falha) {
    console.error("Falha ao listar as candidaturas do jovem:", falha);
    return res.status(500).json(erro("Não foi possível carregar suas candidaturas."));
  }
});

// GET /candidaturas/:id -> uma candidatura do jovem com o histórico (RN08).
// Candidatura de outro jovem responde 404, igual a uma que não existe.
rotas.get("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(404).json(erro("Candidatura não encontrada."));

  try {
    const jovem = await banco.jovem.findUnique({ where: { usuarioId: req.usuario.id } });
    if (!jovem) return res.status(401).json(erro("Sessão inválida."));

    const candidatura = await banco.candidatura.findFirst({
      where: { id, jovemId: jovem.id },
      include: { ...DADOS_DA_VAGA, historico: true },
    });
    if (!candidatura) return res.status(404).json(erro("Candidatura não encontrada."));

    return res.json({
      ...candidaturaParaJovem(candidatura),
      historico: linhaDoTempo(candidatura.historico),
    });
  } catch (falha) {
    console.error("Falha ao abrir a candidatura do jovem:", falha);
    return res.status(500).json(erro("Não foi possível abrir a candidatura."));
  }
});

// POST /candidaturas { vagaId } -> registra a candidatura com status
// "Em análise", o primeiro passo do histórico (RN08) e a notificação para o
// jovem, tudo na mesma transação.
rotas.post("/", async (req, res) => {
  const vagaId = lerId(req.body?.vagaId);
  if (!vagaId) return res.status(400).json(erro("Informe a vaga."));

  try {
    const jovem = await jovemDoUsuario(req.usuario.id);
    if (!jovem) return res.status(401).json(erro("Sessão inválida."));

    const situacao = await situacaoDoPedido(jovem, vagaId);
    const conferencia = conferirCandidatura(situacao);

    if (!conferencia.pode) {
      const extra = conferencia.irPara ? { irPara: conferencia.irPara } : {};
      return res.status(conferencia.status).json(erro(conferencia.mensagem, extra));
    }

    const candidatura = await banco.$transaction(async (tx) => {
      const nova = await tx.candidatura.create({
        data: { jovemId: jovem.id, vagaId, status: "EM_ANALISE" },
      });

      await tx.historicoCandidatura.create({
        data: { candidaturaId: nova.id, statusAnterior: null, statusNovo: "EM_ANALISE", alteradoPorId: req.usuario.id },
      });

      await criarNotificacao(tx, {
        destinatarioId: req.usuario.id,
        mensagem: mensagemDeConfirmacao(situacao.vaga),
        candidaturaId: nova.id,
      });

      return nova;
    });

    return res.status(201).json({
      id: candidatura.id,
      vagaId: candidatura.vagaId,
      status: candidatura.status,
      criadaEm: candidatura.criadaEm,
    });
  } catch (falha) {
    // RN05 também no banco: dois cliques ao mesmo tempo passam pela conferência,
    // mas a chave única (jovemId, vagaId) barra a segunda gravação.
    if (falha.code === "P2002") {
      return res.status(409).json(erro("Você já se candidatou a esta vaga. Acompanhe em Minhas candidaturas."));
    }
    console.error("Falha ao registrar a candidatura:", falha);
    return res.status(500).json(erro("Não foi possível registrar a candidatura."));
  }
});

module.exports = rotas;
