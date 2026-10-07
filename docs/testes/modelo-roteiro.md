# Modelo de roteiro de teste

Copie este arquivo para `docs/testes/<id-do-item>.md` antes de começar a testar
(exemplo: `docs/testes/us01-cadastro-jovem.md`) e preencha os campos.

O roteiro preenchido é um dos critérios para o item ser considerado pronto, e é o
que a equipe mostra na revisão da sprint.

---

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US01 - Cadastro de jovem |
| Regras de negócio envolvidas | RN03, RN09, RN11 |
| Requisito não funcional envolvido | RNF03 |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 00/00/2026 |
| Versão testada | branch `us01-cadastro-jovem`, commit `abc1234` |

## Pré-condições

O que precisa estar pronto antes de rodar o roteiro.

- Banco `conecta_jovem` criado e com as migrações aplicadas
- API rodando em `http://localhost:3000`
- Nenhuma conta cadastrada com o e-mail usado no teste

## Caso 1 - Fluxo principal

Objetivo: descrever o caminho em que tudo dá certo.

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Abrir a tela de cadastro de jovem | Formulário carrega com os campos obrigatórios |
| 2 | Preencher nome, e-mail, senha e data de nascimento de quem tem 17 anos | Campos aceitam os dados sem erro |
| 3 | Enviar o formulário | API responde 201 e a tela mostra confirmação do cadastro |
| 4 | Consultar a tabela `Usuario` no banco | Existe uma linha com o e-mail informado e perfil `JOVEM` |

Resultado obtido: _(passou / falhou, e o que aconteceu)_

## Caso 2 - Exceção

Objetivo: descrever um caminho em que o sistema precisa recusar a operação.
Todo item precisa de pelo menos uma exceção testada.

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Repetir o cadastro com o mesmo e-mail do Caso 1 | API responde 409 com mensagem de e-mail já cadastrado |
| 2 | Consultar a tabela `Usuario` | Continua existindo apenas uma linha com aquele e-mail (RN03) |

Resultado obtido: _(passou / falhou, e o que aconteceu)_

## Caso 3 - Regra de negócio

Um caso por regra de negócio que o item precisa cumprir.

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Cadastrar jovem com data de nascimento de quem tem 12 anos | API recusa o cadastro, informando a faixa de 14 a 24 anos (RN09) |
| 2 | Cadastrar jovem de 15 anos sem informar responsável legal | API recusa e pede nome e consentimento do responsável (RN11) |

Resultado obtido: _(passou / falhou, e o que aconteceu)_

## Verificação de segurança

Checar sempre que o item mexe com senha, sessão ou dado pessoal do jovem.

- [ ] A senha não aparece em texto puro no banco (coluna `senhaHash` tem hash bcrypt)
- [ ] A senha não aparece na resposta da API nem no log do servidor
- [ ] Nenhum segredo (senha do banco, chave do JWT) está escrito no código

## Verificação de acessibilidade

Checar sempre que o item altera alguma tela.

- [ ] Todos os campos do formulário têm rótulo associado
- [ ] É possível preencher e enviar o formulário usando só o teclado
- [ ] As mensagens de erro são lidas por leitor de tela e não dependem só de cor
- [ ] Contraste de texto e fundo aprovado no verificador do WebAIM

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 0 |
| Casos aprovados | 0 |
| Casos reprovados | 0 |
| Situação do item | aprovado / reprovado / aprovado com pendências |

Pendências e observações:

- _(o que ficou aberto, com o número da issue quando houver)_
