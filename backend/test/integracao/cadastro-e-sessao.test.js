// IT01 e IT02: cadastro e login gravam e leem do banco de verdade.
// US01 · US02 · US03 · TS01 (senha em hash) · RN03 (um e-mail por conta)

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { api, banco, SENHA, limparBanco } = require("./ajuda");

before(limparBanco);
after(() => banco.$disconnect());

test("IT01: cadastro de jovem grava usuario e jovem, com a senha só em hash", async () => {
  const resposta = await api()
    .post("/jovens")
    .send({ nome: "Ana Teste", email: "Ana@Teste.com", senha: SENHA, dataNascimento: "2007-05-10" })
    .expect(201);

  const usuario = await banco.usuario.findUnique({ where: { email: "ana@teste.com" }, include: { jovem: true } });
  assert.equal(resposta.body.id, usuario.id);
  assert.equal(usuario.perfil, "JOVEM");
  assert.equal(usuario.jovem.nome, "Ana Teste");
  assert.ok(usuario.senhaHash.startsWith("$2b$10$"), "a senha deve estar em BCrypt");
  assert.ok(!usuario.senhaHash.includes(SENHA));
  assert.equal(JSON.stringify(resposta.body).includes("senhaHash"), false, "o hash não sai na resposta");
});

test("IT01: o mesmo e-mail não cria segunda conta (RN03)", async () => {
  await api()
    .post("/jovens")
    .send({ nome: "Outra Ana", email: "ana@teste.com", senha: SENHA, dataNascimento: "2007-05-10" })
    .expect(409);
  assert.equal(await banco.usuario.count({ where: { email: "ana@teste.com" } }), 1);
});

test("IT02: login devolve token que a API aceita, e senha errada é recusada", async () => {
  await api().post("/sessao").send({ email: "ana@teste.com", senha: "errada123" }).expect(401);

  const { body } = await api().post("/sessao").send({ email: "ana@teste.com", senha: SENHA }).expect(200);
  const eu = await api().get("/sessao/eu").set("Authorization", `Bearer ${body.token}`).expect(200);
  assert.equal(eu.body.perfil, "JOVEM");
  assert.equal(eu.body.email, "ana@teste.com");
});

test("IT02: cadastro de empresa nasce pendente no banco (RN01)", async () => {
  await api()
    .post("/empresas")
    .send({ razaoSocial: "Loja Teste", cnpj: "11.222.333/0001-81", email: "loja@teste.com", senha: SENHA })
    .expect(201);
  const empresa = await banco.empresa.findUnique({ where: { cnpj: "11222333000181" } });
  assert.equal(empresa.status, "PENDENTE");
});
