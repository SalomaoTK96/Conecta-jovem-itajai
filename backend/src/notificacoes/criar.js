// Uma função só para criar notificação (US13 · RF09). A US07, a US10 e a US11
// chamam esta mesma função, então o formato da notificação é sempre igual.
// Recebe o "tx" da transação de quem chamou: se a gravação principal falhar,
// a notificação também não fica no banco.
function criarNotificacao(tx, { destinatarioId, mensagem, candidaturaId = null }) {
  return tx.notificacao.create({
    data: { destinatarioId, mensagem, candidaturaId },
  });
}

module.exports = { criarNotificacao };
