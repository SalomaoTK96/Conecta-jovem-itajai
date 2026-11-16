// Regressão do defeito DEF-01 (XSS armazenado no título da vaga).
// Antes da correção, encerrar uma vaga com título <img onerror=...> rodava o
// código do título na página e ele conseguia ler o token da sessão.

const { test, expect } = require("@playwright/test");
const { entrar, publicarVaga } = require("./ajuda");
const { LOJA, prazo } = require("./dados");

const TITULO_MALICIOSO = `<img src=x onerror="document.body.dataset.xss='rodou'">`;

test("SEC-XSS: título de vaga com HTML aparece como texto e não roda", async ({ page }) => {
  const alertas = [];
  page.on("dialog", async (dialogo) => {
    alertas.push(dialogo.message());
    await dialogo.dismiss();
  });

  await entrar(page, LOJA.email, "minhas-vagas.html");
  await page.waitForURL("**/minhas-vagas.html");
  await publicarVaga(page, { titulo: TITULO_MALICIOSO, area: "Tecnologia", prazo: prazo() });

  const cartao = page.locator(".cartao-vaga").filter({ hasText: "onerror" });
  await cartao.getByRole("button", { name: "Encerrar" }).click();

  const aviso = page.locator("#aviso");
  await expect(aviso).toContainText(TITULO_MALICIOSO);
  await expect(aviso.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.dataset.xss)).toBeUndefined();
  expect(alertas).toEqual([]);

  // O mesmo título no mural público também é só texto.
  await page.goto("/vagas.html?area=Tecnologia");
  await expect(page.locator(".cartao-mural img")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.dataset.xss)).toBeUndefined();
});
