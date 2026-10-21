const jwt = require("jsonwebtoken");

// Quanto tempo a sessão dura. Passou disso, o token para de valer e o usuário
// entra de novo. Curto demais irrita, longo demais é risco se alguém copiar o
// token da máquina de outra pessoa.
const VALIDADE = "8h";

function segredo() {
  const valor = process.env.JWT_SECRET;

  // Melhor quebrar aqui do que assinar token com segredo vazio: um token
  // assinado com "" qualquer pessoa consegue forjar.
  if (!valor || valor.trim().length < 16) {
    throw new Error(
      "JWT_SECRET ausente ou curto demais no .env. Gere um texto longo e aleatório."
    );
  }

  return valor;
}

// Dentro do token vai só o que identifica o usuário e o que ele pode fazer.
// Nada de senha, nada de hash, nada de dado pessoal: o conteúdo do token é
// legível por quem o tiver em mãos, o que ele não consegue é alterar.
function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
    segredo(),
    { expiresIn: VALIDADE }
  );
}

// Devolve o conteúdo do token quando ele é válido e está no prazo, e null
// quando é falso, foi alterado ou venceu.
function lerToken(texto) {
  if (typeof texto !== "string" || !texto.trim()) return null;

  try {
    return jwt.verify(texto.trim(), segredo());
  } catch {
    return null;
  }
}

module.exports = { gerarToken, lerToken, VALIDADE };
