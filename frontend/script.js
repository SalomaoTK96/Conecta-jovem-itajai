
// =========================
// TEMA CLARO E ESCURO
// =========================

const themeButton = document.querySelector(".theme-button");
const temaSalvo = localStorage.getItem("tema");

if (temaSalvo === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
} else {
    document.documentElement.removeAttribute("data-theme");
}

if (themeButton) {
    themeButton.addEventListener("click", () => {
        const temaEscuro =
            document.documentElement.getAttribute("data-theme") === "dark";

        if (temaEscuro) {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("tema", "light");
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("tema", "dark");
        }
    });
}

// =========================
// VALIDAÇÃO DAS SENHAS
// =========================

document.querySelectorAll(".auth-form").forEach((form) => {
    const senha = form.querySelector("#senha");
    const confirmarSenha = form.querySelector("#confirmar-senha");

    if (!senha || !confirmarSenha) {
        return;
    }

    // O cadastro de jovem tem envio próprio, lá embaixo, que já confere as
    // senhas antes de chamar a API. Sem isso o formulário teria dois donos.
    if (form.id === "form-cadastro-jovem") {
        confirmarSenha.addEventListener("input", () => {
            confirmarSenha.setCustomValidity("");
        });
        return;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (senha.value !== confirmarSenha.value) {
            confirmarSenha.setCustomValidity("As senhas não coincidem.");
            confirmarSenha.reportValidity();
            return;
        }

        confirmarSenha.setCustomValidity("");

        alert("Senhas conferem! O cadastro ainda não está conectado ao servidor.");
    });

    confirmarSenha.addEventListener("input", () => {
        confirmarSenha.setCustomValidity("");
    });
});

const nascimento = document.querySelector("#nascimento");
const dadosResponsavel = document.querySelector("#dados-responsavel");
const responsavel = document.querySelector("#responsavel");
const consentimento = document.querySelector("#consentimento");

if (nascimento && dadosResponsavel && responsavel && consentimento) {
    function verificarIdade() {
        if (!nascimento.value) {
            dadosResponsavel.hidden = true;
            responsavel.required = false;
            consentimento.required = false;
            return;
        }

        const hoje = new Date();
        const dataNascimento = new Date(`${nascimento.value}T00:00:00`);

        let idade = hoje.getFullYear() - dataNascimento.getFullYear();

        const aindaNaoFezAniversario =
            hoje.getMonth() < dataNascimento.getMonth() ||
            (hoje.getMonth() === dataNascimento.getMonth() &&
             hoje.getDate() < dataNascimento.getDate());

        if (aindaNaoFezAniversario) idade--;

        // Só pede responsável de quem está dentro da faixa de 14 a 24 (RN09).
        // Sem esta conferência, alguém de 13 anos ficava preso num campo de
        // responsável obrigatório em vez de receber o aviso de que a
        // plataforma não atende essa idade.
        const dentroDaFaixa = idade >= 14 && idade <= 24;
        const precisaResponsavel = dentroDaFaixa && idade < 16;

        dadosResponsavel.hidden = !precisaResponsavel;
        responsavel.required = precisaResponsavel;
        consentimento.required = precisaResponsavel;
    }

    nascimento.addEventListener("change", verificarIdade);
    verificarIdade();
}
// =========================
// CADASTRO DE JOVEM: ENVIO PARA A API
// =========================

// A tela é entregue pelo mesmo servidor da API, então basta o caminho. Se um
// dia o front for publicado separado, é aqui que entra o endereço completo.
const ENDERECO_DA_API = "";

// Monta o objeto que a API espera a partir dos campos da tela.
function montarCadastroDeJovem(formulario) {
    const texto = (id) => {
        const campo = formulario.querySelector(`#${id}`);
        return campo ? campo.value.trim() : "";
    };

    return {
        nome: texto("nome"),
        email: texto("email"),
        senha: formulario.querySelector("#senha").value,
        dataNascimento: texto("nascimento"),
        telefone: texto("telefone"),
        nomeResponsavel: texto("responsavel"),
        consentimento: formulario.querySelector("#consentimento").checked,
    };
}

