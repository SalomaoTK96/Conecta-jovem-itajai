// Mudança de status da candidatura pela empresa (US11 · RF13 · RN07 · RN08).
// Funções puras, sem banco, para dar para testar sozinho.

const { NOMES_DOS_STATUS } = require("./regras");

const STATUS_VALIDOS = Object.keys(NOMES_DOS_STATUS);

// Confere o status pedido. Fora da lista é recusado e o anterior fica como
// estava; pedir o mesmo status que já está também é recusado, para não gravar
// no histórico uma "mudança" que não mudou nada.
function conferirMudanca(statusAtual, statusPedido) {
  const novo = typeof statusPedido === "string" ? statusPedido.trim().toUpperCase() : "";

  if (!STATUS_VALIDOS.includes(novo)) {
    return {
      valido: false,
      mensagem: `Status inválido. Use um destes: ${Object.values(NOMES_DOS_STATUS).join(", ")}.`,
    };
  }

  if (novo === statusAtual) {
    return { valido: false, mensagem: `A candidatura já está "${NOMES_DOS_STATUS[novo]}".` };
  }

  return { valido: true, novo };
}

// Filtro de status da lista de candidatos. Valor desconhecido mostra todos.
function lerFiltroDeStatus(valor) {
  const status = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return STATUS_VALIDOS.includes(status) ? status : null;
}

// Texto da notificação que o jovem recebe (RN08).
function mensagemDeMudanca(vaga, novo) {
  return `Sua candidatura para "${vaga.titulo}" mudou para: ${NOMES_DOS_STATUS[novo]}.`;
}

// O que a empresa vê do candidato. Só o que precisa para o processo seletivo:
// nome, contato, habilidades e currículo. Endereço e data de nascimento ficam
// de fora (RNF08: dados pessoais só quando necessários).
function candidatoParaEmpresa(candidatura) {
  const { jovem } = candidatura;
  const curriculo = jovem.curriculo;

  return {
    id: candidatura.id,
    status: candidatura.status,
    criadaEm: candidatura.criadaEm,
    atualizadaEm: candidatura.atualizadaEm,
    vaga: candidatura.vaga ? { id: candidatura.vaga.id, titulo: candidatura.vaga.titulo } : null,
    jovem: {
      nome: jovem.nome,
      email: jovem.usuario?.email ?? null,
      telefone: jovem.perfil?.telefone ?? null,
      habilidades: jovem.perfil?.habilidades ?? null,
    },
    curriculo: {
      objetivo: curriculo?.objetivo || "",
      escolaridades: (curriculo?.escolaridades || []).map((e) => ({
        instituicao: e.instituicao,
        curso: e.curso,
        nivel: e.nivel,
        anoInicio: e.anoInicio,
        anoFim: e.anoFim,
      })),
      experiencias: (curriculo?.experiencias || []).map((e) => ({
        empresa: e.empresa,
        cargo: e.cargo,
        descricao: e.descricao,
        inicio: e.inicio,
        fim: e.fim,
      })),
    },
    historico: (candidatura.historico || []).map((h) => ({
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      criadoEm: h.criadoEm,
    })),
  };
}

module.exports = {
  STATUS_VALIDOS,
  conferirMudanca,
  lerFiltroDeStatus,
  mensagemDeMudanca,
  candidatoParaEmpresa,
};
