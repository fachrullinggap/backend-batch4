/*
  Warnings:

  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "stock",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "pictureUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "profilePictureUrl" TEXT;
