const express = require("express");

const banco = require("../banco");
const { conferirSenha } = require("../seguranca/senha");
const { gerarToken } = require("../seguranca/token");
const { exigirLogin } = require("../seguranca/porta");

const rotas = express.Router();

// Uma mensagem só para e-mail inexistente e para senha errada. Se fossem
// diferentes, daria para descobrir quais e-mails têm conta no sistema só
// observando a resposta.
const RECUSA = {
  erros: [{ campo: null, mensagem: "E-mail ou senha incorretos." }],
};

// POST /sessao -> entra no sistema
rotas.post("/", async (req, res) => {
  const { email, senha } = req.body || {};

  if (typeof email !== "string" || typeof senha !== "string" || !email.trim() || !senha) {
    return res.status(400).json({
      erros: [{ campo: null, mensagem: "Informe e-mail e senha." }],
    });
  }

  try {
    const usuario = await banco.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { jovem: true, empresa: true },
    });

    // Mesmo sem usuário, a conferência da senha roda assim mesmo, contra um
    // hash qualquer. Sem isso, o tempo de resposta entregaria quais e-mails
    // existem: e-mail inexistente responderia na hora, e-mail real demoraria.
    const hashParaConferir =
      usuario?.senhaHash ||
      "$2b$10$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinvalidoinv";

    const senhaConfere = await conferirSenha(senha, hashParaConferir);

    if (!usuario || !senhaConfere) {
      return res.status(401).json(RECUSA);
    }

    return res.json({
      token: gerarToken(usuario),
      usuario: {
        id: usuario.id,
        email: usuario.email,
        perfil: usuario.perfil,
        nome: usuario.jovem?.nome || usuario.empresa?.razaoSocial || null,
      },
    });
  } catch (erro) {
    console.error("Falha ao autenticar:", erro);
    return res.status(500).json({
      erros: [{ campo: null, mensagem: "Não foi possível entrar agora." }],
    });
  }
});

// GET /sessao/eu -> quem está logado. Rota protegida: serve para a tela saber
// quem entrou e também como prova de que a proteção funciona.
rotas.get("/eu", exigirLogin, async (req, res) => {
  const usuario = await banco.usuario.findUnique({
    where: { id: req.usuario.id },
    include: { jovem: true, empresa: true },
  });

  if (!usuario) {
    return res.status(401).json({
      erros: [{ campo: null, mensagem: "Sessão inválida." }],
    });
  }

  return res.json({
    id: usuario.id,
    email: usuario.email,
    perfil: usuario.perfil,
    nome: usuario.jovem?.nome || usuario.empresa?.razaoSocial || null,
  });
});

module.exports = rotas;
