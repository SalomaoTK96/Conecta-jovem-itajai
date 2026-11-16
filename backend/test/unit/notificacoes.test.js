// Testes das notificações (US13 · RF09 · RN08).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { linkDaNotificacao, notificacaoParaTela } = require("../../src/notificacoes/regras");

describe("linkDaNotificacao", () => {
  test("notificação de candidatura leva o jovem à candidatura certa", () => {
    assert.equal(linkDaNotificacao({ candidaturaId: 7 }, "JOVEM"), "minhas-candidaturas.html#candidatura-7");
  });

  test("notificação da validação leva a empresa à tela de validação (US07)", () => {
    assert.equal(linkDaNotificacao({ candidaturaId: null }, "EMPRESA"), "validacao-empresa.html");
  });

  test("sem destino conhecido não tem link", () => {
    assert.equal(linkDaNotificacao({ candidaturaId: null }, "JOVEM"), null);
    assert.equal(linkDaNotificacao({ candidaturaId: null }, "ADMIN"), null);
  });
});

describe("notificacaoParaTela", () => {
  test("mostra mensagem, vaga, data, se foi lida e o link", () => {
    const tela = notificacaoParaTela(
      {
        id: 1,
        destinatarioId: 4,
        mensagem: "Sua candidatura mudou para: Aprovada.",
        lida: false,
        criadaEm: "2026-11-16",
        candidaturaId: 3,
        candidatura: { vaga: { titulo: "Estágio em TI" } },
      },
      "JOVEM"
    );
    assert.deepEqual(tela, {
      id: 1,
      mensagem: "Sua candidatura mudou para: Aprovada.",
      vaga: "Estágio em TI",
      lida: false,
      criadaEm: "2026-11-16",
      link: "minhas-candidaturas.html#candidatura-3",
    });
  });

  test("notificação sem candidatura não tem vaga", () => {
    const tela = notificacaoParaTela({ id: 2, mensagem: "Aprovada", lida: true, criadaEm: "x" }, "EMPRESA");
    assert.equal(tela.vaga, null);
    assert.equal(tela.link, "validacao-empresa.html");
  });
});
