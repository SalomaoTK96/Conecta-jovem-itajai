// Testes das regras de cadastro do jovem (US01 · RF01 · RN09 e RN11).
// As datas são montadas com new Date(ano, mês, dia), no horário local, para o
// resultado ser o mesmo no Windows de vocês e no Linux do GitHub Actions.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  calcularIdade,
  idadeDentroDaFaixa,
  precisaDeResponsavel,
  emailParecePlausivel,
  lerData,
  conferirCadastroDeJovem,
} = require("../../src/jovens/regras");

const HOJE = new Date(2026, 10, 16); // 16/11/2026

function cadastro(sobrescrever = {}) {
  return {
    nome: "Jovem Teste",
    email: "jovem@teste.com",
    senha: "senha1234",
    dataNascimento: "2006-05-10", // 20 anos
    ...sobrescrever,
  };
}

describe("calcularIdade", () => {
  test("conta o ano só depois do aniversário", () => {
    assert.equal(calcularIdade(new Date(2012, 10, 17), HOJE), 13); // faz 14 amanhã
    assert.equal(calcularIdade(new Date(2012, 10, 16), HOJE), 14); // faz 14 hoje
    assert.equal(calcularIdade(new Date(2012, 9, 30), HOJE), 14); // fez mês passado
  });
});

describe("RN09: faixa de 14 a 24 anos (valor-limite)", () => {
  for (const [idade, esperado] of [[13, false], [14, true], [24, true], [25, false]]) {
    test(`${idade} anos → ${esperado ? "aceita" : "recusa"}`, () => {
      assert.equal(idadeDentroDaFaixa(idade), esperado);
    });
  }
});

describe("RN11: responsável para menores de 16", () => {
  test("15 anos precisa, 16 não precisa", () => {
    assert.equal(precisaDeResponsavel(15), true);
    assert.equal(precisaDeResponsavel(16), false);
  });
});

describe("e-mail e data", () => {
  test("aceita e-mail comum e recusa sem domínio ou com espaço", () => {
    assert.equal(emailParecePlausivel("a@b.com"), true);
    assert.equal(emailParecePlausivel("a@b"), false);
    assert.equal(emailParecePlausivel("a b@c.com"), false);
    assert.equal(emailParecePlausivel(undefined), false);
  });

  test("lerData recusa data que não existe, como 31/02", () => {
    assert.equal(lerData("2026-02-31"), null);
    assert.equal(lerData("abc"), null);
    assert.equal(lerData(""), null);
    assert.deepEqual(lerData("2010-01-15"), new Date(2010, 0, 15));
  });
});

describe("conferirCadastroDeJovem", () => {
  test("cadastro completo de quem tem 20 anos é válido", () => {
    const resultado = conferirCadastroDeJovem(cadastro(), HOJE);
    assert.equal(resultado.valido, true);
    assert.equal(resultado.idade, 20);
  });

  test("13 anos é recusado com a mensagem da faixa", () => {
    const resultado = conferirCadastroDeJovem(cadastro({ dataNascimento: "2013-05-01" }), HOJE);
    assert.equal(resultado.valido, false);
    assert.match(resultado.erros[0].mensagem, /14 a 24 anos/);
  });

  test("15 anos sem responsável e sem consentimento aponta os dois campos", () => {
    const resultado = conferirCadastroDeJovem(cadastro({ dataNascimento: "2011-03-10" }), HOJE);
    assert.deepEqual(resultado.erros.map((e) => e.campo), ["nomeResponsavel", "consentimento"]);
  });

  test("15 anos com responsável e consentimento é aceito", () => {
    const resultado = conferirCadastroDeJovem(
      cadastro({ dataNascimento: "2011-03-10", nomeResponsavel: "Maria", consentimento: true }),
      HOJE
    );
    assert.equal(resultado.valido, true);
  });

  test("campos vazios geram um erro para cada campo", () => {
    const resultado = conferirCadastroDeJovem({ senha: "curta" }, HOJE);
    assert.deepEqual(
      resultado.erros.map((e) => e.campo),
      ["nome", "email", "senha", "dataNascimento"]
    );
    assert.equal(resultado.idade, null);
  });
});
