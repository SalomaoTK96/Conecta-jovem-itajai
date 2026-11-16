// Testes do envio de documentos (US06 · RF10) e da decisão do admin
// (US07 · RF11 · RN01 · RN10).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  formatoDoArquivo,
  conferirDocumentos,
  situacaoParaEnvio,
  podePublicarVagas,
  TAMANHO_MAXIMO,
} = require("../../src/empresas/validacao");
const { conferirDecisao, podeDecidir, mensagemParaEmpresa } = require("../../src/empresas/decisao");

const PDF = Buffer.from("%PDF-1.4 teste");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const EXE = Buffer.from("MZ executável");

describe("formato do arquivo pelo conteúdo", () => {
  test("reconhece PDF, PNG e JPG pelos primeiros bytes", () => {
    assert.equal(formatoDoArquivo(PDF), "pdf");
    assert.equal(formatoDoArquivo(PNG), "png");
    assert.equal(formatoDoArquivo(JPG), "jpg");
  });

  test("arquivo renomeado para .pdf mas com outro conteúdo é recusado", () => {
    assert.equal(formatoDoArquivo(EXE), null);
  });
});

describe("conferirDocumentos", () => {
  test("os dois documentos válidos passam", () => {
    const resultado = conferirDocumentos({
      cartaoCnpj: { tamanho: PDF.length, conteudo: PDF },
      contratoSocial: { tamanho: PNG.length, conteudo: PNG },
    });
    assert.equal(resultado.valido, true);
    assert.deepEqual(resultado.documentos.map((d) => d.tipo), ["CARTAO_CNPJ", "CONTRATO_SOCIAL"]);
  });

  test("falta de documento, arquivo grande e formato errado", () => {
    const resultado = conferirDocumentos({
      cartaoCnpj: { tamanho: TAMANHO_MAXIMO + 1, conteudo: PDF },
    });
    assert.equal(resultado.erros.length, 2);
    assert.match(resultado.erros[0].mensagem, /5 MB/);
    assert.match(resultado.erros[1].mensagem, /Anexe/);

    const formato = conferirDocumentos({
      cartaoCnpj: { tamanho: 10, conteudo: EXE },
      contratoSocial: { tamanho: 10, conteudo: PDF },
    });
    assert.match(formato.erros[0].mensagem, /PDF, JPG ou PNG/);
  });

  test("arquivo com exatamente 5 MB ainda é aceito (valor-limite)", () => {
    const resultado = conferirDocumentos({
      cartaoCnpj: { tamanho: TAMANHO_MAXIMO, conteudo: PDF },
      contratoSocial: { tamanho: TAMANHO_MAXIMO, conteudo: PDF },
    });
    assert.equal(resultado.valido, true);
  });

  test("no reenvio basta um documento, mas não pode vir vazio", () => {
    assert.equal(
      conferirDocumentos({ cartaoCnpj: { tamanho: 10, conteudo: PDF } }, { reenvio: true }).valido,
      true
    );
    assert.match(conferirDocumentos({}, { reenvio: true }).erros[0].mensagem, /pelo menos um/);
  });
});

describe("situação para envio e RN01", () => {
  test("cada status da empresa dá a resposta certa", () => {
    assert.equal(situacaoParaEnvio("VALIDADA").pode, false);
    assert.deepEqual(situacaoParaEnvio("EM_ANALISE", { status: "DOCUMENTOS_PENDENTES" }), {
      pode: true,
      reenvio: true,
    });
    assert.equal(situacaoParaEnvio("EM_ANALISE", { status: "PENDENTE" }).pode, false);
    assert.equal(situacaoParaEnvio("REJEITADA").pode, false);
    assert.deepEqual(situacaoParaEnvio("PENDENTE"), { pode: true, reenvio: false });
  });

  test("só empresa validada publica vaga", () => {
    assert.equal(podePublicarVagas("VALIDADA"), true);
    assert.equal(podePublicarVagas("EM_ANALISE"), false);
  });
});

describe("decisão do admin", () => {
  test("aprovar não exige motivo", () => {
    const resultado = conferirDecisao({ decisao: "aprovar" });
    assert.equal(resultado.valido, true);
    assert.equal(resultado.motivo, null);
  });

  test("rejeitar com motivo de 9 caracteres é recusado; com 10 é aceito", () => {
    assert.equal(conferirDecisao({ decisao: "REJEITAR", motivo: "123456789" }).valido, false);
    assert.equal(conferirDecisao({ decisao: "REJEITAR", motivo: "1234567890" }).valido, true);
  });

  test("motivo com mais de 500 caracteres e decisão desconhecida", () => {
    assert.equal(conferirDecisao({ decisao: "PEDIR_DOCUMENTOS", motivo: "m".repeat(501) }).valido, false);
    assert.equal(conferirDecisao({ decisao: "APAGAR" }).erros[0].campo, "decisao");
  });

  test("só decide pedido pendente e monta a mensagem para a empresa", () => {
    assert.equal(podeDecidir("PENDENTE"), true);
    assert.equal(podeDecidir("APROVADA"), false);
    assert.match(mensagemParaEmpresa("APROVAR"), /já pode publicar/);
    assert.match(mensagemParaEmpresa("REJEITAR", "CNPJ ilegível"), /rejeitado. Motivo: CNPJ ilegível/);
    assert.match(mensagemParaEmpresa("PEDIR_DOCUMENTOS", "envie o contrato"), /documentos adicionais/);
  });
});
