
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
