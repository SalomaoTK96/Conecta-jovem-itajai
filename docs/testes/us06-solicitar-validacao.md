# Roteiro de teste - US06 (RF10) Solicitar validação de empresa

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | US06 (RF10) - Solicitar validação de empresa |
| Requisito | RF10 · Caso de uso UC07 |
| Regras de negócio envolvidas | RN01 (só empresa validada publica vaga) |
| Responsável pelo teste | Thiago Martins |
| Data da execução | 23/10/2026 |
| Versão testada | branch `us06-solicitar-validacao` |
| Técnica usada | caixa-preta, pela API e pela tela |

## Pré-condições

- API no ar com `JWT_SECRET` preenchido
- Cinco empresas, uma em cada situação: Alfa (pendente, nunca enviou), Beta
  (em análise), Gama (administrador pediu documentos adicionais), Delta
  (validada) e Épsilon (rejeitada, com motivo). Uma conta de jovem.
- Arquivos de teste: `cartao.pdf` e `contrato.png` válidos, `virus.pdf`
  (programa do Windows renomeado para .pdf) e `grande.pdf` (6 MB)

**Atenção:** esta execução usou um banco falso em memória no lugar do
PostgreSQL, porque a máquina do teste estava com Node 18 e o Prisma 7 exige
Node 20 ou superior. Rotas, regras, token, gravação dos arquivos em disco e
tela rodaram de verdade. Ver Pendências.

## Regras definidas neste item

O cartão não dizia quais documentos e quais limites. Ficou assim, para a
equipe confirmar na revisão:

- Documentos: **Cartão CNPJ** e **Contrato social ou requerimento de empresário**
- Formatos: PDF, JPG ou PNG, conferidos pelo **conteúdo** do arquivo, não pelo nome
- Tamanho: até 5 MB por arquivo
- Empresa rejeitada não reenvia pela tela; é orientada a falar com a equipe

## Resultado da execução, pela API

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Alfa consulta a validação | status pendente, lista do que é exigido, pode enviar | 200, `PENDENTE`, dois documentos, PDF/JPG/PNG até 5 MB | passou |
| 2 | Alfa envia só o Cartão CNPJ | recusa pedindo o outro | 400 "Anexe o Contrato social [...]" | passou |
| 3 | Alfa envia um programa renomeado para .pdf | recusa pelo formato | 400 "Cartão CNPJ: envie em PDF, JPG ou PNG." | passou |
| 4 | Alfa envia arquivo de 6 MB | recusa pelo tamanho | 400 "Cada arquivo pode ter até 5 MB." | passou |
| 5 | Alfa envia um campo de arquivo que não foi pedido | recusa | 400 "Envie só os documentos pedidos na tela." | passou |
| 6 | Nenhum dos envios recusados (2 a 5) grava arquivo | pasta vazia | 0 arquivos | passou |
| 7 | Alfa envia os dois documentos válidos | solicitação criada e empresa em análise | 201, empresa `EM_ANALISE`, solicitação `PENDENTE` com os dois documentos, 2 arquivos com nome sorteado na pasta | passou |
| 8 | Alfa tenta enviar de novo | recusa: já está em análise | 409 "A solicitação já está em análise. Aguarde a resposta." | passou |
| 9 | Gama (documentos pedidos) reenvia sem arquivo | recusa | 400 "Anexe pelo menos um documento para reenviar." | passou |
| 10 | Gama reenvia só o contrato | entra na **mesma** solicitação, volta para análise e a mensagem antiga some | 200, mesma solicitação com 3 documentos, `PENDENTE`, motivo apagado | passou (depois da correção 1) |
| 11 | Delta (validada) tenta enviar | recusa | 409 "A empresa já está validada." | passou |
| 12 | Épsilon (rejeitada) consulta | mostra a rejeição e o motivo, sem envio | 200, `REJEITADA`, motivo "CNPJ baixado na Receita Federal.", `pode: false` | passou |
| 13 | Jovem abre a validação | recusa | 403 "Esta área não é do seu perfil." | passou |
| 14 | Sem login | recusa | 401 "Faça login para continuar." | passou |
| 15 | Alguma resposta mostra o caminho do arquivo no servidor? | não | nenhuma ocorrência | passou |
| 16 | Banco falha no meio do envio | erro para a empresa e arquivos gravados apagados | 500 "Não foi possível enviar os documentos.", os 2 arquivos removidos da pasta | passou |

### RN01: empresa não validada tentando publicar vaga

A rota de publicar vaga é da US08 e ainda não existe. A regra ficou numa porta
reaproveitável, `exigirEmpresaValidada`, que a US08 só precisa encaixar na rota.
Para testar, a porta foi montada numa rota de teste no lugar da futura `POST /vagas`:

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 17 | Alfa (em análise) tenta publicar | bloqueada | 403 "Sua empresa ainda não foi validada. [...]" | passou |
| 18 | Épsilon (rejeitada) tenta publicar | bloqueada | 403, mesma mensagem | passou |
| 19 | Delta (validada) publica | passa | 201 | passou |

