// Regras do mural de vagas (US09 · RF06 · RN01 · RN06). Funções puras: recebem
// o que veio no endereço e a data de agora, devolvem o filtro pronto para o
// banco. Nada de banco aqui, para dar para testar sozinho.

const { AREAS } = require("./regras");

// 20 por página: o mural carrega rápido mesmo com mil vagas (TS05 · RNF02).
const VAGAS_POR_PAGINA = 20;

// Palavra-chave muito longa não ajuda a achar nada e só pesa a consulta.
const TAMANHO_MAXIMO_DA_PALAVRA = 100;

function limpar(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

// Lê os filtros do endereço (?area=&cidade=&q=&pagina=). O que vier fora do
// padrão é ignorado em vez de dar erro: o mural é público e não pode quebrar
// por causa de um link digitado errado.
function lerFiltros(consulta = {}) {
  const area = limpar(consulta.area);
  const pagina = Number.parseInt(consulta.pagina, 10);

  return {
    area: AREAS.includes(area) ? area : null,
    cidade: limpar(consulta.cidade).slice(0, 60) || null,
    palavra: limpar(consulta.q).slice(0, TAMANHO_MAXIMO_DA_PALAVRA) || null,
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

// O que o mural pode mostrar, sempre: vaga aberta, não removida, no prazo
// (RN06) e de empresa validada (RN01). Os filtros do jovem entram por cima.
function filtroDoMural(filtros, agora = new Date()) {
  const condicoes = [
    { status: "ABERTA" },
    { removidaEm: null },
    { expiraEm: { gte: agora } },
    { empresa: { status: "VALIDADA" } },
  ];

  if (filtros.area) condicoes.push({ area: filtros.area });

  if (filtros.cidade) {
    condicoes.push({ cidade: { equals: filtros.cidade, mode: "insensitive" } });
  }

  // A palavra-chave procura no título e na descrição (RF06).
  if (filtros.palavra) {
    condicoes.push({
      OR: [
        { titulo: { contains: filtros.palavra, mode: "insensitive" } },
        { descricao: { contains: filtros.palavra, mode: "insensitive" } },
      ],
    });
  }

  return { AND: condicoes };
}

// Conta das páginas. Se pedirem uma página depois da última, devolve a última,
// para a tela nunca ficar em branco tendo vagas.
function paginacao(total, paginaPedida, porPagina = VAGAS_POR_PAGINA) {
  const totalDePaginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(Math.max(1, paginaPedida), totalDePaginas);

  return {
    pagina,
    totalDePaginas,
    total,
    pular: (pagina - 1) * porPagina,
    pegar: porPagina,
  };
}

// O que cada card do mural mostra (título, empresa, tipo, cidade e prazo).
function vagaParaMural(vaga) {
  return {
    id: vaga.id,
    titulo: vaga.titulo,
    empresa: vaga.empresa?.razaoSocial ?? null,
    tipo: vaga.tipo,
    area: vaga.area,
    cidade: vaga.cidade,
    expiraEm: vaga.expiraEm,
  };
}

// Os detalhes trazem também o texto completo da vaga.
function vagaParaDetalhes(vaga) {
  return {
    ...vagaParaMural(vaga),
    descricao: vaga.descricao,
    requisitos: vaga.requisitos,
    criadaEm: vaga.criadaEm,
  };
}

module.exports = {
  VAGAS_POR_PAGINA,
  lerFiltros,
  filtroDoMural,
  paginacao,
  vagaParaMural,
  vagaParaDetalhes,
};
