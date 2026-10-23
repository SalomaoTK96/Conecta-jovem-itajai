// Regras do pedido de validação da empresa (US06). Funções puras, como em
// regras.js: entra dado, sai resposta, sem banco e sem disco.

const TAMANHO_MAXIMO_EM_MB = 5;
const TAMANHO_MAXIMO = TAMANHO_MAXIMO_EM_MB * 1024 * 1024;

// O que o administrador precisa ver para validar a empresa (US07). O "campo"
// é o nome do campo de arquivo que a tela envia.
const DOCUMENTOS_EXIGIDOS = [
  {
    campo: "cartaoCnpj",
    tipo: "CARTAO_CNPJ",
    nome: "Cartão CNPJ",
    descricao: "Comprovante de inscrição emitido no site da Receita Federal.",
  },
  {
    campo: "contratoSocial",
    tipo: "CONTRATO_SOCIAL",
    nome: "Contrato social ou requerimento de empresário",
    descricao: "Documento que mostra quem são os sócios ou o titular da empresa.",
  },
];

// Formato aceito, com a assinatura que todo arquivo daquele tipo traz nos
// primeiros bytes. O nome do arquivo e o tipo que o navegador informa podem ser
// trocados por qualquer um; o conteúdo, não. Um .exe renomeado para .pdf cai aqui.
const FORMATOS_ACEITOS = [
  { extensao: "pdf", assinatura: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { extensao: "jpg", assinatura: [0xff, 0xd8, 0xff] },
  { extensao: "png", assinatura: [0x89, 0x50, 0x4e, 0x47] },
];

const NOMES_DOS_FORMATOS = "PDF, JPG ou PNG";

function formatoDoArquivo(conteudo) {
  const formato = FORMATOS_ACEITOS.find(({ assinatura }) =>
    assinatura.every((byte, posicao) => conteudo[posicao] === byte)
  );

  return formato ? formato.extensao : null;
}

// Confere os arquivos recebidos, já separados por campo:
// { cartaoCnpj: { nomeOriginal, tamanho, conteudo }, contratoSocial: ... }
// No primeiro envio os dois são obrigatórios. No reenvio (o administrador pediu
// documentos adicionais), basta mandar o que foi pedido, mas ao menos um.
function conferirDocumentos(arquivos, { reenvio = false } = {}) {
  const erros = [];
  const documentos = [];

  for (const exigido of DOCUMENTOS_EXIGIDOS) {
    const arquivo = arquivos[exigido.campo];

    if (!arquivo) {
      if (!reenvio) {
        erros.push({ campo: exigido.campo, mensagem: `Anexe o ${exigido.nome}.` });
      }
      continue;
    }

    if (arquivo.tamanho > TAMANHO_MAXIMO) {
      erros.push({
        campo: exigido.campo,
        mensagem: `${exigido.nome}: o arquivo passa de ${TAMANHO_MAXIMO_EM_MB} MB.`,
      });
      continue;
    }

    const extensao = formatoDoArquivo(arquivo.conteudo);

    if (!extensao) {
      erros.push({
        campo: exigido.campo,
        mensagem: `${exigido.nome}: envie em ${NOMES_DOS_FORMATOS}.`,
      });
      continue;
    }

    documentos.push({ tipo: exigido.tipo, extensao, conteudo: arquivo.conteudo });
  }

  if (reenvio && erros.length === 0 && documentos.length === 0) {
    erros.push({ campo: null, mensagem: "Anexe pelo menos um documento para reenviar." });
  }

  return { valido: erros.length === 0, erros, documentos };
}

// Decide se a empresa pode mandar documentos agora, olhando o status dela e o
// do último pedido. Devolve { pode, reenvio } ou { pode: false, mensagem }.
function situacaoParaEnvio(statusDaEmpresa, ultimaSolicitacao) {
  if (statusDaEmpresa === "VALIDADA") {
    return { pode: false, mensagem: "A empresa já está validada." };
  }

  // O administrador pediu documentos adicionais: o reenvio vai pela mesma
  // solicitação, como pede o cartão.
  if (ultimaSolicitacao?.status === "DOCUMENTOS_PENDENTES") {
    return { pode: true, reenvio: true };
  }

  if (statusDaEmpresa === "EM_ANALISE") {
    return { pode: false, mensagem: "A solicitação já está em análise. Aguarde a resposta." };
  }

  if (statusDaEmpresa === "REJEITADA") {
    return {
      pode: false,
      mensagem: "A solicitação foi rejeitada. Entre em contato com a equipe do Conecta Jovem.",
    };
  }

  return { pode: true, reenvio: false };
}

// RN01: só empresa validada publica vaga. A US08 chama esta mesma função.
function podePublicarVagas(statusDaEmpresa) {
  return statusDaEmpresa === "VALIDADA";
}

module.exports = {
  DOCUMENTOS_EXIGIDOS,
  TAMANHO_MAXIMO,
  TAMANHO_MAXIMO_EM_MB,
  NOMES_DOS_FORMATOS,
  formatoDoArquivo,
  conferirDocumentos,
  situacaoParaEnvio,
  podePublicarVagas,
};
