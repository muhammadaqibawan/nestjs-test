/*
  Warnings:

  - A unique constraint covering the columns `[signerToken]` on the table `Signer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Signer_email_key";

-- AlterTable
ALTER TABLE "Signer" ADD COLUMN     "signerToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Signer_signerToken_key" ON "Signer"("signerToken");
