// Testes de "Minhas candidaturas" (US12 · RF08 · RN08).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { candidaturaParaJovem, linhaDoTempo } = require("../../src/candidaturas/acompanhar");

describe("candidaturaParaJovem", () => {
  const candidatura = {
    id: 1,
    jovemId: 7,
    status: "EM_SELECAO",
    criadaEm: "2026-11-10",
    atualizadaEm: "2026-11-12",
    vaga: { id: 2, titulo: "Estágio em TI", cidade: "Itajaí", empresa: { razaoSocial: "Loja Ltda" } },
  };

  test("mostra vaga, empresa, status com nome e última atualização", () => {
    const item = candidaturaParaJovem(candidatura);
    assert.equal(item.nomeDoStatus, "Em seleção");
    assert.equal(item.vaga.empresa, "Loja Ltda");
    assert.equal(item.atualizadaEm, "2026-11-12");
    assert.equal(item.jovemId, undefined);
  });

  test("vaga sem empresa carregada não quebra", () => {
    assert.equal(candidaturaParaJovem({ ...candidatura, vaga: { id: 2, titulo: "x" } }).vaga.empresa, null);
  });
});

describe("linhaDoTempo", () => {
  test("ordena da mais antiga para a mais nova e traduz os status", () => {
    const linha = linhaDoTempo([
      { statusAnterior: "EM_ANALISE", statusNovo: "APROVADA", criadoEm: "2026-11-12T10:00:00Z", alteradoPorId: 2 },
      { statusAnterior: null, statusNovo: "EM_ANALISE", criadoEm: "2026-11-10T10:00:00Z", alteradoPorId: 7 },
    ]);
    assert.deepEqual(linha, [
      { de: null, para: "Em análise", em: "2026-11-10T10:00:00Z" },
      { de: "Em análise", para: "Aprovada", em: "2026-11-12T10:00:00Z" },
    ]);
  });

  test("sem histórico devolve lista vazia e não mexe na lista original", () => {
    assert.deepEqual(linhaDoTempo(), []);
    const original = [{ statusAnterior: null, statusNovo: "EM_ANALISE", criadoEm: "2026-11-10" }];
    linhaDoTempo(original);
    assert.equal(original.length, 1);
  });
});
