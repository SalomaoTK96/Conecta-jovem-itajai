# Roteiro de teste - TS01 (RNF03) Hash de senhas com BCrypt

## Identificação

| Campo | Valor |
|---|---|
| Item do backlog | TS01 (RNF03) - Hash de senhas com BCrypt |
| Requisito não funcional | RNF03 (Segurança) |
| Responsável pelo teste | Salomão Panas |
| Data da execução | 20/10/2026 |
| Versão testada | branch `ts01-hash-de-senhas` |

## Pré-condições

- Dependências instaladas (`npm install` na pasta `backend`)
- Não depende de banco nem de servidor no ar

## Como executar

Na pasta `backend`:

```
node -e "const s=require('./src/seguranca/senha');(async()=>{const h=await s.gerarHash('SenhaForte123');console.log('hash:',h);console.log('senha certa:',await s.conferirSenha('SenhaForte123',h));console.log('senha errada:',await s.conferirSenha('senhaerrada',h));const h2=await s.gerarHash('SenhaForte123');console.log('hashes diferentes:',h!==h2);})()"
```

## Caso 1 - Fluxo principal: a senha vira hash e confere

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Gerar o hash da senha `SenhaForte123` | Devolve um texto bem diferente da senha |
| 2 | Conferir `SenhaForte123` contra esse hash | Devolve verdadeiro |

**Resultado obtido: passou.** O hash gerado foi
`$2b$10$tnVzxxdQLJ1vGLzmBwvbZOMp1KAM5x.DZVqHBn3j/2Hbz8PKQK71q`
e a conferência devolveu `true`. Em nenhum momento a senha original aparece
dentro do hash.

## Caso 2 - Exceção: senha errada é recusada

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Conferir `senhaerrada` contra o hash do Caso 1 | Devolve falso |

**Resultado obtido: passou.** Devolveu `false`.

## Caso 3 - A mesma senha nunca gera o mesmo hash

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Gerar o hash de `SenhaForte123` duas vezes seguidas | Os dois hashes são diferentes entre si |
| 2 | Conferir a senha contra os dois | Os dois devolvem verdadeiro |

**Resultado obtido: passou.** Os dois hashes saíram diferentes e os dois
conferiram a senha corretamente.

Por que isso importa: o bcrypt sorteia um salt diferente a cada vez e guarda
ele dentro do próprio hash. Sem isso, dois usuários com a mesma senha teriam o
mesmo hash no banco, e quem roubasse a tabela descobriria os dois de uma vez.

## Caso 4 - Fator de custo

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Olhar o começo do hash gerado | Aparece `$2b$10$` |

**Resultado obtido: passou.** O hash começa com `$2b$10$`, onde `2b` é a versão
do bcrypt e `10` é o fator de custo que o RNF03 pede.

## Verificação de segurança

- [x] A senha em texto puro não aparece em nenhum lugar do retorno
- [x] Não existe função que desfaça o hash de volta para a senha
- [x] Nenhum segredo está escrito no código

## Conclusão

| Campo | Valor |
|---|---|
| Casos executados | 4 |
| Casos aprovados | 4 |
| Casos reprovados | 0 |
| Situação do item | aprovado |

Pendências e observações:

- O módulo está pronto, mas só passa a ser usado de verdade quando a US01
  (cadastro) e a US03 (login) chamarem as duas funções.
