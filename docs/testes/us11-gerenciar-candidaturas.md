# Roteiro de teste - US11 (RF13) Gerenciar candidaturas

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US11 (RF13) - Gerenciar candidaturas |
| Requisito | RF13 · Caso de uso UC10 |
| Regras de negócio envolvidas | RN04 (empresa só vê candidatos das próprias vagas), RN07 (só a dona da vaga muda o status), RN08 (histórico e notificação) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 16/11/2026 |
| Versão testada | branch `us11-gerenciar-candidaturas` |
| Técnica usada | caixa-preta pela API e pela tela; partição de equivalência no status |
| Testes automatizados | `backend/test/unit/status-candidatura.test.js` (10 testes, `npm test`) |

## Pré-condições

- Empresa `validada@teste.com` dona da vaga "Estágio em suporte de TI"
- Empresa `pendente@teste.com` (outra empresa, sem vagas com candidatos)
- Jovens `ana@teste.com` e `bruno@teste.com` candidatos dessa vaga, os dois "Em análise"

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Dona lista os candidatos da vaga | lista com currículo | 200 com os candidatos, contato e currículo | passou |
| 2 | Outra empresa lista os candidatos da vaga | bloqueia sem revelar e registra em log (RN04) | 404 "Vaga não encontrada." e log `[acesso negado] usuario 3 (empresa) tentou GET ...` | passou |
| 3 | Outra empresa abre a candidatura | bloqueia e registra em log | 404 e log | passou |
| 4 | Outra empresa tenta mudar o status | bloqueia e registra em log (RN07) | 404 e log; status não mudou | passou |
| 5 | Jovem tenta mudar o status | bloqueia | 403 "Esta área não é do seu perfil." | passou |
| 6 | Status `CONTRATADO` | recusa e mantém o anterior | 400 "Status inválido..."; continua Em análise | passou |
| 7 | Mesmo status que já está | recusa | 400 "A candidatura já está "Em análise"." | passou |
| 8 | Dona muda para `em_selecao` | muda, grava histórico e notifica (RN08) | 200; histórico Em análise → Em seleção com `alteradoPorId` da empresa; notificação "...mudou para: Em seleção." | passou |
| 9 | Filtro `status=EM_ANALISE` depois do caso 8 | só quem está em análise | 0 candidatos (Ana mudou) | passou |
| 10 | Filtro `status=EM_SELECAO` | só quem está em seleção | 1 candidata (Ana) | passou |
| 11 | O que a empresa recebe do candidato | sem endereço e sem data de nascimento (RNF08) | só nome, e-mail, telefone, habilidades e currículo | passou |

## Resultado da execução, pela tela (`minhas-vagas.html` → `candidatos.html`)

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 12 | Card da vaga em Minhas vagas | link para os candidatos | "Ver candidatos (2)" | passou |
| 13 | Abrir os candidatos | lista com status | "2 candidato(s).", selos "Em seleção" e "Em análise" | passou |
| 14 | Clicar em "Ver currículo" | mostra contato, objetivo, escolaridade e experiência | tudo aparece; sem endereço | passou |
| 15 | Mudar Bruno para Recusada pela lista | confirma e avisa que notificou | "Bruno Teste: status mudou para Recusada. O jovem foi notificado." | passou |
| 16 | Filtro "Recusada" | só Bruno | "1 candidato(s) com status "Recusada"." | passou |
| 17 | Filtro "Aprovada" | mensagem de lista vazia | "Nenhum candidato com status "Aprovada" nesta vaga." | passou |
| 18 | Console do navegador | sem erros | nenhum erro | passou |
