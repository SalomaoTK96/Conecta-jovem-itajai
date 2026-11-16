// E2E01: jovem se cadastra, completa perfil e currículo, acha a vaga no mural
// e se candidata. US01 · US03 · US04 · US05 · US09 · US10 · US12 · RN02

const { test, expect } = require("@playwright/test");
const { entrar, publicarVaga } = require("./ajuda");
const { SENHA, LOJA, prazo } = require("./dados");

test("E2E01: jovem do cadastro até a candidatura", async ({ page }) => {
  // A empresa validada publica a vaga que o jovem vai encontrar.
  await entrar(page, LOJA.email, "minhas-vagas.html");
  await page.waitForURL("**/minhas-vagas.html");
  await publicarVaga(page, { titulo: "Estágio em suporte de TI", area: "Tecnologia", prazo: prazo() });
  await page.getByRole("button", { name: "Sair" }).click();

  // Cadastro do jovem (US01).
  await page.goto("/cadastro-jovem.html");
  await page.getByLabel("Nome completo").fill("Ana Teste");
  await page.getByLabel("Data de nascimento").fill("2007-05-10");
  await page.getByLabel("E-mail").fill("ana@teste.com");
  await page.getByLabel("Telefone").fill("(47) 99999-1111");
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByLabel("Confirmar senha").fill(SENHA);
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  // Mural (US09): filtra e abre a vaga. Ainda sem login, pede para entrar.
  await page.goto("/vagas.html");
  await page.getByLabel("Área").selectOption("Tecnologia");
  await page.getByLabel("Palavra-chave").fill("computadores");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("1 vaga encontrada.")).toBeVisible();
  await page.getByRole("link", { name: "Estágio em suporte de TI" }).click();
  await page.getByRole("link", { name: "Entrar para se candidatar" }).click();

  // Login (US03) volta para a mesma vaga.
  await page.getByLabel("E-mail").fill("ana@teste.com");
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL("**/vaga.html?id=*");

  // RN02: perfil incompleto é barrado e mostra o caminho para o perfil.
  await expect(page.getByText("Para se candidatar, complete seu perfil.")).toBeVisible();
  await page.getByRole("button", { name: "Candidatar-se" }).click();
  await expect(page.getByText("Complete seu perfil antes de se candidatar.")).toBeVisible();
  const vaga = page.url();

  // Perfil (US04) e currículo (US05).
  await page.getByRole("link", { name: "Completar meu perfil" }).click();
  await page.getByLabel("Endereço").fill("Rua Hercílio Luz, 100 - Centro");
  await page.getByLabel("Habilidades").fill("Excel, atendimento, montagem de computadores");
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();

  await page.goto("/curriculo.html");
  await page.getByLabel("Objetivo").fill("Primeiro estágio na área de tecnologia.");
  if ((await page.locator(".item-curriculo").count()) === 0) {
    await page.getByRole("button", { name: /escolaridade/i }).click();
  }
  const escola = page.locator(".item-curriculo").first();
  await escola.getByLabel("Escola ou instituição").fill("EEB Itajaí");
  await escola.getByLabel("Curso ou série").fill("3º ano");
  await escola.getByLabel("Nível").selectOption({ label: "Ensino médio" });
  await escola.getByLabel("Ano de início").fill("2024");
  await page.getByRole("button", { name: "Salvar currículo" }).click();
  await expect(page.getByText("Currículo salvo.")).toBeVisible();

  // Candidatura (US10) e acompanhamento (US12).
  await page.goto(vaga);
  await page.getByRole("button", { name: "Candidatar-se" }).click();
  await expect(page.getByText("Candidatura enviada! Status: Em análise.")).toBeVisible();

  await page.getByRole("link", { name: "Ver minhas candidaturas" }).click();
  const cartao = page.locator(".cartao-candidato").first();
  await expect(cartao.getByRole("heading", { name: "Estágio em suporte de TI" })).toBeVisible();
  await expect(cartao.getByText("Em análise", { exact: true })).toBeVisible();
});
