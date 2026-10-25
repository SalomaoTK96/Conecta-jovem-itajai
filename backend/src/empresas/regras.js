// Regras do cadastro de empresa, em funções puras: entra dado, sai resposta.
// Sem banco e sem rede, igual ao que foi feito para o jovem na US01.

const TAMANHO_MINIMO_DA_SENHA = 8;

function textoPreenchido(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

function emailParecePlausivel(email) {
  return textoPreenchido(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Tira pontos, barras e traços. O usuário digita 00.000.000/0001-00 e o banco
// guarda só os 14 números, senão o mesmo CNPJ entraria duas vezes escrito de
// jeitos diferentes.
function soNumeros(texto) {
  return typeof texto === "string" ? texto.replace(/\D/g, "") : "";
}

// Calcula um dígito verificador do CNPJ. Os dois dígitos do fim existem para
// pegar erro de digitação: trocar ou inverter um número derruba a conta.
function calcularDigito(numeros, pesos) {
  const soma = pesos.reduce(
    (total, peso, posicao) => total + Number(numeros[posicao]) * peso,
    0
  );

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function cnpjValido(valor) {
  const numeros = soNumeros(valor);

  if (numeros.length !== 14) return false;

  // 00000000000000, 11111111111111 e companhia passam na conta dos dígitos
  // mas não são CNPJ de ninguém.
  if (/^(\d)\1{13}$/.test(numeros)) return false;

  const primeiro = calcularDigito(numeros, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (primeiro !== Number(numeros[12])) return false;

  const segundo = calcularDigito(numeros, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return segundo === Number(numeros[13]);
}

// Olha o cadastro inteiro e devolve a lista de problemas. Lista vazia quer
// dizer que está liberado para gravar.
function conferirCadastroDeEmpresa(dados) {
  const erros = [];

  if (!textoPreenchido(dados.razaoSocial)) {
    erros.push({ campo: "razaoSocial", mensagem: "Informe o nome da empresa." });
  }

  if (!cnpjValido(dados.cnpj)) {
    erros.push({ campo: "cnpj", mensagem: "Informe um CNPJ válido, com 14 dígitos." });
  }

  if (!emailParecePlausivel(dados.email)) {
    erros.push({ campo: "email", mensagem: "Informe um e-mail válido." });
  }

  if (!textoPreenchido(dados.senha) || dados.senha.length < TAMANHO_MINIMO_DA_SENHA) {
    erros.push({
      campo: "senha",
      mensagem: `A senha precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`,
    });
  }

  return { valido: erros.length === 0, erros, cnpj: soNumeros(dados.cnpj) };
}

module.exports = {
  cnpjValido,
  soNumeros,
  emailParecePlausivel,
  conferirCadastroDeEmpresa,
  TAMANHO_MINIMO_DA_SENHA,
};
