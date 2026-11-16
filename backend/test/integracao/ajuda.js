// Preparação dos testes de integração (API ↔ banco). Os testes chamam a API de
// verdade com o Supertest e depois conferem o que ficou gravado no PostgreSQL.
//
// Usa um banco SÓ para testes, informado em DATABASE_URL_TESTE (no .env ou no
// ambiente). Antes de cada arquivo o banco é esvaziado, por isso o nome do
// banco precisa terminar em "_teste": assim ninguém apaga o banco de verdade
// por engano.

require("dotenv").config();

const urlDoTeste = process.env.DATABASE_URL_TESTE;
if (!urlDoTeste) {
  throw new Error("Defina DATABASE_URL_TESTE (um banco só para testes, ex.: .../conecta_jovem_teste).");
}
const nomeDoBanco = new URL(urlDoTeste).pathname.slice(1);
if (!nomeDoBanco.endsWith("_teste")) {
  throw new Error(`O banco de teste precisa terminar em "_teste" (veio "${nomeDoBanco}"). Os testes apagam os dados.`);
}

// Tem que vir antes de carregar o app: o banco.js lê a DATABASE_URL ao ser carregado.
process.env.DATABASE_URL = urlDoTeste;
process.env.JWT_SECRET ||= "segredo-so-para-os-testes-de-integracao";
process.env.FORCAR_HTTPS = "false";

const request = require("supertest");
const app = require("../../src/app");
const banco = require("../../src/banco");

const api = () => request(app);
const SENHA = "senha1234";

// Esvazia todas as tabelas e zera os ids.
async function limparBanco() {
  const tabelas = await banco.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const lista = tabelas.map((t) => `"${t.tablename}"`).join(", ");
  await banco.$executeRawUnsafe(`TRUNCATE ${lista} RESTART IDENTITY CASCADE`);
}

async function entrar(email) {
  const resposta = await api().post("/sessao").send({ email, senha: SENHA }).expect(200);
  return resposta.body.token;
}

// Jovem pela API (US01) com perfil e currículo completos (US04, US05), pronto
// para se candidatar.
async function criarJovemCompleto(email, nome = "Jovem Teste") {
  await api()
    .post("/jovens")
    .send({ nome, email, senha: SENHA, dataNascimento: "2007-05-10", telefone: "(47) 99999-1111" })
    .expect(201);
  const token = await entrar(email);

  await api()
    .put("/perfil")
    .set("Authorization", `Bearer ${token}`)
    .send({ telefone: "(47) 99999-1111", endereco: "Rua A, 10", habilidades: "Excel" })
    .expect(200);
  await api()
    .put("/curriculo")
    .set("Authorization", `Bearer ${token}`)
    .send({
      objetivo: "Primeiro emprego",
      escolaridades: [{ instituicao: "EEB Itajaí", curso: "3º ano", nivel: "Ensino médio", anoInicio: 2024 }],
    })
    .expect(200);

  return token;
}

// Empresa pela API (US02). A validação do admin (US07) é feita direto no banco
// aqui, porque ela tem o próprio teste e exige envio de arquivos.
async function criarEmpresa(email, cnpj, { validada = true } = {}) {
  await api()
    .post("/empresas")
    .send({ razaoSocial: `Empresa ${email}`, cnpj, email, senha: SENHA })
    .expect(201);
  if (validada) {
    const usuario = await banco.usuario.findUnique({ where: { email } });
    await banco.empresa.update({ where: { usuarioId: usuario.id }, data: { status: "VALIDADA" } });
  }
  return entrar(email);
}

// Prazo daqui a N dias, no formato do formulário.
function diaDaqui(dias) {
  return new Date(Date.now() + dias * 86400000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

async function publicarVaga(tokenDaEmpresa, campos = {}) {
  const resposta = await api()
    .post("/empresas/vagas")
    .set("Authorization", `Bearer ${tokenDaEmpresa}`)
    .send({
      titulo: "Jovem aprendiz administrativo",
      tipo: "APRENDIZAGEM",
      area: "Administração",
      cidade: "Itajaí",
      descricao: "Apoio na rotina do escritório e atendimento ao público.",
      expiraEm: diaDaqui(20),
      ...campos,
    })
    .expect(201);
  return resposta.body;
}

module.exports = {
  api,
  banco,
  SENHA,
  limparBanco,
  entrar,
  criarJovemCompleto,
  criarEmpresa,
  publicarVaga,
  diaDaqui,
};
