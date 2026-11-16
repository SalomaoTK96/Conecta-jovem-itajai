# Roteiro de teste - US09 (RF06) Buscar vagas

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US09 (RF06) - Buscar vagas |
| Requisito | RF06 · Caso de uso UC04 |
| Regras de negócio envolvidas | RN01 (só empresa validada aparece), RN06 (vaga encerrada ou vencida não aparece) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 16/11/2026 |
| Versão testada | branch `us09-buscar-vagas` |
| Técnica usada | caixa-preta pela API e pela tela; partição de equivalência nos filtros e valor-limite na paginação |
| Testes automatizados | `backend/test/unit/mural.test.js` (12 testes, `npm test`) |

## Pré-condições

- Banco com as migrações aplicadas
- Empresa `validada@teste.com` com status `VALIDADA` e 23 vagas abertas (Itajaí, Balneário Camboriú e Navegantes) e 1 vaga encerrada
- Empresa `pendente@teste.com` com status `EM_ANALISE` e 1 vaga aberta

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | `GET /vagas` sem login e sem filtro | só vagas abertas de empresa validada | 23 vagas; a encerrada e a da empresa em análise não vêm | passou |
| 2 | `?cidade=itajaí` (minúsculo) | só vagas de Itajaí | 2 vagas, as duas de Itajaí | passou |
| 3 | `?area=Tecnologia&q=computador` (filtros combinados) | respeita os dois | 1 vaga, "Estágio em suporte de TI" (palavra está na descrição) | passou |
| 4 | `?q=xyz` | lista vazia | total 0, lista vazia | passou |
| 5 | `?pagina=99` com 23 vagas | volta para a última página | página 2 de 2 | passou |
| 6 | `?area=Marketing` (fora da lista) | filtro ignorado, sem erro | 23 vagas | passou |
| 7 | `GET /vagas/<id da vaga encerrada>` | não mostra | 404 "Vaga não encontrada ou já encerrada." | passou |
| 8 | `GET /vagas/abc` | não quebra | 404 "Vaga não encontrada." | passou |
| 9 | `GET /vagas/<id aberta>` | detalhes com empresa, descrição e requisitos | 200 com título, empresa, tipo, área, cidade, prazo e descrição | passou |

## Resultado da execução, pela tela (`vagas.html` e `vaga.html`)

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 10 | Clicar em "Vagas" no menu | abre o mural | mural com filtros e "23 vagas encontradas." | passou |
| 11 | Cada card | título, empresa, tipo, área, cidade e prazo | "Estágio em suporte de TI · Loja Validada Ltda · Estágio · Tecnologia · Itajaí · Candidaturas até 26/11/2026" | passou |
| 12 | Buscar "xyz" | mensagem clara e botão de limpar | "Nenhuma vaga encontrada com esses filtros." e "Limpar filtros" | passou |
| 13 | Clicar em "Limpar filtros" | volta a mostrar todas | 20 cards na página 1 | passou |
| 14 | Clicar em "Próxima" | página 2 | "Página 2 de 2", 3 cards, `?pagina=2` no endereço | passou |
| 15 | Clicar no título do card | abre os detalhes com "Candidatar-se" | detalhes da vaga e botão "Candidatar-se" | passou |
| 16 | Tela de 390 px (celular) | filtros um embaixo do outro, sem rolagem lateral | filtros em coluna, sem rolagem lateral | passou |
| 17 | Console do navegador durante 10 a 16 | sem erros | nenhum erro | passou |

## Observações

- O botão "Candidatar-se" só passa a funcionar na US10.
- A paginação de 20 por página já está pronta; o teste de carga com 1.000 vagas fica no TS05.
