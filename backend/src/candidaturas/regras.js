// Regras da candidatura (US10 · RF07 · RN02 · RN05 · RN06). Funções puras:
// recebem o que já foi buscado no banco e devolvem a resposta. Nada de banco
// aqui, para dar para testar sozinho.

const { vagaAceitaCandidatura } = require("../vagas/regras");

// Nomes que a tela mostra para cada status.
const NOMES_DOS_STATUS = {
  EM_ANALISE: "Em análise",
  EM_SELECAO: "Em seleção",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
};

// Diz se o jovem pode se candidatar e, se não puder, por quê. A ordem importa:
// primeiro a vaga (não adianta completar o perfil para uma vaga encerrada),
// depois a candidatura repetida e por último o perfil.
//
// Cada recusa tem um código HTTP e uma mensagem própria, como pede o card:
//   404 vaga não existe ou não está no mural
//   409 vaga encerrada/vencida (RN06) ou candidatura repetida (RN05)
//   422 perfil incompleto (RN02), com o endereço da tela de perfil
function conferirCandidatura({ vaga, perfil, jaCandidatou }, agora = new Date()) {
  if (!vaga || vaga.empresa?.status !== "VALIDADA") {
    return { pode: false, status: 404, mensagem: "Vaga não encontrada." };
  }

  if (!vagaAceitaCandidatura(vaga, agora)) {
    return {
      pode: false,
      status: 409,
      mensagem: "Esta vaga não aceita mais candidaturas: ela foi encerrada ou o prazo terminou.",
    };
  }

  if (jaCandidatou) {
    return {
      pode: false,
      status: 409,
      mensagem: "Você já se candidatou a esta vaga. Acompanhe em Minhas candidaturas.",
    };
  }

  if (!perfil.completo) {
    return {
      pode: false,
      status: 422,
      mensagem: `Complete seu perfil antes de se candidatar. Falta: ${perfil.faltando.join(", ")}.`,
      irPara: "perfil.html",
    };
  }

  return { pode: true };
}

// Texto da notificação que confirma a candidatura para o jovem.
function mensagemDeConfirmacao(vaga) {
  return `Sua candidatura para "${vaga.titulo}" foi enviada. Status: ${NOMES_DOS_STATUS.EM_ANALISE}.`;
}

module.exports = { NOMES_DOS_STATUS, conferirCandidatura, mensagemDeConfirmacao };
