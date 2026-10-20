const express = require("express");

const banco = require("../banco");
const { gerarHash } = require("../seguranca/senha");
const { conferirCadastroDeJovem } = require("../jovens/regras");

const rotas = express.Router();

// POST /jovens -> cria a conta de um jovem
rotas.post("/", async (req, res) => {
  const dados = req.body || {};

  // 1. As regras de negócio primeiro. Se já reprova aqui, nem incomoda o banco.
  const conferencia = conferirCadastroDeJovem(dados);

  if (!conferencia.valido) {
    return res.status(400).json({ erros: conferencia.erros });
  }

  const email = dados.email.trim().toLowerCase();

  try {
    // 2. RN03: um e-mail por conta.
    const jaExiste = await banco.usuario.findUnique({ where: { email } });

    if (jaExiste) {
      return res.status(409).json({
        erros: [{ campo: "email", mensagem: "Este e-mail já tem conta." }],
      });
    }

    // 3. RNF03: o que vai para o banco é o hash, nunca a senha digitada.
    const senhaHash = await gerarHash(dados.senha);

    const precisaResponsavel = conferencia.idade < 16;

    // Criar o usuário e o jovem numa tacada só. Se uma das duas falhar, o
    // Prisma desfaz a outra, e não sobra conta pela metade no banco.
    const usuario = await banco.usuario.create({
      data: {
        email,
        senhaHash,
        perfil: "JOVEM",
        jovem: {
          create: {
            nome: dados.nome.trim(),
            dataNascimento: conferencia.nascimento,
            nomeResponsavel: precisaResponsavel
              ? dados.nomeResponsavel.trim()
              : null,
            consentimentoEm: precisaResponsavel ? new Date() : null,
          },
        },
      },
      include: { jovem: true },
    });

    // A resposta devolve só o necessário. Nada de senha, nada de hash.
    return res.status(201).json({
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      jovem: { id: usuario.jovem.id, nome: usuario.jovem.nome },
    });
  } catch (erro) {
    // Se a corrida for apertada, dois cadastros com o mesmo e-mail podem passar
    // pela conferência acima ao mesmo tempo. Aí quem segura é o índice único do
    // banco, e o recado para o usuário continua sendo o mesmo.
    if (erro.code === "P2002") {
      return res.status(409).json({
        erros: [{ campo: "email", mensagem: "Este e-mail já tem conta." }],
      });
    }

    // O detalhe técnico fica no log do servidor; o usuário recebe só o aviso.
    console.error("Falha ao cadastrar jovem:", erro);
    return res.status(500).json({
      erros: [{ campo: null, mensagem: "Não foi possível concluir o cadastro." }],
    });
  }
});

module.exports = rotas;
