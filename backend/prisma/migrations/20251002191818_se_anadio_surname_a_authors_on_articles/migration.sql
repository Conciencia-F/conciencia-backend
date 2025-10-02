/*
  Warnings:

  - Added the required column `surname` to the `AuthorsOnArticles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AuthorsOnArticles" ADD COLUMN     "surname" TEXT NOT NULL;
