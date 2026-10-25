// Onde os documentos da validação ficam guardados. Por enquanto é uma pasta no
// próprio servidor, fora do Git. Na publicação (TS08) a pasta precisa estar num
// disco que não se apaga a cada nova versão, ou trocar isto por um armazenamento
// de arquivos da hospedagem; o resto do código não muda.

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const PASTA =
  process.env.PASTA_DOCUMENTOS ||
  path.join(__dirname, "..", "..", "uploads", "documentos");

// Grava cada documento com um nome sorteado. O nome que a empresa deu ao arquivo
// não é usado: poderia ter "../" e escrever fora da pasta, ou repetir o de outra
// empresa e sobrescrever. Devolve o caminho relativo, que é o que vai para o banco.
async function guardarDocumentos(documentos) {
  await fs.mkdir(PASTA, { recursive: true });

  const guardados = [];

  for (const documento of documentos) {
    const nome = `${crypto.randomUUID()}.${documento.extensao}`;
    await fs.writeFile(path.join(PASTA, nome), documento.conteudo);
    guardados.push({ tipo: documento.tipo, arquivo: nome });
  }

  return guardados;
}

// Desfaz a gravação quando o banco falha, para não sobrar arquivo sem dono.
async function apagarDocumentos(guardados) {
  await Promise.all(
    guardados.map(({ arquivo }) => fs.rm(path.join(PASTA, arquivo), { force: true }))
  );
}

module.exports = { guardarDocumentos, apagarDocumentos, PASTA };
