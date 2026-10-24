# Roteiro de teste - US08 (RF12) Manter vagas

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US08 (RF12) - Manter vagas |
| Requisito | RF12 · Caso de uso UC09 |
| Regras de negócio envolvidas | RN01 (só empresa validada publica vaga), RN06 (vaga vencida é encerrada) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 24/10/2026 |
| Versão testada | branch `us08-manter-vagas`, commit `0fb79ad` |
| Técnica usada | caixa-preta pela API e pela tela; partição de equivalência e valor-limite no prazo |

## Pré-condições

- Banco com as migrações aplicadas, inclusive `20261024190000_vaga_pode_ser_removida`
- Empresas `thiago@teste.com` e `outra@teste.com` validadas pela US07; `padaria@teste.com` ainda em análise
- Jovem `leandro@teste.com` cadastrado

## Regras do prazo (funções puras, data de referência 24/10/2026 15h)

| # | Prazo informado | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | 24/10/2026 (hoje) | aceita, vale até 23h59 | aceita | passou |
| 2 | 23/10/2026 (ontem) | recusa | "O prazo não pode ser uma data que já passou." | passou |
| 3 | 31/02/2027 | recusa | "O prazo não é uma data válida." | passou |
| 4 | 24/10/2028 (mais de 365 dias) | recusa | "O prazo pode ser de no máximo 365 dias a partir de hoje." | passou |
| 5 | vazio | recusa | "Informe até quando a vaga fica aberta." | passou |

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 6 | Empresa validada cadastra vaga completa | 201, vaga aberta | 201, status `ABERTA`, prazo até o fim do dia 30/11 | passou |
| 7 | Empresa em análise tenta cadastrar | recusa (RN01) | 403 "Sua empresa ainda não foi validada..." | passou |
| 8 | Vaga com título curto, tipo `CLT`, área fora da lista, sem descrição e sem prazo | recusa campo a campo | 400 com um erro para cada um dos 6 campos | passou |
| 9 | Jovem pede `GET /empresas/vagas` | recusa | 403 "Esta área não é do seu perfil." | passou |
| 10 | Empresa lista as vagas | só as dela, sem as removidas | só as vagas da empresa logada | passou |
| 11 | Editar a própria vaga aberta | salva | 200, título e cidade novos no banco | passou |
| 12 | Outra empresa tenta editar a vaga | recusa sem revelar que existe | 404 "Vaga não encontrada." | passou |
| 13 | Outra empresa tenta encerrar a vaga | recusa | 404 "Vaga não encontrada." | passou |
| 14 | Encerrar a própria vaga | para de aceitar candidatos | 200, status `ENCERRADA` | passou |
| 15 | Editar vaga encerrada | recusa | 409 "Vaga encerrada não pode ser editada. Cadastre uma nova." | passou |
| 16 | Remover vaga que tem 1 candidatura | sai da lista, candidatura continua | 204; vaga com `removidaEm` preenchido e a candidatura ainda no banco | passou |
| 17 | Remover a mesma vaga de novo | não encontra | 404 | passou |
| 18 | Vaga com prazo vencido e status `ABERTA` ao subir o servidor | encerrada sozinha (RN06) | log "1 vaga(s) com prazo vencido encerrada(s)." e status `ENCERRADA` | passou |
| 19 | Vaga que venceu ontem, consultando a lista sem reiniciar | já vem encerrada (RN06) | status `ENCERRADA` na resposta | passou |

## Resultado da execução, pela tela

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 20 | Empresa entra | cabeçalho com "Minhas vagas" | "Minhas vagas", "Validação" e "Sair" | passou |
| 21 | Abrir a tela | formulário, 9 áreas vindas da API, prazo mínimo hoje | 9 áreas, `min` = 2026-10-24 | passou |
| 22 | Publicar com o formulário vazio | erros de cada campo | título, descrição e prazo apontados | passou |
| 23 | Publicar vaga completa | confirma e mostra o cartão | "Vaga publicada." e cartão com selo "Aberta" | passou |
| 24 | Clicar em Editar | formulário carrega a vaga | título, tipo e prazo preenchidos, "Editar vaga: ..." | passou |
| 25 | Trocar a cidade e salvar | salva e volta para nova vaga | "Alterações salvas.", cidade nova no cartão | passou |
| 26 | Encerrar | selo muda e some o Editar | "Encerrada", só o botão Remover | passou |
| 27 | Remover, primeiro clique | pede confirmação sem remover | botão vira "Confirmar remoção", nada removido | passou |
| 28 | Remover, segundo clique | remove | "A vaga ... foi removida.", um cartão a menos | passou |
| 29 | Empresa em análise abre a tela | aviso no lugar do formulário | aviso com link para a validação, formulário escondido | passou |
| 30 | Jovem abre a tela | recusa | "Esta área não é do seu perfil." | passou |
| 31 | Tela em 360 px e 1280 px | sem rolagem lateral | sem rolagem lateral | passou |

## Verificação de segurança

- [x] A empresa sai do token, nunca do endereço; vaga de outra empresa responde 404 (casos 12 e 13)
- [x] Cadastrar e editar exigem empresa validada no servidor, não só na tela (caso 7)
- [x] Título, descrição e requisitos entram na tela por `textContent`, nunca como HTML
- [x] Remover não apaga dados de candidatos (caso 16)

## Verificação de acessibilidade

- [x] Todo campo tem `label`; descrição e prazo têm dica ligada por `aria-describedby`
- [x] Botões Editar e Encerrar dizem de qual vaga são (`aria-label`)
- [x] Situação da vaga escrita no selo ("Aberta" ou "Encerrada"), não só pela cor
- [x] Remover sem `alert()`: a confirmação é o próprio botão
- [ ] Contraste das cores novas no verificador do WebAIM (não executado)

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 31 |
| Casos aprovados | 31 |
| Casos reprovados | 0 |
| Situação do item | aprovado com pendências |

Pendências e observações:

- O critério "aparece no mural" depende da US09 (busca de vagas), que ainda não existe. A consulta do mural deve filtrar `status = ABERTA` e `removidaEm` vazio, e chamar `encerrarVagasVencidas` antes, como a lista da empresa já faz
- A função `vagaAceitaCandidatura` já está pronta para a US10 conferir a RN06 antes de registrar a candidatura
- Conferir o contraste das cores novas junto com o TS04
