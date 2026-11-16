// Cabeçalhos de segurança em todas as respostas (M3 · OWASP A05, defeito DEF-02).
// Sem biblioteca: são poucos cabeçalhos fixos, então dá para ler um por um.

const POLITICA_DE_CONTEUDO = [
  // Só carrega script, estilo e imagem do próprio site. Um <script> injetado
  // apontando para outro endereço é bloqueado pelo navegador.
  "default-src 'self'",
  // data: e blob: para as imagens dos documentos que o admin abre (US07).
  "img-src 'self' data: blob:",
  "object-src 'self' blob:",
  // Ninguém coloca o site dentro de um iframe (clickjacking).
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function cabecalhosDeSeguranca(req, res, next) {
  res.set({
    "Content-Security-Policy": POLITICA_DE_CONTEUDO,
    // O navegador não tenta adivinhar o tipo do arquivo (um .txt virar script).
    "X-Content-Type-Options": "nosniff",
    // Mesmo efeito do frame-ancestors, para navegadores antigos.
    "X-Frame-Options": "DENY",
    // O endereço da página (que pode ter id de vaga ou filtro) não vaza para outros sites.
    "Referrer-Policy": "no-referrer",
  });
  next();
}

module.exports = { cabecalhosDeSeguranca, POLITICA_DE_CONTEUDO };
