# Roteiro de teste - US05 (RF05) Montar currículo

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US05 (RF05) - Montar currículo |
| Requisito | RF05 · Caso de uso UC03 |
| Regras de negócio envolvidas | RN02 (perfil incompleto impede a candidatura) |
| Requisito não funcional envolvido | RNF08 (só o próprio jovem vê e edita) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 25/10/2026 |
| Versão testada | branch `us05-curriculo`, commit `7658f62` |
| Técnica usada | caixa-preta pela API e pela tela, com PostgreSQL; valor-limite nos anos |

## Pré-condições

- Banco com as migrações aplicadas e API no ar
- Jovens `leandro@teste.com` (com perfil preenchido) e `salomao@teste.com` (sem currículo)
- Empresa `thiago@teste.com`

## Regras (funções puras, ano de referência 2026)

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Objetivo e uma escolaridade sem ano de conclusão | válido, "cursando", conta para o perfil | válido, `anoFim` nulo, `curriculoCompleto` verdadeiro | passou |
| 2 | Escolaridade com nível "Doutorado", início 1980 e conclusão 1970 | recusa cada problema, dizendo o item | 4 mensagens começando por "Escolaridade 1:" | passou |
| 3 | Experiência começando em 2027-01 e saída 2026-13 | recusa início no futuro e mês inválido | 2 mensagens começando por "Experiência 1:" | passou |
| 4 | Ano de conclusão "abc" | recusa | "o ano de conclusão não é um ano válido." | passou |
| 5 | Currículo sem objetivo | salva, mas não conta para o perfil | válido, `curriculoCompleto` falso | passou |

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 6 | `GET /curriculo` de quem ainda não montou | currículo vazio e a lista de níveis | 200, listas vazias, `completo: false` | passou |
| 7 | Salvar objetivo, duas escolaridades e nenhuma experiência | salva normalmente (primeiro emprego) | 200, 2 escolaridades, `completo: true` | passou |
| 8 | Salvar de novo com uma escolaridade a menos e uma experiência | fica só o que foi mandado | banco com 1 escolaridade e 1 experiência | passou |
| 9 | Salvar com escolaridade incompleta | recusa e não mexe no que estava salvo | 400 com os erros; banco continua com 1 escolaridade | passou |
| 10 | Empresa pede `/curriculo` | recusa | 403 "Esta área não é do seu perfil." | passou |
| 11 | Sem token | recusa | 401 "Faça login para continuar." | passou |
| 12 | Perfil de jovem sem currículo | aponta o currículo como pendente (RN02) | `faltando: ["Currículo"]` | passou |
| 13 | Perfil de jovem com currículo e contatos | completo | `completo: true` | passou |

## Resultado da execução, pela tela

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 14 | Jovem entra | cabeçalho com "Meu currículo" | "Meu perfil", "Meu currículo" e "Sair" | passou |
| 15 | Perfil sem currículo | diz o que falta e leva ao currículo | "Perfil incompleto... Currículo." com o link "Montar meu currículo" | passou |
| 16 | Abrir a tela pela primeira vez | explica o que falta para contar no perfil | aviso de objetivo e escolaridade, sem itens | passou |
| 17 | Adicionar duas escolaridades | duas caixas numeradas, foco no primeiro campo da nova | "Escolaridade 1" e "Escolaridade 2", foco em "Escola ou instituição" | passou |
| 18 | Remover a segunda | sobra uma, numeração refeita, foco não se perde | "Escolaridade 1", foco no botão "Adicionar escolaridade" | passou |
| 19 | Ver como a empresa vê, antes de salvar | prévia com o que está digitado | nome, objetivo, "3º ano (Ensino médio), ..., cursando" e "Ainda sem experiência" | passou |
| 20 | Salvar sem experiência | salva e conta para o perfil | "Currículo salvo." e "Currículo pronto" | passou |
| 21 | Adicionar experiência e salvar | salva | "Currículo salvo." | passou |
| 22 | Adicionar escolaridade em branco e salvar | mostra o erro com o número do item | "Escolaridade 2: informe o nome da escola..." | passou |
| 23 | Recarregar a página | tudo volta preenchido | 1 escolaridade e 1 experiência, mês "2025-02" no campo | passou |
| 24 | Voltar ao perfil | perfil completo | "Perfil completo." | passou |
| 25 | Empresa abre a tela | recusa | "O currículo é só para contas de jovem." | passou |
| 26 | Tela em 360 px e 1280 px | sem rolagem lateral | sem rolagem lateral | passou |

## Verificação de segurança

- [x] Não existe `/curriculo/:id`; o currículo é sempre o do token (casos 10 e 11)
- [x] Salvar troca as listas numa transação: erro no meio não apaga o currículo antigo (caso 9)
- [x] No máximo 10 itens por seção, para um envio enorme não travar o servidor
- [x] Prévia e tela montadas com `textContent`, nunca como HTML

## Verificação de acessibilidade

- [x] Cada seção é um `fieldset` com `legend`, e cada item tem a sua, numerada
- [x] Todo campo tem rótulo ligado pelo `id`, mesmo com vários itens na tela
- [x] O botão "Remover" diz qual item remove (`aria-label`) e o foco não se perde depois
- [x] A prévia recebe o foco quando abre
- [ ] Contraste das cores no verificador do WebAIM (fica para o TS04)

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 26 |
| Casos aprovados | 26 |
| Casos reprovados | 0 |
| Situação do item | aprovado com pendências |

Pendências e observações:

- O roteiro da US04 foi escrito antes do currículo existir. Com a US05, a lista do que falta no perfil passa a incluir "Currículo"; os casos 1, 2 e 14 da US04 devem esperar esse item a mais
- No Firefox e no Safari antigos o campo de mês aparece como texto; o exemplo "AAAA-MM" orienta o formato
