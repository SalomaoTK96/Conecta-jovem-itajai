// Dados fictícios usados pelos fluxos E2E. Só e-mails @teste.com.

const SENHA = "senha1234";

module.exports = {
  SENHA,
  ADMIN: "admin@teste.com",
  LOJA: { email: "loja@teste.com", razaoSocial: "Loja Validada Ltda", cnpj: "11222333000181" },
  // Prazo da vaga daqui a 20 dias, no formato do campo de data.
  prazo: () =>
    new Date(Date.now() + 20 * 86400000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }),
};
