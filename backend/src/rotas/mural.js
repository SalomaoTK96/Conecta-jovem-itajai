const express = require("express");

const banco = require("../banco");
const { AREAS, TIPOS } = require("../vagas/regras");
const {
  lerFiltros,
  filtroDoMural,
  paginacao,
  vagaParaMural,
  vagaParaDetalhes,
} = require("../vagas/mural");

const rotas = express.Router();

// O mural é público: qualquer usuario vê as vagas, mesmo sem login. Só a
// candidatura (US10) pede login de jovem.

function erro(mensagem) {
  return { erros: [{ campo: null, mensagem }] };
}

const SO_O_NOME_DA_EMPRESA = { empresa: { select: { razaoSocial: true } } };

// GET /vagas?area=&cidade=&q=&pagina= -> vagas abertas de empresas validadas,
// prazo mais próximo primeiro, 20 por página.
rotas.get("/", async (req, res) => {
  try {
    const filtros = lerFiltros(req.query);
    const onde = filtroDoMural(filtros);

    const total = await banco.vaga.count({ where: onde });
    const paginas = paginacao(total, filtros.pagina);

    const vagas = await banco.vaga.findMany({
      where: onde,
      orderBy: [{ expiraEm: "asc" }, { id: "asc" }],
      skip: paginas.pular,
      take: paginas.pegar,
      include: SO_O_NOME_DA_EMPRESA,
    });

    return res.json({
      opcoes: { areas: AREAS, tipos: TIPOS },
      filtros: { area: filtros.area, cidade: filtros.cidade, q: filtros.palavra },
      pagina: paginas.pagina,
      totalDePaginas: paginas.totalDePaginas,
      total: paginas.total,
      vagas: vagas.map(vagaParaMural),
    });
  } catch (falha) {
    console.error("Falha ao montar o mural de vagas:", falha);
    return res.status(500).json(erro("Não foi possível carregar as vagas."));
  }
});

// GET /vagas/:id -> detalhes de uma vaga do mural. Vaga encerrada, removida ou
// de empresa não validada responde 404, igual a uma vaga que não existe.
rotas.get("/:id", async (req, res) => {
  // Number e não parseInt: "3 OR 1=1" não pode virar a vaga 3.
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json(erro("Vaga não encontrada."));
  }

  try {
    const vaga = await banco.vaga.findFirst({
      where: { AND: [{ id }, filtroDoMural({})] },
      include: SO_O_NOME_DA_EMPRESA,
    });

    if (!vaga) return res.status(404).json(erro("Vaga não encontrada ou já encerrada."));

    return res.json(vagaParaDetalhes(vaga));
  } catch (falha) {
    console.error("Falha ao abrir a vaga:", falha);
    return res.status(500).json(erro("Não foi possível carregar a vaga."));
  }
});

module.exports = rotas;
