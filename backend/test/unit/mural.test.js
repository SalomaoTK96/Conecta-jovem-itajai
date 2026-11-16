// Testes do mural de vagas (US09 · RF06 · RN01 · RN06).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  VAGAS_POR_PAGINA,
  lerFiltros,
  filtroDoMural,
  paginacao,
  vagaParaMural,
  vagaParaDetalhes,
} = require("../../src/vagas/mural");

const AGORA = new Date("2026-11-16T12:00:00-03:00");

describe("lerFiltros", () => {
  test("sem nada no endereço, sem filtro e página 1", () => {
    assert.deepEqual(lerFiltros(), { area: null, cidade: null, palavra: null, pagina: 1 });
  });

  test("lê área, cidade, palavra e página, tirando espaços", () => {
    const filtros = lerFiltros({ area: " Tecnologia ", cidade: " Itajaí ", q: " excel ", pagina: "3" });
    assert.deepEqual(filtros, { area: "Tecnologia", cidade: "Itajaí", palavra: "excel", pagina: 3 });
  });

  test("área fora da lista e página inválida são ignoradas", () => {
    const filtros = lerFiltros({ area: "Marketing", pagina: "-2" });
    assert.equal(filtros.area, null);
    assert.equal(filtros.pagina, 1);
    assert.equal(lerFiltros({ pagina: "abc" }).pagina, 1);
  });

  test("palavra-chave longa é cortada em 100 caracteres", () => {
    assert.equal(lerFiltros({ q: "a".repeat(300) }).palavra.length, 100);
  });
});

describe("filtroDoMural", () => {
  test("sempre exige vaga aberta, não removida, no prazo e de empresa validada", () => {
    const { AND } = filtroDoMural({}, AGORA);
    assert.deepEqual(AND, [
      { status: "ABERTA" },
      { removidaEm: null },
      { expiraEm: { gte: AGORA } },
      { empresa: { status: "VALIDADA" } },
    ]);
  });

  test("área, cidade e palavra-chave se somam (filtros combinados)", () => {
    const { AND } = filtroDoMural({ area: "Tecnologia", cidade: "Itajaí", palavra: "excel" }, AGORA);
    assert.equal(AND.length, 7);
    assert.deepEqual(AND[4], { area: "Tecnologia" });
    assert.equal(AND[5].cidade.mode, "insensitive");
  });

  test("a palavra-chave procura no título e na descrição", () => {
    const { AND } = filtroDoMural({ palavra: "excel" }, AGORA);
    const campos = AND.at(-1).OR.map((condicao) => Object.keys(condicao)[0]);
    assert.deepEqual(campos, ["titulo", "descricao"]);
  });
});

describe("paginacao", () => {
  test("20 por página: 45 vagas dão 3 páginas", () => {
    const paginas = paginacao(45, 2);
    assert.equal(VAGAS_POR_PAGINA, 20);
    assert.deepEqual(paginas, { pagina: 2, totalDePaginas: 3, total: 45, pular: 20, pegar: 20 });
  });

  test("valores-limite: 20 vagas é 1 página, 21 vagas são 2", () => {
    assert.equal(paginacao(20, 1).totalDePaginas, 1);
    assert.equal(paginacao(21, 1).totalDePaginas, 2);
  });

  test("página depois da última volta para a última; sem vagas fica a página 1", () => {
    assert.equal(paginacao(45, 99).pagina, 3);
    assert.deepEqual(paginacao(0, 5), { pagina: 1, totalDePaginas: 1, total: 0, pular: 0, pegar: 20 });
  });
});

describe("o que a tela recebe", () => {
  const vaga = {
    id: 1,
    titulo: "Jovem aprendiz",
    tipo: "APRENDIZAGEM",
    area: "Administração",
    cidade: "Itajaí",
    descricao: "Rotina de escritório",
    requisitos: null,
    expiraEm: "2026-12-15",
    criadaEm: "2026-11-01",
    empresaId: 9,
    empresa: { razaoSocial: "Loja Ltda" },
  };

  test("o card mostra título, empresa, tipo, cidade e prazo", () => {
    const card = vagaParaMural(vaga);
    assert.equal(card.empresa, "Loja Ltda");
    assert.equal(card.descricao, undefined);
    assert.equal(card.empresaId, undefined);
  });

  test("os detalhes trazem também descrição e requisitos", () => {
    const detalhes = vagaParaDetalhes(vaga);
    assert.equal(detalhes.descricao, "Rotina de escritório");
    assert.equal(detalhes.requisitos, null);
    assert.equal(vagaParaMural({ ...vaga, empresa: undefined }).empresa, null);
  });
});
