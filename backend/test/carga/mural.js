// Teste de carga do mural de vagas (TS05 · RNF02 · M3 desempenho e carga).
// Sem biblioteca: cada "usuario virtual" fica pedindo o mural em sequência,
// como alguém navegando, e o script mede quanto cada resposta demorou.
//
// Uso, com a API no ar e a massa criada (npm run massa:vagas):
//   node test/carga/mural.js --usuarios 100 --segundos 30
//   node test/carga/mural.js --usuarios 50,100,200 --segundos 30 --saida resultados.json
//
// Mede: tempo médio, mediana, p95, p99, máximo, vazão (pedidos por segundo)
// e taxa de erro. A meta do RNF02 é p95 de até 2 segundos com 100 usuarios.

const { writeFileSync } = require("node:fs");

function lerArgumentos(argv) {
  const valor = (nome, padrao) => {
    const i = argv.indexOf(`--${nome}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : padrao;
  };
  return {
    endereco: valor("endereco", "http://localhost:3000"),
    usuarios: valor("usuarios", "100").split(",").map(Number),
    segundos: Number(valor("segundos", "30")),
    saida: valor("saida", null),
  };
}

// O que um jovem faz no mural: abre a primeira página, filtra, troca de página
// e abre o detalhe de uma vaga. Sorteado a cada pedido.
const CAMINHOS = [
  "/vagas",
  "/vagas?area=Tecnologia",
  "/vagas?cidade=Itaja%C3%AD",
  "/vagas?area=Log%C3%ADstica&cidade=Navegantes",
  "/vagas?q=atendimento",
  "/vagas?q=tutor&pagina=3",
  "/vagas?pagina=10",
  "/vagas?pagina=25",
];

function percentil(ordenados, p) {
  if (!ordenados.length) return 0;
  const i = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return ordenados[Math.max(0, i)];
}

function resumir(usuarios, segundos, tempos, erros, duracaoReal) {
  const ordenados = [...tempos].sort((a, b) => a - b);
  const total = tempos.length + erros;
  const media = tempos.reduce((s, t) => s + t, 0) / (tempos.length || 1);
  const arred = (n) => Math.round(n * 10) / 10;

  return {
    usuarios,
    segundos,
    pedidos: total,
    erros,
    taxaDeErro: arred((erros / (total || 1)) * 100),
    vazao: arred(total / duracaoReal),
    mediaMs: arred(media),
    medianaMs: arred(percentil(ordenados, 50)),
    p95Ms: arred(percentil(ordenados, 95)),
    p99Ms: arred(percentil(ordenados, 99)),
    maximoMs: arred(ordenados.at(-1) || 0),
    metaP95Ok: percentil(ordenados, 95) <= 2000,
  };
}

async function rodarCenario(endereco, usuarios, segundos) {
  const tempos = [];
  let erros = 0;
  const fim = Date.now() + segundos * 1000;

  // Um id de vaga real para o pedido de detalhe.
  const primeira = await fetch(`${endereco}/vagas`).then((r) => r.json());
  const idDeVaga = primeira.vagas[0]?.id;
  const caminhos = idDeVaga ? [...CAMINHOS, `/vagas/${idDeVaga}`] : CAMINHOS;

  async function usuarioVirtual() {
    while (Date.now() < fim) {
      const caminho = caminhos[Math.floor(Math.random() * caminhos.length)];
      const inicio = performance.now();
      try {
        const resposta = await fetch(`${endereco}${caminho}`, { signal: AbortSignal.timeout(10000) });
        await resposta.arrayBuffer();
        if (resposta.ok) tempos.push(performance.now() - inicio);
        else erros += 1;
      } catch {
        erros += 1;
      }
    }
  }

  const comeco = performance.now();
  await Promise.all(Array.from({ length: usuarios }, usuarioVirtual));
  const duracaoReal = (performance.now() - comeco) / 1000;

  return resumir(usuarios, segundos, tempos, erros, duracaoReal);
}

async function principal() {
  const { endereco, usuarios, segundos, saida } = lerArgumentos(process.argv.slice(2));
  const resultados = [];

  for (const quantidade of usuarios) {
    console.log(`Rodando ${quantidade} usuarios por ${segundos}s...`);
    const resultado = await rodarCenario(endereco, quantidade, segundos);
    console.log(resultado);
    resultados.push(resultado);
  }

  if (saida) {
    writeFileSync(saida, JSON.stringify({ data: new Date().toISOString(), endereco, resultados }, null, 2));
    console.log(`Resultados gravados em ${saida}`);
  }
}

if (require.main === module) {
  principal().catch((erro) => {
    console.error("Falha no teste de carga:", erro.message);
    process.exitCode = 1;
  });
}

module.exports = { percentil, resumir };
