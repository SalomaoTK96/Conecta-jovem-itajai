// Testes do currículo (US05 · RF05) e do perfil do jovem (US04 · RF04 · RN02).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { conferirCurriculo, curriculoCompleto } = require("../../src/jovens/curriculo");
const { conferirPerfil, situacaoDoPerfil, telefoneValido } = require("../../src/jovens/perfil");

const HOJE = new Date(2026, 10, 16);

const escolaridade = {
  instituicao: "EEB Itajaí",
  curso: "3º ano",
  nivel: "Ensino médio",
  anoInicio: 2024,
  anoFim: "",
};

describe("conferirCurriculo", () => {
  test("objetivo e uma escolaridade cursando é válido e completo", () => {
    const resultado = conferirCurriculo({ objetivo: "Primeiro emprego", escolaridades: [escolaridade] }, HOJE);
    assert.equal(resultado.valido, true);
    assert.equal(resultado.curriculo.escolaridades[0].anoFim, null);
    assert.equal(curriculoCompleto(resultado.curriculo), true);
  });

  test("experiência é opcional: lista vazia não trava", () => {
    const resultado = conferirCurriculo({ objetivo: "x", escolaridades: [escolaridade], experiencias: [] }, HOJE);
    assert.equal(resultado.valido, true);
  });

  test("escolaridade com problemas diz o número do item", () => {
    const resultado = conferirCurriculo(
      { escolaridades: [escolaridade, { nivel: "Doutorado", anoInicio: 1980, anoFim: 1970 }] },
      HOJE
    );
    assert.equal(resultado.valido, false);
    assert.ok(resultado.erros.every((e) => e.mensagem.startsWith("Escolaridade 2:")));
    assert.equal(resultado.erros.length, 5);
  });

  test("ano de conclusão inválido e previsão longe demais", () => {
    const invalido = conferirCurriculo({ escolaridades: [{ ...escolaridade, anoFim: "abc" }] }, HOJE);
    assert.match(invalido.erros[0].mensagem, /não é um ano válido/);
    const longe = conferirCurriculo({ escolaridades: [{ ...escolaridade, anoFim: 2040 }] }, HOJE);
    assert.match(longe.erros[0].mensagem, /longe demais/);
  });

  test("experiência no futuro, mês inválido e saída antes do início", () => {
    const resultado = conferirCurriculo(
      {
        experiencias: [
          { empresa: "Loja", cargo: "Vendedor", inicio: "2027-01", fim: "2026-13" },
          { empresa: "Loja", cargo: "Vendedor", inicio: "2025-05", fim: "2025-01", descricao: "z".repeat(501) },
        ],
      },
      HOJE
    );
    const mensagens = resultado.erros.map((e) => e.mensagem);
    assert.ok(mensagens.some((m) => m.startsWith("Experiência 1:") && /futuro/.test(m)));
    assert.ok(mensagens.some((m) => m.startsWith("Experiência 1:") && /saída não é válido/.test(m)));
    assert.ok(mensagens.some((m) => m.startsWith("Experiência 2:") && /antes do início/.test(m)));
    assert.ok(mensagens.some((m) => /500 caracteres/.test(m)));
  });

  test("mais de 10 itens e objetivo longo são recusados", () => {
    const resultado = conferirCurriculo(
      { objetivo: "o".repeat(301), escolaridades: Array(11).fill(escolaridade) },
      HOJE
    );
    assert.deepEqual(resultado.erros.map((e) => e.campo), ["objetivo", null]);
  });

  test("sem objetivo o currículo salva, mas não conta como completo", () => {
    const resultado = conferirCurriculo({ escolaridades: [escolaridade] }, HOJE);
    assert.equal(resultado.valido, true);
    assert.equal(curriculoCompleto(resultado.curriculo), false);
  });
});

describe("perfil do jovem", () => {
  test("telefone com 10 ou 11 dígitos é válido", () => {
    assert.equal(telefoneValido("(47) 3333-4444"), true);
    assert.equal(telefoneValido("(47) 99999-1111"), true);
    assert.equal(telefoneValido("9999-1111"), false);
  });

  test("conferirPerfil aponta telefone, endereço e habilidades fora do padrão", () => {
    const resultado = conferirPerfil({
      telefone: "123",
      endereco: "e".repeat(201),
      habilidades: "h".repeat(501),
    });
    assert.deepEqual(resultado.erros.map((e) => e.campo), ["telefone", "endereco", "habilidades"]);
  });

  test("campos em branco viram null e são aceitos", () => {
    const resultado = conferirPerfil({ telefone: "  ", endereco: undefined });
    assert.equal(resultado.valido, true);
    assert.equal(resultado.perfil.telefone, null);
  });

  test("RN02: situação mostra o que falta, incluindo o currículo", () => {
    assert.deepEqual(situacaoDoPerfil(null, null).faltando, [
      "Telefone",
      "Endereço",
      "Habilidades",
      "Currículo",
    ]);
    const completo = situacaoDoPerfil(
      { telefone: "47999991111", endereco: "Rua A", habilidades: "Excel" },
      { objetivo: "x", escolaridades: [escolaridade] }
    );
    assert.equal(completo.completo, true);
  });
});
