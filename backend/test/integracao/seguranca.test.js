// Testes de segurança pela API (OWASP Top 10): injeção de SQL, autenticação e
// sessão, controle de acesso, cabeçalhos de segurança e força bruta no login.
// SEC01 a SEC06. Os resultados ficam no relatório de segurança da M3.

const { test, before, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const { api, banco, SENHA, limparBanco, criarEmpresa, criarJovemCompleto, publicarVaga } = require("./ajuda");

let jovem;
let empresa;
let vaga;

before(async () => {
  await limparBanco();
  empresa = await criarEmpresa("empresa@teste.com", "11.222.333/0001-81");
  jovem = await criarJovemCompleto("ana@teste.com", "Ana Teste");
  vaga = await publicarVaga(empresa, { titulo: "Estágio em suporte de TI" });
});
after(() => banco.$disconnect());

const com = (token) => ({ Authorization: `Bearer ${token}` });

describe("SEC01: injeção de SQL (A03)", () => {
  test("palavra-chave com SQL no mural é tratada como texto", async () => {
    for (const q of ["' OR '1'='1", "'; DROP TABLE \"Vaga\"; --", "%", "_"]) {
      const resposta = await api().get("/vagas").query({ q }).expect(200);
      assert.equal(resposta.body.total, 0, `"${q}" não pode trazer vagas`);
    }
    assert.equal(await banco.vaga.count(), 1, "a tabela continua inteira");
  });

  test("login com SQL no e-mail não entra", async () => {
    await api().post("/sessao").send({ email: "' OR 1=1 --", senha: "x" }).expect(401);
    await api().post("/sessao").send({ email: "ana@teste.com' --", senha: "qualquer" }).expect(401);
  });

  test("id com SQL no endereço responde 404, sem erro 500", async () => {
    await api().get("/vagas/1%20OR%201=1").expect(404);
    await api().get("/empresas/candidaturas/1;DELETE").set(com(empresa)).expect(404);
  });
});

describe("SEC02: autenticação e sessão (A07)", () => {
  test("token assinado com outro segredo é recusado", async () => {
    const falso = jwt.sign({ id: 1, perfil: "ADMIN" }, "segredo-chutado-por-um-atacante");
    await api().get("/sessao/eu").set(com(falso)).expect(401);
  });

  test('token com algoritmo "none" (sem assinatura) é recusado', async () => {
    const semAssinatura = jwt.sign({ id: 1, perfil: "ADMIN" }, null, { algorithm: "none" });
    await api().get("/sessao/eu").set(com(semAssinatura)).expect(401);
  });

  test("token vencido é recusado", async () => {
    const vencido = jwt.sign({ id: 1, perfil: "JOVEM", exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
    await api().get("/sessao/eu").set(com(vencido)).expect(401);
  });

  test("a resposta do login não traz o hash da senha", async () => {
    const { body } = await api().post("/sessao").send({ email: "ana@teste.com", senha: SENHA }).expect(200);
    assert.ok(!JSON.stringify(body).includes("$2b$"));
  });

  test("e-mail inexistente e senha errada dão a mesma resposta", async () => {
    const inexistente = await api().post("/sessao").send({ email: "ninguem@teste.com", senha: "senha1234" });
    const errada = await api().post("/sessao").send({ email: "ana@teste.com", senha: "senhaerrada" });
    assert.equal(inexistente.status, errada.status);
    assert.deepEqual(inexistente.body, errada.body);
  });
});

describe("SEC03: controle de acesso (A01)", () => {
  test("cadastro não aceita escolher o perfil ADMIN (atribuição em massa)", async () => {
    await api()
      .post("/jovens")
      .send({ nome: "Esperto", email: "esperto@teste.com", senha: SENHA, dataNascimento: "2007-01-01", perfil: "ADMIN" })
      .expect(201);
    const usuario = await banco.usuario.findUnique({ where: { email: "esperto@teste.com" } });
    assert.equal(usuario.perfil, "JOVEM");
  });

  test("jovem não entra nas rotas do admin nem da empresa", async () => {
    await api().get("/admin/validacoes").set(com(jovem)).expect(403);
    await api().get("/empresas/vagas").set(com(jovem)).expect(403);
    await api().patch("/empresas/candidaturas/1").set(com(jovem)).send({ status: "APROVADA" }).expect(403);
  });

  test("empresa não se candidata nem lê candidaturas de jovem", async () => {
    await api().post("/candidaturas").set(com(empresa)).send({ vagaId: vaga.id }).expect(403);
    await api().get("/candidaturas").set(com(empresa)).expect(403);
  });

  test("sem login, as rotas protegidas respondem 401", async () => {
    for (const caminho of ["/perfil", "/curriculo", "/candidaturas", "/notificacoes", "/empresas/vagas", "/admin/validacoes"]) {
      await api().get(caminho).expect(401);
    }
  });
});

describe("SEC04: dados pessoais na API pública (A01, RNF08)", () => {
  test("o mural não expõe e-mail, CNPJ nem ids internos da empresa", async () => {
    const { body } = await api().get(`/vagas/${vaga.id}`).expect(200);
    const texto = JSON.stringify(body);
    assert.ok(!texto.includes('"email"'));
    assert.ok(!texto.includes("11222333000181"));
    assert.equal(body.empresaId, undefined);
  });
});

describe("SEC05: cabeçalhos de segurança (A05)", () => {
  test("não anuncia o Express e manda os cabeçalhos de proteção", async () => {
    const resposta = await api().get("/vagas.html").expect(200);
    assert.equal(resposta.headers["x-powered-by"], undefined, "não deve dizer que é Express");
    assert.equal(resposta.headers["x-content-type-options"], "nosniff");
    assert.equal(resposta.headers["x-frame-options"], "DENY");
    assert.equal(resposta.headers["referrer-policy"], "no-referrer");
    assert.match(resposta.headers["content-security-policy"] || "", /default-src 'self'/);
  });
});

describe("SEC06: força bruta no login (A07)", () => {
  test("depois de 5 senhas erradas seguidas, o login fica bloqueado por um tempo", async () => {
    const tentativa = (senha) => api().post("/sessao").send({ email: "ana@teste.com", senha });

    for (let i = 0; i < 5; i += 1) await tentativa("errada" + i).expect(401);
    const bloqueada = await tentativa(SENHA).expect(429);
    assert.match(bloqueada.body.erros[0].mensagem, /Muitas tentativas/);

    // Outro e-mail não é afetado pelo bloqueio da Ana.
    await api().post("/sessao").send({ email: "empresa@teste.com", senha: SENHA }).expect(200);
  });
});
