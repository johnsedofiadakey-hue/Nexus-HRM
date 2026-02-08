-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'GHS', 'GNF');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'GHS',
ADD COLUMN     "nationalIdDocUrl" TEXT,
ADD COLUMN     "salary" DECIMAL(10,2);
