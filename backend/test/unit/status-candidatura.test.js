// Testes da mudança de status pela empresa (US11 · RF13 · RN07 · RN08).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  STATUS_VALIDOS,
  conferirMudanca,
  lerFiltroDeStatus,
  mensagemDeMudanca,
  candidatoParaEmpresa,
} = require("../../src/candidaturas/status");

describe("conferirMudanca", () => {
  test("os quatro status válidos", () => {
    assert.deepEqual(STATUS_VALIDOS, ["EM_ANALISE", "EM_SELECAO", "APROVADA", "RECUSADA"]);
  });

  test("fluxo principal: de Em análise para Em seleção", () => {
    assert.deepEqual(conferirMudanca("EM_ANALISE", "EM_SELECAO"), { valido: true, novo: "EM_SELECAO" });
  });

  test("aceita minúsculas e espaços", () => {
    assert.equal(conferirMudanca("EM_ANALISE", " aprovada ").novo, "APROVADA");
  });

  test("status fora da lista é recusado", () => {
    for (const pedido of ["CONTRATADO", "", undefined, 3]) {
      const resultado = conferirMudanca("EM_ANALISE", pedido);
      assert.equal(resultado.valido, false);
      assert.match(resultado.mensagem, /Status inválido/);
    }
  });

  test("pedir o mesmo status não grava uma mudança à toa", () => {
    const resultado = conferirMudanca("RECUSADA", "RECUSADA");
    assert.equal(resultado.valido, false);
    assert.match(resultado.mensagem, /já está "Recusada"/);
  });
});

describe("filtro e mensagem", () => {
  test("filtro de status: válido passa, desconhecido mostra todos", () => {
    assert.equal(lerFiltroDeStatus("em_selecao"), "EM_SELECAO");
    assert.equal(lerFiltroDeStatus("qualquer"), null);
    assert.equal(lerFiltroDeStatus(undefined), null);
  });

  test("a notificação cita a vaga e o novo status", () => {
    assert.equal(
      mensagemDeMudanca({ titulo: "Estágio em TI" }, "APROVADA"),
      'Sua candidatura para "Estágio em TI" mudou para: Aprovada.'
    );
  });
});

describe("candidatoParaEmpresa", () => {
  const candidatura = {
    id: 1,
    status: "EM_ANALISE",
    criadaEm: "2026-11-16",
    atualizadaEm: "2026-11-16",
    vaga: { id: 2, titulo: "Estágio em TI", empresaId: 9 },
    jovem: {
      nome: "Ana",
      dataNascimento: "2008-05-10",
      usuario: { email: "ana@teste.com" },
      perfil: { telefone: "47999991111", endereco: "Rua A, 10", habilidades: "Excel" },
      curriculo: {
        objetivo: "Primeiro emprego",
        escolaridades: [{ id: 5, instituicao: "EEB", curso: "3º", nivel: "Ensino médio", anoInicio: 2024, anoFim: null }],
        experiencias: [],
      },
    },
    historico: [{ id: 7, statusAnterior: null, statusNovo: "EM_ANALISE", criadoEm: "2026-11-16", alteradoPorId: 4 }],
  };

  test("mostra contato, habilidades e currículo para a empresa", () => {
    const visto = candidatoParaEmpresa(candidatura);
    assert.equal(visto.jovem.email, "ana@teste.com");
    assert.equal(visto.jovem.telefone, "47999991111");
    assert.equal(visto.curriculo.escolaridades[0].instituicao, "EEB");
    assert.equal(visto.historico[0].statusNovo, "EM_ANALISE");
  });

  test("RNF08: endereço, nascimento e ids internos não saem para a empresa", () => {
    const texto = JSON.stringify(candidatoParaEmpresa(candidatura));
    assert.ok(!texto.includes("Rua A"));
    assert.ok(!texto.includes("2008-05-10"));
    assert.ok(!texto.includes("empresaId"));
    assert.ok(!texto.includes("alteradoPorId"));
  });

  test("jovem sem perfil nem currículo não quebra", () => {
    const visto = candidatoParaEmpresa({ ...candidatura, vaga: null, historico: undefined, jovem: { nome: "Bia" } });
    assert.equal(visto.jovem.telefone, null);
    assert.equal(visto.jovem.email, null);
    assert.deepEqual(visto.curriculo, { objetivo: "", escolaridades: [], experiencias: [] });
    assert.equal(visto.vaga, null);
  });
});
