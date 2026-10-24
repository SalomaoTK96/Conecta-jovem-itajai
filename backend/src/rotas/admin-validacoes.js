const path = require("node:path");

const express = require("express");

const banco = require("../banco");
const { exigirLogin, exigirPerfil } = require("../seguranca/porta");
const { DOCUMENTOS_EXIGIDOS } = require("../empresas/validacao");
const { PASTA } = require("../empresas/arquivos");

const rotas = express.Router();

// RN10: só administrador entra aqui. Jovem e empresa recebem 403.
rotas.use(exigirLogin, exigirPerfil("ADMIN"));

const NOME_DO_TIPO = Object.fromEntries(DOCUMENTOS_EXIGIDOS.map(({ tipo, nome }) => [tipo, nome]));

function erro(mensagem) {
  return { erros: [{ campo: null, mensagem }] };
}

// O id vem do endereço. Texto, número quebrado ou negativo não chega no banco.
function lerId(texto) {
  const id = Number(texto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Tudo que o admin precisa para decidir. A decisão já registrada vai junto,
// para a tela avisar quando outro admin decidiu antes.
function detalheDaSolicitacao(solicitacao) {
  const { empresa } = solicitacao;

  return {
    id: solicitacao.id,
    status: solicitacao.status,
    enviadaEm: solicitacao.enviadaEm,
    empresa: {
      razaoSocial: empresa.razaoSocial,
      cnpj: empresa.cnpj,
      email: empresa.usuario.email,
      nomeResponsavel: empresa.nomeResponsavel,
      telefone: empresa.telefone,
      status: empresa.status,
    },
    documentos: solicitacao.documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      nome: NOME_DO_TIPO[d.tipo] || d.tipo,
      enviadoEm: d.enviadoEm,
    })),
    decisao: solicitacao.analisadaEm
      ? {
          motivo: solicitacao.motivo,
          analisadaEm: solicitacao.analisadaEm,
          analisadoPor: solicitacao.analisadoPor?.email || null,
        }
      : null,
  };
}

function buscarSolicitacao(id) {
  return banco.solicitacaoValidacao.findUnique({
    where: { id },
    include: {
      empresa: { include: { usuario: true } },
      documentos: { orderBy: { enviadoEm: "asc" } },
      analisadoPor: true,
    },
  });
}

// GET /admin/validacoes -> fila de pedidos pendentes, o mais antigo primeiro
rotas.get("/", async (req, res) => {
  try {
    const pendentes = await banco.solicitacaoValidacao.findMany({
      where: { status: "PENDENTE" },
      orderBy: { enviadaEm: "asc" },
      include: { empresa: true, _count: { select: { documentos: true } } },
    });

    return res.json(
      pendentes.map((s) => ({
        id: s.id,
        razaoSocial: s.empresa.razaoSocial,
        cnpj: s.empresa.cnpj,
        enviadaEm: s.enviadaEm,
        documentos: s._count.documentos,
      }))
    );
  } catch (falha) {
    console.error("Falha ao listar a fila de validação:", falha);
    return res.status(500).json(erro("Não foi possível carregar a fila."));
  }
});

// GET /admin/validacoes/:id -> um pedido com os dados da empresa e os documentos
rotas.get("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(404).json(erro("Solicitação não encontrada."));

  try {
    const solicitacao = await buscarSolicitacao(id);
    if (!solicitacao) return res.status(404).json(erro("Solicitação não encontrada."));

    return res.json(detalheDaSolicitacao(solicitacao));
  } catch (falha) {
    console.error("Falha ao abrir a solicitação:", falha);
    return res.status(500).json(erro("Não foi possível abrir a solicitação."));
  }
});

// GET /admin/validacoes/:id/documentos/:documentoId -> o arquivo para o admin ver
// O documento precisa ser daquela solicitação. Sem essa conferência, trocar o
// número no endereço abriria o documento de qualquer empresa.
rotas.get("/:id/documentos/:documentoId", async (req, res) => {
  const id = lerId(req.params.id);
  const documentoId = lerId(req.params.documentoId);
  if (!id || !documentoId) return res.status(404).json(erro("Documento não encontrado."));

  try {
    const documento = await banco.documento.findFirst({
      where: { id: documentoId, solicitacaoId: id },
    });
    if (!documento) return res.status(404).json(erro("Documento não encontrado."));

    // path.basename garante que o nome guardado não sai da pasta de documentos.
    const arquivo = path.join(PASTA, path.basename(documento.arquivo));

    // Abre na aba do navegador em vez de baixar, e o nome sorteado não
    // revela nada sobre a empresa.
    res.set("Content-Disposition", "inline");
    res.set("X-Content-Type-Options", "nosniff");
    return res.sendFile(arquivo, (falha) => {
      if (falha && !res.headersSent) {
        res.status(404).json(erro("O arquivo deste documento não está mais no servidor."));
      }
    });
  } catch (falha) {
    console.error("Falha ao abrir o documento:", falha);
    return res.status(500).json(erro("Não foi possível abrir o documento."));
  }
});

module.exports = rotas;
