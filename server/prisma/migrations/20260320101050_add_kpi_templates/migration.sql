-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KpiSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lockedAt" DATETIME,
    "title" TEXT NOT NULL,
    "employeeId" TEXT,
    "reviewerId" TEXT,
    "totalScore" REAL,
    "status" TEXT DEFAULT 'DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "targetDepartmentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiSheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KpiSheet_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KpiSheet" ("createdAt", "employeeId", "id", "isLocked", "lockedAt", "month", "organizationId", "reviewerId", "status", "title", "totalScore", "year") SELECT "createdAt", "employeeId", "id", "isLocked", "lockedAt", "month", "organizationId", "reviewerId", "status", "title", "totalScore", "year" FROM "KpiSheet";
DROP TABLE "KpiSheet";
ALTER TABLE "new_KpiSheet" RENAME TO "KpiSheet";
CREATE INDEX "KpiSheet_organizationId_employeeId_idx" ON "KpiSheet"("organizationId", "employeeId");
CREATE INDEX "KpiSheet_organizationId_reviewerId_idx" ON "KpiSheet"("organizationId", "reviewerId");
CREATE INDEX "KpiSheet_organizationId_targetDepartmentId_idx" ON "KpiSheet"("organizationId", "targetDepartmentId");
CREATE INDEX "KpiSheet_organizationId_month_year_idx" ON "KpiSheet"("organizationId", "month", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
