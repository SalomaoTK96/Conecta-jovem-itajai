// Testes do cadastro de empresa (US02 · RF02) e da conferência do CNPJ.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { cnpjValido, soNumeros, conferirCadastroDeEmpresa } = require("../../src/empresas/regras");

describe("CNPJ", () => {
  test("aceita CNPJ válido com e sem pontuação", () => {
    assert.equal(cnpjValido("11.222.333/0001-81"), true);
    assert.equal(cnpjValido("11222333000181"), true);
  });

  test("recusa dígito verificador errado", () => {
    assert.equal(cnpjValido("11.222.333/0001-82"), false);
    assert.equal(cnpjValido("11.222.333/0001-91"), false);
  });

  test("recusa tamanho errado e números todos iguais", () => {
    assert.equal(cnpjValido("1122233300018"), false);
    assert.equal(cnpjValido("00000000000000"), false);
    assert.equal(cnpjValido(undefined), false);
  });

  test("soNumeros guarda só os 14 dígitos", () => {
    assert.equal(soNumeros("11.222.333/0001-81"), "11222333000181");
    assert.equal(soNumeros(null), "");
  });
});

describe("conferirCadastroDeEmpresa", () => {
  test("cadastro completo é válido e devolve o CNPJ limpo", () => {
    const resultado = conferirCadastroDeEmpresa({
      razaoSocial: "Padaria Teste",
      cnpj: "11.222.333/0001-81",
      email: "empresa@teste.com",
      senha: "senha1234",
    });
    assert.equal(resultado.valido, true);
    assert.equal(resultado.cnpj, "11222333000181");
  });

  test("cadastro vazio aponta todos os campos", () => {
    const resultado = conferirCadastroDeEmpresa({ senha: "1234567" });
    assert.deepEqual(resultado.erros.map((e) => e.campo), ["razaoSocial", "cnpj", "email", "senha"]);
  });
});
