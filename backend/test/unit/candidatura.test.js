// Testes da candidatura (US10 · RF07 · RN02 · RN05 · RN06).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  NOMES_DOS_STATUS,
  conferirCandidatura,
  mensagemDeConfirmacao,
} = require("../../src/candidaturas/regras");
const { criarNotificacao } = require("../../src/notificacoes/criar");

const AGORA = new Date("2026-11-16T12:00:00-03:00");

const VAGA = {
  titulo: "Jovem aprendiz administrativo",
  status: "ABERTA",
  removidaEm: null,
  expiraEm: "2026-11-30T23:59:59-03:00",
  empresa: { status: "VALIDADA" },
};
const PERFIL_COMPLETO = { completo: true, faltando: [] };

function pedido(sobrescrever = {}) {
  return { vaga: VAGA, perfil: PERFIL_COMPLETO, jaCandidatou: false, ...sobrescrever };
}

describe("conferirCandidatura", () => {
  test("fluxo principal: perfil completo e vaga aberta pode se candidatar", () => {
    assert.deepEqual(conferirCandidatura(pedido(), AGORA), { pode: true });
  });

  test("RN02: perfil incompleto é barrado e leva para a tela de perfil", () => {
    const resultado = conferirCandidatura(
      pedido({ perfil: { completo: false, faltando: ["Telefone", "Currículo"] } }),
      AGORA
    );
    assert.equal(resultado.pode, false);
    assert.equal(resultado.status, 422);
    assert.equal(resultado.irPara, "perfil.html");
    assert.match(resultado.mensagem, /Falta: Telefone, Currículo/);
  });

  test("RN06: vaga encerrada, removida ou vencida é barrada com 409", () => {
    for (const vaga of [
      { ...VAGA, status: "ENCERRADA" },
      { ...VAGA, removidaEm: new Date() },
      { ...VAGA, expiraEm: "2026-11-15T23:59:59-03:00" },
    ]) {
      const resultado = conferirCandidatura(pedido({ vaga }), AGORA);
      assert.equal(resultado.status, 409);
      assert.match(resultado.mensagem, /não aceita mais candidaturas/);
    }
  });

  test("RN05: segunda candidatura na mesma vaga é barrada com 409", () => {
    const resultado = conferirCandidatura(pedido({ jaCandidatou: true }), AGORA);
    assert.equal(resultado.status, 409);
    assert.match(resultado.mensagem, /já se candidatou/);
  });

  test("vaga que não existe ou de empresa não validada responde 404", () => {
    assert.equal(conferirCandidatura(pedido({ vaga: null }), AGORA).status, 404);
    const pendente = { ...VAGA, empresa: { status: "EM_ANALISE" } };
    assert.equal(conferirCandidatura(pedido({ vaga: pendente }), AGORA).status, 404);
  });

  test("a vaga é conferida antes do perfil: vaga encerrada não manda completar perfil", () => {
    const resultado = conferirCandidatura(
      pedido({ vaga: { ...VAGA, status: "ENCERRADA" }, perfil: { completo: false, faltando: ["Telefone"] } }),
      AGORA
    );
    assert.equal(resultado.status, 409);
    assert.equal(resultado.irPara, undefined);
  });
});

describe("notificação de confirmação", () => {
  test("a mensagem cita a vaga e o status Em análise", () => {
    assert.equal(
      mensagemDeConfirmacao(VAGA),
      'Sua candidatura para "Jovem aprendiz administrativo" foi enviada. Status: Em análise.'
    );
    assert.equal(NOMES_DOS_STATUS.RECUSADA, "Recusada");
  });

  test("criarNotificacao grava pelo tx recebido, com candidatura opcional", async () => {
    const gravados = [];
    const tx = { notificacao: { create: async ({ data }) => gravados.push(data) } };

    await criarNotificacao(tx, { destinatarioId: 4, mensagem: "oi", candidaturaId: 1 });
    await criarNotificacao(tx, { destinatarioId: 5, mensagem: "olá" });

    assert.deepEqual(gravados, [
      { destinatarioId: 4, mensagem: "oi", candidaturaId: 1 },
      { destinatarioId: 5, mensagem: "olá", candidaturaId: null },
    ]);
  });
});
