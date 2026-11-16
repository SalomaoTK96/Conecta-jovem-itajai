# Roteiro de teste - US13 (RF09) Notificar mudança de status

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US13 (RF09) - Notificar mudança de status |
| Requisito | RF09 · Caso de uso UC06 |
| Regras de negócio envolvidas | RN08 (toda mudança de status gera notificação) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 16/11/2026 |
| Versão testada | branch `us13-notificacoes` |
| Técnica usada | caixa-preta pela API e pela tela |
| Testes automatizados | `backend/test/unit/notificacoes.test.js` (5 testes) e `candidatura.test.js` (função `criarNotificacao`) |

## Pré-condições

- Jovem `ana@teste.com` com 3 candidaturas e notificações da US10 e da US11
- Jovem `bruno@teste.com` e empresa `validada@teste.com`

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Ana pede `GET /notificacoes/nao-lidas` | número de não lidas | `{"total":4}` | passou |
| 2 | Ana pede `GET /notificacoes` | mensagem, vaga, data, lida e link | 4 itens, mais novos primeiro, link `minhas-candidaturas.html#candidatura-N` | passou |
| 3 | Bruno marca uma notificação da Ana como lida | recusa | 404 "Notificação não encontrada."; continua não lida | passou |
| 4 | Ana marca a dela como lida | marca | 204 e contador vai de 5 para 4 | passou |
| 5 | Empresa muda a candidatura da Ana para Aprovada | contador da Ana sobe | de 4 para 5 | passou |
| 6 | Sem login | recusa | 401 | passou |
| 7 | Empresa sem notificações pede a lista | lista vazia (só vê as dela) | `{"notificacoes":[]}` | passou |
| 8 | Decisão do admin (US07) | usa a mesma função `criarNotificacao` | código da US07 chama `criarNotificacao`; testes da US07 continuam passando | passou |

## Resultado da execução, pela tela

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 9 | Ana entra | sino com contador no cabeçalho | 🔔 com "4" e rótulo "Notificações: 4 não lida(s)" para leitor de tela | passou |
| 10 | Clicar no sino | lista com mensagem, vaga e data | 5 notificações, 4 com selo "Nova" | passou |
| 11 | Clicar na mais nova | marca como lida e abre a candidatura | abriu `minhas-candidaturas.html#candidatura-5` com o histórico aberto (Em análise → Aprovada) | passou |
| 12 | Contador depois do clique | diminui | de 4 para 3 | passou |
| 13 | Console do navegador | sem erros | nenhum erro | passou |
