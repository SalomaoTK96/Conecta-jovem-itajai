const express = require("express");
const multer = require("multer");

const banco = require("../banco");
const { exigirLogin, exigirPerfil } = require("../seguranca/porta");
const { guardarDocumentos, apagarDocumentos } = require("../empresas/arquivos");
const {
  DOCUMENTOS_EXIGIDOS,
  TAMANHO_MAXIMO,
  TAMANHO_MAXIMO_EM_MB,
  NOMES_DOS_FORMATOS,
  conferirDocumentos,
  situacaoParaEnvio,
  podePublicarVagas,
} = require("../empresas/validacao");

const rotas = express.Router();

// Só a própria empresa vê e envia o pedido dela. Como na US04, não existe id no
// endereço: o pedido é sempre o da empresa que está no token.
rotas.use(exigirLogin, exigirPerfil("EMPRESA"));

// Os arquivos chegam na memória primeiro e só vão para o disco depois de
// conferidos. Assim um arquivo recusado nunca chega a ser gravado.
// O limite aqui corta o envio no meio quando passa do tamanho, em vez de
// receber um arquivo enorme inteiro só para recusar depois.
const receberArquivos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO, files: DOCUMENTOS_EXIGIDOS.length },
}).fields(DOCUMENTOS_EXIGIDOS.map(({ campo }) => ({ name: campo, maxCount: 1 })));

// Traduz os erros do multer para o mesmo formato de erro do resto da API.
function receberArquivosComAviso(req, res, next) {
  receberArquivos(req, res, (erro) => {
    if (!erro) return next();

    const mensagens = {
      LIMIT_FILE_SIZE: `Cada arquivo pode ter até ${TAMANHO_MAXIMO_EM_MB} MB.`,
      LIMIT_FILE_COUNT: "Envie um arquivo por documento.",
      LIMIT_UNEXPECTED_FILE: "Envie só os documentos pedidos na tela.",
    };

    if (erro instanceof multer.MulterError) {
      return res.status(400).json({
        erros: [{ campo: erro.field || null, mensagem: mensagens[erro.code] || "Envio inválido." }],
      });
    }

    next(erro);
  });
}

const SESSAO_INVALIDA = {
  erros: [{ campo: null, mensagem: "Sessão inválida." }],
};

function empresaDoUsuario(usuarioId) {
  return banco.empresa.findUnique({
    where: { usuarioId },
    include: {
      solicitacoes: {
        orderBy: { enviadaEm: "desc" },
        take: 1,
        include: { documentos: { orderBy: { enviadoEm: "asc" } } },
      },
    },
  });
}

const NOME_DO_TIPO = Object.fromEntries(DOCUMENTOS_EXIGIDOS.map(({ tipo, nome }) => [tipo, nome]));

// Tudo que a tela precisa para se montar: o que é exigido, a situação atual e
// se o botão de enviar deve aparecer. O caminho do arquivo no servidor não sai
// daqui; a empresa não precisa dele e ele só interessa ao administrador.
function resposta(empresa) {
  const ultima = empresa.solicitacoes[0] || null;
  const envio = situacaoParaEnvio(empresa.status, ultima);

  return {
    statusEmpresa: empresa.status,
    podePublicarVagas: podePublicarVagas(empresa.status),
    exigencias: {
      documentos: DOCUMENTOS_EXIGIDOS.map(({ campo, nome, descricao }) => ({ campo, nome, descricao })),
      formatos: NOMES_DOS_FORMATOS,
      tamanhoMaximoEmMb: TAMANHO_MAXIMO_EM_MB,
    },
    envio: {
      pode: envio.pode,
      reenvio: Boolean(envio.reenvio),
      mensagem: envio.mensagem || null,
    },
    solicitacao: ultima && {
      id: ultima.id,
      status: ultima.status,
      enviadaEm: ultima.enviadaEm,
      motivo: ultima.motivo,
      documentos: ultima.documentos.map((d) => ({
        tipo: d.tipo,
        nome: NOME_DO_TIPO[d.tipo] || d.tipo,
        enviadoEm: d.enviadoEm,
      })),
    },
  };
}

// GET /empresas/validacao -> situação do pedido de validação da empresa logada
rotas.get("/", async (req, res) => {
  try {
    const empresa = await empresaDoUsuario(req.usuario.id);
    if (!empresa) return res.status(401).json(SESSAO_INVALIDA);

    return res.json(resposta(empresa));
  } catch (erro) {
    console.error("Falha ao consultar a validação:", erro);
    return res.status(500).json({
      erros: [{ campo: null, mensagem: "Não foi possível consultar a validação." }],
    });
  }
});

// POST /empresas/validacao -> envia (ou reenvia) os documentos
rotas.post("/", receberArquivosComAviso, async (req, res) => {
  let guardados = [];

  try {
    const empresa = await empresaDoUsuario(req.usuario.id);
    if (!empresa) return res.status(401).json(SESSAO_INVALIDA);

    const ultima = empresa.solicitacoes[0] || null;
    const envio = situacaoParaEnvio(empresa.status, ultima);

    // 409: o pedido está certo, o momento é que não permite.
    if (!envio.pode) {
      return res.status(409).json({ erros: [{ campo: null, mensagem: envio.mensagem }] });
    }

    // Do formato do multer ({ campo: [arquivo] }) para o das regras.
    const arquivos = {};
    for (const [campo, lista] of Object.entries(req.files || {})) {
      arquivos[campo] = {
        nomeOriginal: lista[0].originalname,
        tamanho: lista[0].size,
        conteudo: lista[0].buffer,
      };
    }

    const conferencia = conferirDocumentos(arquivos, { reenvio: envio.reenvio });

    if (!conferencia.valido) {
      return res.status(400).json({ erros: conferencia.erros });
    }

    guardados = await guardarDocumentos(conferencia.documentos);

    // Tudo numa transação: ou a solicitação, os documentos e o status da
    // empresa mudam juntos, ou nada muda. Senão poderia sobrar empresa "em
    // análise" sem documento nenhum para o administrador olhar.
    if (envio.reenvio) {
      await banco.$transaction([
        banco.documento.createMany({
          data: guardados.map((d) => ({ ...d, solicitacaoId: ultima.id })),
        }),
        banco.solicitacaoValidacao.update({
          where: { id: ultima.id },
          // O pedido de documentos foi atendido; a mensagem antiga do
          // administrador sairia na tela como se ainda faltasse algo.
          data: { status: "PENDENTE", motivo: null },
        }),
        banco.empresa.update({ where: { id: empresa.id }, data: { status: "EM_ANALISE" } }),
      ]);
    } else {
      await banco.$transaction([
        banco.solicitacaoValidacao.create({
          data: { empresaId: empresa.id, documentos: { create: guardados } },
        }),
        banco.empresa.update({ where: { id: empresa.id }, data: { status: "EM_ANALISE" } }),
      ]);
    }

    return res.status(envio.reenvio ? 200 : 201).json(resposta(await empresaDoUsuario(req.usuario.id)));
  } catch (erro) {
    await apagarDocumentos(guardados).catch(() => {});

    console.error("Falha ao enviar documentos:", erro);
    return res.status(500).json({
      erros: [{ campo: null, mensagem: "Não foi possível enviar os documentos." }],
    });
  }
});

module.exports = rotas;
