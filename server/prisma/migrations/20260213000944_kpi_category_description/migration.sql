-- AlterTable
ALTER TABLE "KpiItem" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';
