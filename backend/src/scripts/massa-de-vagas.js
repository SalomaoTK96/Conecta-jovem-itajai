// Massa de dados para o teste de desempenho do mural (TS05 · RNF02).
// Cria 10 empresas fictícias já validadas e completa 1.000 vagas abertas
// espalhadas por área, cidade e prazo. Rodar de novo não duplica: só cria o
// que falta para chegar a 1.000.
//
// Uso, dentro de backend/:  npm run massa:vagas
// Só para banco local ou de teste. Em produção (NODE_ENV=production) recusa.

require("dotenv/config");

const crypto = require("node:crypto");

const banco = require("../banco");
const { AREAS, TIPOS } = require("../vagas/regras");
const { cnpjValido } = require("../empresas/regras");

const TOTAL_DE_VAGAS = 1000;
const TOTAL_DE_EMPRESAS = 10;
const CIDADES = ["Itajaí", "Balneário Camboriú", "Navegantes", "Brusque", "Camboriú", "Itapema"];
const CARGOS = ["Auxiliar", "Assistente", "Jovem aprendiz", "Estagiário", "Atendente", "Apoio"];
const UM_DIA = 24 * 60 * 60 * 1000;

// Monta um CNPJ válido a partir de 12 dígitos (calcula os 2 verificadores).
function cnpjComDigitos(base) {
  const digito = (numeros) => {
    const pesos = numeros.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = numeros.split("").reduce((total, n, i) => total + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? "0" : String(11 - resto);
  };
  const primeiro = base + digito(base);
  const completo = primeiro + digito(primeiro);
  return completo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

// A senha é aleatória e ninguém sabe: essas contas existem só para a massa.
async function garantirEmpresas() {
  const empresas = [];

  for (let n = 1; n <= TOTAL_DE_EMPRESAS; n += 1) {
    const email = `massa-${n}@teste.com`;
    const cnpj = cnpjComDigitos(`9900000${String(n).padStart(5, "0")}`);
    if (!cnpjValido(cnpj)) throw new Error(`CNPJ gerado inválido: ${cnpj}`);

    const usuario = await banco.usuario.upsert({
      where: { email },
      update: {},
      create: { email, perfil: "EMPRESA", senhaHash: crypto.randomBytes(32).toString("hex") },
    });

    const empresa = await banco.empresa.upsert({
      where: { usuarioId: usuario.id },
      update: { status: "VALIDADA" },
      create: { usuarioId: usuario.id, razaoSocial: `Empresa Fictícia ${n} Ltda`, cnpj, status: "VALIDADA" },
    });

    empresas.push(empresa);
  }

  return empresas;
}

// Vaga número i, sempre igual para o mesmo i: o teste fica repetível.
function vagaFicticia(i, empresas, agora) {
  const area = AREAS[i % AREAS.length];
  const cidade = CIDADES[i % CIDADES.length];
  const cargo = CARGOS[i % CARGOS.length];

  return {
    empresaId: empresas[i % empresas.length].id,
    titulo: `${cargo} de ${area.toLowerCase()} ${i + 1}`,
    tipo: TIPOS[i % TIPOS.length],
    area,
    cidade,
    descricao: `Vaga fictícia número ${i + 1} para o teste de desempenho. Rotina de ${area.toLowerCase()} em ${cidade}, com acompanhamento de um tutor.`,
    requisitos: i % 3 === 0 ? "Estar cursando o ensino médio." : null,
    expiraEm: new Date(agora.getTime() + (5 + (i % 120)) * UM_DIA),
  };
}

async function criarMassa() {
  if (process.env.NODE_ENV === "production") {
    console.error("Massa de dados não roda em produção.");
    process.exitCode = 1;
    return;
  }

  const empresas = await garantirEmpresas();
  const existentes = await banco.vaga.count({ where: { empresaId: { in: empresas.map((e) => e.id) } } });
  const faltam = TOTAL_DE_VAGAS - existentes;

  if (faltam <= 0) {
    console.log(`Já existem ${existentes} vagas da massa. Nada a criar.`);
    return;
  }

  const agora = new Date();
  const vagas = Array.from({ length: faltam }, (_, k) => vagaFicticia(existentes + k, empresas, agora));
  await banco.vaga.createMany({ data: vagas });

  console.log(`${faltam} vagas criadas. Total da massa: ${TOTAL_DE_VAGAS}.`);
}

criarMassa()
  .catch((erro) => {
    console.error("Falha ao criar a massa de vagas:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => banco.$disconnect());
