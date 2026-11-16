// E2E03: empresa nova se cadastra, não consegue publicar, envia os documentos,
// o administrador aprova e a vaga dela aparece no mural.
// US02 · US06 · US07 · US08 · US09 · RN01

const { test, expect } = require("@playwright/test");
const { entrar, publicarVaga } = require("./ajuda");
const { SENHA, ADMIN, prazo } = require("./dados");

const PDF = { name: "documento.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% teste E2E\n") };

test("E2E03: empresa do cadastro até a vaga no mural", async ({ page }) => {
  await page.goto("/cadastro-empresa.html");
  await page.getByLabel("Nome da empresa").fill("Padaria Nova Ltda");
  await page.getByLabel("CNPJ").fill("11.444.777/0001-61");
  await page.getByLabel("Nome do responsável").fill("Carlos Teste");
  await page.getByLabel("E-mail corporativo").fill("padaria@teste.com");
  await page.getByLabel("Telefone de contato").fill("(47) 3333-4444");
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByLabel("Confirmar senha").fill(SENHA);
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText("Cadastro enviado. A conta fica pendente")).toBeVisible();

  // RN01: ainda não validada, não publica.
  await entrar(page, "padaria@teste.com", "minhas-vagas.html");
  await page.waitForURL("**/minhas-vagas.html");
  await expect(page.getByText("Sua empresa ainda não foi validada.")).toBeVisible();

  // US06: envia os documentos.
  await page.getByRole("link", { name: "tela de validação" }).click();
  await page.locator("#cartaoCnpj").setInputFiles(PDF);
  await page.locator("#contratoSocial").setInputFiles(PDF);
  await page.getByRole("button", { name: "Enviar documentos" }).click();
  await expect(page.getByText("Documentos enviados. A solicitação está em análise.")).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();

  // US07: o admin aprova.
  await entrar(page, ADMIN, "admin-validacoes.html");
  await page.waitForURL("**/admin-validacoes.html");
  await page.getByRole("button", { name: /Padaria Nova Ltda/ }).click();
  await page.getByRole("button", { name: "Aprovar" }).click();
  await expect(page.getByText("Decisão registrada. A empresa foi avisada.")).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();

  // US08 e US09: agora publica, e a vaga aparece no mural público.
  await entrar(page, "padaria@teste.com", "minhas-vagas.html");
  await page.waitForURL("**/minhas-vagas.html");
  await publicarVaga(page, { titulo: "Auxiliar de padaria", area: "Comércio", prazo: prazo() });
  await page.getByRole("button", { name: "Sair" }).click();

  await page.goto("/vagas.html?area=Com%C3%A9rcio");
  await expect(page.getByRole("link", { name: "Auxiliar de padaria" })).toBeVisible();
  await expect(page.getByText("Padaria Nova Ltda")).toBeVisible();
});
