// Testes de ponta a ponta (E2E) da M3: o Playwright abre o navegador, clica
// nas telas como um usuario e grava o vídeo de cada fluxo.
//
// Uso, dentro de backend/:  npm run test:e2e
// Precisa do DATABASE_URL_TESTE no .env (o mesmo banco dos testes de
// integração). Na primeira vez: npx playwright install chromium

require("dotenv").config();

const os = require("node:os");
const path = require("node:path");
const { defineConfig } = require("@playwright/test");

// Porta diferente da 3000 para não brigar com a API que você usa no dia a dia.
const PORTA = 3101;

module.exports = defineConfig({
  testDir: "test/e2e",
  // Os fluxos usam o mesmo banco, então rodam um de cada vez.
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  globalSetup: "./test/e2e/preparar.js",
  outputDir: "test/e2e/resultados",
  reporter: [["list"], ["html", { outputFolder: "test/e2e/relatorio", open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    video: "on",
    screenshot: "on",
    trace: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "node src/server.js",
    url: `http://localhost:${PORTA}/saude`,
    reuseExistingServer: false,
    env: {
      PORT: String(PORTA),
      DATABASE_URL: process.env.DATABASE_URL_TESTE || "",
      JWT_SECRET: process.env.JWT_SECRET || "segredo-so-para-os-testes-e2e",
      FORCAR_HTTPS: "false",
      PASTA_DOCUMENTOS: path.join(os.tmpdir(), "conecta-jovem-e2e-documentos"),
    },
  },
});
