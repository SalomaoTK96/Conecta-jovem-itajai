const bcrypt = require("bcrypt");

// Fator de custo 10: é o que o RNF03 pede. Quanto maior o número, mais lenta
// fica a conta e mais caro fica para alguém tentar adivinhar a senha na força
// bruta. 10 é o equilíbrio que a maioria dos projetos usa.
const FATOR_DE_CUSTO = 10;

// Transforma a senha digitada no texto embaralhado que vai para o banco.
// O bcrypt já sorteia um salt diferente para cada senha e guarda ele dentro do
// próprio hash, por isso não precisamos de uma coluna separada para o salt.
async function gerarHash(senha) {
  if (typeof senha !== "string" || senha.length === 0) {
    throw new Error("Senha vazia não pode virar hash");
  }

  return bcrypt.hash(senha, FATOR_DE_CUSTO);
}

// Confere se a senha que o usuário digitou no login bate com o hash do banco.
// Não existe caminho de volta: o jeito de conferir é refazer a conta e comparar.
async function conferirSenha(senha, hash) {
  if (typeof senha !== "string" || typeof hash !== "string") {
    return false;
  }

  return bcrypt.compare(senha, hash);
}

module.exports = { gerarHash, conferirSenha, FATOR_DE_CUSTO };
