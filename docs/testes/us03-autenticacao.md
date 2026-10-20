# Roteiro de teste - US03 (RF03) Autenticar-se

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US03 (RF03) - Autenticar-se |
| Requisito | RF03 · Caso de uso UC02 |
| Requisito não funcional relacionado | RNF03 (a senha é conferida contra o hash, nunca decifrada) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 20/10/2026 |
| Versão testada | branch `us03-autenticacao` |
| Técnica usada | caixa-preta, com atenção às respostas que poderiam vazar informação |

## Pré-condições

- API no ar com o banco ligado
- Pelo menos uma conta criada pela US01 (usamos `salomao@teste.com`)
- `JWT_SECRET` preenchido no `.env`

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Login com e-mail e senha corretos | devolve o token e os dados de quem entrou | 200, perfil JOVEM, nome Salomao Panas, token emitido | passou |
| 2 | Senha errada | recusa com mensagem genérica | 401 "E-mail ou senha incorretos." | passou |
| 3 | E-mail que não existe | recusa com **a mesma** mensagem do caso 2 | 401 "E-mail ou senha incorretos." | passou |
| 4 | Rota protegida sem token | recusa | 401 "Faça login para continuar." | passou |
| 5 | Rota protegida com token válido | devolve quem está logado | 200, Salomao Panas (JOVEM) | passou |
| 6 | Rota protegida com token adulterado | recusa | 401 "Faça login para continuar." | passou |
| 7 | A resposta do login menciona senha ou hash? | não | nenhuma ocorrência | passou |

### Por que os casos 2 e 3 têm que dar a mesma resposta

Se e-mail inexistente respondesse diferente de senha errada, qualquer pessoa
descobriria quais e-mails têm conta no sistema só observando o retorno. É o
critério de aceitação do cartão, e vale também para o tempo de resposta: por
isso a conferência da senha roda mesmo quando o e-mail não existe, contra um
hash qualquer. Sem isso, e-mail sem conta responderia na hora e e-mail real
demoraria, e a diferença entregaria a informação do mesmo jeito.

### Conteúdo do token emitido

```
{"id":5,"email":"salomao@teste.com","perfil":"JOVEM","iat":...,"exp":...}
```

Só identificação e perfil. Nada de senha, nada de hash, nada de dado pessoal.
O conteúdo de um token é legível por quem o tiver em mãos; o que a assinatura
impede é que ele seja alterado.

## Resultado da execução, pela tela

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 8 | Entrar com senha errada | aviso de erro e nenhuma sessão iniciada | "E-mail ou senha incorretos.", nada guardado no navegador | passou |
| 9 | Entrar com a senha certa | inicia a sessão e volta para a página inicial | aviso de sucesso, sessão iniciada, redirecionou para `index.html` | passou |
| 10 | Cabeçalho depois de entrar | mostra quem entrou e o botão de sair | "Olá, Salomao" e botão "Sair" no lugar de Entrar e Criar conta | passou |
| 11 | Clicar em Sair | encerra a sessão e volta a tratar como visitante | voltou para `index.html` com "Entrar" e "Criar conta" no cabeçalho | passou |

## Critérios de aceitação do cartão

| Critério | Situação |
|---|---|
| Jovem, empresa e administrador entram com e-mail e senha | atendido para jovem; empresa e administrador dependem da US02 e do seed de admin, que ainda não existem |
| E-mail ou senha errados mostram mensagem genérica | atendido, casos 2 e 3 |
| Ao entrar, o sistema gera um token assinado e leva o usuário adiante | atendido; o destino hoje é a página inicial, porque as telas de perfil são da US04 |
| Rotas protegidas recusam acesso sem token ou com token vencido | atendido, casos 4 e 6 |
| Ao sair, o token é descartado e o usuário volta à tela inicial | atendido, caso 11 |
| Um perfil não acessa telas de outro | o mecanismo existe (`exigirPerfil`), mas só será exercido quando houver rotas de empresa e administrador (US06, US07, US08) |

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 11 (7 pela API, 4 pela tela) |
| Casos aprovados | 11 |
| Casos reprovados | 0 |
| Situação do item | aprovado para o perfil jovem |

Pendências e observações:

- Empresa e administrador ainda não têm conta no sistema, então o login desses
  dois perfis não pôde ser testado. Entra junto com a US02 e com o seed da
  conta de administrador.
- O token é guardado no navegador pelo caminho mais simples. Tem um custo: se
  alguém conseguir rodar script na nossa página, consegue ler o token. É
  aceitável aqui porque ele vale 8 horas e não carrega dado pessoal, e o TS04
  vai revisar essa decisão.
- Pelo princípio de que quem implementa não testa, estes casos devem ser
  reexecutados por outro integrante antes do item ir para "Testado".
