
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

    // A empresa acompanha daqui o pedido de validação (US06).
    if (usuario.perfil === "EMPRESA") {
        const validacao = document.createElement("a");
        validacao.href = "validacao-empresa.html";
        validacao.className = "login-button";
        validacao.textContent = "Validação";
        acoes.append(saudacao, validacao, sair);
        return;
    }

    // O admin vai direto para a fila de validação (US07).
    if (usuario.perfil === "ADMIN") {
        saudacao.textContent = "Olá, Administrador";
        const fila = document.createElement("a");
        fila.href = "admin-validacoes.html";
        fila.className = "login-button";
        fila.textContent = "Validar empresas";
        acoes.append(saudacao, fila, sair);
        return;
    }

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

// =========================
// VALIDAÇÃO DA EMPRESA (US06)
// =========================

const formularioDeValidacao = document.querySelector("#form-validacao");

const SITUACOES_DA_VALIDACAO = {
    SEM_ENVIO: {
        classe: "pendente",
        titulo: "Nenhum documento enviado ainda.",
        texto: "Sua empresa só publica vagas depois de validada.",
    },
    EM_ANALISE: {
        classe: "analise",
        titulo: "Em análise.",
        texto: "Recebemos os documentos. Você vê a resposta nesta tela.",
    },
    DOCUMENTOS_PENDENTES: {
        classe: "pendente",
        titulo: "A equipe pediu documentos adicionais.",
        texto: "Envie abaixo o que foi pedido. Ele entra na mesma solicitação.",
    },
    VALIDADA: {
        classe: "validada",
        titulo: "Empresa validada.",
        texto: "Você já pode publicar vagas.",
    },
    REJEITADA: {
        classe: "rejeitada",
        titulo: "Solicitação rejeitada.",
        texto: "Para rever a decisão, entre em contato com a equipe do Conecta Jovem.",
    },
};

function situacaoDaValidacao(dados) {
    if (dados.solicitacao?.status === "DOCUMENTOS_PENDENTES") return "DOCUMENTOS_PENDENTES";
    if (dados.statusEmpresa === "PENDENTE") return "SEM_ENVIO";
    return dados.statusEmpresa;
}

function formatarData(texto) {
    return new Date(texto).toLocaleDateString("pt-BR");
}

// Monta a caixa de situação com textContent, nunca innerHTML: o motivo vem do
// administrador, e texto digitado por alguém não deve virar código na página.
function mostrarSituacaoDaValidacao(dados) {
    const caixa = document.querySelector("#situacao-validacao");
    const situacao = SITUACOES_DA_VALIDACAO[situacaoDaValidacao(dados)];

    caixa.className = `situacao-validacao situacao-validacao--${situacao.classe}`;
    caixa.replaceChildren();

    const titulo = document.createElement("strong");
    titulo.textContent = situacao.titulo;
    caixa.append(titulo);

    if (situacao.texto) caixa.append(` ${situacao.texto}`);

    if (dados.solicitacao?.motivo) {
        const motivo = document.createElement("p");
        motivo.textContent = `Mensagem da equipe: ${dados.solicitacao.motivo}`;
        caixa.append(motivo);
    }

    if (dados.solicitacao?.documentos.length) {
        const lista = document.createElement("ul");
        dados.solicitacao.documentos.forEach((documento) => {
            const item = document.createElement("li");
            item.textContent = `${documento.nome}, enviado em ${formatarData(documento.enviadoEm)}`;
            lista.append(item);
        });
        caixa.append(lista);
    }

    caixa.hidden = false;
}

