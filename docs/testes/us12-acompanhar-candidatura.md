# Roteiro de teste - US12 (RF08) Acompanhar candidatura

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US12 (RF08) - Acompanhar candidatura |
| Requisito | RF08 · Caso de uso UC06 |
| Regras de negócio envolvidas | RN08 (histórico de status com datas) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 16/11/2026 |
| Versão testada | branch `us12-acompanhar-candidatura` |
| Técnica usada | caixa-preta pela API e pela tela |
| Testes automatizados | `backend/test/unit/acompanhar.test.js` (4 testes, `npm test`) |

## Pré-condições

- Jovem `ana@teste.com` com 3 candidaturas; a de "Estágio em suporte de TI" já foi mudada pela empresa para Em seleção (US11)
- Jovem `bruno@teste.com` com outra candidatura
- Jovem `carla@teste.com` sem candidaturas

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Ana pede `GET /candidaturas` | as 3, atualização mais recente primeiro | 3 itens: Estágio em TI (Em seleção, 19:33), Jovem aprendiz (19:32), Atendente (19:30) | passou |
| 2 | Cada item | vaga, empresa, status e última atualização | título, "Loja Validada Ltda", `nomeDoStatus` e `atualizadaEm` | passou |
| 3 | Ana abre a candidatura 1 | histórico com datas (RN08) | 2 passos: vazio → Em análise; Em análise → Em seleção | passou |
| 4 | Bruno abre a candidatura da Ana | recusa | 404 "Candidatura não encontrada." | passou |
| 5 | Empresa pede `GET /candidaturas` | recusa | 403 | passou |
| 6 | Carla pede a lista | lista vazia | `{"candidaturas":[]}` | passou |

## Resultado da execução, pela tela (`minhas-candidaturas.html`)

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 7 | Jovem logado | link no cabeçalho | "Minhas candidaturas" no cabeçalho | passou |
| 8 | Ana abre a tela | 3 cards com status em destaque | selos "Em seleção", "Em análise", "Em análise" | passou |
| 9 | Ana clica em "Ver histórico" | linha do tempo com datas | "Candidatura enviada: Em análise · 16/11/2026, 19:30" e "Em análise → Em seleção · 16/11/2026, 19:33" | passou |
| 10 | Carla abre a tela | mensagem e atalho para o mural | "Você ainda não se candidatou a nenhuma vaga." e "Ver vagas abertas" | passou |
| 11 | Console do navegador | sem erros | nenhum erro | passou |
