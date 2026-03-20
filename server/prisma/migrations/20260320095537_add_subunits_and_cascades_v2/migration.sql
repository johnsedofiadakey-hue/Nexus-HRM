/*
  Warnings:

  - Added the required column `updatedAt` to the `Loan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "SubUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubUnit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubUnit_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "departmentId" INTEGER,
    "publishDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Announcement" ("content", "createdAt", "createdById", "departmentId", "expirationDate", "id", "organizationId", "priority", "publishDate", "targetAudience", "title", "updatedAt") SELECT "content", "createdAt", "createdById", "departmentId", "expirationDate", "id", "organizationId", "priority", "publishDate", "targetAudience", "title", "updatedAt" FROM "Announcement";
DROP TABLE "Announcement";
ALTER TABLE "new_Announcement" RENAME TO "Announcement";
CREATE INDEX "Announcement_organizationId_targetAudience_expirationDate_idx" ON "Announcement"("organizationId", "targetAudience", "expirationDate");
CREATE TABLE "new_Appraisal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "finalScore" REAL,
    "staffNotes" TEXT,
    "managerNotes" TEXT,
    "calibrationNotes" TEXT,
    "hrNotes" TEXT,
    "mdNotes" TEXT,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "calibratedAt" DATETIME,
    "hrReviewedAt" DATETIME,
    "verdictAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appraisal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appraisal_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appraisal_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Appraisal" ("calibratedAt", "calibrationNotes", "completedAt", "createdAt", "cycleId", "employeeId", "finalScore", "hrNotes", "hrReviewedAt", "id", "managerNotes", "mdNotes", "organizationId", "reviewedAt", "reviewerId", "staffNotes", "status", "submittedAt", "updatedAt", "verdictAt") SELECT "calibratedAt", "calibrationNotes", "completedAt", "createdAt", "cycleId", "employeeId", "finalScore", "hrNotes", "hrReviewedAt", "id", "managerNotes", "mdNotes", "organizationId", "reviewedAt", "reviewerId", "staffNotes", "status", "submittedAt", "updatedAt", "verdictAt" FROM "Appraisal";
DROP TABLE "Appraisal";
ALTER TABLE "new_Appraisal" RENAME TO "Appraisal";
CREATE INDEX "Appraisal_organizationId_idx" ON "Appraisal"("organizationId");
CREATE INDEX "Appraisal_organizationId_reviewerId_idx" ON "Appraisal"("organizationId", "reviewerId");
CREATE INDEX "Appraisal_organizationId_status_idx" ON "Appraisal"("organizationId", "status");
CREATE INDEX "Appraisal_cycleId_idx" ON "Appraisal"("cycleId");
CREATE UNIQUE INDEX "Appraisal_employeeId_cycleId_key" ON "Appraisal"("employeeId", "cycleId");
CREATE TABLE "new_AssetAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "returnedAt" DATETIME,
    "details" TEXT,
    "status" TEXT DEFAULT 'OPEN',
    "conditionOnAssign" TEXT,
    "conditionOnReturn" TEXT,
    "loggedById" TEXT,
    "userId" TEXT,
    "assetId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetAssignment_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AssetAssignment" ("assetId", "assignedAt", "conditionOnAssign", "conditionOnReturn", "details", "id", "loggedById", "organizationId", "returnedAt", "status", "userId") SELECT "assetId", "assignedAt", "conditionOnAssign", "conditionOnReturn", "details", "id", "loggedById", "organizationId", "returnedAt", "status", "userId" FROM "AssetAssignment";
DROP TABLE "AssetAssignment";
ALTER TABLE "new_AssetAssignment" RENAME TO "AssetAssignment";
CREATE INDEX "AssetAssignment_organizationId_userId_idx" ON "AssetAssignment"("organizationId", "userId");
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "userId" TEXT,
    "action" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "details", "entity", "entityId", "id", "ipAddress", "organizationId", "userId") SELECT "action", "createdAt", "details", "entity", "entityId", "id", "ipAddress", "organizationId", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE TABLE "new_EmployeeHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT,
    "createdById" TEXT,
    "title" TEXT,
    "description" TEXT,
    "change" TEXT,
    "type" TEXT,
    "severity" TEXT,
    "status" TEXT DEFAULT 'OPEN',
    "loggedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeHistory_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmployeeHistory" ("change", "createdAt", "createdById", "description", "employeeId", "id", "loggedById", "organizationId", "severity", "status", "title", "type") SELECT "change", "createdAt", "createdById", "description", "employeeId", "id", "loggedById", "organizationId", "severity", "status", "title", "type" FROM "EmployeeHistory";
DROP TABLE "EmployeeHistory";
ALTER TABLE "new_EmployeeHistory" RENAME TO "EmployeeHistory";
CREATE INDEX "EmployeeHistory_organizationId_employeeId_idx" ON "EmployeeHistory"("organizationId", "employeeId");
CREATE TABLE "new_EmployeeQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeQuery_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeQuery_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmployeeQuery" ("createdAt", "description", "employeeId", "id", "issuedById", "organizationId", "resolution", "status", "subject", "updatedAt") SELECT "createdAt", "description", "employeeId", "id", "issuedById", "organizationId", "resolution", "status", "subject", "updatedAt" FROM "EmployeeQuery";
DROP TABLE "EmployeeQuery";
ALTER TABLE "new_EmployeeQuery" RENAME TO "EmployeeQuery";
CREATE INDEX "EmployeeQuery_organizationId_employeeId_idx" ON "EmployeeQuery"("organizationId", "employeeId");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiSheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KpiSheet_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KpiSheet" ("createdAt", "employeeId", "id", "isLocked", "lockedAt", "month", "organizationId", "reviewerId", "status", "title", "totalScore", "year") SELECT "createdAt", "employeeId", "id", "isLocked", "lockedAt", "month", "organizationId", "reviewerId", "status", "title", "totalScore", "year" FROM "KpiSheet";
DROP TABLE "KpiSheet";
ALTER TABLE "new_KpiSheet" RENAME TO "KpiSheet";
CREATE INDEX "KpiSheet_organizationId_employeeId_idx" ON "KpiSheet"("organizationId", "employeeId");
CREATE INDEX "KpiSheet_organizationId_reviewerId_idx" ON "KpiSheet"("organizationId", "reviewerId");
CREATE INDEX "KpiSheet_organizationId_month_year_idx" ON "KpiSheet"("organizationId", "month", "year");
CREATE TABLE "new_LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "leaveDays" REAL NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "relieverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_RELIEVER',
    "managerComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_relieverId_fkey" FOREIGN KEY ("relieverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LeaveRequest" ("createdAt", "employeeId", "endDate", "id", "leaveDays", "managerComment", "organizationId", "reason", "relieverId", "startDate", "status") SELECT "createdAt", "employeeId", "endDate", "id", "leaveDays", "managerComment", "organizationId", "reason", "relieverId", "startDate", "status" FROM "LeaveRequest";
DROP TABLE "LeaveRequest";
ALTER TABLE "new_LeaveRequest" RENAME TO "LeaveRequest";
CREATE INDEX "LeaveRequest_organizationId_employeeId_status_idx" ON "LeaveRequest"("organizationId", "employeeId", "status");
CREATE TABLE "new_Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ADVANCE',
    "principalAmount" REAL NOT NULL,
    "interestRate" REAL NOT NULL DEFAULT 0,
    "totalRepayment" REAL NOT NULL,
    "installmentAmount" REAL NOT NULL,
    "monthsDuration" INTEGER NOT NULL,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Loan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("approvedAt", "approvedById", "employeeId", "id", "installmentAmount", "interestRate", "monthsDuration", "organizationId", "principalAmount", "purpose", "requestedAt", "status", "totalRepayment", "type") SELECT "approvedAt", "approvedById", "employeeId", "id", "installmentAmount", "interestRate", "monthsDuration", "organizationId", "principalAmount", "purpose", "requestedAt", "status", "totalRepayment", "type" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
CREATE INDEX "Loan_organizationId_employeeId_idx" ON "Loan"("organizationId", "employeeId");
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("createdAt", "id", "isRead", "link", "message", "organizationId", "title", "type", "userId") SELECT "createdAt", "id", "isRead", "link", "message", "organizationId", "title", "type", "userId" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_organizationId_userId_isRead_idx" ON "Notification"("organizationId", "userId", "isRead");
CREATE TABLE "new_OnboardingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OnboardingSession" ("completedAt", "createdAt", "employeeId", "id", "organizationId", "progress", "startDate", "templateId") SELECT "completedAt", "createdAt", "employeeId", "id", "organizationId", "progress", "startDate", "templateId" FROM "OnboardingSession";
DROP TABLE "OnboardingSession";
ALTER TABLE "new_OnboardingSession" RENAME TO "OnboardingSession";
CREATE INDEX "OnboardingSession_organizationId_employeeId_idx" ON "OnboardingSession"("organizationId", "employeeId");
CREATE TABLE "new_PayrollItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "baseSalary" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "overtime" REAL NOT NULL DEFAULT 0,
    "bonus" REAL NOT NULL DEFAULT 0,
    "allowances" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "ssnit" REAL NOT NULL DEFAULT 0,
    "otherDeductions" REAL NOT NULL DEFAULT 0,
    "grossPay" REAL NOT NULL,
    "netPay" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PayrollItem" ("allowances", "baseSalary", "bonus", "createdAt", "currency", "employeeId", "grossPay", "id", "netPay", "notes", "organizationId", "otherDeductions", "overtime", "runId", "ssnit", "tax") SELECT "allowances", "baseSalary", "bonus", "createdAt", "currency", "employeeId", "grossPay", "id", "netPay", "notes", "organizationId", "otherDeductions", "overtime", "runId", "ssnit", "tax" FROM "PayrollItem";
DROP TABLE "PayrollItem";
ALTER TABLE "new_PayrollItem" RENAME TO "PayrollItem";
CREATE INDEX "PayrollItem_organizationId_idx" ON "PayrollItem"("organizationId");
CREATE UNIQUE INDEX "PayrollItem_runId_employeeId_key" ON "PayrollItem"("runId", "employeeId");
CREATE TABLE "new_Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "clientId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priceGHS" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "orgName" TEXT,
    "contactEmail" TEXT,
    "paystackRef" TEXT,
    "paystackSubCode" TEXT,
    "trialEndsAt" DATETIME,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("cancelledAt", "clientId", "contactEmail", "createdAt", "currentPeriodEnd", "currentPeriodStart", "id", "orgName", "organizationId", "paystackRef", "paystackSubCode", "plan", "priceGHS", "status", "trialEndsAt", "updatedAt") SELECT "cancelledAt", "clientId", "contactEmail", "createdAt", "currentPeriodEnd", "currentPeriodStart", "id", "orgName", "organizationId", "paystackRef", "paystackSubCode", "plan", "priceGHS", "status", "trialEndsAt", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");
CREATE TABLE "new_TrainingEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "programId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "score" REAL,
    "certificate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    CONSTRAINT "TrainingEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrainingEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TrainingEnrollment" ("certificate", "completedAt", "employeeId", "enrolledAt", "id", "organizationId", "programId", "score", "status") SELECT "certificate", "completedAt", "employeeId", "enrolledAt", "id", "organizationId", "programId", "score", "status" FROM "TrainingEnrollment";
DROP TABLE "TrainingEnrollment";
ALTER TABLE "new_TrainingEnrollment" RENAME TO "TrainingEnrollment";
CREATE INDEX "TrainingEnrollment_organizationId_employeeId_idx" ON "TrainingEnrollment"("organizationId", "employeeId");
CREATE UNIQUE INDEX "TrainingEnrollment_programId_employeeId_key" ON "TrainingEnrollment"("programId", "employeeId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "employeeCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "position" TEXT,
    "departmentId" INTEGER,
    "subUnitId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "joinDate" DATETIME,
    "employmentType" TEXT,
    "dob" DATETIME,
    "gender" TEXT,
    "nationalId" TEXT,
    "contactNumber" TEXT,
    "address" TEXT,
    "profilePhoto" TEXT,
    "nextOfKinName" TEXT,
    "nextOfKinRelation" TEXT,
    "nextOfKinContact" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salary" REAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankBranch" TEXT,
    "ssnitNumber" TEXT,
    "bankAccountEnc" TEXT,
    "ghanaCardEnc" TEXT,
    "ssnitEnc" TEXT,
    "salaryEnc" TEXT,
    "nationalIdDocUrl" TEXT,
    "leaveBalance" REAL NOT NULL DEFAULT 0,
    "leaveAllowance" REAL NOT NULL DEFAULT 24,
    "leaveAccruedAt" DATETIME,
    "supervisorId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedDate" DATETIME,
    "organizationId" TEXT DEFAULT 'default-tenant',
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_subUnitId_fkey" FOREIGN KEY ("subUnitId") REFERENCES "SubUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("address", "archivedDate", "avatarUrl", "bankAccountEnc", "bankAccountNumber", "bankBranch", "bankName", "contactNumber", "createdAt", "currency", "departmentId", "dob", "email", "employeeCode", "employmentType", "fullName", "gender", "ghanaCardEnc", "id", "isArchived", "jobTitle", "joinDate", "leaveAccruedAt", "leaveAllowance", "leaveBalance", "nationalId", "nationalIdDocUrl", "nextOfKinContact", "nextOfKinName", "nextOfKinRelation", "organizationId", "passwordHash", "position", "profilePhoto", "role", "salary", "salaryEnc", "ssnitEnc", "ssnitNumber", "status", "supervisorId", "updatedAt") SELECT "address", "archivedDate", "avatarUrl", "bankAccountEnc", "bankAccountNumber", "bankBranch", "bankName", "contactNumber", "createdAt", "currency", "departmentId", "dob", "email", "employeeCode", "employmentType", "fullName", "gender", "ghanaCardEnc", "id", "isArchived", "jobTitle", "joinDate", "leaveAccruedAt", "leaveAllowance", "leaveBalance", "nationalId", "nationalIdDocUrl", "nextOfKinContact", "nextOfKinName", "nextOfKinRelation", "organizationId", "passwordHash", "position", "profilePhoto", "role", "salary", "salaryEnc", "ssnitEnc", "ssnitNumber", "status", "supervisorId", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX "User_departmentId_isArchived_status_idx" ON "User"("departmentId", "isArchived", "status");
CREATE INDEX "User_supervisorId_idx" ON "User"("supervisorId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE UNIQUE INDEX "User_employeeCode_organizationId_key" ON "User"("employeeCode", "organizationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SubUnit_organizationId_idx" ON "SubUnit"("organizationId");

-- CreateIndex
CREATE INDEX "SubUnit_departmentId_idx" ON "SubUnit"("departmentId");

-- CreateIndex
CREATE INDEX "SubUnit_managerId_idx" ON "SubUnit"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "SubUnit_name_departmentId_key" ON "SubUnit"("name", "departmentId");
