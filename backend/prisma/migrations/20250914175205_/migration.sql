/*
  Warnings:

  - The primary key for the `AuthorsOnArticles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `AuthorsOnArticles` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Article` table without a default value. This is not possible if the table is not empty.
  - Added the required column `affiliation` to the `AuthorsOnArticles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `AuthorsOnArticles` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `AuthorsOnArticles` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `name` to the `AuthorsOnArticles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."AuthorsOnArticles" DROP CONSTRAINT "AuthorsOnArticles_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Article" ADD COLUMN     "tags" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."AuthorsOnArticles" DROP CONSTRAINT "AuthorsOnArticles_pkey",
DROP COLUMN "userId",
ADD COLUMN     "affiliation" TEXT NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD CONSTRAINT "AuthorsOnArticles_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
