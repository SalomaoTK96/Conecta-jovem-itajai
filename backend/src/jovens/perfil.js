// Regras do perfil do jovem (US04). Funções puras, como em regras.js: dá para
// testar sem banco e a regra fica escrita num lugar só.

const TAMANHO_MAXIMO_DO_ENDERECO = 200;
const TAMANHO_MAXIMO_DAS_HABILIDADES = 500;

// Os campos que contam para o perfil completo (RN02), com o nome que a tela
// mostra quando um deles está faltando. O currículo entra nesta conta na US05.
const CAMPOS_DO_PERFIL = [
  { campo: "telefone", nome: "Telefone" },
  { campo: "endereco", nome: "Endereço" },
  { campo: "habilidades", nome: "Habilidades" },
];

// Texto vazio ou só com espaços vira null. Assim "apagar" um campo na tela
// grava a ausência de verdade, e não um texto em branco que pareceria preenchido.
function limpar(valor) {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  return texto ? texto : null;
}

// Aceita o número com ou sem máscara: "(47) 99999-0000", "47999990000"...
// O que importa são os dígitos: DDD + 8 (fixo) ou 9 (celular).
function telefoneValido(telefone) {
  const digitos = telefone.replace(/\D/g, "");
  return digitos.length === 10 || digitos.length === 11;
}

// Confere o que veio da tela. Campo vazio é permitido: o jovem pode salvar
// aos poucos, e a tela mostra o que ainda falta. Só recusa o que está errado.
function conferirPerfil(dados) {
  const erros = [];

  const perfil = {
    telefone: limpar(dados.telefone),
    endereco: limpar(dados.endereco),
    habilidades: limpar(dados.habilidades),
  };

  if (perfil.telefone && !telefoneValido(perfil.telefone)) {
    erros.push({
      campo: "telefone",
      mensagem: "Informe o telefone com DDD, por exemplo (47) 99999-0000.",
    });
  }

  if (perfil.endereco && perfil.endereco.length > TAMANHO_MAXIMO_DO_ENDERECO) {
    erros.push({
      campo: "endereco",
      mensagem: `O endereço pode ter até ${TAMANHO_MAXIMO_DO_ENDERECO} caracteres.`,
    });
  }

  if (perfil.habilidades && perfil.habilidades.length > TAMANHO_MAXIMO_DAS_HABILIDADES) {
    erros.push({
      campo: "habilidades",
      mensagem: `As habilidades podem ter até ${TAMANHO_MAXIMO_DAS_HABILIDADES} caracteres.`,
    });
  }

  return { valido: erros.length === 0, erros, perfil };
}

// RN02: perfil incompleto impede a candidatura. A US10 vai usar esta mesma
// função para decidir se deixa o jovem se candidatar.
function situacaoDoPerfil(perfil) {
  const faltando = CAMPOS_DO_PERFIL
    .filter(({ campo }) => !limpar(perfil?.[campo]))
    .map(({ nome }) => nome);

  return { completo: faltando.length === 0, faltando };
}

module.exports = {
  conferirPerfil,
  situacaoDoPerfil,
  telefoneValido,
  TAMANHO_MAXIMO_DO_ENDERECO,
  TAMANHO_MAXIMO_DAS_HABILIDADES,
};
