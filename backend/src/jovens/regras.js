// Tudo aqui é função pura: entra dado, sai resposta. Nada de banco, nada de
// rede, nada guardado entre uma chamada e outra. Duas vantagens: dá para testar
// sem subir nada, e a regra fica escrita num lugar só.

const IDADE_MINIMA = 14; // RN09
const IDADE_MAXIMA = 24; // RN09
const IDADE_QUE_DISPENSA_RESPONSAVEL = 16; // RN11
const TAMANHO_MINIMO_DA_SENHA = 8;

// Idade em anos completos. O "hoje" entra como parâmetro de propósito: assim o
// teste pode fingir qualquer data em vez de depender do dia em que roda.
function calcularIdade(dataNascimento, hoje = new Date()) {
  const anos = hoje.getFullYear() - dataNascimento.getFullYear();

  const aindaNaoFezAniversario =
    hoje.getMonth() < dataNascimento.getMonth() ||
    (hoje.getMonth() === dataNascimento.getMonth() &&
      hoje.getDate() < dataNascimento.getDate());

  return aindaNaoFezAniversario ? anos - 1 : anos;
}

// RN09. Os sinais são >= e <=: quem tem exatamente 14 e quem tem exatamente 24
// está dentro. Trocar por > e < recusaria os dois.
function idadeDentroDaFaixa(idade) {
  return idade >= IDADE_MINIMA && idade <= IDADE_MAXIMA;
}

// RN11. Com 16 anos completos já não precisa; com 15 precisa.
function precisaDeResponsavel(idade) {
  return idade < IDADE_QUE_DISPENSA_RESPONSAVEL;
}

function textoPreenchido(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

function emailParecePlausivel(email) {
  return textoPreenchido(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Devolve a data quando o texto é uma data de verdade, e null quando não é.
// Datas como "2026-02-31" caem no null, porque o JavaScript as empurra para
// março e aí o dia não bate mais com o que foi escrito.
function lerData(texto) {
  if (!textoPreenchido(texto)) return null;

  const data = new Date(`${texto.trim()}T00:00:00`);
  if (Number.isNaN(data.getTime())) return null;

  const [ano, mes, dia] = texto.trim().split("-").map(Number);
  const bate =
    data.getFullYear() === ano &&
    data.getMonth() + 1 === mes &&
    data.getDate() === dia;

  return bate ? data : null;
}

// Junta tudo: olha o cadastro inteiro e devolve a lista de problemas.
// Lista vazia quer dizer que está liberado para gravar.
function conferirCadastroDeJovem(dados, hoje = new Date()) {
  const erros = [];

  if (!textoPreenchido(dados.nome)) {
    erros.push({ campo: "nome", mensagem: "Informe o nome completo." });
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

  const nascimento = lerData(dados.dataNascimento);

  if (!nascimento) {
    erros.push({
      campo: "dataNascimento",
      mensagem: "Informe a data de nascimento no formato dia, mês e ano.",
    });
    // Sem data não dá para falar de idade, então para por aqui.
    return { valido: erros.length === 0, erros, idade: null };
  }

  const idade = calcularIdade(nascimento, hoje);

  if (!idadeDentroDaFaixa(idade)) {
    erros.push({
      campo: "dataNascimento",
      mensagem: `A plataforma atende jovens de ${IDADE_MINIMA} a ${IDADE_MAXIMA} anos.`,
    });
  } else if (precisaDeResponsavel(idade)) {
    // Só cobra responsável de quem está dentro da faixa. Recusar alguém de 10
    // anos por "falta de responsável" seria dar a dica errada.
    if (!textoPreenchido(dados.nomeResponsavel)) {
      erros.push({
        campo: "nomeResponsavel",
        mensagem: "Menores de 16 anos precisam informar o responsável legal.",
      });
    }

    if (dados.consentimento !== true) {
      erros.push({
        campo: "consentimento",
        mensagem: "É preciso registrar o consentimento do responsável legal.",
      });
    }
  }

  return { valido: erros.length === 0, erros, idade, nascimento };
}

module.exports = {
  calcularIdade,
  idadeDentroDaFaixa,
  precisaDeResponsavel,
  emailParecePlausivel,
  lerData,
  conferirCadastroDeJovem,
  IDADE_MINIMA,
  IDADE_MAXIMA,
  IDADE_QUE_DISPENSA_RESPONSAVEL,
  TAMANHO_MINIMO_DA_SENHA,
};
