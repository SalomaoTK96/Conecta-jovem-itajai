# Roteiro de teste - US10 (RF07) Candidatar-se à vaga

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US10 (RF07) - Candidatar-se à vaga |
| Requisito | RF07 · Caso de uso UC05 |
| Regras de negócio envolvidas | RN02 (perfil completo), RN05 (uma candidatura por vaga), RN06 (vaga aberta e no prazo), RN08 (histórico) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 16/11/2026 |
| Versão testada | branch `us10-candidatar-se` |
| Técnica usada | caixa-preta pela API e pela tela; tabela de decisão para as recusas |
| Testes automatizados | `backend/test/unit/candidatura.test.js` (8 testes, `npm test`) |

## Pré-condições

- Mesmos dados do roteiro da US09 (empresa `validada@teste.com` com vagas abertas e 1 encerrada; empresa `pendente@teste.com` em análise)
- Jovem `ana@teste.com` com perfil e currículo completos
- Jovem `bruno@teste.com` só com telefone (sem endereço, habilidades e currículo)

## Tabela de decisão (ordem em que a API confere)

| Vaga existe e é de empresa validada | Vaga aberta e no prazo (RN06) | Já se candidatou (RN05) | Perfil completo (RN02) | Resposta |
|---|---|---|---|---|
| não | - | - | - | 404 |
| sim | não | - | - | 409 "não aceita mais candidaturas" |
| sim | sim | sim | - | 409 "já se candidatou" |
| sim | sim | não | não | 422 "Complete seu perfil", com link para o perfil |
| sim | sim | não | sim | 201, status Em análise |

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | `POST /candidaturas` sem login | 401 | 401 "Faça login para continuar." | passou |
| 2 | Empresa tenta se candidatar | 403 | 403 | passou |
| 3 | Jovem com perfil incompleto | 422 e leva ao perfil (RN02) | 422 "Complete seu perfil... Falta: Endereço, Habilidades, Currículo." e `irPara: perfil.html` | passou |
| 4 | Vaga encerrada | 409 (RN06) | 409 "Esta vaga não aceita mais candidaturas..." | passou |
| 5 | Vaga de empresa em análise | 404 (RN01) | 404 "Vaga não encontrada." | passou |
| 6 | Sem informar a vaga | 400 | 400 "Informe a vaga." | passou |
| 7 | Jovem com perfil completo em vaga aberta | 201, Em análise | 201, status `EM_ANALISE` | passou |
| 8 | Mesmo jovem na mesma vaga de novo | 409 (RN05) | 409 "Você já se candidatou a esta vaga..." | passou |
| 9 | 5 pedidos ao mesmo tempo para a mesma vaga | só 1 gravado | 1 × 201 e 4 × 409; 1 candidatura no banco; nenhum erro 500 | passou |
| 10 | Histórico depois do caso 7 | 1 linha, de vazio para Em análise (RN08) | `statusAnterior` nulo, `statusNovo` `EM_ANALISE` | passou |
| 11 | Notificação depois do caso 7 | 1 notificação para o jovem | "Sua candidatura para "Estágio em suporte de TI" foi enviada. Status: Em análise." | passou |
| 12 | Empresa lista as vagas dela | contador de candidaturas sobe | "Estágio em suporte de TI" com 1 candidatura | passou |

## Resultado da execução, pela tela (`vaga.html`)

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 13 | Visitante abre a vaga | botão leva ao login e volta para a vaga | "Entrar para se candidatar" → `login.html?voltar=vaga.html?id=1` | passou |
| 14 | Bruno entra pelo link | volta para a mesma vaga | voltou para `vaga.html?id=1` | passou |
| 15 | Bruno abre a vaga | avisa o que falta antes do clique | "Para se candidatar, complete seu perfil. Falta: ..." e link "Completar meu perfil" | passou |
| 16 | Bruno clica em Candidatar-se | bloqueia e leva ao perfil | mensagem da API com link "Completar meu perfil" | passou |
| 17 | Ana clica em Candidatar-se | confirma | "Candidatura enviada! Status: Em análise." e o botão some | passou |
| 18 | Ana recarrega a página | não oferece de novo | "Você já se candidatou a esta vaga." sem botão | passou |
| 19 | Login com `?voltar=https://site-falso.com` | não sai do site | foi para `index.html` | passou |
| 20 | Console do navegador | sem erros | nenhum erro | passou |
