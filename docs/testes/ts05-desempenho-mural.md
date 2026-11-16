# Roteiro de teste - TS05 (RNF02) Desempenho do mural de vagas

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | TS05 (RNF02) - Desempenho do mural de vagas |
| Requisito | RNF02 (desempenho) · aplica-se à US09 |
| Meta | com 1.000 vagas e 100 usuarios simultâneos, 95% das consultas em até 2 segundos |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 16/11/2026 |
| Versão testada | branch `ts05-desempenho-mural` |
| Ferramenta | `backend/test/carga/mural.js` (script próprio em Node, sem biblioteca) |
| Resultados brutos | `docs/testes/carga/ts05-resultados.json` e gráficos em `docs/testes/carga/ts05-graficos.png` |

## Ambiente

- API (Node 22 + Express + Prisma) e PostgreSQL 16 na mesma máquina de testes, com 2 vCPU
- O gerador de carga roda na mesma máquina, então disputa CPU com a API. Os números são um piso: num servidor separado tendem a ser melhores.
- Banco com 1.023 vagas abertas: as 1.000 do `npm run massa:vagas` (10 empresas fictícias validadas, 9 áreas, 6 cidades) mais as vagas dos roteiros anteriores

## Cenário

Cada usuario virtual pede uma tela atrás da outra, sem pausa, durante 30 segundos (20 s nos cenários de 1.200 e 1.600). O pedido é sorteado entre: primeira página, filtro por área, por cidade, área + cidade, palavra-chave, páginas 3, 10 e 25, e o detalhe de uma vaga.

## Paginação e índice

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | `GET /vagas` com 1.023 vagas | só 20 vagas e o total de páginas | 20 vagas, `totalDePaginas` 52 | passou |
| 2 | `GET /vagas?pagina=52` | última página | 3 vagas, página 52 de 52 | passou |
| 3 | Índice em vaga(area, cidade, status) | existe | `Vaga_area_cidade_status_idx` (criado na US08) | passou |
| 4 | `EXPLAIN ANALYZE` do mural filtrado por área | usa o índice | `Bitmap Index Scan on "Vaga_area_cidade_status_idx"`, 0,26 ms | passou |
| 5 | `EXPLAIN ANALYZE` do mural sem filtro | consulta rápida | leitura sequencial de 1.024 linhas em 0,42 ms. Com tão poucas linhas o PostgreSQL prefere ler a tabela toda, e isso é o esperado | passou |

## Resultado da carga

| Usuarios | Pedidos | Erros | Vazão (pedidos/s) | Média (ms) | p95 (ms) | p99 (ms) | Máximo (ms) | Meta p95 ≤ 2 s |
|---|---|---|---|---|---|---|---|---|
| 50 | 14.590 | 0 | 486 | 103 | 144 | 167 | 234 | sim |
| **100** | **16.071** | **0** | **534** | **187** | **228** | **251** | **361** | **sim** |
| 200 | 15.483 | 0 | 513 | 389 | 459 | 483 | 582 | sim |
| 400 | 15.805 | 0 | 520 | 765 | 880 | 985 | 1.606 | sim |
| 800 | 16.707 | 0 | 541 | 1.463 | 1.771 | 1.875 | 2.619 | sim |
| 1.200 | 11.100 | 0 | 526 | 2.229 | 2.680 | 2.934 | 3.132 | não |
| 1.600 | 11.742 | 0 | 548 | 2.845 | 3.206 | 3.674 | 4.056 | não |

**Meta do RNF02 atingida:** com 100 usuarios o p95 ficou em 228 ms, quase 9 vezes abaixo dos 2 segundos.

## Análise

- **Ponto de saturação:** a vazão para de crescer por volta de 500 pedidos por segundo, já a partir de 50 usuarios. Daí para frente, mais usuarios só aumentam a fila e o tempo de resposta cresce quase em linha reta com o número de usuarios.
- **Ponto de degradação da meta:** o p95 passa de 2 segundos entre 800 e 1.200 usuarios simultâneos.
- **Erros:** nenhum erro nem tempo esgotado em nenhum cenário, nem com 1.600 usuarios. O sistema fica mais lento, mas não cai.
- **Gargalo:** não é o banco. As consultas levam menos de 1 ms (casos 4 e 5). Durante a carga, a CPU da máquina ficou dividida entre a API, os processos do PostgreSQL e o próprio gerador de carga, com as 2 vCPU ocupadas. O limite é o processamento da máquina, e cada pedido do mural faz duas consultas (contagem + página).
- **Como melhorar, se um dia for preciso:** rodar a API em mais de um processo (cluster ou mais instâncias), guardar por alguns segundos a contagem do mural sem filtro e separar o gerador de carga da máquina da API na medição.

## Como repetir

```bash
cd backend
npm run massa:vagas
npm start            # em outro terminal
node test/carga/mural.js --usuarios 50,100,200 --segundos 30 --saida resultados.json
```
