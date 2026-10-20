const { PrismaClient } = require("../generated/prisma/client");

// Uma conexão só para o processo inteiro. Se cada rota abrisse a sua, o
// PostgreSQL ficaria sem conexões livres rapidinho.
const banco = new PrismaClient();

module.exports = banco;
