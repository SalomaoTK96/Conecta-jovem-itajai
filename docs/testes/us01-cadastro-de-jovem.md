# Roteiro de teste - US01 (RF01) Criar conta como jovem

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US01 (RF01) - Criar conta como jovem |
| Regras de negócio | RN03 (e-mail único), RN09 (14 a 24 anos), RN11 (responsável legal) |
| Requisito não funcional | RNF03 (senha em hash) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 20/10/2026 |
| Versão testada | branch `us01-cadastro-jovem` |
| Técnica usada | caixa-preta: partição de equivalência e análise de valor-limite |

## Pré-condições

- PostgreSQL rodando com o banco `conecta_jovem` e as migrações aplicadas
- API no ar (`npm run dev` na pasta `backend`)
- Tabelas `Usuario` e `Jovem` vazias no início

## Como foram escolhidos os casos

A RN09 define a faixa de 14 a 24 anos. Isso cria três classes de equivalência
(abaixo, dentro, acima) e duas fronteiras. Como a fronteira é onde o defeito
mais aparece, os dois extremos da faixa entraram como casos próprios: alguém
com exatamente 14 e alguém com exatamente 24 precisam ser aceitos. Se o código
usasse `>` e `<` no lugar de `>=` e `<=`, esses dois seriam recusados e
nenhum outro caso perceberia.

A RN11 tem fronteira própria aos 16 anos, então 15 e 16 também viraram casos.

## Resultado da execução

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Jovem de 19 anos, dados completos | cria a conta | 201, id 5 | passou |
| 2 | Mesmo e-mail do caso 1 (RN03) | recusa | 409 "Este e-mail já tem conta." | passou |
| 3 | Jovem de 24 anos, limite de cima (RN09) | cria a conta | 201, id 6 | passou |
| 4 | Jovem de 14 anos, limite de baixo (RN09 e RN11) | cria a conta | 201, id 7 | passou |
| 5 | Jovem de 13 anos (RN09) | recusa | 400 "A plataforma atende jovens de 14 a 24 anos." | passou |
| 6 | Jovem de 25 anos (RN09) | recusa | 400 "A plataforma atende jovens de 14 a 24 anos." | passou |
| 7 | Jovem de 15 anos sem responsável (RN11) | recusa | 400 "Menores de 16 anos precisam informar o responsável legal." e "É preciso registrar o consentimento do responsável legal." | passou |
| 8 | Jovem de 15 anos com responsável e consentimento (RN11) | cria a conta | 201, id 8 | passou |
| 9 | Senha com menos de 8 caracteres | recusa | 400 "A senha precisa ter pelo menos 8 caracteres." | passou |
| 10 | E-mail sem formato de e-mail | recusa | 400 "Informe um e-mail válido." | passou |

## Verificação de segurança (RNF03)

Os quatro cadastros aceitos usaram a mesma senha, `SenhaForte1`. Consulta feita
na tabela `Usuario` depois da execução:

| id | email | senha gravada no banco |
|---|---|---|
| 5 | salomao@teste.com | `$2b$10$hEMZsmD9mYeEO/TzbL...` |
| 6 | leandro@teste.com | `$2b$10$.hib5oNeqZ6hXNu2CL...` |
| 7 | thiago@teste.com | `$2b$10$z/qse84zjVPdO1S6Ag...` |
| 8 | caio2@teste.com | `$2b$10$eiMO/RggCXSwJD5Lem...` |

Duas coisas ficam provadas aqui. A senha não está legível em lugar nenhum, e os
quatro hashes são diferentes entre si mesmo vindo da mesma senha, porque cada
um recebeu um tempero sorteado na hora.

- [x] Nenhuma senha gravada em texto puro
- [x] A resposta da API devolve só id, e-mail, perfil e nome; senha e hash não saem
- [x] Mensagem de erro não entrega se o problema foi o e-mail ou a senha além do necessário
- [x] Nenhum segredo escrito no código

## Segunda rodada: teste pela tela

Executado em 20/10, depois de ligar `frontend/cadastro-jovem.html` à API.
O caminho é o do usuário: abrir `http://localhost:3000/cadastro-jovem.html`,
preencher o formulário e clicar em Criar conta.

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 11 | Preenchimento completo, 19 anos | cria a conta, avisa e leva para o login | conta criada, aviso verde, redirecionou para `login.html` | passou |
| 12 | Repetir o e-mail do caso 11 (RN03) | aviso de e-mail já cadastrado | "Este e-mail já tem conta." | passou |
| 13 | Data de nascimento de quem tem 25 anos (RN09) | aviso de idade fora da faixa | "A plataforma atende jovens de 14 a 24 anos." | passou |
| 14 | Data de nascimento de quem tem 13 anos (RN09) | aviso de idade fora da faixa | ver defeito abaixo | reprovou, corrigido e reexecutado |
| 15 | 15 anos com responsável e consentimento (RN11) | cria a conta | conta criada, redirecionou | passou |

### Defeito encontrado e corrigido

**Caso 14, primeira execução.** Ao informar a data de nascimento de quem tem
13 anos, a tela abria o bloco do responsável legal e tornava os campos
obrigatórios. Como eles estavam vazios, o navegador travava o envio e o
formulário nunca chegava na API. O usuário ficava preso num campo de
responsável, sem nunca ser informado do problema real, que é a idade estar
fora da faixa atendida.

Classificação pela aula: defeito **grande**, de interface, com origem na
codificação. A regra da tela dizia "menor de 16 precisa de responsável" sem
considerar que a RN09 já teria recusado aquela idade antes.

Correção: a tela passou a só exigir responsável de quem está dentro da faixa
de 14 a 24 anos, espelhando a regra que a API aplica. Commit
`US01: envia o cadastro da tela para a API`.

Reexecução do caso 14 depois da correção: o bloco do responsável não aparece,
o formulário envia, e a tela mostra "A plataforma atende jovens de 14 a 24
anos". Passou.

Os casos 11, 12, 13 e 15 foram reexecutados depois da correção e continuaram
passando (teste de regressão).

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 15 (10 pela API, 5 pela tela) |
| Casos aprovados | 15 |
| Casos reprovados | 1 na primeira execução, corrigido e reaprovado |
| Defeitos encontrados | 1 (grande, interface) |
| Situação do item | aprovado |

Pendências e observações:

- Pelo princípio de que quem implementa não testa, estes casos devem ser
  reexecutados por outro integrante antes do item ir para "Testado".
- A US03 (login) ainda não existe, então a conta criada não consegue entrar
  no sistema. O redirecionamento para a tela de login já está no lugar.
