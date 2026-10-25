const banco = require("../banco");
const { podePublicarVagas } = require("../empresas/validacao");

// RN01: porta das rotas que só empresa validada pode usar, como publicar vaga
// (US08). Usar depois de exigirLogin e exigirPerfil("EMPRESA").
// Quando passa, deixa a empresa em req.empresa para a rota usar.
async function exigirEmpresaValidada(req, res, next) {
  try {
    const empresa = await banco.empresa.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    if (!empresa) {
      return res.status(401).json({
        erros: [{ campo: null, mensagem: "Sessão inválida." }],
      });
    }

    if (!podePublicarVagas(empresa.status)) {
      return res.status(403).json({
        erros: [
          {
            campo: null,
            mensagem:
              "Sua empresa ainda não foi validada. Envie os documentos na tela de validação e aguarde a análise.",
          },
        ],
      });
    }

    req.empresa = empresa;
    next();
  } catch (erro) {
    console.error("Falha ao conferir a validação da empresa:", erro);
    return res.status(500).json({
      erros: [{ campo: null, mensagem: "Não foi possível conferir a empresa agora." }],
    });
  }
}

module.exports = { exigirEmpresaValidada };
