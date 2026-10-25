const express = require("express");

const banco = require("../banco");
const { gerarHash } = require("../seguranca/senha");
const { conferirCadastroDeEmpresa } = require("../empresas/regras");

const rotas = express.Router();

// POST /empresas -> cria a conta de uma empresa
rotas.post("/", async (req, res) => {
  const dados = req.body || {};

  const conferencia = conferirCadastroDeEmpresa(dados);

  if (!conferencia.valido) {
    return res.status(400).json({ erros: conferencia.erros });
  }

  const email = dados.email.trim().toLowerCase();
  const cnpj = conferencia.cnpj;

  try {
    // RN03: um e-mail por conta.
    if (await banco.usuario.findUnique({ where: { email } })) {
      return res.status(409).json({
        erros: [{ campo: "email", mensagem: "Este e-mail já tem conta." }],
      });
    }

    // O CNPJ também não pode se repetir: duas contas para a mesma empresa
    // bagunçariam a validação e a dona das vagas.
    if (await banco.empresa.findUnique({ where: { cnpj } })) {
      return res.status(409).json({
        erros: [{ campo: "cnpj", mensagem: "Este CNPJ já tem conta." }],
      });
    }

    const senhaHash = await gerarHash(dados.senha);

    const usuario = await banco.usuario.create({
      data: {
        email,
        senhaHash,
        perfil: "EMPRESA",
        empresa: {
          create: {
            razaoSocial: dados.razaoSocial.trim(),
            cnpj,
            // RN01: a conta nasce pendente. A empresa entra no sistema, mas
            // só publica vaga depois que o administrador validar (US07).
            status: "PENDENTE",
            nomeResponsavel: dados.nomeResponsavel?.trim() || null,
            telefone: dados.telefone?.trim() || null,
          },
        },
      },
      include: { empresa: true },
    });

    return res.status(201).json({
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      empresa: {
        id: usuario.empresa.id,
        razaoSocial: usuario.empresa.razaoSocial,
        status: usuario.empresa.status,
      },
    });
  } catch (erro) {
    // Mesma corrida do cadastro de jovem: se dois pedidos iguais passarem
    // juntos pela conferência, quem segura é o índice único do banco.
    if (erro.code === "P2002") {
      const campo = (erro.meta?.target || []).includes("cnpj") ? "cnpj" : "email";
      return res.status(409).json({
        erros: [
          {
            campo,
            mensagem: campo === "cnpj" ? "Este CNPJ já tem conta." : "Este e-mail já tem conta.",
          },
        ],
      });
    }

    console.error("Falha ao cadastrar empresa:", erro);
    return res.status(500).json({
      erros: [{ campo: null, mensagem: "Não foi possível concluir o cadastro." }],
    });
  }
});

module.exports = rotas;
