const express = require("express");
const cors = require("cors");
const forcarHttps = require("./https");

const app = express();

// Na hospedagem quem recebe o HTTPS é o proxy da plataforma, que repassa para cá
// em HTTP. Sem isso, req.secure fica sempre falso e o redirecionamento entra em loop.
app.set("trust proxy", 1);

// Vem antes de tudo: nenhuma rota pode responder por HTTP quando o HTTPS é obrigatório.
app.use(forcarHttps);

// O front roda num endereço diferente do da API, então sem isso o navegador
// bloqueia a chamada antes mesmo de sair da máquina.
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
// Quando a US01 existir, vai ser algo como:
// app.use("/jovens", require("./rotas/jovens"));

// Qualquer endereço que não casou com nada acima cai aqui.
app.use((req, res) => {
  res.status(404).json({ erro: "Endereço não encontrado" });
});

module.exports = app;
