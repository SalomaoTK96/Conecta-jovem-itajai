// Passos que mais de um fluxo usa.

const { expect } = require("@playwright/test");
const { SENHA } = require("./dados");

async function entrar(page, email, voltar) {
  await page.goto(voltar ? `/login.html?voltar=${encodeURIComponent(voltar)}` : "/login.html");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Tudo certo. Entrando...")).toBeVisible();
}

async function sair(page) {
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
}

async function publicarVaga(page, { titulo, area, prazo }) {
  await page.goto("/minhas-vagas.html");
  await page.getByLabel("Título").fill(titulo);
  await page.getByLabel("Tipo").selectOption("ESTAGIO");
  await page.getByLabel("Área").selectOption(area);
  await page.getByLabel("Cidade").fill("Itajaí");
  await page.getByLabel("Descrição").fill("Atendimento a usuarios, manutenção de computadores e apoio à equipe de TI.");
  await page.getByLabel("Recebe candidaturas até").fill(prazo);
  await page.getByRole("button", { name: "Publicar vaga" }).click();
  await expect(page.getByText("Vaga publicada.")).toBeVisible();
}

module.exports = { entrar, sair, publicarVaga };
