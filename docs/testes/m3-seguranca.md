# Testes de segurança - M3 (OWASP Top 10)

| Campo | Valor |
|---|---|
| Responsável | Salomão Panas |
| Data | 16/11/2026 |
| Versão testada | branch `m3-testes-seguranca` |
| Ferramentas | `npm audit`, OWASP ZAP 2.16.1 (varredura rápida: spider + ataque ativo), testes automatizados com Supertest e Playwright |
| Testes automatizados | `backend/test/integracao/seguranca.test.js` (16 testes), `backend/test/e2e/seguranca-xss.spec.js` (1 fluxo), `backend/test/unit/tentativas.test.js` (5 testes) |

## 1. Dependências (`npm audit`)

| Momento | Críticas | Altas | Moderadas | Baixas |
|---|---|---|---|---|
| Antes (`seguranca/npm-audit-antes.json`) | 0 | 5 | 1 | 0 |
| Depois (`seguranca/npm-audit-depois.json`) | 0 | 0 | 0 | 0 |

- `body-parser` 2.3.0 (alta, usado pelo Express em toda requisição) e `fast-uri` (moderada): atualizados com `npm audit fix`.
- `prisma` 7.10.0 → 7.10.1, que tira as versões vulneráveis de `deepmerge-ts`, `@prisma/config` e `mysql2`. É uma versão de correção do mesmo Prisma 7. Os 112 testes unitários e os 32 de integração continuaram passando.

## 2. Casos de teste de segurança

| ID | OWASP | Ataque | Esperado | Obtido | Situação |
|---|---|---|---|---|---|
| SEC01 | A03 Injeção | `q=' OR '1'='1` e `q='; DROP TABLE "Vaga"; --` no mural | tratado como texto, 0 vagas, tabela intacta | 0 vagas; tabela inteira | passou |
| SEC01 | A03 Injeção | `q=%` e `q=_` no mural | 0 vagas | **antes: 1 vaga (todas)**. Corrigido no DEF-04, agora 0 | passou depois da correção |
| SEC01 | A03 Injeção | e-mail `' OR 1=1 --` no login | recusa | 401 | passou |
| SEC01 | A03 Injeção | `/vagas/1%20OR%201=1` | 404 | **antes: 200 com a vaga 1**. Corrigido no DEF-05, agora 404 | passou depois da correção |
| SEC02 | A07 Autenticação | token assinado com outro segredo | 401 | 401 | passou |
| SEC02 | A07 Autenticação | token com `alg: none` (sem assinatura) | 401 | 401 | passou |
| SEC02 | A07 Autenticação | token vencido | 401 | 401 | passou |
| SEC02 | A07 Autenticação | hash da senha na resposta do login | não aparece | não aparece | passou |
| SEC02 | A07 Autenticação | e-mail inexistente × senha errada | mesma resposta (não revela contas) | mesma resposta e mesmo código | passou |
| SEC03 | A01 Controle de acesso | cadastro com `"perfil": "ADMIN"` no corpo | conta criada como JOVEM | JOVEM | passou |
| SEC03 | A01 Controle de acesso | jovem chama rotas de admin e de empresa | 403 | 403 | passou |
| SEC03 | A01 Controle de acesso | empresa chama rotas de jovem | 403 | 403 | passou |
| SEC03 | A01 Controle de acesso | 6 rotas protegidas sem login | 401 | 401 | passou |
| SEC03 | A01 Controle de acesso | empresa acessa candidato de outra empresa (IDOR) | 404 e log | 404 e `[acesso negado]` no log (IT07) | passou |
| SEC04 | A01 / RNF08 | detalhe público da vaga | sem e-mail, CNPJ e ids internos | nada disso aparece | passou |
| SEC05 | A05 Configuração | cabeçalhos de segurança | CSP, nosniff, DENY, no-referrer; sem `X-Powered-By` | **antes: nenhum, e `X-Powered-By: Express`**. Corrigido no DEF-02 | passou depois da correção |
| SEC05 | A05 Configuração | CORS com origem de outro site | sem permissão | **antes: `Access-Control-Allow-Origin: *`**. Corrigido no DEF-08 | passou depois da correção |
| SEC06 | A07 Autenticação | 5 senhas erradas seguidas | bloqueio temporário | **antes: tentativas ilimitadas**. Corrigido no DEF-03, agora 429 por 15 min | passou depois da correção |
| SEC07 | A03 XSS | título de vaga `<img src=x onerror=...>` e encerrar a vaga | aparece como texto | **antes: o código rodou e leu o token da sessão** (`seguranca/SEC-XSS-antes.png`). Corrigido no DEF-01 (`seguranca/SEC-XSS-depois-aviso.png`) | passou depois da correção |
| SEC07 | A03 XSS | as 15 telas abertas com a política de conteúdo (CSP) ligada | nenhuma violação | 0 violações | passou |

## 3. OWASP ZAP

| Varredura | Alta | Média | Baixa | Informativo | Arquivo |
|---|---|---|---|---|---|
| 1ª (depois dos cabeçalhos, antes do CORS) | 0 | 1 | 0 | 2 | `seguranca/zap-1-primeira-varredura.html` |
| 2ª (depois de todas as correções) | 0 | 1 | 0 | 1 | `seguranca/zap-2-depois-das-correcoes.html` |

O que a 1ª varredura apontou e o que foi feito:

- **Cross-Domain Misconfiguration (média):** CORS liberado para qualquer site. Corrigido no DEF-08.
- **Sensitive Information in URL (informativo):** sem JavaScript, os formulários de login e cadastro iriam por GET e a senha apareceria no endereço. Corrigido no DEF-09 (`method="post"`).

O que sobrou na 2ª varredura, com justificativa:

- **Absence of Anti-CSRF Tokens (média): falso positivo neste sistema.** O ZAP procura um token CSRF nos formulários. Só que a sessão não usa cookie: a tela manda o token no cabeçalho `Authorization`, por JavaScript, e o navegador nunca envia esse cabeçalho sozinho para outro site. Sem cookie de sessão, o ataque de CSRF não tem o que aproveitar.
- **Suspicious Comments (informativo):** comentário `// O admin vai direto para a fila de validação` no `script.js`. Não revela nada que a própria tela não mostre, então foi mantido.

## 4. Limitações conhecidas (não corrigidas nesta entrega)

- O token JWT continua válido até vencer (8 h) mesmo depois de "Sair", porque o servidor não guarda sessões. O risco fica menor com o XSS fechado e a CSP ligada.
- A trava de força bruta fica na memória do servidor: reiniciar zera a contagem, e várias instâncias não compartilham o bloqueio.
- O token fica no `localStorage`. A CSP impede script de outro endereço, e todo texto vindo de usuario é mostrado com `textContent`.
