/*
  Warnings:

  - You are about to drop the column `name` on the `Theme` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[category]` on the table `Theme` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Theme_name_key";

-- AlterTable
ALTER TABLE "public"."Theme" DROP COLUMN "name";

-- CreateIndex
CREATE UNIQUE INDEX "Theme_category_key" ON "public"."Theme"("category");
