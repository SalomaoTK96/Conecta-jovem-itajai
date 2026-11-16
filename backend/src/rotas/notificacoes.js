const express = require("express");

const banco = require("../banco");
const { exigirLogin } = require("../seguranca/porta");
const { notificacaoParaTela } = require("../notificacoes/regras");

const rotas = express.Router();

// Notificações são de qualquer perfil, mas sempre só as de quem está no token.
rotas.use(exigirLogin);

function erro(mensagem) {
  return { erros: [{ campo: null, mensagem }] };
}

// As 50 mais recentes bastam: notificação antiga já foi vista na tela da
// candidatura, e a lista não fica pesada.
const LIMITE = 50;

// GET /notificacoes -> as notificações de quem está logado, mais novas primeiro
rotas.get("/", async (req, res) => {
  try {
    const notificacoes = await banco.notificacao.findMany({
      where: { destinatarioId: req.usuario.id },
      orderBy: [{ criadaEm: "desc" }, { id: "desc" }],
      take: LIMITE,
      include: { candidatura: { select: { vaga: { select: { titulo: true } } } } },
    });

    return res.json({
      notificacoes: notificacoes.map((n) => notificacaoParaTela(n, req.usuario.perfil)),
    });
  } catch (falha) {
    console.error("Falha ao listar notificações:", falha);
    return res.status(500).json(erro("Não foi possível carregar as notificações."));
  }
});

// GET /notificacoes/nao-lidas -> só o número, para o contador do cabeçalho
rotas.get("/nao-lidas", async (req, res) => {
  try {
    const total = await banco.notificacao.count({
      where: { destinatarioId: req.usuario.id, lida: false },
    });
    return res.json({ total });
  } catch (falha) {
    console.error("Falha ao contar notificações:", falha);
    return res.status(500).json(erro("Não foi possível contar as notificações."));
  }
});

// POST /notificacoes/:id/lida -> marca como lida. O destinatário entra no
// filtro: notificação de outro usuario não muda e responde 404.
rotas.post("/:id/lida", async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json(erro("Notificação não encontrada."));

  try {
    const { count } = await banco.notificacao.updateMany({
      where: { id, destinatarioId: req.usuario.id },
      data: { lida: true },
    });
    if (count === 0) return res.status(404).json(erro("Notificação não encontrada."));
    return res.status(204).end();
  } catch (falha) {
    console.error("Falha ao marcar notificação:", falha);
    return res.status(500).json(erro("Não foi possível marcar a notificação."));
  }
});

module.exports = rotas;
