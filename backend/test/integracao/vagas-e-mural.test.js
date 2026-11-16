// IT03: publicar vaga e o mural, da API até o banco.
// US08 · US09 · RN01 · RN06

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { api, banco, limparBanco, criarEmpresa, publicarVaga } = require("./ajuda");

let validada;
let pendente;

before(async () => {
  await limparBanco();
  validada = await criarEmpresa("validada@teste.com", "11.222.333/0001-81");
  pendente = await criarEmpresa("pendente@teste.com", "11.444.777/0001-61", { validada: false });
});
after(() => banco.$disconnect());

test("IT03: empresa pendente não publica vaga e nada é gravado (RN01)", async () => {
  await api()
    .post("/empresas/vagas")
    .set("Authorization", `Bearer ${pendente}`)
    .send({ titulo: "Vaga que não pode", tipo: "ESTAGIO", area: "Tecnologia", cidade: "Itajaí", descricao: "x".repeat(30), expiraEm: "2026-12-30" })
    .expect(403);
  assert.equal(await banco.vaga.count(), 0);
});

test("IT03: vaga publicada é gravada aberta e aparece no mural público", async () => {
  const vaga = await publicarVaga(validada, { titulo: "Estágio em suporte de TI", area: "Tecnologia" });

  const gravada = await banco.vaga.findUnique({ where: { id: vaga.id } });
  assert.equal(gravada.status, "ABERTA");

  const mural = await api().get("/vagas?area=Tecnologia").expect(200);
  assert.deepEqual(mural.body.vagas.map((v) => v.id), [vaga.id]);
  assert.equal(mural.body.vagas[0].empresa, "Empresa validada@teste.com");
});

test("IT03: vaga encerrada no banco some do mural e o detalhe responde 404 (RN06)", async () => {
  const vaga = await publicarVaga(validada, { titulo: "Vaga que vai encerrar" });
  await api().post(`/empresas/vagas/${vaga.id}/encerrar`).set("Authorization", `Bearer ${validada}`).expect(200);

  assert.equal((await banco.vaga.findUnique({ where: { id: vaga.id } })).status, "ENCERRADA");
  const mural = await api().get("/vagas").expect(200);
  assert.ok(!mural.body.vagas.some((v) => v.id === vaga.id));
  await api().get(`/vagas/${vaga.id}`).expect(404);
});

test("IT03: vaga de empresa que deixou de ser validada sai do mural (RN01)", async () => {
  await banco.empresa.updateMany({ data: { status: "EM_ANALISE" } });
  const mural = await api().get("/vagas").expect(200);
  assert.equal(mural.body.total, 0);
  await banco.empresa.updateMany({ where: { cnpj: "11222333000181" }, data: { status: "VALIDADA" } });
});

test("IT03: paginação com 45 vagas devolve 3 páginas de no máximo 20", async () => {
  await banco.vaga.deleteMany();
  const empresa = await banco.empresa.findFirst({ where: { status: "VALIDADA" } });
  const prazo = new Date(Date.now() + 10 * 86400000);
  await banco.vaga.createMany({
    data: Array.from({ length: 45 }, (_, i) => ({
      empresaId: empresa.id, titulo: `Vaga ${i}`, tipo: "ESTAGIO", area: "Comércio",
      cidade: "Itajaí", descricao: "Descrição da vaga de teste.", expiraEm: prazo,
    })),
  });

  const pagina3 = await api().get("/vagas?pagina=3").expect(200);
  assert.equal(pagina3.body.totalDePaginas, 3);
  assert.equal(pagina3.body.vagas.length, 5);
});
