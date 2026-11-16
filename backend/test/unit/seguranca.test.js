// Testes da segurança: hash de senha (TS01 · RNF03), token (US03 · RF03),
// travas de permissão (RN10) e HTTPS (TS02 · RNF04).

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "segredo-so-para-os-testes-unitarios";

const { gerarHash, conferirSenha, FATOR_DE_CUSTO } = require("../../src/seguranca/senha");
const { gerarToken, lerToken } = require("../../src/seguranca/token");
const { exigirLogin, exigirPerfil, tokenDoPedido } = require("../../src/seguranca/porta");
const forcarHttps = require("../../src/https");

// Resposta falsa do Express: guarda o status e o corpo para o teste conferir.
function respostaFalsa() {
  return {
    statusCode: 200,
    corpo: null,
    cabecalhos: {},
    destino: null,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(corpo) {
      this.corpo = corpo;
      return this;
    },
    set(nome, valor) {
      this.cabecalhos[nome] = valor;
    },
    redirect(codigo, destino) {
      this.statusCode = codigo;
      this.destino = destino;
    },
  };
}

describe("TS01: senha com BCrypt", () => {
  let hash;

  before(async () => {
    hash = await gerarHash("senha1234");
  });

  test("o hash não contém a senha e usa custo 10", () => {
    assert.ok(!hash.includes("senha1234"));
    assert.ok(hash.startsWith(`$2b$${FATOR_DE_CUSTO}$`));
  });

  test("confere a senha certa e recusa a errada", async () => {
    assert.equal(await conferirSenha("senha1234", hash), true);
    assert.equal(await conferirSenha("senha12345", hash), false);
    assert.equal(await conferirSenha(undefined, hash), false);
  });

  test("a mesma senha gera hashes diferentes (sal)", async () => {
    assert.notEqual(await gerarHash("senha1234"), hash);
  });

  test("senha vazia não vira hash", async () => {
    await assert.rejects(() => gerarHash(""));
  });
});

describe("token de sessão", () => {
  test("gera e lê o token com id e perfil", () => {
    const conteudo = lerToken(gerarToken({ id: 7, email: "a@b.com", perfil: "JOVEM" }));
    assert.equal(conteudo.id, 7);
    assert.equal(conteudo.perfil, "JOVEM");
  });

  test("token adulterado ou vazio vira null", () => {
    const token = gerarToken({ id: 7, email: "a@b.com", perfil: "JOVEM" });
    assert.equal(lerToken(token.slice(0, -2) + "xx"), null);
    assert.equal(lerToken(""), null);
    assert.equal(lerToken(undefined), null);
  });

  test("segredo curto demais impede gerar token", () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "curto";
    assert.throws(() => gerarToken({ id: 1 }), /JWT_SECRET/);
    process.env.JWT_SECRET = original;
  });
});

describe("RN10: travas de permissão", () => {
  const tokenJovem = () => gerarToken({ id: 1, email: "j@t.com", perfil: "JOVEM" });

  test("tokenDoPedido só aceita o formato Bearer", () => {
    assert.equal(tokenDoPedido({ headers: { authorization: "Bearer abc" } }), "abc");
    assert.equal(tokenDoPedido({ headers: { authorization: "Basic abc" } }), null);
    assert.equal(tokenDoPedido({ headers: {} }), null);
  });

  test("sem token responde 401 e não segue", () => {
    const res = respostaFalsa();
    let seguiu = false;
    exigirLogin({ headers: {} }, res, () => (seguiu = true));
    assert.equal(res.statusCode, 401);
    assert.equal(seguiu, false);
  });

  test("com token válido segue e guarda o usuário no pedido", () => {
    const req = { headers: { authorization: `Bearer ${tokenJovem()}` } };
    let seguiu = false;
    exigirLogin(req, respostaFalsa(), () => (seguiu = true));
    assert.equal(seguiu, true);
    assert.equal(req.usuario.perfil, "JOVEM");
  });

  test("perfil errado responde 403; perfil certo segue", () => {
    const res = respostaFalsa();
    exigirPerfil("ADMIN")({ usuario: { perfil: "JOVEM" } }, res, () => {});
    assert.equal(res.statusCode, 403);

    let seguiu = false;
    exigirPerfil("ADMIN", "EMPRESA")({ usuario: { perfil: "EMPRESA" } }, respostaFalsa(), () => (seguiu = true));
    assert.equal(seguiu, true);

    const semLogin = respostaFalsa();
    exigirPerfil("ADMIN")({}, semLogin, () => {});
    assert.equal(semLogin.statusCode, 401);
  });
});

describe("TS02: HTTPS", () => {
  test("desligado, deixa passar", () => {
    process.env.FORCAR_HTTPS = "false";
    let seguiu = false;
    forcarHttps({}, respostaFalsa(), () => (seguiu = true));
    assert.equal(seguiu, true);
  });

  test("ligado: HTTPS recebe HSTS, GET em HTTP redireciona, POST em HTTP é barrado", () => {
    process.env.FORCAR_HTTPS = "true";

    const seguro = respostaFalsa();
    forcarHttps({ secure: true }, seguro, () => {});
    assert.match(seguro.cabecalhos["Strict-Transport-Security"], /max-age/);

    const get = respostaFalsa();
    forcarHttps(
      { secure: false, method: "GET", originalUrl: "/vagas", get: () => "conecta.com" },
      get,
      () => {}
    );
    assert.equal(get.statusCode, 301);
    assert.equal(get.destino, "https://conecta.com/vagas");

    const post = respostaFalsa();
    forcarHttps({ secure: false, method: "POST" }, post, () => {});
    assert.equal(post.statusCode, 403);

    process.env.FORCAR_HTTPS = "false";
  });
});
