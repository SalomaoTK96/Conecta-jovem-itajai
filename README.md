# Conecta Jovem Itajaí

Plataforma web que reúne vagas de aprendizagem profissional e estágio de Itajaí e região
para jovens de 14 a 24 anos, cobrindo cadastro, currículo, busca de vagas, candidatura e
acompanhamento do status.

Projeto da disciplina **Engenharia de Software II** — Ciência da Computação, UNIVALI.
Professora Claudia Neli de Souza Zambon.

## Equipe

| Integrante | Função |
|---|---|
| Thiago Martins | Product Owner · Back-end |
| Salomão Panas | Scrum Master · Infraestrutura, dados e testes |
| Leandro Gabardo | Front-end · UX e acessibilidade |

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Apresentação | HTML, CSS e JavaScript |
| Aplicação | Node.js com Express (API REST) |
| Acesso a dados | Prisma 7.10.0 |
| Banco | PostgreSQL 17 |
| Segurança | bcrypt (senha) e JWT (sessão) |

## Como rodar o projeto

### O que precisa estar instalado

- **Node.js 20 ou superior** — [nodejs.org](https://nodejs.org)
- **PostgreSQL 17** — [postgresql.org](https://www.postgresql.org/download/windows/)
- **Git**

### Passo a passo

```bash
git clone https://github.com/SalomaoTK96/Conecta-jovem-itajai.git
cd Conecta-jovem-itajai
```

Crie o banco (pelo pgAdmin ou pelo terminal):

```bash
createdb -U postgres conecta_jovem
```

Configure as variáveis de ambiente:

```bash
cd backend
cp .env.example .env
```

Abra o `.env` e preencha com os seus dados:

```
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/conecta_jovem?schema=public"
JWT_SECRET="um texto longo e aleatório"
PORT=3000
```

Instale as dependências e crie as tabelas:

```bash
npm install
npx prisma migrate dev
```

Para conferir o banco pelo navegador:

```bash
npx prisma studio
```

## Estrutura de pastas

```
backend/     API em Node + Express, schema e migrações do Prisma
frontend/    telas em HTML, CSS e JavaScript
docs/        documentação do projeto
  diagramas/ diagramas exportados
  testes/    roteiros e resultados de teste
```

## Como trabalhamos

A branch `main` é protegida: ninguém commita direto nela. Toda alteração entra por pull
request aprovado por outro integrante.

### Fluxo de cada item do backlog

```bash
git checkout main
git pull
git checkout -b us01-cadastro-jovem
# desenvolve e vai commitando
git push origin us01-cadastro-jovem
```

Depois abra o pull request no GitHub, peça revisão e só então faça o merge.

### Convenções

- **Branch**: uma por item do backlog, com o identificador no nome
  (`us01-cadastro-jovem`, `ts02-https`)
- **Commit**: começa com o identificador do item e diz o que mudou
  (`US01: valida a idade no cadastro do jovem`)
- **Pull request**: o link é colado no cartão do Trello antes de movê-lo para "Testando"

### Quando um item está pronto

1. Integrado por pull request revisado e aprovado por outro integrante
2. Fluxo principal e pelo menos uma exceção executados com sucesso
3. Regras de negócio testadas, com roteiro registrado em `docs/testes/`
4. Sem erro crítico de acessibilidade nas telas alteradas
5. Demonstrado e aceito na revisão da sprint
6. Backlog e mapa de rastreabilidade atualizados

## Planejamento

| Sprint | Período | Entrega |
|---|---|---|
| 1 | 15/09 a 04/10 | Cadastro e autenticação de jovens e empresas |
| 2 | 06/10 a 25/10 | Perfil e currículo; validação de empresa e vagas |
| 3 | 27/10 a 15/11 | Busca, candidatura, status e seleção |
| 4 | 17/11 a 30/11 | Estabilização, testes, publicação e documentação |

O quadro com os 21 itens do backlog fica no Trello. Cada cartão traz os critérios de
aceitação, o que fazer em cada camada e os testes mínimos.

## O que não faz parte desta versão

Vagas informais, chat e videochamada, aplicativo móvel nativo, notificações por WhatsApp
ou e-mail, importação e exportação de currículo em PDF, integração com portais externos,
recomendação automática de vagas, relatórios gerenciais e contrato eletrônico.