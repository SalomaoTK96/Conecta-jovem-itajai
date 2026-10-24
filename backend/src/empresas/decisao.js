// Regras da decisão do administrador sobre o pedido de validação (US07).
// Funções puras: entra o que o admin escolheu, sai o que muda no sistema.

const TAMANHO_MINIMO_DO_MOTIVO = 10;
const TAMANHO_MAXIMO_DO_MOTIVO = 500;

// O que cada decisão faz com a solicitação e com a empresa, e se o motivo é
// obrigatório. Pedir documentos não muda a empresa: ela continua em análise e
// o reenvio entra na mesma solicitação (US06).
const DECISOES = {
  APROVAR: {
    statusSolicitacao: "APROVADA",
    statusEmpresa: "VALIDADA",
    exigeMotivo: false,
  },
  REJEITAR: {
    statusSolicitacao: "REJEITADA",
    statusEmpresa: "REJEITADA",
    exigeMotivo: true,
  },
  PEDIR_DOCUMENTOS: {
    statusSolicitacao: "DOCUMENTOS_PENDENTES",
    statusEmpresa: "EM_ANALISE",
    exigeMotivo: true,
  },
};

function limpar(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

// Confere a decisão enviada pela tela. Devolve { valido, erros, decisao, motivo }.
function conferirDecisao(dados) {
  const decisao = limpar(dados.decisao).toUpperCase();
  const motivo = limpar(dados.motivo);
  const regra = DECISOES[decisao];

  if (!regra) {
    return {
      valido: false,
      erros: [{ campo: "decisao", mensagem: "Escolha aprovar, rejeitar ou pedir documentos." }],
    };
  }

  const erros = [];

  // Rejeitar ou pedir documento sem explicar deixa a empresa sem saber o que
  // corrigir. Por isso o motivo é obrigatório nesses dois casos.
  if (regra.exigeMotivo && motivo.length < TAMANHO_MINIMO_DO_MOTIVO) {
    erros.push({
      campo: "motivo",
      mensagem: `Explique o motivo para a empresa, com pelo menos ${TAMANHO_MINIMO_DO_MOTIVO} caracteres.`,
    });
  }

  if (motivo.length > TAMANHO_MAXIMO_DO_MOTIVO) {
    erros.push({
      campo: "motivo",
      mensagem: `O motivo pode ter até ${TAMANHO_MAXIMO_DO_MOTIVO} caracteres.`,
    });
  }

  return {
    valido: erros.length === 0,
    erros,
    decisao,
    // Na aprovação o motivo não vale de nada para a empresa, então não é guardado.
    motivo: regra.exigeMotivo ? motivo : null,
  };
}

// Só pedido PENDENTE recebe decisão. Se já está aprovado, rejeitado ou
// esperando documentos, outro admin decidiu antes e a tela mostra o que foi feito.
function podeDecidir(statusDaSolicitacao) {
  return statusDaSolicitacao === "PENDENTE";
}

// Texto da notificação que a empresa recebe com a decisão.
function mensagemParaEmpresa(decisao, motivo) {
  if (decisao === "APROVAR") {
    return "Sua empresa foi validada. Você já pode publicar vagas.";
  }

  if (decisao === "REJEITAR") {
    return `O pedido de validação da sua empresa foi rejeitado. Motivo: ${motivo}`;
  }

  return `A equipe pediu documentos adicionais para validar sua empresa: ${motivo}`;
}

module.exports = {
  DECISOES,
  TAMANHO_MINIMO_DO_MOTIVO,
  TAMANHO_MAXIMO_DO_MOTIVO,
  conferirDecisao,
  podeDecidir,
  mensagemParaEmpresa,
};