// Um campo de arquivo para cada documento exigido. No reenvio nenhum é
// obrigatório, porque a empresa manda só o que foi pedido.
function montarCamposDeDocumentos(dados) {
    const conjunto = document.querySelector("#documentos-exigidos");
    const campos = document.querySelector("#campos-documentos");
    const botao = formularioDeValidacao.querySelector("button[type=submit]");
    const { exigencias, envio } = dados;

    document.querySelector("#regras-arquivo").textContent =
        `Formatos aceitos: ${exigencias.formatos}. Tamanho máximo: ${exigencias.tamanhoMaximoEmMb} MB por arquivo.`;

    campos.replaceChildren();

    exigencias.documentos.forEach((documento) => {
        const rotulo = document.createElement("label");
        rotulo.htmlFor = documento.campo;
        rotulo.textContent = envio.reenvio ? documento.nome : `${documento.nome} (obrigatório)`;

        const campo = document.createElement("input");
        campo.type = "file";
        campo.id = documento.campo;
        campo.name = documento.campo;
        campo.accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
        campo.required = !envio.reenvio;
        campo.setAttribute("aria-describedby", `dica-${documento.campo} regras-arquivo`);

        const dica = document.createElement("p");
        dica.className = "dica";
        dica.id = `dica-${documento.campo}`;
        dica.textContent = documento.descricao;

        campos.append(rotulo, campo, dica);
    });

    conjunto.hidden = !envio.pode;
    botao.hidden = !envio.pode;
    document.querySelector("#explicacao-validacao").hidden = !envio.pode;
    botao.textContent = envio.reenvio ? "Reenviar documentos" : "Enviar documentos";
}

// Confere no navegador antes de mandar, para não esperar o envio de um arquivo
// grande só para ouvir um "não". A API confere de novo, porque esta parte
// qualquer pessoa contorna.
function conferirArquivosNaTela(dados) {
    const erros = [];
    const limite = dados.exigencias.tamanhoMaximoEmMb * 1024 * 1024;
    let algumArquivo = false;

    dados.exigencias.documentos.forEach((documento) => {
        const arquivo = document.querySelector(`#${documento.campo}`).files[0];

        if (!arquivo) {
            if (!dados.envio.reenvio) erros.push(`Anexe o ${documento.nome}.`);
            return;
        }

        algumArquivo = true;

        if (!/\.(pdf|jpe?g|png)$/i.test(arquivo.name)) {
            erros.push(`${documento.nome}: envie em ${dados.exigencias.formatos}.`);
        } else if (arquivo.size > limite) {
            erros.push(`${documento.nome}: o arquivo passa de ${dados.exigencias.tamanhoMaximoEmMb} MB.`);
        }
    });

    if (dados.envio.reenvio && !algumArquivo) {
        erros.push("Anexe pelo menos um documento para reenviar.");
    }

    return erros;
}

if (formularioDeValidacao) {
    const aviso = formularioDeValidacao.querySelector("#aviso");
    const botao = formularioDeValidacao.querySelector("button[type=submit]");
    let dadosAtuais = null;

    if (!pegarToken()) {
        window.location.href = "login.html";
    }

    function atualizarTela(dados) {
        dadosAtuais = dados;
        mostrarSituacaoDaValidacao(dados);
        montarCamposDeDocumentos(dados);
    }

    function avisarRecusa(resposta, corpo, titulo) {
        if (resposta.status === 401) {
            esquecerToken();
            window.location.href = "login.html";
            return;
        }

        if (resposta.status === 403) {
            mostrarAviso(aviso, "erro", "A validação é só para contas de empresa.");
            return;
        }

        const mensagens = (corpo.erros || []).map((e) => e.mensagem);
        mostrarAviso(aviso, "erro", titulo, mensagens);
    }

    async function carregarValidacao() {
        try {
            const resposta = await chamarComToken("/empresas/validacao");
            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.ok) {
                atualizarTela(corpo);
                return;
            }

            avisarRecusa(resposta, corpo, "Não foi possível abrir a validação.");
        } catch (erro) {
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        }
    }

    formularioDeValidacao.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        aviso.hidden = true;

        const errosNaTela = conferirArquivosNaTela(dadosAtuais);
        if (errosNaTela.length) {
            mostrarAviso(aviso, "erro", "Confira os arquivos:", errosNaTela);
            return;
        }

        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = "Enviando...";

        try {
            // FormData monta o envio de arquivos. O Content-Type fica por conta
            // do navegador, que inclui a separação entre os arquivos.
            const resposta = await chamarComToken("/empresas/validacao", {
                method: "POST",
                body: new FormData(formularioDeValidacao),
            });

            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.ok) {
                atualizarTela(corpo);
                mostrarAviso(aviso, "sucesso", "Documentos enviados. A solicitação está em análise.");
                return;
            }

            botao.textContent = textoOriginal;
            avisarRecusa(resposta, corpo, "Não foi possível enviar os documentos:");
        } catch (erro) {
            botao.textContent = textoOriginal;
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        } finally {
            botao.disabled = false;
        }
    });

    carregarValidacao();
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

