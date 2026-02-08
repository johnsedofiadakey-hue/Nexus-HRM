-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isCompanyProperty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT;
