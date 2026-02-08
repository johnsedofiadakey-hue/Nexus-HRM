-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "isMaintenanceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "securityLockdown" BOOLEAN NOT NULL DEFAULT false;
