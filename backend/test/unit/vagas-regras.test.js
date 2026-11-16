// Testes das regras da vaga (US08 · RF12 · RN06).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  fimDoDia,
  conferirVaga,
  vagaAceitaCandidatura,
  podeEditar,
} = require("../../src/vagas/regras");

// Meio-dia de 16/11/2026 em Itajaí.
const HOJE = new Date("2026-11-16T12:00:00-03:00");

function vaga(sobrescrever = {}) {
  return {
    titulo: "Jovem aprendiz administrativo",
    tipo: "aprendizagem",
    area: "Administração",
    cidade: "Itajaí",
    descricao: "Apoio na rotina do escritório e no atendimento.",
    expiraEm: "2026-12-15",
    ...sobrescrever,
  };
}

describe("fimDoDia", () => {
  test("o prazo vale até 23:59:59 do dia em Itajaí", () => {
    assert.equal(fimDoDia("2026-11-30").toISOString(), "2026-12-01T02:59:59.999Z");
  });

  test("recusa formato errado e data que não existe", () => {
    assert.equal(fimDoDia("30/11/2026"), null);
    assert.equal(fimDoDia("2026-02-31"), null);
  });
});

describe("conferirVaga", () => {
  test("vaga completa é válida e o tipo vira maiúsculo", () => {
    const resultado = conferirVaga(vaga(), HOJE);
    assert.equal(resultado.valido, true);
    assert.equal(resultado.vaga.tipo, "APRENDIZAGEM");
    assert.equal(resultado.vaga.requisitos, null);
  });

  test("prazo hoje ainda vale; ontem não vale (valor-limite)", () => {
    assert.equal(conferirVaga(vaga({ expiraEm: "2026-11-16" }), HOJE).valido, true);
    const ontem = conferirVaga(vaga({ expiraEm: "2026-11-15" }), HOJE);
    assert.match(ontem.erros[0].mensagem, /já passou/);
  });

  test("prazo de mais de 365 dias é recusado", () => {
    const resultado = conferirVaga(vaga({ expiraEm: "2027-12-31" }), HOJE);
    assert.match(resultado.erros[0].mensagem, /365 dias/);
  });

  test("prazo vazio e prazo inválido têm mensagens diferentes", () => {
    assert.match(conferirVaga(vaga({ expiraEm: "" }), HOJE).erros[0].mensagem, /até quando/);
    assert.match(conferirVaga(vaga({ expiraEm: "2026-13-01" }), HOJE).erros[0].mensagem, /não é uma data/);
  });

  test("título curto, tipo e área fora da lista, descrição curta", () => {
    const resultado = conferirVaga(
      vaga({ titulo: "Oi", tipo: "CLT", area: "Marketing", descricao: "curta" }),
      HOJE
    );
    assert.deepEqual(resultado.erros.map((e) => e.campo), ["titulo", "tipo", "area", "descricao"]);
  });

  test("texto longo demais passa do limite", () => {
    const resultado = conferirVaga(vaga({ titulo: "x".repeat(101), requisitos: "y".repeat(1001) }), HOJE);
    assert.deepEqual(resultado.erros.map((e) => e.campo), ["titulo", "requisitos"]);
  });
});

describe("RN06: vaga aceita candidatura", () => {
  const aberta = { status: "ABERTA", removidaEm: null, expiraEm: "2026-11-30T23:59:59-03:00" };

  test("aberta e no prazo aceita", () => {
    assert.equal(vagaAceitaCandidatura(aberta, HOJE), true);
  });

  test("encerrada, removida ou vencida não aceita", () => {
    assert.equal(vagaAceitaCandidatura({ ...aberta, status: "ENCERRADA" }, HOJE), false);
    assert.equal(vagaAceitaCandidatura({ ...aberta, removidaEm: new Date() }, HOJE), false);
    assert.equal(vagaAceitaCandidatura({ ...aberta, expiraEm: "2026-11-15T23:59:59-03:00" }, HOJE), false);
  });

  test("só vaga aberta e não removida pode ser editada", () => {
    assert.equal(podeEditar(aberta), true);
    assert.equal(podeEditar({ ...aberta, status: "ENCERRADA" }), false);
    assert.equal(podeEditar({ ...aberta, removidaEm: new Date() }), false);
  });
});
