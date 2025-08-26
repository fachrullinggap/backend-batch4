/*
  Warnings:

  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `pictureUrl` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "description",
DROP COLUMN "pictureUrl",
ADD COLUMN     "detail" TEXT,
ADD COLUMN     "image" TEXT;
