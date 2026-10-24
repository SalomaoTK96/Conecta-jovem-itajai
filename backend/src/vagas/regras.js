// Regras da vaga (US08). Funções puras: recebem os dados e a data de hoje,
// devolvem a resposta. Nada de banco aqui, para dar para testar sozinho.

const TIPOS = ["APRENDIZAGEM", "ESTAGIO"];

// Áreas fixas para o filtro do mural (US09) funcionar. Com texto livre, a mesma
// área apareceria escrita de dez jeitos e a busca não acharia nada.
// A tela usa esta mesma lista; se mudar aqui, muda lá também.
const AREAS = [
  "Administração",
  "Atendimento e vendas",
  "Comércio",
  "Educação",
  "Indústria",
  "Logística",
  "Saúde",
  "Tecnologia",
  "Outra",
];

const LIMITES = {
  titulo: { minimo: 5, maximo: 100 },
  cidade: { minimo: 2, maximo: 60 },
  descricao: { minimo: 20, maximo: 2000 },
  requisitos: { minimo: 0, maximo: 1000 },
};

// O prazo pode ir até um ano à frente. Mais que isso deixaria vaga esquecida
// no mural por tempo demais.
const DIAS_MAXIMOS_DE_PRAZO = 365;

function limpar(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

// Lê "AAAA-MM-DD" e devolve o fim daquele dia no horário de Itajaí (UTC-3,
// sem horário de verão desde 2019). Prazo "até 30/11" vale o dia 30 inteiro.
function fimDoDia(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;

  const data = new Date(`${texto}T23:59:59.999-03:00`);
  if (Number.isNaN(data.getTime())) return null;

  // Recusa datas que o JavaScript "conserta" sozinho, como 2026-02-31.
  const [ano, mes, dia] = texto.split("-").map(Number);
  const conferida = new Date(Date.UTC(ano, mes - 1, dia));
  if (conferida.getUTCMonth() !== mes - 1 || conferida.getUTCDate() !== dia) return null;

  return data;
}

function conferirTamanho(erros, campo, valor, nome) {
  const { minimo, maximo } = LIMITES[campo];

  if (minimo > 0 && valor.length < minimo) {
    erros.push({ campo, mensagem: `${nome} precisa ter pelo menos ${minimo} caracteres.` });
  } else if (valor.length > maximo) {
    erros.push({ campo, mensagem: `${nome} pode ter até ${maximo} caracteres.` });
  }
}

// Confere a vaga enviada pela tela. Devolve { valido, erros, vaga }, com a vaga
// já limpa e pronta para gravar.
function conferirVaga(dados, hoje = new Date()) {
  const erros = [];

  const vaga = {
    titulo: limpar(dados.titulo),
    tipo: limpar(dados.tipo).toUpperCase(),
    area: limpar(dados.area),
    cidade: limpar(dados.cidade),
    descricao: limpar(dados.descricao),
    requisitos: limpar(dados.requisitos) || null,
    expiraEm: fimDoDia(limpar(dados.expiraEm)),
  };

  conferirTamanho(erros, "titulo", vaga.titulo, "O título");

  if (!TIPOS.includes(vaga.tipo)) {
    erros.push({ campo: "tipo", mensagem: "Escolha se a vaga é de aprendizagem ou de estágio." });
  }

  if (!AREAS.includes(vaga.area)) {
    erros.push({ campo: "area", mensagem: "Escolha uma das áreas da lista." });
  }

  conferirTamanho(erros, "cidade", vaga.cidade, "A cidade");
  conferirTamanho(erros, "descricao", vaga.descricao, "A descrição");
  conferirTamanho(erros, "requisitos", vaga.requisitos || "", "Os requisitos");

  if (!limpar(dados.expiraEm)) {
    erros.push({ campo: "expiraEm", mensagem: "Informe até quando a vaga fica aberta." });
  } else if (!vaga.expiraEm) {
    erros.push({ campo: "expiraEm", mensagem: "O prazo não é uma data válida." });
  } else if (vaga.expiraEm < hoje) {
    erros.push({ campo: "expiraEm", mensagem: "O prazo não pode ser uma data que já passou." });
  } else if (vaga.expiraEm - hoje > DIAS_MAXIMOS_DE_PRAZO * 24 * 60 * 60 * 1000) {
    erros.push({
      campo: "expiraEm",
      mensagem: `O prazo pode ser de no máximo ${DIAS_MAXIMOS_DE_PRAZO} dias a partir de hoje.`,
    });
  }

  return { valido: erros.length === 0, erros, vaga };
}

// RN06: vaga aceita candidatura só se está aberta, não foi removida e o prazo
// não passou. A US10 usa esta mesma função antes de registrar a candidatura.
function vagaAceitaCandidatura(vaga, agora = new Date()) {
  return vaga.status === "ABERTA" && !vaga.removidaEm && new Date(vaga.expiraEm) >= agora;
}

// Só vaga aberta pode ser editada. Encerrada fica como estava, para o
// histórico de quem se candidatou bater com o que foi anunciado.
function podeEditar(vaga) {
  return vaga.status === "ABERTA" && !vaga.removidaEm;
}

module.exports = {
  TIPOS,
  AREAS,
  LIMITES,
  DIAS_MAXIMOS_DE_PRAZO,
  fimDoDia,
  conferirVaga,
  vagaAceitaCandidatura,
  podeEditar,
};
