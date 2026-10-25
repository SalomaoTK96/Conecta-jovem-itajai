const express = require("express");

const banco = require("../banco");
const { exigirLogin, exigirPerfil } = require("../seguranca/porta");
const { conferirPerfil, situacaoDoPerfil } = require("../jovens/perfil");

const rotas = express.Router();

// Só o próprio jovem abre o perfil (RNF08). Não existe /perfil/:id de propósito:
// o perfil é sempre o de quem está no token, então não há como pedir o de outro.
rotas.use(exigirLogin, exigirPerfil("JOVEM"));

// Monta a resposta igual nas duas rotas, para a tela tratar de um jeito só.
function resposta(perfil, curriculo) {
  const dados = {
    telefone: perfil?.telefone ?? null,
    endereco: perfil?.endereco ?? null,
    habilidades: perfil?.habilidades ?? null,
  };

  return { ...dados, situacao: situacaoDoPerfil(dados, curriculo) };
}

// Acha o jovem de quem está logado. Token válido de uma conta que sumiu do
// banco devolve null, e a rota trata como sessão inválida.
function jovemDoUsuario(usuarioId) {
  return banco.jovem.findUnique({
    where: { usuarioId },
    // O currículo vem junto porque também conta para o perfil completo (RN02).
    include: { perfil: true, curriculo: { include: { escolaridades: true } } },
  });
}

const SESSAO_INVALIDA = {
  erros: [{ campo: null, mensagem: "Sessão inválida." }],
};

// GET /perfil -> os dados do perfil de quem está logado
rotas.get("/", async (req, res) => {
  try {
    const jovem = await jovemDoUsuario(req.usuario.id);
    if (!jovem) return res.status(401).json(SESSAO_INVALIDA);

    return res.json(resposta(jovem.perfil, jovem.curriculo));
  } catch (erro) {
    console.error("Falha ao consultar perfil:", erro);
    return res.status(500).json({
      erros: [{ campo: null, mensagem: "Não foi possível abrir o perfil." }],
    });
  }
});

// PUT /perfil -> grava telefone, endereço e habilidades
rotas.put("/", async (req, res) => {
  const conferencia = conferirPerfil(req.body || {});

  if (!conferencia.valido) {
    return res.status(400).json({ erros: conferencia.erros });
  }

  try {
    const jovem = await jovemDoUsuario(req.usuario.id);
    if (!jovem) return res.status(401).json(SESSAO_INVALIDA);

    // upsert: quem não informou telefone no cadastro ainda não tem perfil
    // criado, e aqui ele nasce. Quem já tem, só atualiza.
    const perfil = await banco.perfil.upsert({
      where: { jovemId: jovem.id },
      create: { jovemId: jovem.id, ...conferencia.perfil },
      update: conferencia.perfil,
    });

    return res.json(resposta(perfil, jovem.curriculo));
  } catch (erro) {
    console.error("Falha ao salvar perfil:", erro);
    return res.status(500).json({
      erros: [{ campo: null, mensagem: "Não foi possível salvar o perfil." }],
    });
  }
});

module.exports = rotas;
