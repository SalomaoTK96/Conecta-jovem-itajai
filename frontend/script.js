
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

        const precisaResponsavel = idade < 16;

        dadosResponsavel.hidden = !precisaResponsavel;
        responsavel.required = precisaResponsavel;
        consentimento.required = precisaResponsavel;
    }

    nascimento.addEventListener("change", verificarIdade);
    verificarIdade();
}