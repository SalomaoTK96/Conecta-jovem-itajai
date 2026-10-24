// Cria a conta de administrador. Não existe tela de cadastro de admin de
// propósito: se existisse, qualquer usuário poderia se cadastrar como admin e
// aprovar a própria empresa. Quem tem acesso ao servidor roda este script uma vez.
//
// Uso, dentro de backend/:  npm run criar-admin
// Lê ADMIN_EMAIL e ADMIN_SENHA do .env.

require("dotenv/config");

const banco = require("../banco");
const { gerarHash } = require("../seguranca/senha");
const { emailParecePlausivel, TAMANHO_MINIMO_DA_SENHA } = require("../jovens/regras");

// Confere o que veio do .env antes de tocar no banco. Devolve a lista de problemas.
function conferirDadosDoAdmin(email, senha) {
  const erros = [];

  if (!email || !emailParecePlausivel(email)) {
    erros.push("Preencha ADMIN_EMAIL no .env com um e-mail válido.");
  }

  if (!senha || senha.length < TAMANHO_MINIMO_DA_SENHA) {
    erros.push(`Preencha ADMIN_SENHA no .env com pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`);
  }

  return erros;
}

async function criarAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA || "";

  const erros = conferirDadosDoAdmin(email, senha);
  if (erros.length) {
    erros.forEach((erro) => console.error(erro));
    process.exitCode = 1;
    return;
  }

  // Rodar duas vezes não cria duas contas nem troca a senha de ninguém.
  const existente = await banco.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(
      existente.perfil === "ADMIN"
        ? `O administrador ${email} já existe. Nada foi alterado.`
        : `O e-mail ${email} já é de uma conta de ${existente.perfil.toLowerCase()}. Use outro.`
    );
    return;
  }

  await banco.usuario.create({
    data: { email, senhaHash: await gerarHash(senha), perfil: "ADMIN" },
  });

  console.log(`Administrador ${email} criado. Já dá para entrar pela tela de login.`);
}

criarAdmin()
  .catch((erro) => {
    console.error("Não foi possível criar o administrador:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => banco.$disconnect());
