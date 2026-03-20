/*
  Warnings:

  - You are about to drop the `Appraisal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppraisalApproval` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppraisalRating` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApprovalFlow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApprovalStep` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Competency` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Appraisal_employeeId_cycleId_key";

-- DropIndex
DROP INDEX "Appraisal_cycleId_idx";

-- DropIndex
DROP INDEX "Appraisal_organizationId_status_idx";

-- DropIndex
DROP INDEX "Appraisal_organizationId_reviewerId_idx";

-- DropIndex
DROP INDEX "Appraisal_organizationId_idx";

-- DropIndex
DROP INDEX "AppraisalApproval_approverId_idx";

-- DropIndex
DROP INDEX "AppraisalApproval_organizationId_appraisalId_idx";

-- DropIndex
DROP INDEX "AppraisalRating_appraisalId_competencyId_key";

-- DropIndex
DROP INDEX "AppraisalRating_organizationId_idx";

-- DropIndex
DROP INDEX "ApprovalFlow_organizationId_isActive_idx";

-- DropIndex
DROP INDEX "ApprovalStep_flowId_stepOrder_key";

-- DropIndex
DROP INDEX "ApprovalStep_organizationId_flowId_idx";

-- DropIndex
DROP INDEX "Competency_name_idx";

-- DropIndex
DROP INDEX "Competency_organizationId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Appraisal";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AppraisalApproval";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AppraisalRating";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ApprovalFlow";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ApprovalStep";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Competency";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "type" TEXT NOT NULL DEFAULT 'SINGLE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" DATETIME,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "parentTargetId" TEXT,
    "departmentId" INTEGER,
    "assigneeId" TEXT,
    "originatorId" TEXT NOT NULL,
    "lineManagerId" TEXT,
    "reviewerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Target_parentTargetId_fkey" FOREIGN KEY ("parentTargetId") REFERENCES "Target" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Target_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Target_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Target_originatorId_fkey" FOREIGN KEY ("originatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Target_lineManagerId_fkey" FOREIGN KEY ("lineManagerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Target_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TargetMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL DEFAULT 'NUMERICAL',
    "targetValue" REAL,
    "currentValue" REAL NOT NULL DEFAULT 0,
    "unit" TEXT,
    "currency" TEXT DEFAULT 'GHS',
    "weight" REAL NOT NULL DEFAULT 1.0,
    "qualitativePrompt" TEXT,
    CONSTRAINT "TargetMetric_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TargetAcknowledgement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACKNOWLEDGED',
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TargetAcknowledgement_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TargetAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TargetUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "targetId" TEXT NOT NULL,
    "metricId" TEXT,
    "submittedById" TEXT NOT NULL,
    "value" REAL,
    "comment" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TargetUpdate_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TargetUpdate_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "TargetMetric" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TargetUpdate_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppraisalCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppraisalPacket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL DEFAULT 'SELF_REVIEW',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "supervisorId" TEXT,
    "managerId" TEXT,
    "hrReviewerId" TEXT,
    "finalReviewerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppraisalPacket_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalPacket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppraisalReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "packetId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME,
    "overallRating" REAL,
    "summary" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "achievements" TEXT,
    "developmentNeeds" TEXT,
    "responses" TEXT DEFAULT '{}',
    CONSTRAINT "AppraisalReview_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "AppraisalPacket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "leaveDays" REAL NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "relieverId" TEXT,
    "relieverStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "relieverRespondedAt" DATETIME,
    "relieverComment" TEXT,
    "managerId" TEXT,
    "managerComment" TEXT,
    "hrReviewerId" TEXT,
    "hrComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_relieverId_fkey" FOREIGN KEY ("relieverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_hrReviewerId_fkey" FOREIGN KEY ("hrReviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LeaveRequest" ("createdAt", "employeeId", "endDate", "id", "leaveDays", "managerComment", "organizationId", "reason", "relieverId", "startDate", "status") SELECT "createdAt", "employeeId", "endDate", "id", "leaveDays", "managerComment", "organizationId", "reason", "relieverId", "startDate", "status" FROM "LeaveRequest";
DROP TABLE "LeaveRequest";
ALTER TABLE "new_LeaveRequest" RENAME TO "LeaveRequest";
CREATE INDEX "LeaveRequest_organizationId_employeeId_status_idx" ON "LeaveRequest"("organizationId", "employeeId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Target_organizationId_assigneeId_idx" ON "Target"("organizationId", "assigneeId");

-- CreateIndex
CREATE INDEX "Target_organizationId_departmentId_idx" ON "Target"("organizationId", "departmentId");

-- CreateIndex
CREATE INDEX "Target_organizationId_status_idx" ON "Target"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TargetMetric_organizationId_targetId_idx" ON "TargetMetric"("organizationId", "targetId");

-- CreateIndex
CREATE INDEX "TargetAcknowledgement_organizationId_targetId_idx" ON "TargetAcknowledgement"("organizationId", "targetId");

-- CreateIndex
CREATE INDEX "TargetUpdate_organizationId_targetId_idx" ON "TargetUpdate"("organizationId", "targetId");

-- CreateIndex
CREATE INDEX "AppraisalCycle_organizationId_status_idx" ON "AppraisalCycle"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AppraisalPacket_organizationId_employeeId_idx" ON "AppraisalPacket"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "AppraisalPacket_organizationId_currentStage_idx" ON "AppraisalPacket"("organizationId", "currentStage");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalPacket_cycleId_employeeId_key" ON "AppraisalPacket"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "AppraisalReview_organizationId_packetId_idx" ON "AppraisalReview"("organizationId", "packetId");

-- CreateIndex
CREATE INDEX "AppraisalReview_reviewerId_idx" ON "AppraisalReview"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalReview_packetId_reviewStage_key" ON "AppraisalReview"("packetId", "reviewStage");
