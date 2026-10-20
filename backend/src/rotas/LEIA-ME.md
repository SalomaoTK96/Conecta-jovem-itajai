# Rotas da API

Um arquivo por assunto, registrado no `src/app.js`.

Quando a US01 for implementada, este diretório ganha `jovens.js`, e o `app.js`
passa a ter a linha `app.use("/jovens", require("./rotas/jovens"));`.

A regra de negócio fica aqui, nunca só na tela: a validação do navegador
qualquer usuário contorna, a da API não.
