const { lerToken } = require("./token");

// Tira o token do cabeçalho "Authorization: Bearer <token>".
function tokenDoPedido(req) {
  const cabecalho = req.headers.authorization || "";
  const [tipo, valor] = cabecalho.split(" ");

  return tipo === "Bearer" ? valor : null;
}

// Porta de entrada das rotas protegidas: sem token válido, não passa.
// Quando passa, deixa o usuário em req.usuario para a rota usar.
function exigirLogin(req, res, next) {
  const conteudo = lerToken(tokenDoPedido(req));

  if (!conteudo) {
    return res.status(401).json({
      erros: [{ campo: null, mensagem: "Faça login para continuar." }],
    });
  }

  req.usuario = conteudo;
  next();
}

// Segunda porta, para rotas que só um tipo de usuário pode abrir. Jovem não
// entra na área da empresa, empresa não entra na do administrador.
// Usar sempre depois do exigirLogin.
function exigirPerfil(...perfisQuePodem) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        erros: [{ campo: null, mensagem: "Faça login para continuar." }],
      });
    }

    if (!perfisQuePodem.includes(req.usuario.perfil)) {
      // 403 e não 404: o endereço existe, quem pediu é que não pode abrir.
      return res.status(403).json({
        erros: [{ campo: null, mensagem: "Esta área não é do seu perfil." }],
      });
    }

    next();
  };
}

module.exports = { exigirLogin, exigirPerfil, tokenDoPedido };
