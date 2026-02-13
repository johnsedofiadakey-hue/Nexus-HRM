-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'PERIPHERAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HistoryType" ADD VALUE 'GENERAL_NOTE';
ALTER TYPE "HistoryType" ADD VALUE 'COMMENDATION';
ALTER TYPE "HistoryType" ADD VALUE 'DISCIPLINARY';

-- AlterEnum
ALTER TYPE "Severity" ADD VALUE 'CRITICAL';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isCompanyProperty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "make" TEXT;

-- AlterTable
ALTER TABLE "EmployeeHistory" ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT;
