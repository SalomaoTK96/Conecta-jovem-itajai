// O que a tela recebe de cada notificação (US13 · RF09). Função pura, sem
// banco, para dar para testar sozinho.

// Para onde a notificação leva quando o usuario clica nela:
// - candidatura (US10, US11): a tela Minhas candidaturas, já na candidatura certa
// - resultado da validação da empresa (US07): a tela de validação
function linkDaNotificacao(notificacao, perfil) {
  if (notificacao.candidaturaId && perfil === "JOVEM") {
    return `minhas-candidaturas.html#candidatura-${notificacao.candidaturaId}`;
  }
  if (perfil === "EMPRESA") return "validacao-empresa.html";
  return null;
}

function notificacaoParaTela(notificacao, perfil) {
  return {
    id: notificacao.id,
    mensagem: notificacao.mensagem,
    vaga: notificacao.candidatura?.vaga?.titulo ?? null,
    lida: notificacao.lida,
    criadaEm: notificacao.criadaEm,
    link: linkDaNotificacao(notificacao, perfil),
  };
}

module.exports = { linkDaNotificacao, notificacaoParaTela };
