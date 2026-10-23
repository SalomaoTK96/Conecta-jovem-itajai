require("dotenv").config();

const fs = require("fs");
const http = require("http");
const https = require("https");
const app = require("./app");

const porta = process.env.PORT || 3000;

// Sem certificado configurado, a API sobe em HTTP como sempre. Na hospedagem é
// assim mesmo: o certificado fica na plataforma, e o app.js cuida do redirecionamento.
if (!process.env.HTTPS_CERT || !process.env.HTTPS_KEY) {
  app.listen(porta, () => {
    console.log(`API no ar em http://localhost:${porta}`);
    console.log(`Para conferir, abra http://localhost:${porta}/saude`);
  });
} else {
  const opcoes = {
    cert: fs.readFileSync(process.env.HTTPS_CERT),
    key: fs.readFileSync(process.env.HTTPS_KEY),
    // TS02: TLS 1.0 e 1.1 têm falhas conhecidas e são recusados.
    minVersion: "TLSv1.2",
  };

  https.createServer(opcoes, app).listen(porta, () => {
    console.log(`API no ar em https://localhost:${porta}`);
    console.log(`Para conferir, abra https://localhost:${porta}/saude`);
  });

  // Quem digitar http:// cai numa porta separada que só manda para o HTTPS.
  const portaHttp = process.env.HTTP_PORT || 3080;

  http
    .createServer((req, res) => {
      const host = (req.headers.host || "localhost").split(":")[0];
      res.writeHead(301, { Location: `https://${host}:${porta}${req.url}` });
      res.end();
    })
    .listen(portaHttp, () => {
      console.log(`http://localhost:${portaHttp} redireciona para o HTTPS`);
    });
}
