-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('JOVEM', 'EMPRESA', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusEmpresa" AS ENUM ('PENDENTE', 'EM_ANALISE', 'VALIDADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('PENDENTE', 'DOCUMENTOS_PENDENTES', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "TipoVaga" AS ENUM ('APRENDIZAGEM', 'ESTAGIO');

-- CreateEnum
CREATE TYPE "StatusVaga" AS ENUM ('ABERTA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "StatusCandidatura" AS ENUM ('EM_ANALISE', 'EM_SELECAO', 'APROVADA', 'RECUSADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jovem" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "nomeResponsavel" TEXT,
    "consentimentoEm" TIMESTAMP(3),

    CONSTRAINT "Jovem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfil" (
    "id" SERIAL NOT NULL,
    "jovemId" INTEGER NOT NULL,
    "telefone" TEXT,
    "endereco" TEXT,
    "habilidades" TEXT,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curriculo" (
    "id" SERIAL NOT NULL,
    "jovemId" INTEGER NOT NULL,
    "objetivo" TEXT,

    CONSTRAINT "Curriculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escolaridade" (
    "id" SERIAL NOT NULL,
    "curriculoId" INTEGER NOT NULL,
    "instituicao" TEXT NOT NULL,
    "curso" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "anoInicio" INTEGER NOT NULL,
    "anoFim" INTEGER,

    CONSTRAINT "Escolaridade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiencia" (
    "id" SERIAL NOT NULL,
    "curriculoId" INTEGER NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "descricao" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),

    CONSTRAINT "Experiencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "status" "StatusEmpresa" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoValidacao" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'PENDENTE',
    "motivo" TEXT,
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analisadaEm" TIMESTAMP(3),
    "analisadoPorId" INTEGER,

    CONSTRAINT "SolicitacaoValidacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "solicitacaoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaga" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoVaga" NOT NULL,
    "area" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "requisitos" TEXT,
    "status" "StatusVaga" NOT NULL DEFAULT 'ABERTA',
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidatura" (
    "id" SERIAL NOT NULL,
    "jovemId" INTEGER NOT NULL,
    "vagaId" INTEGER NOT NULL,
    "status" "StatusCandidatura" NOT NULL DEFAULT 'EM_ANALISE',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoCandidatura" (
    "id" SERIAL NOT NULL,
    "candidaturaId" INTEGER NOT NULL,
    "statusAnterior" "StatusCandidatura",
    "statusNovo" "StatusCandidatura" NOT NULL,
    "alteradoPorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoCandidatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" SERIAL NOT NULL,
    "destinatarioId" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "candidaturaId" INTEGER,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Jovem_usuarioId_key" ON "Jovem"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_jovemId_key" ON "Perfil"("jovemId");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculo_jovemId_key" ON "Curriculo"("jovemId");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_usuarioId_key" ON "Empresa"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE INDEX "Vaga_area_cidade_status_idx" ON "Vaga"("area", "cidade", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Candidatura_jovemId_vagaId_key" ON "Candidatura"("jovemId", "vagaId");

-- AddForeignKey
ALTER TABLE "Jovem" ADD CONSTRAINT "Jovem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perfil" ADD CONSTRAINT "Perfil_jovemId_fkey" FOREIGN KEY ("jovemId") REFERENCES "Jovem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curriculo" ADD CONSTRAINT "Curriculo_jovemId_fkey" FOREIGN KEY ("jovemId") REFERENCES "Jovem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escolaridade" ADD CONSTRAINT "Escolaridade_curriculoId_fkey" FOREIGN KEY ("curriculoId") REFERENCES "Curriculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiencia" ADD CONSTRAINT "Experiencia_curriculoId_fkey" FOREIGN KEY ("curriculoId") REFERENCES "Curriculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoValidacao" ADD CONSTRAINT "SolicitacaoValidacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoValidacao" ADD CONSTRAINT "SolicitacaoValidacao_analisadoPorId_fkey" FOREIGN KEY ("analisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoValidacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaga" ADD CONSTRAINT "Vaga_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_jovemId_fkey" FOREIGN KEY ("jovemId") REFERENCES "Jovem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoCandidatura" ADD CONSTRAINT "HistoricoCandidatura_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "Candidatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoCandidatura" ADD CONSTRAINT "HistoricoCandidatura_alteradoPorId_fkey" FOREIGN KEY ("alteradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "Candidatura"("id") ON DELETE SET NULL ON UPDATE CASCADE;