// =========================
// VALIDAÇÃO DE EMPRESAS PELO ADMIN (US07)
// =========================

const painelDoAdmin = document.querySelector(".painel-admin");

const NOMES_DAS_DECISOES = {
    APROVADA: "aprovada",
    REJEITADA: "rejeitada",
    DOCUMENTOS_PENDENTES: "devolvida pedindo documentos",
};

function formatarDataEHora(texto) {
    return new Date(texto).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Uma linha "rótulo: valor" da lista de dados da empresa. Sempre textContent:
// o que a empresa digitou no cadastro não pode virar código na tela do admin.
function linhaDeDado(rotulo, valor) {
    const termo = document.createElement("dt");
    termo.textContent = rotulo;
    const descricao = document.createElement("dd");
    descricao.textContent = valor || "não informado";
    return [termo, descricao];
}

if (painelDoAdmin) {
    const aviso = painelDoAdmin.querySelector("#aviso");
    const fila = painelDoAdmin.querySelector("#fila-validacoes");
    const filaVazia = painelDoAdmin.querySelector("#fila-vazia");
    const analise = painelDoAdmin.querySelector("#analise");
    const formulario = painelDoAdmin.querySelector("#form-decisao");
    const decisaoRegistrada = painelDoAdmin.querySelector("#decisao-registrada");
    let aberta = null;

    if (!pegarToken()) {
        window.location.href = "login.html";
    }

    function avisarRecusa(resposta, corpo, titulo) {
        if (resposta.status === 401) {
            esquecerToken();
            window.location.href = "login.html";
            return;
        }

        if (resposta.status === 403) {
            mostrarAviso(aviso, "erro", "Esta tela é só para administradores.");
            return;
        }

        const mensagens = (corpo.erros || []).map((e) => e.mensagem);
        mostrarAviso(aviso, "erro", titulo, mensagens);
    }

    function montarFila(pendentes) {
        fila.replaceChildren();
        filaVazia.hidden = pendentes.length > 0;

        pendentes.forEach((pedido) => {
            const item = document.createElement("li");
            const botao = document.createElement("button");
            botao.type = "button";
            botao.textContent =
                `${pedido.razaoSocial} · CNPJ ${formatarCnpj(pedido.cnpj)} · ` +
                `enviado em ${formatarData(pedido.enviadaEm)} · ${pedido.documentos} documento(s)`;
            if (aberta && aberta.id === pedido.id) botao.setAttribute("aria-current", "true");
            botao.addEventListener("click", () => abrirSolicitacao(pedido.id));
            item.append(botao);
            fila.append(item);
        });
    }

    async function carregarFila() {
        try {
            const resposta = await chamarComToken("/admin/validacoes");
            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.ok) {
                montarFila(corpo);
                return;
            }

            avisarRecusa(resposta, corpo, "Não foi possível carregar a fila.");
        } catch (erro) {
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        }
    }

    // O documento só sai da API com o token, então não dá para usar um link
    // simples. A aba abre antes da chamada para o navegador não bloquear.
    async function abrirDocumento(solicitacaoId, documento) {
        const aba = window.open("", "_blank");

        try {
            const resposta = await chamarComToken(
                `/admin/validacoes/${solicitacaoId}/documentos/${documento.id}`
            );

            if (!resposta.ok) {
                if (aba) aba.close();
                const corpo = await resposta.json().catch(() => ({}));
                avisarRecusa(resposta, corpo, `Não foi possível abrir ${documento.nome}.`);
                return;
            }

            const endereco = URL.createObjectURL(await resposta.blob());
            if (aba) aba.location.href = endereco;
            else window.location.href = endereco;
        } catch (erro) {
            if (aba) aba.close();
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        }
    }

    // Se o pedido já foi decidido, esconde os botões e mostra quem decidiu.
    function mostrarDecisao(solicitacao) {
        const pendente = solicitacao.status === "PENDENTE";
        formulario.hidden = !pendente;
        decisaoRegistrada.hidden = pendente;
        if (pendente) return;

        decisaoRegistrada.replaceChildren();
        const titulo = document.createElement("strong");
        titulo.textContent = `Solicitação ${NOMES_DAS_DECISOES[solicitacao.status] || solicitacao.status}.`;
        decisaoRegistrada.append(titulo);

        if (solicitacao.decisao) {
            const quem = document.createElement("p");
            quem.textContent =
                `Decidido por ${solicitacao.decisao.analisadoPor || "um administrador"} ` +
                `em ${formatarDataEHora(solicitacao.decisao.analisadaEm)}.`;
            decisaoRegistrada.append(quem);

            if (solicitacao.decisao.motivo) {
                const motivo = document.createElement("p");
                motivo.textContent = `Motivo: ${solicitacao.decisao.motivo}`;
                decisaoRegistrada.append(motivo);
            }
        }
    }

    function montarAnalise(solicitacao) {
        aberta = solicitacao;
        const { empresa } = solicitacao;

        analise.querySelector("#analise-titulo").textContent = empresa.razaoSocial;

        analise.querySelector("#dados-empresa").replaceChildren(
            ...linhaDeDado("CNPJ", formatarCnpj(empresa.cnpj)),
            ...linhaDeDado("Responsável", empresa.nomeResponsavel),
            ...linhaDeDado("E-mail", empresa.email),
            ...linhaDeDado("Telefone", empresa.telefone),
            ...linhaDeDado("Pedido enviado em", formatarDataEHora(solicitacao.enviadaEm))
        );

        const documentos = analise.querySelector("#documentos-empresa");
        documentos.replaceChildren(
            ...solicitacao.documentos.map((documento) => {
                const item = document.createElement("li");
                const nome = document.createElement("span");
                nome.textContent = `${documento.nome} (enviado em ${formatarData(documento.enviadoEm)})`;
                const botao = document.createElement("button");
                botao.type = "button";
                botao.className = "secondary-button";
                botao.textContent = "Abrir";
                botao.setAttribute("aria-label", `Abrir ${documento.nome}`);
                botao.addEventListener("click", () => abrirDocumento(solicitacao.id, documento));
                item.append(nome, botao);
                return item;
            })
        );

        formulario.reset();
        mostrarDecisao(solicitacao);
        analise.hidden = false;
    }

    async function abrirSolicitacao(id) {
        aviso.hidden = true;

        try {
            const resposta = await chamarComToken(`/admin/validacoes/${id}`);
            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.ok) {
                montarAnalise(corpo);
                // Recarrega a fila para marcar o pedido aberto e tirar os que
                // outro admin decidiu enquanto esta tela estava aberta.
                carregarFila();
                analise.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
            }

            avisarRecusa(resposta, corpo, "Não foi possível abrir a solicitação.");
        } catch (erro) {
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        }
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        aviso.hidden = true;
        if (!aberta) return;

        // Cada botão do formulário leva a decisão no próprio value.
        const decisao = evento.submitter ? evento.submitter.value : "";
        const motivo = formulario.querySelector("#motivo").value;
        const botoes = formulario.querySelectorAll("button");
        botoes.forEach((b) => { b.disabled = true; });

        try {
            const resposta = await chamarComToken(`/admin/validacoes/${aberta.id}/decisao`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decisao, motivo }),
            });
            const corpo = await resposta.json().catch(() => ({}));

            if (resposta.ok) {
                montarAnalise(corpo);
                mostrarAviso(aviso, "sucesso", "Decisão registrada. A empresa foi avisada.");
                carregarFila();
                return;
            }

            // Outro admin decidiu antes: mostra o que ficou registrado.
            if (resposta.status === 409 && corpo.solicitacao) {
                montarAnalise(corpo.solicitacao);
                mostrarAviso(aviso, "erro", "Outro administrador já analisou esta solicitação.");
                carregarFila();
                return;
            }

            avisarRecusa(resposta, corpo, "Não foi possível registrar a decisão:");
        } catch (erro) {
            mostrarAviso(aviso, "erro", "Não conseguimos falar com o servidor. Confira a conexão e tente de novo.");
        } finally {
            botoes.forEach((b) => { b.disabled = false; });
        }
    });

    carregarFila();
}
