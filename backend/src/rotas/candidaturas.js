const express = require("express");

const banco = require("../banco");
const { exigirLogin, exigirPerfil } = require("../seguranca/porta");
const { situacaoDoPerfil } = require("../jovens/perfil");
const { conferirCandidatura, mensagemDeConfirmacao } = require("../candidaturas/regras");
const { criarNotificacao } = require("../notificacoes/criar");

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
