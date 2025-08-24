/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Token` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `roleId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('ADMIN', 'DIRECTOR', 'AUTHOR', 'REVIEWER', 'STYLISTIC_EDITOR', 'DESIGNER');

-- CreateEnum
CREATE TYPE "public"."ArticleType" AS ENUM ('SCIENTIFIC_ARTICLE', 'STUDENT_LOG');

-- CreateEnum
CREATE TYPE "public"."ArticleStatus" AS ENUM ('PENDING_PRE_FILTERING', 'ACCEPTED_FOR_PRELIMINARY_REVIEW', 'ACCEPTED_FOR_FUTURE_JOURNAL', 'REJECTED_BY_PRE_FILTERING', 'PENDING_REVIEWER_ASSIGNMENT', 'IN_REVIEW', 'REVIEW_COMPLETED', 'PENDING_AUTHOR_CORRECTIONS', 'RESUBMITTED_PENDING_APPROVAL', 'READY_FOR_STYLISTIC_EDITION', 'IN_STYLISTIC_EDITION', 'STYLISTIC_EDITION_COMPLETED', 'READY_FOR_LAYOUT', 'IN_LAYOUT', 'LAYOUT_COMPLETED', 'READY_FOR_FINAL_APPROVAL', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ReviewRecommendation" AS ENUM ('FIT_FOR_STYLISTIC_EDITION', 'REQUIRES_CORRECTIONS');

-- CreateEnum
CREATE TYPE "public"."TaskType" AS ENUM ('STYLISTIC_EDITION', 'LAYOUT');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "public"."Token" DROP CONSTRAINT "Token_userId_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "roleId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Token";

-- DropEnum
DROP TYPE "public"."Role";

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" "public"."RoleName" NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "status" "public"."ArticleStatus" NOT NULL DEFAULT 'PENDING_PRE_FILTERING',
    "themeId" TEXT,
    "journalId" TEXT,
    "type" "public"."ArticleType" NOT NULL,
    "plagiarismScore" INTEGER,
    "aiContentPercentage" INTEGER,
    "plagiarismReportUrl" TEXT,
    "forFutureJournal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthorsOnArticles" (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "AuthorsOnArticles_pkey" PRIMARY KEY ("userId","articleId")
);

-- CreateTable
CREATE TABLE "public"."ArticleVersion" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "versionNotes" TEXT,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "articleId" TEXT NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ArticleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "recommendation" "public"."ReviewRecommendation" NOT NULL,
    "commentsForDirector" TEXT,
    "commentsForAuthor" TEXT,
    "reviewerId" TEXT NOT NULL,
    "articleVersionId" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductionTask" (
    "id" TEXT NOT NULL,
    "type" "public"."TaskType" NOT NULL,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "assigneeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "articleId" TEXT NOT NULL,

    CONSTRAINT "ProductionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Journal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publicationDate" TIMESTAMP(3) NOT NULL,
    "finalPdfUrl" TEXT,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "public"."Theme"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_hashedToken_key" ON "public"."RefreshToken"("hashedToken");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "public"."Journal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthorsOnArticles" ADD CONSTRAINT "AuthorsOnArticles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthorsOnArticles" ADD CONSTRAINT "AuthorsOnArticles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleVersion" ADD CONSTRAINT "ArticleVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_articleVersionId_fkey" FOREIGN KEY ("articleVersionId") REFERENCES "public"."ArticleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductionTask" ADD CONSTRAINT "ProductionTask_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductionTask" ADD CONSTRAINT "ProductionTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
