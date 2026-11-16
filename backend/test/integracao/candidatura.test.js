// IT04, IT05, IT06 e IT07: candidatura, status, histórico e notificação,
// conferindo no banco o que cada chamada da API gravou.
// US10 · US11 · US12 · US13 · RN02 · RN04 · RN05 · RN07 · RN08

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { api, banco, limparBanco, criarEmpresa, criarJovemCompleto, publicarVaga } = require("./ajuda");

let empresa;
let outraEmpresa;
let jovem;
let vaga;
let candidaturaId;

const com = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  await limparBanco();
  empresa = await criarEmpresa("empresa@teste.com", "11.222.333/0001-81");
  outraEmpresa = await criarEmpresa("outra@teste.com", "11.444.777/0001-61");
  jovem = await criarJovemCompleto("ana@teste.com", "Ana Teste");
  vaga = await publicarVaga(empresa, { titulo: "Estágio em suporte de TI" });
});
after(() => banco.$disconnect());

test("IT04: candidatura grava candidatura, histórico e notificação juntos", async () => {
  const resposta = await api().post("/candidaturas").set(com(jovem)).send({ vagaId: vaga.id }).expect(201);
  candidaturaId = resposta.body.id;

  const gravada = await banco.candidatura.findUnique({
    where: { id: candidaturaId },
    include: { historico: true, notificacoes: true },
  });
  assert.equal(gravada.status, "EM_ANALISE");
  assert.equal(gravada.historico.length, 1);
  assert.equal(gravada.historico[0].statusAnterior, null);
  assert.equal(gravada.notificacoes.length, 1);
  assert.match(gravada.notificacoes[0].mensagem, /foi enviada/);
});

test("IT05: cinco pedidos ao mesmo tempo gravam uma candidatura só (RN05)", async () => {
  const outraVaga = await publicarVaga(empresa, { titulo: "Atendente de loja" });
  const respostas = await Promise.all(
    Array.from({ length: 5 }, () => api().post("/candidaturas").set(com(jovem)).send({ vagaId: outraVaga.id }))
  );

  const codigos = respostas.map((r) => r.status).sort();
  assert.deepEqual(codigos, [201, 409, 409, 409, 409]);
  assert.equal(await banco.candidatura.count({ where: { vagaId: outraVaga.id } }), 1);
});

test("IT05: jovem com perfil incompleto é barrado e nada é gravado (RN02)", async () => {
  await api()
    .post("/jovens")
    .send({ nome: "Bruno", email: "bruno@teste.com", senha: "senha1234", dataNascimento: "2007-01-01" })
    .expect(201);
  const { body } = await api().post("/sessao").send({ email: "bruno@teste.com", senha: "senha1234" });

  const resposta = await api().post("/candidaturas").set(com(body.token)).send({ vagaId: vaga.id }).expect(422);
  assert.equal(resposta.body.irPara, "perfil.html");
  assert.equal(await banco.candidatura.count({ where: { vagaId: vaga.id } }), 1);
});

test("IT06: empresa muda o status e o jovem vê histórico e notificação (RN08)", async () => {
  await api()
    .patch(`/empresas/candidaturas/${candidaturaId}`)
    .set(com(empresa))
    .send({ status: "APROVADA" })
    .expect(200);

  const historico = await banco.historicoCandidatura.findMany({ where: { candidaturaId }, orderBy: { id: "asc" } });
  assert.deepEqual(historico.map((h) => h.statusNovo), ["EM_ANALISE", "APROVADA"]);

  const minhas = await api().get(`/candidaturas/${candidaturaId}`).set(com(jovem)).expect(200);
  assert.equal(minhas.body.status, "APROVADA");
  assert.equal(minhas.body.historico.at(-1).para, "Aprovada");

  const naoLidas = await api().get("/notificacoes/nao-lidas").set(com(jovem)).expect(200);
  assert.equal(naoLidas.body.total, 3); // 2 confirmações + a aprovação
});

test("IT06: status inválido é recusado e o banco continua como estava", async () => {
  await api()
    .patch(`/empresas/candidaturas/${candidaturaId}`)
    .set(com(empresa))
    .send({ status: "CONTRATADO" })
    .expect(400);
  assert.equal((await banco.candidatura.findUnique({ where: { id: candidaturaId } })).status, "APROVADA");
  assert.equal(await banco.historicoCandidatura.count({ where: { candidaturaId } }), 2);
});

test("IT07: outra empresa não vê nem muda a candidatura (RN04, RN07)", async () => {
  await api().get(`/empresas/candidaturas?vagaId=${vaga.id}`).set(com(outraEmpresa)).expect(404);
  await api().get(`/empresas/candidaturas/${candidaturaId}`).set(com(outraEmpresa)).expect(404);
  await api()
    .patch(`/empresas/candidaturas/${candidaturaId}`)
    .set(com(outraEmpresa))
    .send({ status: "RECUSADA" })
    .expect(404);

  assert.equal((await banco.candidatura.findUnique({ where: { id: candidaturaId } })).status, "APROVADA");
});

test("IT07: notificação lida só pelo dono, e o contador desce", async () => {
  const lista = await api().get("/notificacoes").set(com(jovem)).expect(200);
  const primeira = lista.body.notificacoes[0];

  await api().post(`/notificacoes/${primeira.id}/lida`).set(com(empresa)).expect(404);
  await api().post(`/notificacoes/${primeira.id}/lida`).set(com(jovem)).expect(204);

  assert.equal((await banco.notificacao.findUnique({ where: { id: primeira.id } })).lida, true);
  const naoLidas = await api().get("/notificacoes/nao-lidas").set(com(jovem)).expect(200);
  assert.equal(naoLidas.body.total, 2);
});
