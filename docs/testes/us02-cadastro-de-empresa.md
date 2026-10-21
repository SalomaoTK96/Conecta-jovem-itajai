# Roteiro de teste - US02 (RF02) Criar conta como empresa

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US02 (RF02) - Criar conta como empresa |
| Regras de negócio | RN01 (conta nasce pendente), RN03 (e-mail único) |
| Requisito não funcional | RNF03 (senha em hash) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 20/10/2026 |
| Versão testada | branch `us02-cadastro-empresa` |
| Técnica usada | caixa-preta: partição de equivalência e valor-limite no CNPJ |

## Pré-condições

- PostgreSQL com a migração `20261020235654_adiciona_contato_da_empresa` aplicada
- API no ar

## Como foram escolhidos os casos do CNPJ

O CNPJ tem dois dígitos no fim que existem para pegar erro de digitação. Isso
cria três classes: CNPJ certo, CNPJ com dígito errado e CNPJ malformado. O caso
mais importante é o do meio: `11.222.333/0001-82` é o válido com **um** dígito
trocado. Se a conferência estivesse só olhando a quantidade de números, esse
passaria.

Entraram também os repetidos tipo `00.000.000/0000-00`, que passam na conta dos
dígitos mas não são CNPJ de ninguém.

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Empresa com CNPJ válido e e-mail novo | cria a conta com status pendente | 201, id 11, status PENDENTE | passou |
| 2 | Mesmo CNPJ, outro e-mail | recusa | 409 "Este CNPJ já tem conta." | passou |
| 3 | Mesmo e-mail, outro CNPJ (RN03) | recusa | 409 "Este e-mail já tem conta." | passou |
| 4 | CNPJ válido com um dígito trocado | recusa | 400 "Informe um CNPJ válido, com 14 dígitos." | passou |
| 5 | CNPJ com todos os números iguais | recusa | 400 "Informe um CNPJ válido, com 14 dígitos." | passou |
| 6 | Sem o nome da empresa | recusa | 400 "Informe o nome da empresa." | passou |
| 7 | Login com a conta de empresa recém-criada | entra como EMPRESA | 200, perfil EMPRESA, Estaleiro Teste Ltda | passou |
| 8 | A resposta menciona senha ou hash? | não | nenhuma ocorrência | passou |

O caso 7 também fecha um critério que estava em aberto na US03, que é o login
funcionando para o perfil de empresa. Até agora só existia conta de jovem.

## Resultado da execução, pela tela

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 9 | Digitar o CNPJ só com números | a tela desenha a pontuação sozinha | `04252011000110` virou `04.252.011/0001-10` | passou |
| 10 | Enviar com CNPJ já cadastrado | aviso de erro | "Este CNPJ já tem conta." | passou |
| 11 | Enviar com CNPJ de dígito trocado | aviso de erro | "Informe um CNPJ válido, com 14 dígitos." | passou |
| 12 | Cadastro válido | confirma e avisa que a conta fica pendente | "Cadastro enviado. A conta fica pendente até a validação dos documentos." | passou |

### Defeito encontrado e corrigido

**Primeira execução dos casos 9 a 12.** A página travava ao enviar o
formulário, sem mostrar aviso nenhum.

Causa: o formulário tinha dois donos. Um código antigo pegava qualquer
formulário com campo de senha e, no envio, abria uma janelinha de alerta
dizendo que o cadastro ainda não estava conectado ao servidor. Quando a tela
passou a chamar a API de verdade, os dois responderam ao mesmo clique, e a
janelinha bloqueava a página inteira.

Classificação pela aula: defeito **grande**, de interface, encontrado em teste
de **integração**. Cada parte funcionava sozinha; o problema só apareceu na
junção.

O mesmo código já tinha incomodado no cadastro de jovem e na época foi
contornado com uma exceção para aquele formulário. A exceção tratou o sintoma e
deixou a causa viva, que voltou a aparecer aqui.

Correção: o manipulador antigo foi removido, por ser código morto desde que o
primeiro cadastro passou a funcionar. Ficou só a parte que ainda serve.
Reexecução dos casos 9 a 12 depois da correção: todos passaram.

## Critérios de aceitação do cartão

| Critério | Situação |
|---|---|
| O formulário pede razão social, CNPJ, e-mail e senha | atendido |
| Um e-mail já cadastrado é recusado (RN03) | atendido, caso 3 |
| CNPJ validado no formato e nos dígitos verificadores, e sem repetir | atendido, casos 2, 4 e 5 |
| A conta nasce pendente de validação e ainda não publica vagas (RN01) | atendido no cadastro, caso 1; o bloqueio de publicar vaga será exercido na US08 |
| A senha é gravada somente como hash (TS01) | atendido |

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 12 (8 pela API, 4 pela tela) |
| Casos aprovados | 12 |
| Casos reprovados | 1 na primeira execução, corrigido e reaprovado |
| Defeitos encontrados | 1 (grande, interface, integração) |
| Situação do item | aprovado |

Pendências e observações:

- Pelo princípio de que quem implementa não testa, estes casos devem ser
  reexecutados por outro integrante antes do item ir para "Testado".
- A empresa ainda não tem para onde ir depois de entrar: a tela de envio de
  documentos é a US06 e a aprovação pelo administrador é a US07.
