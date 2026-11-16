// Roda uma vez antes dos testes E2E: esvazia o banco de teste e cria só o que
// os fluxos precisam encontrar pronto (o admin e uma empresa já validada).

require("dotenv").config();

const urlDoTeste = process.env.DATABASE_URL_TESTE;
if (!urlDoTeste || !new URL(urlDoTeste).pathname.endsWith("_teste")) {
  throw new Error('Defina DATABASE_URL_TESTE com um banco que termine em "_teste". Os testes apagam os dados.');
}
process.env.DATABASE_URL = urlDoTeste;

const banco = require("../../src/banco");
const { gerarHash } = require("../../src/seguranca/senha");
const { SENHA, ADMIN, LOJA } = require("./dados");

module.exports = async function preparar() {
  const tabelas = await banco.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await banco.$executeRawUnsafe(
    `TRUNCATE ${tabelas.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`
  );

  const senhaHash = await gerarHash(SENHA);
  await banco.usuario.create({ data: { email: ADMIN, senhaHash, perfil: "ADMIN" } });
  await banco.usuario.create({
    data: {
      email: LOJA.email,
      senhaHash,
      perfil: "EMPRESA",
      empresa: { create: { razaoSocial: LOJA.razaoSocial, cnpj: LOJA.cnpj, status: "VALIDADA" } },
    },
  });

  await banco.$disconnect();
};
