// E2E02: a empresa vê o candidato, abre o currículo e aprova; o jovem vê o
// sino com a notificação e o histórico. US11 · US12 · US13 · RN08
// Usa a candidatura criada no E2E01.

const { test, expect } = require("@playwright/test");
const { entrar } = require("./ajuda");
const { LOJA } = require("./dados");

test("E2E02: empresa aprova e o jovem é notificado", async ({ page }) => {
  await entrar(page, LOJA.email, "minhas-vagas.html");
  await page.waitForURL("**/minhas-vagas.html");
  await page.getByRole("link", { name: "Ver candidatos (1)" }).click();

  const candidato = page.locator(".cartao-candidato").filter({ hasText: "Ana Teste" });
  await candidato.getByText("Ver currículo").click();
  await expect(candidato.getByText("Ensino médio · 3º ano · EEB Itajaí")).toBeVisible();

  await candidato.getByLabel("Mudar status para").selectOption("APROVADA");
  await candidato.getByRole("button", { name: "Salvar status" }).click();
  await expect(page.getByText("Ana Teste: status mudou para Aprovada. O jovem foi notificado.")).toBeVisible();

  await page.getByLabel("Mostrar").selectOption("APROVADA");
  await expect(page.getByText('1 candidato(s) com status "Aprovada".')).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();

  // Jovem: sino com contador, notificação e histórico.
  await entrar(page, "ana@teste.com");
  await page.waitForURL("**/index.html");
  const sino = page.locator(".sino");
  await expect(sino.locator(".contador-notificacoes")).toHaveText("2");
  await sino.click();

  await page.getByRole("button", { name: /mudou para: Aprovada/ }).click();
  await page.waitForURL("**/minhas-candidaturas.html#candidatura-*");
  await expect(page.getByText("Em análise → Aprovada")).toBeVisible();
  await expect(page.locator(".contador-notificacoes")).toHaveText("1");
});
