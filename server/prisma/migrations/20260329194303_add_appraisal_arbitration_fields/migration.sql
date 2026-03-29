-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppraisalPacket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL DEFAULT 'SELF_REVIEW',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "supervisorId" TEXT,
    "matrixSupervisorId" TEXT,
    "managerId" TEXT,
    "hrReviewerId" TEXT,
    "finalReviewerId" TEXT,
    "gapDetected" BOOLEAN NOT NULL DEFAULT false,
    "isDisputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedAt" DATETIME,
    "resolvedById" TEXT,
    "finalScore" REAL,
    "finalVerdict" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppraisalPacket_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalPacket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalPacket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AppraisalPacket" ("createdAt", "currentStage", "cycleId", "employeeId", "finalReviewerId", "hrReviewerId", "id", "managerId", "matrixSupervisorId", "organizationId", "status", "supervisorId", "updatedAt") SELECT "createdAt", "currentStage", "cycleId", "employeeId", "finalReviewerId", "hrReviewerId", "id", "managerId", "matrixSupervisorId", "organizationId", "status", "supervisorId", "updatedAt" FROM "AppraisalPacket";
DROP TABLE "AppraisalPacket";
ALTER TABLE "new_AppraisalPacket" RENAME TO "AppraisalPacket";
CREATE INDEX "AppraisalPacket_organizationId_employeeId_idx" ON "AppraisalPacket"("organizationId", "employeeId");
CREATE INDEX "AppraisalPacket_organizationId_currentStage_idx" ON "AppraisalPacket"("organizationId", "currentStage");
CREATE UNIQUE INDEX "AppraisalPacket_cycleId_employeeId_key" ON "AppraisalPacket"("cycleId", "employeeId");
CREATE TABLE "new_LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "leaveDays" REAL NOT NULL DEFAULT 0,
    "leaveType" TEXT NOT NULL DEFAULT 'Annual',
    "reason" TEXT NOT NULL,
    "relieverId" TEXT,
    "relieverStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "relieverRespondedAt" DATETIME,
    "relieverComment" TEXT,
    "handoverNotes" TEXT,
    "handoverAcknowledged" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_LeaveRequest" ("createdAt", "employeeId", "endDate", "hrComment", "hrReviewerId", "id", "leaveDays", "leaveType", "managerComment", "managerId", "organizationId", "reason", "relieverComment", "relieverId", "relieverRespondedAt", "relieverStatus", "startDate", "status", "updatedAt") SELECT "createdAt", "employeeId", "endDate", "hrComment", "hrReviewerId", "id", "leaveDays", "leaveType", "managerComment", "managerId", "organizationId", "reason", "relieverComment", "relieverId", "relieverRespondedAt", "relieverStatus", "startDate", "status", "updatedAt" FROM "LeaveRequest";
DROP TABLE "LeaveRequest";
ALTER TABLE "new_LeaveRequest" RENAME TO "LeaveRequest";
CREATE INDEX "LeaveRequest_organizationId_employeeId_status_idx" ON "LeaveRequest"("organizationId", "employeeId", "status");
CREATE TABLE "new_Target" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "type" TEXT NOT NULL DEFAULT 'SINGLE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" DATETIME,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "progress" REAL NOT NULL DEFAULT 0,
    "contributionWeight" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_Target" ("assigneeId", "contributionWeight", "createdAt", "departmentId", "description", "dueDate", "id", "level", "lineManagerId", "organizationId", "originatorId", "parentTargetId", "reviewerId", "status", "title", "type", "updatedAt", "weight") SELECT "assigneeId", "contributionWeight", "createdAt", "departmentId", "description", "dueDate", "id", "level", "lineManagerId", "organizationId", "originatorId", "parentTargetId", "reviewerId", "status", "title", "type", "updatedAt", "weight" FROM "Target";
DROP TABLE "Target";
ALTER TABLE "new_Target" RENAME TO "Target";
CREATE INDEX "Target_organizationId_assigneeId_idx" ON "Target"("organizationId", "assigneeId");
CREATE INDEX "Target_organizationId_departmentId_idx" ON "Target"("organizationId", "departmentId");
CREATE INDEX "Target_organizationId_status_idx" ON "Target"("organizationId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
