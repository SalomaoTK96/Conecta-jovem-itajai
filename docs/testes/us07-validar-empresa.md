# Roteiro de teste - US07 (RF11) Validar empresa

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US07 (RF11) - Validar empresa |
| Requisito | RF11 · Caso de uso UC08 |
| Regras de negócio envolvidas | RN01 (só empresa validada publica vaga), RN10 (só admin valida, decisão registrada) |
| Requisito não funcional envolvido | RNF08 (documentos da empresa só para o admin) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 24/10/2026 |
| Versão testada | branch `us07-validar-empresa`, commit `47cac18` |
| Técnica usada | caixa-preta, pela API e pela tela, com PostgreSQL |

## Pré-condições

- Banco criado com as migrações aplicadas e a API no ar
- Dois administradores criados com `npm run criar-admin`: `salomao.admin@teste.com` e `leandro.admin@teste.com`
- Um jovem (`leandro@teste.com`) e duas empresas (`thiago@teste.com` e `outra@teste.com`), cada empresa com os dois documentos enviados pela tela da US06

## Preparação: conta de administrador

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | `npm run criar-admin` com e-mail e senha no `.env` | cria a conta com perfil ADMIN e senha em hash | conta criada, `senhaHash` começa com `$2b$10$` | passou |
| 2 | Rodar o comando de novo | não duplica nem troca a senha | "O administrador já existe. Nada foi alterado." | passou |
| 3 | `ADMIN_SENHA` com 3 caracteres | recusa antes de tocar no banco | "Preencha ADMIN_SENHA no .env com pelo menos 8 caracteres." | passou |

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 4 | Admin pede `GET /admin/validacoes` | lista só os pendentes, o mais antigo primeiro | 200, as duas empresas na ordem de envio | passou |
| 5 | Jovem e empresa pedem a fila | recusa (RN10) | 403 "Esta área não é do seu perfil." nos dois | passou |
| 6 | Admin abre um pedido | dados da empresa e lista de documentos | 200, razão social, CNPJ, responsável, e-mail, telefone e os 2 documentos | passou |
| 7 | Pedido com id `abc` e id 99 | não encontrado | 404 nos dois | passou |
| 8 | Admin abre um documento do pedido | o arquivo, para ver no navegador | 200, `application/pdf`, conteúdo começa com `%PDF` | passou |
| 9 | Documento de outro pedido pelo endereço do pedido 1 | não abre | 404 "Documento não encontrado." | passou |
| 10 | Rejeitar sem motivo | recusa e pede o motivo | 400 "Explique o motivo para a empresa, com pelo menos 10 caracteres." | passou |
| 11 | Decisão que não existe (`APAGAR`) | recusa | 400 "Escolha aprovar, rejeitar ou pedir documentos." | passou |
| 12 | Pedir documentos com motivo | pedido sai da fila, empresa continua em análise, notificação criada, admin registrado | `DOCUMENTOS_PENDENTES`, empresa `EM_ANALISE`, `analisadoPor` = salomao.admin, notificação com o motivo | passou |
| 13 | Empresa reenvia só o cartão CNPJ (US06) | volta para a fila com 3 documentos | pedido `PENDENTE` com 3 documentos | passou |
| 14 | Aprovar | empresa validada e notificada (RN01) | solicitação `APROVADA`, empresa `VALIDADA`, `podePublicarVagas: true`, notificação "Sua empresa foi validada." | passou |
| 15 | Segundo admin tenta rejeitar o pedido já aprovado | aviso e decisão registrada | 409 "Esta solicitação já foi analisada por outro administrador." com quem decidiu | passou |
| 16 | Dois admins decidem o pedido 2 ao mesmo tempo (um rejeita, outro aprova) | só um vale | um recebeu 200 e o outro 409; uma única notificação para a empresa | passou |

## Resultado da execução, pela tela

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 17 | Admin entra | cabeçalho com "Validar empresas" | "Olá, Administrador", "Validar empresas" e "Sair" | passou |
| 18 | Abrir a fila e escolher um pedido | dados, documentos e botões de decisão | dados com CNPJ formatado, botões "Abrir" e os três botões de decisão | passou |
| 19 | Clicar em "Abrir" num documento | abre em outra aba | nova aba com o PDF | passou |
| 20 | Rejeitar sem motivo | mensagem pedindo o motivo | "Não foi possível registrar a decisão: Explique o motivo..." | passou |
| 21 | Pedir documentos com motivo | confirma, troca os botões pela decisão e tira da fila | "Decisão registrada. A empresa foi avisada." e quem decidiu, quando e o motivo | passou (depois da correção do defeito 1) |
| 22 | Outro admin aprova enquanto a tela está aberta, e este clica em Rejeitar | aviso e decisão do outro | "Outro administrador já analisou esta solicitação." e "Decidido por leandro.admin..." | passou |
| 23 | Fila sem pedidos | mensagem de fila vazia | "Nenhuma empresa esperando validação." | passou |
| 24 | Empresa abre a tela de validação depois do pedido de documentos | vê a mensagem do admin | "A equipe pediu documentos adicionais." com o motivo | passou |
| 25 | Jovem abre `admin-validacoes.html` | recusa | "Esta tela é só para administradores." | passou |
| 26 | Tela em 360 px e em 1280 px, tema claro e escuro | sem rolagem lateral, botões visíveis | sem rolagem lateral, todos os botões visíveis | passou (depois da correção do defeito 2) |

## Defeitos encontrados e corrigidos

1. **Botões de decisão continuavam na tela depois da decisão.** O `display: flex` do formulário vencia o atributo `hidden`. Corrigido com a regra `#form-decisao[hidden] { display: none; }`.
2. **No celular os botões "Abrir" e "Pedir documentos" sumiam.** Usavam a classe `login-button`, que o CSS esconde em telas pequenas para enxugar o cabeçalho. Passaram a usar `secondary-button`.

## Verificação de segurança

- [x] Só o perfil ADMIN acessa a fila, os pedidos, os documentos e a decisão (casos 5 e 25)
- [x] Documento só abre pelo pedido a que pertence (caso 9)
- [x] Nome do arquivo no disco passa por `path.basename`, sem como sair da pasta de documentos
- [x] Não existe tela de cadastro de admin; a conta só nasce pelo comando no servidor
- [x] Texto digitado pela empresa e pelo admin entra na tela por `textContent`, nunca como HTML

## Verificação de acessibilidade

- [x] O campo de motivo tem rótulo e dica ligada por `aria-describedby`
- [x] Botão "Abrir" diz qual documento abre (`aria-label`)
- [x] Rejeitar não depende só da cor: o texto do botão diz o que faz
- [x] Avisos em `role="alert"` e decisão registrada em `role="status"`
- [ ] Contraste das cores novas no verificador do WebAIM (não executado)

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 26 |
| Casos aprovados | 26 |
| Casos reprovados | 0 |
| Situação do item | aprovado com pendências |

Pendências e observações:

- Conferir o contraste das cores novas no WebAIM junto com o TS04
- No celular, os links do cabeçalho (inclusive "Sair") ficam escondidos para todos os perfis, porque usam a classe `login-button`. Não é deste item; fica registrado para o TS04
- A tabela guarda só a última decisão de cada pedido. Se a empresa reenviar e o admin decidir de novo, a decisão anterior fica apenas na notificação enviada
