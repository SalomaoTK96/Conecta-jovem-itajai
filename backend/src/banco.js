// Carregado aqui também, e não só no server.js, para que qualquer script que
// use o banco direto pela linha de comando já encontre a DATABASE_URL.
require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

// A partir da versão 7, o Prisma monta o SQL mas não fala direto com o banco:
// quem conversa com o PostgreSQL é este adaptador. Antes vinha tudo junto.
const adaptador = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Uma conexão só para o processo inteiro. Se cada rota abrisse a sua, o
// PostgreSQL ficaria sem conexões livres rapidinho.
const banco = new PrismaClient({ adapter: adaptador });

module.exports = banco;
