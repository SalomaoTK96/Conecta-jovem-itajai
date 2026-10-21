
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

// Cada formulário que confere senha limpa o aviso de "não coincidem" assim que
// a pessoa volta a digitar. O envio em si fica com o dono de cada formulário,
// mais abaixo: aqui não entra manipulador de envio, senão o mesmo formulário
// teria dois donos brigando pelo mesmo clique.
document.querySelectorAll(".auth-form").forEach((form) => {
    const confirmarSenha = form.querySelector("#confirmar-senha");

    if (!confirmarSenha) {
        return;
    }

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
// CADASTRO DE EMPRESA: ENVIO PARA A API
// =========================

// Vai desenhando 00.000.000/0000-00 enquanto a pessoa digita. É só conforto:
// quem vale é a conferência dos dígitos, que roda na API.
function formatarCnpj(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 14);

    return numeros
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

const formularioDeEmpresa = document.querySelector("#form-cadastro-empresa");

if (formularioDeEmpresa) {
    const aviso = formularioDeEmpresa.querySelector("#aviso");
    const botao = formularioDeEmpresa.querySelector("button[type=submit]");
    const campoCnpj = formularioDeEmpresa.querySelector("#cnpj");
    const confirmarSenha = formularioDeEmpresa.querySelector("#confirmar-senha");

    campoCnpj.addEventListener("input", () => {
        campoCnpj.value = formatarCnpj(campoCnpj.value);
    });

    formularioDeEmpresa.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        aviso.hidden = true;

        const senha = formularioDeEmpresa.querySelector("#senha");

        if (senha.value !== confirmarSenha.value) {
            confirmarSenha.setCustomValidity("As senhas não coincidem.");
            confirmarSenha.reportValidity();
            return;
        }
        confirmarSenha.setCustomValidity("");

        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = "Enviando...";

        const texto = (id) => {
            const campo = formularioDeEmpresa.querySelector(`#${id}`);
            return campo ? campo.value.trim() : "";
        };

        try {
            const resposta = await fetch(`${ENDERECO_DA_API}/empresas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    razaoSocial: texto("nome-empresa"),
                    cnpj: texto("cnpj"),
                    nomeResponsavel: texto("responsavel"),
                    email: texto("email"),
                    telefone: texto("telefone"),
                    senha: senha.value,
                }),
            });

            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.status === 201) {
                mostrarAviso(
                    aviso,
                    "sucesso",
                    "Cadastro enviado. A conta fica pendente até a validação dos documentos. Redirecionando para a tela de entrada..."
                );
                formularioDeEmpresa.reset();
                setTimeout(() => { window.location.href = "login.html"; }, 2600);
                return;
            }

            const mensagens = (corpo.erros || []).map((e) => e.mensagem);
            mostrarAviso(
                aviso,
                "erro",
                mensagens.length ? "Não foi possível criar a conta:" : "Não foi possível criar a conta.",
                mensagens
            );
        } catch (erro) {
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        } finally {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    });
}