function mostrarAviso(elemento, tipo, titulo, itens = []) {
    const lista = itens.length
        ? `<ul>${itens.map((i) => `<li>${i}</li>`).join("")}</ul>`
        : "";

    elemento.className = `aviso aviso--${tipo}`;
    elemento.innerHTML = `<strong>${titulo}</strong>${lista}`;
    elemento.hidden = false;
    elemento.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

const formularioDeJovem = document.querySelector("#form-cadastro-jovem");

if (formularioDeJovem) {
    const aviso = formularioDeJovem.querySelector("#aviso");
    const botao = formularioDeJovem.querySelector("button[type=submit]");

    formularioDeJovem.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        aviso.hidden = true;

        const senha = formularioDeJovem.querySelector("#senha");
        const confirmarSenha = formularioDeJovem.querySelector("#confirmar-senha");

        if (senha.value !== confirmarSenha.value) {
            confirmarSenha.setCustomValidity("As senhas não coincidem.");
            confirmarSenha.reportValidity();
            return;
        }
        confirmarSenha.setCustomValidity("");

        // Trava o botão enquanto espera. Sem isso, dois cliques rápidos viram
        // dois cadastros, e o usuário ainda fica sem saber se algo aconteceu.
        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = "Criando conta...";

        try {
            const resposta = await fetch(`${ENDERECO_DA_API}/jovens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(montarCadastroDeJovem(formularioDeJovem)),
            });

            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.status === 201) {
                mostrarAviso(aviso, "sucesso", "Conta criada. Redirecionando para a tela de entrada...");
                formularioDeJovem.reset();
                setTimeout(() => { window.location.href = "login.html"; }, 2000);
                return;
            }

            // 400 são as regras de negócio; 409 é e-mail que já tem dono.
            const mensagens = (corpo.erros || []).map((e) => e.mensagem);
            mostrarAviso(
                aviso,
                "erro",
                mensagens.length ? "Não foi possível criar a conta:" : "Não foi possível criar a conta.",
                mensagens
            );
        } catch (erro) {
            // Cai aqui quando o servidor está fora do ar ou a rede falhou.
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        } finally {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    });
}

// =========================
// SESSÃO: ENTRAR, SAIR E SABER QUEM ESTÁ LOGADO
// =========================

// O token fica no navegador para o usuário não precisar entrar a cada página.
// Guardar aqui é o caminho simples e tem um custo: se alguém conseguir rodar
// script na nossa página, consegue ler o token. É aceitável porque o token
// vale 8 horas e não carrega dado pessoal, e porque o TS04 vai revisar isso.
const CHAVE_DO_TOKEN = "conecta-jovem-token";

function guardarToken(token) {
    localStorage.setItem(CHAVE_DO_TOKEN, token);
}

function pegarToken() {
    return localStorage.getItem(CHAVE_DO_TOKEN);
}

function esquecerToken() {
    localStorage.removeItem(CHAVE_DO_TOKEN);
}

// Toda chamada à API que exige login passa por aqui, para o token ir junto
// sem precisar lembrar disso em cada lugar.
function chamarComToken(caminho, opcoes = {}) {
    const token = pegarToken();

    return fetch(`${ENDERECO_DA_API}${caminho}`, {
        ...opcoes,
        headers: {
            ...(opcoes.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}

// Troca os botões "Entrar" e "Criar conta" pelo nome de quem entrou e um
// botão de sair. Roda em todas as páginas que tiverem cabeçalho.
async function mostrarQuemEstaLogado() {
    const acoes = document.querySelector(".header-actions");
    if (!acoes || !pegarToken()) return;

    const resposta = await chamarComToken("/sessao/eu").catch(() => null);

    // Token vencido ou inválido: limpa e deixa a tela como visitante.
    if (!resposta || !resposta.ok) {
        esquecerToken();
        return;
    }

    const usuario = await resposta.json();
    const primeiroNome = (usuario.nome || usuario.email).split(" ")[0];

    acoes.querySelectorAll(".login-button, .register-button").forEach((b) => b.remove());

    const saudacao = document.createElement("span");
    saudacao.className = "saudacao";
    saudacao.textContent = `Olá, ${primeiroNome}`;

    const sair = document.createElement("button");
    sair.type = "button";
    sair.className = "login-button";
    sair.textContent = "Sair";
    sair.addEventListener("click", () => {
        esquecerToken();
        window.location.href = "index.html";
    });

    // Só jovem tem perfil para preencher (US04).
    if (usuario.perfil === "JOVEM") {
        const meuPerfil = document.createElement("a");
        meuPerfil.href = "perfil.html";
        meuPerfil.className = "login-button";
        meuPerfil.textContent = "Meu perfil";
        acoes.append(saudacao, meuPerfil, sair);
        return;
    }

    acoes.append(saudacao, sair);
}

mostrarQuemEstaLogado();

// --- tela de login ---

const formularioDeLogin = document.querySelector("#form-login");

if (formularioDeLogin) {
    const aviso = formularioDeLogin.querySelector("#aviso");
    const botao = formularioDeLogin.querySelector("button[type=submit]");

    formularioDeLogin.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        aviso.hidden = true;

        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = "Entrando...";

        try {
            const resposta = await fetch(`${ENDERECO_DA_API}/sessao`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formularioDeLogin.querySelector("#email").value.trim(),
                    senha: formularioDeLogin.querySelector("#senha").value,
                }),
            });

            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.ok && corpo.token) {
                guardarToken(corpo.token);
                mostrarAviso(aviso, "sucesso", "Tudo certo. Entrando...");
                setTimeout(() => { window.location.href = "index.html"; }, 1200);
                return;
            }

            mostrarAviso(
                aviso,
                "erro",
                (corpo.erros || [])[0]?.mensagem || "Não foi possível entrar."
            );
        } catch (erro) {
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        } finally {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    });
}

// =========================
// PERFIL DO JOVEM (US04)
// =========================

const formularioDePerfil = document.querySelector("#form-perfil");

// Mostra se o perfil está completo ou o que falta (RN02).
function mostrarSituacaoDoPerfil(situacao) {
    const caixa = document.querySelector("#situacao-perfil");

    if (situacao.completo) {
        caixa.className = "situacao-perfil situacao-perfil--completo";
        caixa.textContent = "Perfil completo.";
    } else {
        caixa.className = "situacao-perfil situacao-perfil--incompleto";
        caixa.innerHTML =
            "<strong>Perfil incompleto.</strong> Sem estes dados você ainda não consegue se candidatar: " +
            situacao.faltando.join(", ") + ".";
    }

    caixa.hidden = false;
}

function preencherPerfil(formulario, perfil) {
    ["telefone", "endereco", "habilidades"].forEach((campo) => {
        formulario.querySelector(`#${campo}`).value = perfil[campo] || "";
    });
    mostrarSituacaoDoPerfil(perfil.situacao);
}

if (formularioDePerfil) {
    const aviso = formularioDePerfil.querySelector("#aviso");
    const botao = formularioDePerfil.querySelector("button[type=submit]");

    // Sem login não há perfil para mostrar.
    if (!pegarToken()) {
        window.location.href = "login.html";
    }

    // Trata as respostas que não são de sucesso do mesmo jeito no carregar e no salvar.
    function avisarRecusa(resposta, corpo, titulo) {
        if (resposta.status === 401) {
            esquecerToken();
            window.location.href = "login.html";
            return;
        }

        if (resposta.status === 403) {
            botao.disabled = true;
            mostrarAviso(aviso, "erro", "O perfil é só para contas de jovem.");
            return;
        }

        const mensagens = (corpo.erros || []).map((e) => e.mensagem);
        mostrarAviso(aviso, "erro", titulo, mensagens);
    }

    async function carregarPerfil() {
        try {
            const resposta = await chamarComToken("/perfil");
            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.ok) {
                preencherPerfil(formularioDePerfil, corpo);
                return;
            }

            avisarRecusa(resposta, corpo, "Não foi possível abrir o perfil.");
        } catch (erro) {
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        }
    }

    formularioDePerfil.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        aviso.hidden = true;

        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = "Salvando...";

        try {
            const resposta = await chamarComToken("/perfil", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telefone: formularioDePerfil.querySelector("#telefone").value,
                    endereco: formularioDePerfil.querySelector("#endereco").value,
                    habilidades: formularioDePerfil.querySelector("#habilidades").value,
                }),
            });

            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.ok) {
                preencherPerfil(formularioDePerfil, corpo);
                mostrarAviso(aviso, "sucesso", "Perfil salvo.");
                return;
            }

            avisarRecusa(resposta, corpo, "Não foi possível salvar o perfil:");
        } catch (erro) {
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        } finally {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    });

    carregarPerfil();
}
