const path = require("node:path");

const express = require("express");
const cors = require("cors");

const app = express();

// Em desenvolvimento a tela sai deste mesmo servidor, então nem precisaria.
// Fica ligado porque quando o front for publicado em outro endereço, o
// navegador bloquearia a chamada sem isto.
app.use(cors());

// Sem esta linha, req.body chega vazio quando a tela manda JSON.
app.use(express.json());

// Rota de saúde: serve para saber se a API está de pé sem depender de banco
// nem de login. É o que o monitoramento do TS08 vai consultar depois.
app.get("/saude", (req, res) => {
  res.json({
    status: "ok",
    servico: "Conecta Jovem Itajai",
    horario: new Date().toISOString(),
  });
});

// As rotas de cada item do backlog entram aqui embaixo, uma linha por assunto.
app.use("/jovens", require("./rotas/jovens"));
app.use("/sessao", require("./rotas/sessao"));

// O mesmo servidor entrega as telas. Em desenvolvimento isso evita precisar de
// dois programas no ar, e a tela passa a falar com a API no mesmo endereço.
// As camadas continuam separadas nas pastas: aqui só se define quem serve.
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

// Qualquer endereço que não casou com nada acima cai aqui.
app.use((req, res) => {
  res.status(404).json({ erro: "Endereço não encontrado" });
});

module.exports = app;
