const express = require("express");

const banco = require("../banco");
const { exigirLogin, exigirPerfil } = require("../seguranca/porta");
const { NIVEIS, conferirCurriculo, curriculoCompleto } = require("../jovens/curriculo");

const rotas = express.Router();

// Como o perfil (US04), o currículo é sempre o de quem está no token.
// Não existe /curriculo/:id, então não dá para pedir o de outro jovem.
rotas.use(exigirLogin, exigirPerfil("JOVEM"));

function erro(mensagem) {
  return { erros: [{ campo: null, mensagem }] };
}

const COM_ITENS = {
  escolaridades: { orderBy: { anoInicio: "desc" } },
  experiencias: { orderBy: { inicio: "desc" } },
};

// O que a tela recebe. A experiência volta como "AAAA-MM", o formato do campo
// de mês do navegador, para a edição abrir já preenchida.
function curriculoParaTela(curriculo) {
  const mes = (data) => (data ? data.toISOString().slice(0, 7) : "");

  const dados = {
    objetivo: curriculo?.objetivo || "",
    escolaridades: (curriculo?.escolaridades || []).map((e) => ({
      instituicao: e.instituicao,
      curso: e.curso,
      nivel: e.nivel,
      anoInicio: e.anoInicio,
      anoFim: e.anoFim,
    })),
    experiencias: (curriculo?.experiencias || []).map((e) => ({
      empresa: e.empresa,
      cargo: e.cargo,
      descricao: e.descricao,
      inicio: mes(e.inicio),
      fim: mes(e.fim),
    })),
  };

  return { ...dados, completo: curriculoCompleto(dados), niveis: NIVEIS };
}

function jovemDoUsuario(usuarioId) {
  return banco.jovem.findUnique({
    where: { usuarioId },
    include: { curriculo: { include: COM_ITENS } },
  });
}

// GET /curriculo -> o currículo de quem está logado (vazio se ainda não montou)
rotas.get("/", async (req, res) => {
  try {
    const jovem = await jovemDoUsuario(req.usuario.id);
    if (!jovem) return res.status(401).json(erro("Sessão inválida."));

    return res.json(curriculoParaTela(jovem.curriculo));
  } catch (falha) {
    console.error("Falha ao abrir o currículo:", falha);
    return res.status(500).json(erro("Não foi possível abrir o currículo."));
  }
});

// PUT /curriculo -> salva o currículo inteiro de uma vez
// A tela manda sempre a lista completa de escolaridades e experiências. O mais
// simples e seguro é trocar as listas antigas pelas novas: assim o que o jovem
// removeu na tela some de verdade, sem precisar controlar item por item.
rotas.put("/", async (req, res) => {
  const conferencia = conferirCurriculo(req.body || {});
  if (!conferencia.valido) return res.status(400).json({ erros: conferencia.erros });

  const { objetivo, escolaridades, experiencias } = conferencia.curriculo;

  try {
    const jovem = await jovemDoUsuario(req.usuario.id);
    if (!jovem) return res.status(401).json(erro("Sessão inválida."));

    // Tudo numa transação: se algo falhar no meio, o currículo antigo fica
    // como estava, em vez de sobrar meio currículo apagado.
    const curriculo = await banco.$transaction(async (tx) => {
      const salvo = await tx.curriculo.upsert({
        where: { jovemId: jovem.id },
        create: { jovemId: jovem.id, objetivo },
        update: { objetivo },
      });

      await tx.escolaridade.deleteMany({ where: { curriculoId: salvo.id } });
      await tx.experiencia.deleteMany({ where: { curriculoId: salvo.id } });

      await tx.escolaridade.createMany({
        data: escolaridades.map((e) => ({ ...e, curriculoId: salvo.id })),
      });
      await tx.experiencia.createMany({
        data: experiencias.map((e) => ({ ...e, curriculoId: salvo.id })),
      });

      return tx.curriculo.findUnique({ where: { id: salvo.id }, include: COM_ITENS });
    });

    return res.json(curriculoParaTela(curriculo));
  } catch (falha) {
    console.error("Falha ao salvar o currículo:", falha);
    return res.status(500).json(erro("Não foi possível salvar o currículo."));
  }
});

module.exports = rotas;
