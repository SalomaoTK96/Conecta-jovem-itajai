// Regras do currículo montado no site (US05). Funções puras: recebem o que a
// tela mandou e o ano atual, devolvem o currículo limpo ou a lista de erros.

const NIVEIS = [
  "Ensino fundamental",
  "Ensino médio",
  "Ensino técnico",
  "Ensino superior",
  "Curso livre",
];

// Dez de cada já cobre com folga quem está começando, e impede que um envio
// com milhares de itens trave o servidor.
const MAXIMO_DE_ITENS = 10;
const TAMANHO_MAXIMO_DO_OBJETIVO = 300;
const TAMANHO_MAXIMO_DA_DESCRICAO = 500;
const ANO_MAIS_ANTIGO = 1990;

function limpar(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function textoEntre(valor, minimo, maximo) {
  return valor.length >= minimo && valor.length <= maximo;
}

function lerAno(valor) {
  const ano = Number(valor);
  return Number.isInteger(ano) ? ano : null;
}

// "AAAA-MM", que é o que o campo de mês do navegador manda. Vira o dia 1
// daquele mês; para currículo, o dia não importa.
function lerMes(valor) {
  const texto = limpar(valor);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(texto)) return null;
  return new Date(`${texto}-01T00:00:00.000Z`);
}

// Cada item recebe o número dele na mensagem ("Escolaridade 2: ...") para o
// jovem achar o que corrigir quando tem mais de um.
function conferirEscolaridade(item, posicao, anoAtual) {
  const erros = [];
  const rotulo = `Escolaridade ${posicao + 1}`;

  const anoFimInformado = limpar(String(item.anoFim ?? ""));

  const escolaridade = {
    instituicao: limpar(item.instituicao),
    curso: limpar(item.curso),
    nivel: limpar(item.nivel),
    anoInicio: lerAno(item.anoInicio),
    anoFim: anoFimInformado ? lerAno(anoFimInformado) : null,
  };

  if (!textoEntre(escolaridade.instituicao, 2, 100)) {
    erros.push(`${rotulo}: informe o nome da escola ou instituição.`);
  }

  if (!textoEntre(escolaridade.curso, 2, 100)) {
    erros.push(`${rotulo}: informe o curso ou a série.`);
  }

  if (!NIVEIS.includes(escolaridade.nivel)) {
    erros.push(`${rotulo}: escolha o nível da lista.`);
  }

  if (!escolaridade.anoInicio || escolaridade.anoInicio < ANO_MAIS_ANTIGO || escolaridade.anoInicio > anoAtual) {
    erros.push(`${rotulo}: o ano de início precisa estar entre ${ANO_MAIS_ANTIGO} e ${anoAtual}.`);
  }

  // Ano de conclusão vazio quer dizer "ainda estou cursando".
  if (anoFimInformado && !escolaridade.anoFim) {
    erros.push(`${rotulo}: o ano de conclusão não é um ano válido.`);
  } else if (escolaridade.anoFim && escolaridade.anoInicio && escolaridade.anoFim < escolaridade.anoInicio) {
    erros.push(`${rotulo}: a conclusão não pode ser antes do início.`);
  } else if (escolaridade.anoFim && escolaridade.anoFim > anoAtual + 6) {
    erros.push(`${rotulo}: a previsão de conclusão está longe demais.`);
  }

  return { erros, escolaridade };
}

function conferirExperiencia(item, posicao, hoje) {
  const erros = [];
  const rotulo = `Experiência ${posicao + 1}`;

  const experiencia = {
    empresa: limpar(item.empresa),
    cargo: limpar(item.cargo),
    descricao: limpar(item.descricao) || null,
    inicio: lerMes(item.inicio),
    fim: limpar(item.fim) ? lerMes(item.fim) : null,
  };

  if (!textoEntre(experiencia.empresa, 2, 100)) {
    erros.push(`${rotulo}: informe onde foi, mesmo que seja trabalho voluntário ou informal.`);
  }

  if (!textoEntre(experiencia.cargo, 2, 100)) {
    erros.push(`${rotulo}: informe o que você fazia.`);
  }

  if ((experiencia.descricao || "").length > TAMANHO_MAXIMO_DA_DESCRICAO) {
    erros.push(`${rotulo}: a descrição pode ter até ${TAMANHO_MAXIMO_DA_DESCRICAO} caracteres.`);
  }

  if (!experiencia.inicio || experiencia.inicio > hoje) {
    erros.push(`${rotulo}: informe o mês de início, que não pode estar no futuro.`);
  }

  if (limpar(item.fim) && !experiencia.fim) {
    erros.push(`${rotulo}: o mês de saída não é válido.`);
  } else if (experiencia.fim && experiencia.inicio && experiencia.fim < experiencia.inicio) {
    erros.push(`${rotulo}: a saída não pode ser antes do início.`);
  }

  return { erros, experiencia };
}

// Confere o currículo inteiro. Experiências podem ficar vazias: quem busca o
// primeiro emprego ainda não tem nenhuma, e isso não pode travar o currículo.
function conferirCurriculo(dados, hoje = new Date()) {
  const anoAtual = hoje.getFullYear();
  const objetivo = limpar(dados.objetivo) || null;
  const escolaridades = Array.isArray(dados.escolaridades) ? dados.escolaridades : [];
  const experiencias = Array.isArray(dados.experiencias) ? dados.experiencias : [];
  const erros = [];

  if ((objetivo || "").length > TAMANHO_MAXIMO_DO_OBJETIVO) {
    erros.push({ campo: "objetivo", mensagem: `O objetivo pode ter até ${TAMANHO_MAXIMO_DO_OBJETIVO} caracteres.` });
  }

  if (escolaridades.length > MAXIMO_DE_ITENS || experiencias.length > MAXIMO_DE_ITENS) {
    erros.push({ campo: null, mensagem: `Cada seção aceita até ${MAXIMO_DE_ITENS} itens.` });
  }

  const conferidasEscolaridades = escolaridades.slice(0, MAXIMO_DE_ITENS)
    .map((item, posicao) => conferirEscolaridade(item || {}, posicao, anoAtual));
  const conferidasExperiencias = experiencias.slice(0, MAXIMO_DE_ITENS)
    .map((item, posicao) => conferirExperiencia(item || {}, posicao, hoje));

  conferidasEscolaridades.forEach(({ erros: lista }) =>
    lista.forEach((mensagem) => erros.push({ campo: "escolaridades", mensagem })));
  conferidasExperiencias.forEach(({ erros: lista }) =>
    lista.forEach((mensagem) => erros.push({ campo: "experiencias", mensagem })));

  return {
    valido: erros.length === 0,
    erros,
    curriculo: {
      objetivo,
      escolaridades: conferidasEscolaridades.map(({ escolaridade }) => escolaridade),
      experiencias: conferidasExperiencias.map(({ experiencia }) => experiencia),
    },
  };
}

// RN02: para contar no perfil completo, o currículo precisa de objetivo e de
// pelo menos uma escolaridade. Experiência não é exigida (primeiro emprego).
function curriculoCompleto(curriculo) {
  return Boolean(curriculo?.objetivo) && (curriculo?.escolaridades?.length || 0) > 0;
}

module.exports = {
  NIVEIS,
  MAXIMO_DE_ITENS,
  conferirCurriculo,
  curriculoCompleto,
};
