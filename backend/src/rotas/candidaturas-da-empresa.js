const express = require("express");

const banco = require("../banco");
const { exigirLogin, exigirPerfil } = require("../seguranca/porta");
const { NOMES_DOS_STATUS } = require("../candidaturas/regras");
const {
  conferirMudanca,
  lerFiltroDeStatus,
  mensagemDeMudanca,
  candidatoParaEmpresa,
} = require("../candidaturas/status");
const { criarNotificacao } = require("../notificacoes/criar");

const rotas = express.Router();

// Só empresa entra aqui, e a empresa sai do token, nunca do endereço.
rotas.use(exigirLogin, exigirPerfil("EMPRESA"));

function erro(mensagem) {
  return { erros: [{ campo: null, mensagem }] };
}

function lerId(valor) {
  const id = Number.parseInt(valor, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function empresaDoUsuario(usuarioId) {
  return banco.empresa.findUnique({ where: { usuarioId } });
}

// RN04/RN07: vaga ou candidatura de outra empresa responde 404, igual a uma que
// não existe (não revela que existe), e a tentativa fica registrada no log.
function registrarAcessoNegado(req, recurso) {
  console.warn(
    `[acesso negado] usuario ${req.usuario.id} (empresa) tentou ${req.method} ${req.originalUrl} - ${recurso} de outra empresa`
  );
}

const DADOS_DO_CANDIDATO = {
  vaga: { select: { id: true, titulo: true, empresaId: true } },
  jovem: {
    include: {
      usuario: { select: { email: true } },
      perfil: true,
      curriculo: {
        include: {
          escolaridades: { orderBy: { anoInicio: "desc" } },
          experiencias: { orderBy: { inicio: "desc" } },
        },
      },
    },
  },
  historico: { orderBy: { criadoEm: "asc" } },
};

// GET /empresas/candidaturas?vagaId=3&status=EM_ANALISE -> candidatos de uma
// vaga da empresa logada, mais antigos primeiro (ordem de chegada).
rotas.get("/", async (req, res) => {
  const vagaId = lerId(req.query.vagaId);
  if (!vagaId) return res.status(400).json(erro("Informe a vaga."));

  try {
    const empresa = await empresaDoUsuario(req.usuario.id);
    if (!empresa) return res.status(401).json(erro("Sessão inválida."));

    const vaga = await banco.vaga.findUnique({ where: { id: vagaId } });
    if (!vaga || vaga.removidaEm) return res.status(404).json(erro("Vaga não encontrada."));
    if (vaga.empresaId !== empresa.id) {
      registrarAcessoNegado(req, `vaga ${vagaId}`);
      return res.status(404).json(erro("Vaga não encontrada."));
    }

    const status = lerFiltroDeStatus(req.query.status);
    const candidaturas = await banco.candidatura.findMany({
      where: { vagaId, ...(status ? { status } : {}) },
      orderBy: { criadaEm: "asc" },
      include: DADOS_DO_CANDIDATO,
    });

    return res.json({
      vaga: { id: vaga.id, titulo: vaga.titulo, status: vaga.status },
      filtro: status,
      opcoes: { status: NOMES_DOS_STATUS },
      candidaturas: candidaturas.map(candidatoParaEmpresa),
    });
  } catch (falha) {
    console.error("Falha ao listar candidatos:", falha);
    return res.status(500).json(erro("Não foi possível carregar os candidatos."));
  }
});

// Busca a candidatura e confere se a vaga é da empresa logada.
async function candidaturaDaEmpresa(req, res) {
  const id = lerId(req.params.id);
  if (!id) {
    res.status(404).json(erro("Candidatura não encontrada."));
    return null;
  }

  const empresa = await empresaDoUsuario(req.usuario.id);
  if (!empresa) {
    res.status(401).json(erro("Sessão inválida."));
    return null;
  }

  const candidatura = await banco.candidatura.findUnique({ where: { id }, include: DADOS_DO_CANDIDATO });
  if (!candidatura) {
    res.status(404).json(erro("Candidatura não encontrada."));
    return null;
  }

  if (candidatura.vaga.empresaId !== empresa.id) {
    registrarAcessoNegado(req, `candidatura ${id}`);
    res.status(404).json(erro("Candidatura não encontrada."));
    return null;
  }

  return candidatura;
}

// GET /empresas/candidaturas/:id -> currículo do candidato e histórico.
rotas.get("/:id", async (req, res) => {
  try {
    const candidatura = await candidaturaDaEmpresa(req, res);
    if (!candidatura) return undefined;
    return res.json(candidatoParaEmpresa(candidatura));
  } catch (falha) {
    console.error("Falha ao abrir a candidatura:", falha);
    return res.status(500).json(erro("Não foi possível abrir a candidatura."));
  }
});

// PATCH /empresas/candidaturas/:id { status } -> muda o status. Status,
// histórico (RN08) e notificação do jovem vão juntos na mesma transação.
rotas.patch("/:id", async (req, res) => {
  try {
    const candidatura = await candidaturaDaEmpresa(req, res);
    if (!candidatura) return undefined;

    const mudanca = conferirMudanca(candidatura.status, req.body?.status);
    if (!mudanca.valido) return res.status(400).json(erro(mudanca.mensagem));

    const mudou = await banco.$transaction(async (tx) => {
      // Só muda se o status ainda for o que a empresa viu. Se duas pessoas da
      // empresa mudarem ao mesmo tempo, a segunda não sobrescreve sem saber.
      const { count } = await tx.candidatura.updateMany({
        where: { id: candidatura.id, status: candidatura.status },
        data: { status: mudanca.novo },
      });
      if (count === 0) return false;

      await tx.historicoCandidatura.create({
        data: {
          candidaturaId: candidatura.id,
          statusAnterior: candidatura.status,
          statusNovo: mudanca.novo,
          alteradoPorId: req.usuario.id,
        },
      });

      await criarNotificacao(tx, {
        destinatarioId: candidatura.jovem.usuarioId,
        mensagem: mensagemDeMudanca(candidatura.vaga, mudanca.novo),
        candidaturaId: candidatura.id,
      });

      return true;
    });

    if (!mudou) {
      return res.status(409).json(erro("O status mudou enquanto você olhava. Recarregue a página."));
    }

    const atualizada = await banco.candidatura.findUnique({
      where: { id: candidatura.id },
      include: DADOS_DO_CANDIDATO,
    });
    return res.json(candidatoParaEmpresa(atualizada));
  } catch (falha) {
    console.error("Falha ao mudar o status:", falha);
    return res.status(500).json(erro("Não foi possível mudar o status."));
  }
});

module.exports = rotas;
