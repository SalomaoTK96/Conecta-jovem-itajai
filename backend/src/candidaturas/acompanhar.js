// O que o jovem vê das próprias candidaturas (US12 · RF08 · RN08).
// Funções puras, sem banco, para dar para testar sozinho.

const { NOMES_DOS_STATUS } = require("./regras");

// Item da lista "Minhas candidaturas": vaga, empresa, status e última atualização.
function candidaturaParaJovem(candidatura) {
  return {
    id: candidatura.id,
    status: candidatura.status,
    nomeDoStatus: NOMES_DOS_STATUS[candidatura.status],
    criadaEm: candidatura.criadaEm,
    atualizadaEm: candidatura.atualizadaEm,
    vaga: {
      id: candidatura.vaga.id,
      titulo: candidatura.vaga.titulo,
      empresa: candidatura.vaga.empresa?.razaoSocial ?? null,
      cidade: candidatura.vaga.cidade,
    },
  };
}

// Linha do tempo do histórico, da mais antiga para a mais nova (RN08). Quem
// mudou o status não aparece para o jovem: é dado interno da empresa.
function linhaDoTempo(historico = []) {
  return [...historico]
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm))
    .map((h) => ({
      de: h.statusAnterior ? NOMES_DOS_STATUS[h.statusAnterior] : null,
      para: NOMES_DOS_STATUS[h.statusNovo],
      em: h.criadoEm,
    }));
}

module.exports = { candidaturaParaJovem, linhaDoTempo };