## Resultado da execução, pela tela

Os arquivos foram colocados nos campos por script, porque o navegador
automatizado não abre a janela de escolher arquivo. O envio em si foi o real,
pelo formulário.

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 20 | Cabeçalho de empresa logada | link "Validação" | "Olá, Alfa", "Validação" e "Sair" | passou |
| 21 | Alfa abre a tela | situação, regras de arquivo e os dois campos obrigatórios | "Nenhum documento enviado ainda.", formatos e tamanho, dois campos com "(obrigatório)" | passou |
| 22 | Enviar sem arquivo | aviso na tela, sem chamar a API | "Anexe o Cartão CNPJ." e "Anexe o Contrato social [...]" | passou |
| 23 | Arquivo .docx | aviso na tela | "Cartão CNPJ: envie em PDF, JPG ou PNG." | passou |
| 24 | Programa renomeado para .pdf | passa pela tela e a API recusa | "Não foi possível enviar os documentos: Cartão CNPJ: envie em PDF, JPG ou PNG." | passou |
| 25 | Envio válido | confirmação e situação "em análise" com os documentos | "Documentos enviados. [...]", "Em análise." e os dois documentos com data; campos e botão somem | passou (depois da correção 2) |
| 26 | Gama abre a tela | pedido da equipe, mensagem e campos não obrigatórios | "A equipe pediu documentos adicionais.", a mensagem, botão "Reenviar documentos" | passou |
| 27 | Gama reenvia sem arquivo e depois só o contrato | aviso; depois volta para análise sem a mensagem antiga | "Anexe pelo menos um documento [...]"; depois "Em análise." com o contrato novo na lista | passou |
| 28 | Épsilon abre a tela | rejeição com o motivo, sem campos | "Solicitação rejeitada.", motivo e orientação, sem campos | passou |
| 29 | Abrir a tela sem login | vai para a tela de entrada | redirecionou para `login.html` | passou |

## Defeitos encontrados e corrigidos

1. **Mensagem antiga depois do reenvio** (caso 10). Depois de reenviar, a tela
   continuava mostrando "O contrato social está ilegível", como se ainda
   faltasse algo. Correção: o reenvio apaga o motivo junto com a volta para
   análise. Defeito pequeno, de regra, encontrado em teste de integração.
2. **Botão de enviar continuava na tela** (caso 25). O script escondia o botão
   com `hidden`, mas o CSS do botão define `display` e vencia. Correção:
   `.auth-form [hidden] { display: none; }`. Defeito pequeno, de interface.

## Verificação de segurança

- [x] O formato é conferido pelo conteúdo do arquivo, não pelo nome nem pelo tipo informado pelo navegador (casos 3 e 24)
- [x] O arquivo é gravado com nome sorteado; o nome enviado pela empresa nunca vira caminho no servidor
- [x] Arquivo recusado não chega ao disco (caso 6)
- [x] O caminho do arquivo no servidor não sai na resposta (caso 15)
- [x] A pasta `backend/uploads/` está no `.gitignore`: documento de empresa nunca vai para o repositório
- [x] Só a própria empresa vê e envia o pedido; não há id no endereço (casos 13 e 14)
- [x] A mensagem do administrador entra na tela como texto, nunca como HTML

## Verificação de acessibilidade

- [x] Todo campo de arquivo tem rótulo associado e dicas ligadas por `aria-describedby`
- [x] A situação do pedido tem `role="status"` e não depende só de cor
- [x] Erros no aviso com `role="alert"`, dizendo qual documento corrigir
- [ ] Enviar só com o teclado (não executado)
- [ ] Contraste das cores novas da situação no verificador do WebAIM (não executado)

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 29 |
| Casos aprovados | 29 |
| Casos reprovados | 0 |
| Defeitos encontrados | 2 (pequenos, corrigidos) |
| Situação do item | aprovado com pendências |

Pendências e observações:

- **Repetir com o PostgreSQL ligado (Node 20 ou superior)** os casos 7, 10 e 16
  e conferir no Prisma Studio as tabelas `SolicitacaoValidacao`, `Documento` e o
  status da `Empresa`. No caso 16 o banco falso não desfaz a mudança de status
  quando a gravação falha; no PostgreSQL a transação do Prisma desfaz. É isso
  que precisa ser confirmado: depois da falha, a empresa tem que continuar `PENDENTE`.
- Na publicação (TS08), `backend/uploads/` precisa ficar num disco que não se
  apaga a cada versão, ou ser trocada por um armazenamento de arquivos
  (`PASTA_DOCUMENTOS` no `.env` já permite apontar para outro lugar)
- Confirmar com a equipe a lista de documentos e os limites da seção "Regras definidas neste item"
- Executar os dois itens de acessibilidade em aberto
- Pelo princípio de que quem implementa não testa, outro integrante deve reexecutar os casos
