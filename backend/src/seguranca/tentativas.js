// Trava contra força bruta no login (M3 · OWASP A07, defeito DEF-03).
// Depois de 5 senhas erradas seguidas para o mesmo e-mail, vindas do mesmo
// endereço de rede, o login fica bloqueado por 15 minutos.
//
// A chave junta e-mail e IP de propósito: só o e-mail deixaria qualquer um
// bloquear a conta de outra pessoa errando a senha dela de propósito.
// Fica na memória do servidor: se o servidor reinicia, as contas zeram.

const MAXIMO_DE_ERROS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;

function criarControleDeTentativas({ maximo = MAXIMO_DE_ERROS, bloqueioMs = BLOQUEIO_MS } = {}) {
  const registros = new Map();

  function situacao(chave, agora = Date.now()) {
    const registro = registros.get(chave);
    if (!registro) return { bloqueado: false, erros: 0 };

    // Passou o tempo do bloqueio (ou da janela de erros): começa do zero.
    if (agora - registro.desde > bloqueioMs) {
      registros.delete(chave);
      return { bloqueado: false, erros: 0 };
    }

    const bloqueado = registro.erros >= maximo;
    const liberaEmMs = bloqueado ? bloqueioMs - (agora - registro.desde) : 0;
    return { bloqueado, erros: registro.erros, liberaEmMs };
  }

  function registrarErro(chave, agora = Date.now()) {
    const atual = situacao(chave, agora);
    const desde = atual.erros === 0 ? agora : registros.get(chave).desde;
    // Na tentativa que atinge o limite, o relógio do bloqueio recomeça.
    const erros = atual.erros + 1;
    registros.set(chave, { erros, desde: erros >= maximo ? agora : desde });
  }

  function limpar(chave) {
    registros.delete(chave);
  }

  return { situacao, registrarErro, limpar };
}

function chaveDoLogin(email, ip) {
  return `${String(email).trim().toLowerCase()}|${ip}`;
}

module.exports = { criarControleDeTentativas, chaveDoLogin, MAXIMO_DE_ERROS, BLOQUEIO_MS };
