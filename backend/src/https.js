// TS02 (RNF04): todo tráfego da API passa por HTTPS.
//
// Ligado com FORCAR_HTTPS=true no .env. Em desenvolvimento fica desligado para
// ninguém precisar de certificado só para rodar o projeto.

// Um ano, em segundos. É o valor que os navegadores esperam para levar o HSTS a sério.
const HSTS = "max-age=31536000; includeSubDomains";

function forcarHttps(req, res, next) {
  if (process.env.FORCAR_HTTPS !== "true") {
    return next();
  }

  if (req.secure) {
    // Avisa o navegador para nunca mais tentar HTTP neste endereço.
    res.set("Strict-Transport-Security", HSTS);
    return next();
  }

  // GET e HEAD podem ser redirecionados sem risco. Nos demais (POST com senha,
  // por exemplo) o dado já viajou aberto; redirecionar faria o navegador
  // reenviar e esconderia o erro. Melhor recusar e o front corrigir o endereço.
  if (req.method === "GET" || req.method === "HEAD") {
    return res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
  }

  res.status(403).json({ erro: "Use HTTPS para acessar a API" });
}

module.exports = forcarHttps;
