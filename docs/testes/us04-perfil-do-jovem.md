# Roteiro de teste - US04 (RF04) Manter perfil

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US04 (RF04) - Manter perfil |
| Requisito | RF04 · Caso de uso UC03 |
| Regras de negócio envolvidas | RN02 (perfil incompleto impede a candidatura) |
| Requisito não funcional envolvido | RNF08 (telefone e endereço não são públicos) |
| Responsável pelo teste | Thiago Martins |
| Data da execução | 23/10/2026 |
| Versão testada | branch `us04-perfil-jovem` |
| Técnica usada | caixa-preta, pela API e pela tela |

## Pré-condições

- API no ar com `JWT_SECRET` preenchido
- Duas contas de jovem (Ana, sem perfil; Bia, com perfil preenchido) e uma de empresa

**Atenção:** esta execução usou um banco falso em memória no lugar do
PostgreSQL, porque a máquina do teste estava com Node 18 e o Prisma 7 exige
Node 20 ou superior. Regras, rotas, token e tela rodaram de verdade; só a
gravação no PostgreSQL ficou de fora. Os casos 1, 2 e 5 precisam ser repetidos
com o banco ligado (ver Pendências).

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | `GET /perfil` de jovem que ainda não tem perfil | campos vazios e perfil incompleto, faltando os três | 200, faltando Telefone, Endereço e Habilidades | passou |
| 2 | `PUT /perfil` só com endereço (telefone em branco) | salva e continua incompleto, apontando o que falta | 200, faltando Telefone e Habilidades | passou |
| 3 | `PUT /perfil` com telefone `123` | recusa e diz como preencher | 400 "Informe o telefone com DDD, por exemplo (47) 99999-0000." | passou |
| 4 | `PUT /perfil` com os três campos | salva e marca como completo | 200, `completo: true` | passou |
| 5 | `GET /perfil` depois de salvar | volta com os dados preenchidos | 200, os três campos como foram salvos | passou |
| 6 | Bia pede o próprio perfil | vê só os dados dela | 200, dados da Bia | passou |
| 7 | Empresa pede `/perfil` | recusa | 403 "Esta área não é do seu perfil." | passou |
| 8 | Sem token | recusa | 401 "Faça login para continuar." | passou |
| 9 | Token adulterado | recusa | 401 "Faça login para continuar." | passou |
| 10 | Ana tenta `/perfil/11` (perfil de outro pelo id) | não existe rota para isso | 404 | passou |
| 11 | Endereço com 201 caracteres | recusa | 400 "O endereço pode ter até 200 caracteres." | passou |

### Por que não existe `/perfil/:id`

O perfil é sempre o de quem está no token. Sem id no endereço, não há como um
jovem pedir o perfil de outro trocando um número na URL, e o critério "só o
próprio jovem vê e edita" fica garantido pelo desenho da rota, não por uma
conferência que alguém poderia esquecer.

## Resultado da execução, pela tela

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 12 | Cabeçalho de jovem logado | mostra o link "Meu perfil" | "Olá, Ana", "Meu perfil" e "Sair" | passou |
| 13 | Abrir `perfil.html` com perfil completo | campos preenchidos e indicador de completo | "Perfil completo." | passou |
| 14 | Apagar as habilidades e salvar | salva e avisa o que falta | "Perfil salvo." e "Perfil incompleto. [...] Habilidades." | passou |
| 15 | Telefone `123` | aviso de erro com a orientação | "Não foi possível salvar o perfil: Informe o telefone com DDD [...]" | passou |
| 16 | Preencher tudo, salvar e reabrir | dados continuam lá e perfil completo | dados com acento (Itajaí, público) preservados, "Perfil completo." | passou |
| 17 | Empresa abre `perfil.html` | avisa e não deixa salvar | "O perfil é só para contas de jovem.", botão travado, sem link "Meu perfil" | passou |
| 18 | Abrir `perfil.html` sem login | manda para a tela de entrada | redirecionou para `login.html` | passou |

## Verificação de segurança

- [x] Só o dono do token lê e altera o perfil (casos 6 a 10)
- [x] Telefone e endereço não aparecem em nenhuma rota pública (só em `/perfil`, que exige login de jovem)
- [x] Nenhum segredo escrito no código

## Verificação de acessibilidade

- [x] Todos os campos têm rótulo associado (`label for`)
- [x] As dicas embaixo dos campos estão ligadas a eles por `aria-describedby`
- [x] Indicador de completude não depende só de cor: o texto diz "completo" ou "incompleto" e o que falta
- [ ] Preencher e salvar só com o teclado (não executado)
- [ ] Contraste das cores novas do indicador no verificador do WebAIM (não executado)

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 18 |
| Casos aprovados | 18 |
| Casos reprovados | 0 |
| Situação do item | aprovado com pendências |

Pendências e observações:

- Repetir os casos 1, 2, 4 e 5 com o PostgreSQL ligado (Node 20 ou superior) e conferir a tabela `Perfil` no Prisma Studio
- Executar os dois itens de acessibilidade em aberto
- O currículo entra na conta de perfil completo quando a US05 for feita (a função `situacaoDoPerfil` já é o lugar para isso)
