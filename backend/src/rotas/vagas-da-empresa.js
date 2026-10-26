const express = require("express");

const banco = require("../banco");
const { exigirLogin, exigirPerfil } = require("../seguranca/porta");
const { exigirEmpresaValidada } = require("../seguranca/empresa-validada");
const { podePublicarVagas } = require("../empresas/validacao");
const { AREAS, TIPOS, conferirVaga, podeEditar } = require("../vagas/regras");
const { encerrarVagasVencidas } = require("../vagas/encerrar-vencidas");

const rotas = express.Router();

// Só a própria empresa mexe nas vagas dela. Como na US04 e na US06, a empresa
// sai do token, nunca do endereço.
rotas.use(exigirLogin, exigirPerfil("EMPRESA"));

function erro(mensagem) {
  return { erros: [{ campo: null, mensagem }] };
}

// O que a tela recebe de cada vaga. Fica num lugar só para todas as rotas
// responderem igual.
function vagaParaTela(vaga) {
  return {
    id: vaga.id,
    titulo: vaga.titulo,
    tipo: vaga.tipo,
    area: vaga.area,
    cidade: vaga.cidade,
    descricao: vaga.descricao,
    requisitos: vaga.requisitos,
    status: vaga.status,
    expiraEm: vaga.expiraEm,
    criadaEm: vaga.criadaEm,
    candidaturas: vaga._count?.candidaturas ?? 0,
  };
}

const CONTAR_CANDIDATURAS = { _count: { select: { candidaturas: true } } };

function empresaDoUsuario(usuarioId) {
  return banco.empresa.findUnique({ where: { usuarioId } });
}

// GET /empresas/vagas -> as vagas da empresa logada, mais novas primeiro
// Também diz se a empresa pode publicar, para a tela saber se mostra o formulário.
rotas.get("/", async (req, res) => {
  try {
    const empresa = await empresaDoUsuario(req.usuario.id);
    if (!empresa) return res.status(401).json(erro("Sessão inválida."));

    await encerrarVagasVencidas();

    const vagas = await banco.vaga.findMany({
      where: { empresaId: empresa.id, removidaEm: null },
      orderBy: { criadaEm: "desc" },
      include: CONTAR_CANDIDATURAS,
    });

    return res.json({
      podePublicarVagas: podePublicarVagas(empresa.status),
      opcoes: { tipos: TIPOS, areas: AREAS },
      vagas: vagas.map(vagaParaTela),
    });
  } catch (falha) {
    console.error("Falha ao listar as vagas da empresa:", falha);
    return res.status(500).json(erro("Não foi possível carregar suas vagas."));
  }
});

// POST /empresas/vagas -> cadastra uma vaga. Só empresa validada (RN01).
rotas.post("/", exigirEmpresaValidada, async (req, res) => {
  const conferencia = conferirVaga(req.body || {});
  if (!conferencia.valido) return res.status(400).json({ erros: conferencia.erros });

  try {
    const vaga = await banco.vaga.create({
      data: { ...conferencia.vaga, empresaId: req.empresa.id },
      include: CONTAR_CANDIDATURAS,
    });

    return res.status(201).json(vagaParaTela(vaga));
  } catch (falha) {
    console.error("Falha ao cadastrar a vaga:", falha);
    return res.status(500).json(erro("Não foi possível cadastrar a vaga."));
  }
});

function lerId(texto) {
  const id = Number(texto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Busca a vaga só entre as da empresa logada. Vaga de outra empresa dá o mesmo
// 404 de vaga inexistente: quem tenta adivinhar números não descobre nada.
async function vagaDaEmpresa(req, res, next) {
  const id = lerId(req.params.id);
  if (!id) return res.status(404).json(erro("Vaga não encontrada."));

  try {
    const vaga = await banco.vaga.findFirst({
      where: { id, empresaId: req.empresa.id, removidaEm: null },
      include: CONTAR_CANDIDATURAS,
    });
    if (!vaga) return res.status(404).json(erro("Vaga não encontrada."));

    req.vaga = vaga;
    next();
  } catch (falha) {
    console.error("Falha ao buscar a vaga:", falha);
    return res.status(500).json(erro("Não foi possível abrir a vaga."));
  }
}

// Encerrar e remover não exigem empresa validada: se a validação for revista,
// a empresa ainda precisa conseguir tirar as vagas do ar.
async function empresaLogada(req, res, next) {
  try {
    const empresa = await empresaDoUsuario(req.usuario.id);
    if (!empresa) return res.status(401).json(erro("Sessão inválida."));

    req.empresa = empresa;
    next();
  } catch (falha) {
    console.error("Falha ao buscar a empresa:", falha);
    return res.status(500).json(erro("Não foi possível conferir a empresa agora."));
  }
}

// PUT /empresas/vagas/:id -> edita uma vaga aberta
rotas.put("/:id", exigirEmpresaValidada, vagaDaEmpresa, async (req, res) => {
  if (!podeEditar(req.vaga)) {
    return res.status(409).json(erro("Vaga encerrada não pode ser editada. Cadastre uma nova."));
  }

  const conferencia = conferirVaga(req.body || {});
  if (!conferencia.valido) return res.status(400).json({ erros: conferencia.erros });

  try {
    const vaga = await banco.vaga.update({
      where: { id: req.vaga.id },
      data: conferencia.vaga,
      include: CONTAR_CANDIDATURAS,
    });

    return res.json(vagaParaTela(vaga));
  } catch (falha) {
    console.error("Falha ao editar a vaga:", falha);
    return res.status(500).json(erro("Não foi possível salvar a vaga."));
  }
});

// POST /empresas/vagas/:id/encerrar -> para de aceitar candidaturas
rotas.post("/:id/encerrar", empresaLogada, vagaDaEmpresa, async (req, res) => {
  try {
    const vaga = await banco.vaga.update({
      where: { id: req.vaga.id },
      data: { status: "ENCERRADA" },
      include: CONTAR_CANDIDATURAS,
    });

    return res.json(vagaParaTela(vaga));
  } catch (falha) {
    console.error("Falha ao encerrar a vaga:", falha);
    return res.status(500).json(erro("Não foi possível encerrar a vaga."));
  }
});

// DELETE /empresas/vagas/:id -> tira a vaga da lista e do mural
// Não apaga a linha do banco: quem se candidatou continua vendo a candidatura
// e o histórico (US12). A vaga também é encerrada, para não aceitar mais ninguém.
rotas.delete("/:id", empresaLogada, vagaDaEmpresa, async (req, res) => {
  try {
    await banco.vaga.update({
      where: { id: req.vaga.id },
      data: { status: "ENCERRADA", removidaEm: new Date() },
    });

    return res.status(204).end();
  } catch (falha) {
    console.error("Falha ao remover a vaga:", falha);
    return res.status(500).json(erro("Não foi possível remover a vaga."));
  }
});

module.exports = rotas;
