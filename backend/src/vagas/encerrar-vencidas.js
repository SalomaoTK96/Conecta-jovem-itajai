const banco = require("../banco");

// RN06: vaga com prazo vencido é encerrada sozinha. Roda quando o servidor
// sobe, uma vez por hora depois disso, e também antes de qualquer lista de
// vagas ser montada, para nunca mostrar como aberta uma vaga que já venceu.
async function encerrarVagasVencidas(agora = new Date()) {
  const { count } = await banco.vaga.updateMany({
    where: { status: "ABERTA", expiraEm: { lt: agora } },
    data: { status: "ENCERRADA" },
  });

  return count;
}

const UMA_HORA = 60 * 60 * 1000;

function agendarEncerramento() {
  const rodar = () =>
    encerrarVagasVencidas()
      .then((quantas) => {
        if (quantas > 0) console.log(`${quantas} vaga(s) com prazo vencido encerrada(s).`);
      })
      .catch((erro) => console.error("Falha ao encerrar vagas vencidas:", erro.message));

  rodar();
  // unref: o agendamento não segura o processo aberto quando o servidor para.
  setInterval(rodar, UMA_HORA).unref();
}

module.exports = { encerrarVagasVencidas, agendarEncerramento };
