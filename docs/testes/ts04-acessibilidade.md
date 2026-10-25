# Relatório de verificação - TS04 (RNF06) Acessibilidade WCAG 2.1 AA

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | TS04 (RNF06) - Acessibilidade WCAG AA |
| Requisito não funcional | RNF06 (Acessibilidade) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 25/10/2026 |
| Versão testada | branch `ts04-acessibilidade` |
| Ferramenta automatizada | axe-core 4, regras `wcag2a`, `wcag2aa`, `wcag21a` e `wcag21aa`, rodando no Chromium |
| Técnica usada | verificação automatizada em todas as telas, nos dois temas e em duas larguras; navegação só com teclado |

## Telas verificadas

As telas obrigatórias do RNF06 que já existem (cadastro e montagem de currículo) e todas as outras:
`index`, `login`, `cadastro`, `cadastro-jovem`, `cadastro-empresa`, `perfil`, `curriculo`,
`validacao-empresa`, `minhas-vagas` e `admin-validacoes`.

Mural de vagas e candidatura ainda não existem (US09 e US10, Sprint 3) e entram na verificação quando forem feitas.

## Resultado antes das correções

| Problema | Onde | Medido | Exigido |
|---|---|---|---|
| Nome do link do logo diferente do texto visível | todas as telas | `aria-label` "Conecta Jovem - Início" com texto "Conecta Jovem" | nome acessível contém o texto visível (WCAG 2.5.3) |
| Texto claro com transparência sobre o azul | `index`, convite do fim da página | 3,44:1 e 3,89:1 | 4,5:1 |
| Botão "Sair" no tema escuro | todas as telas com usuário logado | 1,09:1 (texto claro sobre o cinza padrão do botão) | 4,5:1 |
| Mensagem de erro dentro do cartão do formulário | `curriculo` e outras telas com aviso | 4,37:1 (cinza sobre rosado) | 4,5:1 |
| Links do menu sobre o fundo azulado | `minhas-vagas` e outras telas com rolagem | 4,27:1 | 4,5:1 |
| Links do cabeçalho escondidos no celular | todas as telas abaixo de 480 px | "Sair", "Meu perfil" e os outros sumiam | todo o sistema utilizável em qualquer largura (RNF07) |

## Correções

| Commit | O que mudou |
|---|---|
| `TS04: faz o leitor de tela anunciar o logo...` | saiu o `aria-label` do logo nas 10 telas; o nome do link passa a ser o texto visível |
| `TS04: garante contraste no convite...` | sem transparência no texto sobre o azul: 5,2:1 |
| `TS04: deixa o botão Sair legível...` | botão com fundo transparente e borda, como os links |
| `TS04: mostra os links do cabeçalho também no celular` | links menores que quebram linha em vez de sumir |
| `TS04: corrige o contraste das mensagens...` | cor do aviso de erro e de sucesso com prioridade sobre a regra do cartão |
| `TS04: escurece o cinza dos textos secundários...` | variável `--muted` do tema claro de `#64748b` para `#475569`: mais de 6:1 em todos os fundos claros |

## Resultado depois das correções

### Verificação automatizada

| Situação | Telas | Tema claro | Tema escuro |
|---|---|---|---|
| Tela carregada, 1280 px | 10 | 0 violações | 0 violações |
| Tela carregada, 360 px | 10 | 0 violações | 0 violações |
| Com mensagem de erro na tela (login, perfil, minhas vagas, currículo) | 4 | 0 violações | 0 violações |
| Currículo com itens, prévia aberta e erro | 1 | 0 violações | 0 violações |
| Fila do admin com um pedido aberto | 1 | 0 violações | 0 violações |

### Teclado

| # | Caso | Esperado | Obtido | Situação |
|---|---|---|---|---|
| 1 | Da página inicial, chegar em "Criar conta" com Tab e abrir com Enter | abre o cadastro | abriu `cadastro.html` | passou |
| 2 | Escolher "jovem" com Tab e Enter | abre o cadastro de jovem | abriu `cadastro-jovem.html` | passou |
| 3 | Preencher tudo só com teclado e enviar com Enter | conta criada | "Conta criada. Redirecionando para a tela de entrada..." | passou |
| 4 | Data de quem tem menos de 16 anos e marcar o consentimento com espaço | aparecem os campos do responsável e o consentimento marca | campos visíveis, caixa marcada | passou |
| 5 | Tab até o fim da página e Shift+Tab de volta | foco anda nos dois sentidos, sem prender | andou nos dois sentidos | passou |
| 6 | Foco visível no logo e no campo de data | contorno de 3 px | `outline: 3px solid` nos dois | passou |
| 7 | Remover um item do currículo pelo teclado | foco vai para o botão de adicionar, não se perde | foco em "Adicionar escolaridade" | passou (US05) |

### Outros critérios do cartão

| Critério | Situação |
|---|---|
| Todo campo tem rótulo associado | atendido: o axe não apontou campo sem rótulo em nenhuma tela |
| Imagem informativa com texto alternativo | atendido: as telas não usam `img`; o "CJ" do logo é decorativo e está com `aria-hidden` |
| Mensagens de erro lidas por leitor de tela e dizendo qual campo | atendido: os avisos usam `role="alert"` e cada mensagem diz o campo ("Escolaridade 2: informe...") |
| Contraste de 4,5:1 | atendido nos dois temas, medido pelo axe |

## Conclusão

| Campo | Valor |
|---|---|
| Problemas encontrados | 6 |
| Problemas corrigidos | 6 |
| Violações WCAG 2.1 AA no fim | 0 |
| Situação do item | aprovado com pendências |

Pendências e observações:

- Mural de vagas (US09) e candidatura (US10) precisam passar pela mesma verificação quando existirem
- O axe encontra cerca de metade dos problemas de acessibilidade. O teste com leitor de tela de verdade (NVDA) e o teste de usabilidade com jovens (TS06) continuam necessários
