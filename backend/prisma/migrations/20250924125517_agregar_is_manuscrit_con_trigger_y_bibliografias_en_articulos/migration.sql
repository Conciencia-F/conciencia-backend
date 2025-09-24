/*
  Warnings:

  - Added the required column `category` to the `Theme` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ThemeCategory" AS ENUM ('INVESTIGACION_CIENTIFICA_TECNOLOGICA', 'INNOVACION_DESARROLLO', 'EDUCACION_CIENTIFICA_TECNOLOGICA', 'CIENCIA_SOCIEDAD', 'POLITICAS_PUBLICAS_CTI', 'PRODUCCION_DESARROLLO_LOCAL', 'JUVENTUD_INVESTIGADORA', 'BITACORAS_ESTUDIANTES', 'MUJERES_DIVERSIDADES_CIENCIA', 'PERSPECTIVA_FORMOSENIA', 'RECENSIONES_RESEÑA', 'DESARROLLO_SOFTWARE', 'TELECOMUNICACIONES', 'MECATRONICA', 'QUIMICA_INDUSTRIAL');

-- AlterTable
ALTER TABLE "public"."Article" ADD COLUMN     "isManuscrit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Theme" ADD COLUMN     "category" "public"."ThemeCategory" NOT NULL;

-- CreateTable
CREATE TABLE "public"."Bibliography" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "Bibliography_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Bibliography" ADD CONSTRAINT "Bibliography_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
