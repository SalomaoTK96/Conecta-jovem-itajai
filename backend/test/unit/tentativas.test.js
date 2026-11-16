// Testes da trava contra força bruta no login (DEF-03 · OWASP A07).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { criarControleDeTentativas, chaveDoLogin, MAXIMO_DE_ERROS } = require("../../src/seguranca/tentativas");

const MINUTO = 60 * 1000;

describe("controle de tentativas", () => {
  test("4 erros ainda deixam tentar; o 5º bloqueia (valor-limite)", () => {
    const controle = criarControleDeTentativas();
    for (let i = 0; i < MAXIMO_DE_ERROS - 1; i += 1) controle.registrarErro("ana", 0);
    assert.equal(controle.situacao("ana", 0).bloqueado, false);

    controle.registrarErro("ana", 0);
    const situacao = controle.situacao("ana", 0);
    assert.equal(situacao.bloqueado, true);
    assert.equal(situacao.liberaEmMs, 15 * MINUTO);
  });

  test("libera depois de 15 minutos", () => {
    const controle = criarControleDeTentativas();
    for (let i = 0; i < 5; i += 1) controle.registrarErro("ana", 0);
    assert.equal(controle.situacao("ana", 15 * MINUTO).bloqueado, true);
    assert.equal(controle.situacao("ana", 15 * MINUTO + 1).bloqueado, false);
  });

  test("login certo antes do limite zera os erros", () => {
    const controle = criarControleDeTentativas();
    for (let i = 0; i < 4; i += 1) controle.registrarErro("ana", 0);
    controle.limpar("ana");
    controle.registrarErro("ana", 0);
    assert.equal(controle.situacao("ana", 0).erros, 1);
  });

  test("erros espalhados por mais de 15 minutos não somam", () => {
    const controle = criarControleDeTentativas();
    for (let i = 0; i < 4; i += 1) controle.registrarErro("ana", 0);
    controle.registrarErro("ana", 16 * MINUTO);
    assert.equal(controle.situacao("ana", 16 * MINUTO).bloqueado, false);
  });

  test("a chave junta e-mail (sem diferença de maiúscula) e IP", () => {
    assert.equal(chaveDoLogin(" Ana@Teste.com ", "10.0.0.1"), "ana@teste.com|10.0.0.1");
    const controle = criarControleDeTentativas();
    for (let i = 0; i < 5; i += 1) controle.registrarErro(chaveDoLogin("ana@teste.com", "10.0.0.1"), 0);
    assert.equal(controle.situacao(chaveDoLogin("ana@teste.com", "10.0.0.2"), 0).bloqueado, false);
  });
});
