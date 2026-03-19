/*
  Warnings:

  - You are about to alter the column `newSalary` on the `CompensationHistory` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `previousSalary` on the `CompensationHistory` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `amount` on the `ExpenseClaim` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `installmentAmount` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `interestRate` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `principalAmount` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `totalRepayment` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `amount` on the `LoanInstallment` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `subscriptionAmount` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `allowances` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `baseSalary` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `bonus` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `grossPay` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `netPay` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `otherDeductions` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `overtime` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `ssnit` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `tax` on the `PayrollItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `totalGross` on the `PayrollRun` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `totalNet` on the `PayrollRun` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `priceGHS` on the `Subscription` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `annualPriceGHS` on the `SystemSettings` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `monthlyPriceGHS` on the `SystemSettings` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `cost` on the `TrainingProgram` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `salary` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.

*/
-- DropIndex
DROP INDEX "DepartmentKPI_assignedById_assignedToId_idx";

-- DropIndex
DROP INDEX "EmployeeTarget_teamTargetId_assignedById_idx";

-- DropIndex
DROP INDEX "InterviewFeedback_interviewStageId_reviewerId_idx";

-- DropIndex
DROP INDEX "PerformanceReviewV2_managerId_directorId_status_idx";

-- DropIndex
DROP INDEX "TeamTarget_managerId_measurementPeriod_idx";

-- AlterTable
ALTER TABLE "EmployeeTarget" ADD COLUMN "managerId" TEXT;
ALTER TABLE "EmployeeTarget" ADD COLUMN "originKPIId" TEXT;

-- AlterTable
ALTER TABLE "TeamTarget" ADD COLUMN "originKPIId" TEXT;

-- CreateTable
CREATE TABLE "KpiUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "kpiItemId" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "comment" TEXT,
    "submittedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiUpdate_kpiItemId_fkey" FOREIGN KEY ("kpiItemId") REFERENCES "KpiItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "type" TEXT,
    "message" TEXT,
    "action" TEXT,
    "details" TEXT,
    "source" TEXT,
    "operatorId" TEXT,
    "operatorEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmployeeReporting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApprovalFlow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "flowId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "requiredRole" TEXT NOT NULL,
    "targetStatus" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ApprovalStep_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "ApprovalFlow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppraisalApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "appraisalId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "actionedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppraisalApproval_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalApproval_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ApprovalStep" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Appraisal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appraisal_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appraisal_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appraisal" ("createdAt", "cycleId", "employeeId", "finalScore", "id", "organizationId", "reviewerId", "status", "updatedAt") SELECT "createdAt", "cycleId", "employeeId", "finalScore", "id", "organizationId", "reviewerId", "status", "updatedAt" FROM "Appraisal";
DROP TABLE "Appraisal";
ALTER TABLE "new_Appraisal" RENAME TO "Appraisal";
CREATE INDEX "Appraisal_organizationId_idx" ON "Appraisal"("organizationId");
CREATE INDEX "Appraisal_organizationId_reviewerId_idx" ON "Appraisal"("organizationId", "reviewerId");
CREATE INDEX "Appraisal_organizationId_status_idx" ON "Appraisal"("organizationId", "status");
CREATE INDEX "Appraisal_cycleId_idx" ON "Appraisal"("cycleId");
CREATE UNIQUE INDEX "Appraisal_employeeId_cycleId_key" ON "Appraisal"("employeeId", "cycleId");
CREATE TABLE "new_CompensationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "previousSalary" REAL NOT NULL,
    "newSalary" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "reason" TEXT,
    "effectiveDate" DATETIME NOT NULL,
    "authorizedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompensationHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CompensationHistory" ("authorizedById", "createdAt", "currency", "effectiveDate", "employeeId", "id", "newSalary", "organizationId", "previousSalary", "reason", "type") SELECT "authorizedById", "createdAt", "currency", "effectiveDate", "employeeId", "id", "newSalary", "organizationId", "previousSalary", "reason", "type" FROM "CompensationHistory";
DROP TABLE "CompensationHistory";
ALTER TABLE "new_CompensationHistory" RENAME TO "CompensationHistory";
CREATE INDEX "CompensationHistory_organizationId_employeeId_idx" ON "CompensationHistory"("organizationId", "employeeId");
CREATE TABLE "new_ExpenseClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "category" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "paidInRunId" TEXT,
    CONSTRAINT "ExpenseClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpenseClaim_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExpenseClaim" ("amount", "approvedAt", "approvedById", "category", "currency", "description", "employeeId", "id", "organizationId", "paidInRunId", "receiptUrl", "status", "submittedAt", "title") SELECT "amount", "approvedAt", "approvedById", "category", "currency", "description", "employeeId", "id", "organizationId", "paidInRunId", "receiptUrl", "status", "submittedAt", "title" FROM "ExpenseClaim";
DROP TABLE "ExpenseClaim";
ALTER TABLE "new_ExpenseClaim" RENAME TO "ExpenseClaim";
CREATE INDEX "ExpenseClaim_organizationId_employeeId_status_idx" ON "ExpenseClaim"("organizationId", "employeeId", "status");
CREATE TABLE "new_KpiItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "metricType" TEXT NOT NULL DEFAULT 'NUMERIC',
    "targetValue" REAL NOT NULL,
    "actualValue" REAL NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "score" REAL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "lastEntryDate" DATETIME,
    "sheetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiItem_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "KpiSheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KpiItem" ("actualValue", "category", "createdAt", "description", "id", "lastEntryDate", "name", "organizationId", "score", "sheetId", "targetValue", "weight") SELECT "actualValue", "category", "createdAt", "description", "id", "lastEntryDate", "name", "organizationId", "score", "sheetId", "targetValue", "weight" FROM "KpiItem";
DROP TABLE "KpiItem";
ALTER TABLE "new_KpiItem" RENAME TO "KpiItem";
CREATE INDEX "KpiItem_organizationId_sheetId_idx" ON "KpiItem"("organizationId", "sheetId");
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
    CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Loan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("approvedAt", "approvedById", "employeeId", "id", "installmentAmount", "interestRate", "monthsDuration", "organizationId", "principalAmount", "purpose", "requestedAt", "status", "totalRepayment", "type") SELECT "approvedAt", "approvedById", "employeeId", "id", "installmentAmount", "interestRate", "monthsDuration", "organizationId", "principalAmount", "purpose", "requestedAt", "status", "totalRepayment", "type" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
CREATE INDEX "Loan_organizationId_employeeId_idx" ON "Loan"("organizationId", "employeeId");
CREATE TABLE "new_LoanInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "loanId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "deductedRunId" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    CONSTRAINT "LoanInstallment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LoanInstallment" ("amount", "deductedRunId", "id", "loanId", "month", "organizationId", "paidAt", "status", "year") SELECT "amount", "deductedRunId", "id", "loanId", "month", "organizationId", "paidAt", "status", "year" FROM "LoanInstallment";
DROP TABLE "LoanInstallment";
ALTER TABLE "new_LoanInstallment" RENAME TO "LoanInstallment";
CREATE INDEX "LoanInstallment_organizationId_loanId_idx" ON "LoanInstallment"("organizationId", "loanId");
CREATE TABLE "new_LoginSecurityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginSecurityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LoginSecurityEvent" ("createdAt", "email", "id", "ipAddress", "organizationId", "reason", "success", "userAgent") SELECT "createdAt", "email", "id", "ipAddress", "organizationId", "reason", "success", "userAgent" FROM "LoginSecurityEvent";
DROP TABLE "LoginSecurityEvent";
ALTER TABLE "new_LoginSecurityEvent" RENAME TO "LoginSecurityEvent";
CREATE INDEX "LoginSecurityEvent_organizationId_email_createdAt_idx" ON "LoginSecurityEvent"("organizationId", "email", "createdAt");
CREATE INDEX "LoginSecurityEvent_ipAddress_createdAt_idx" ON "LoginSecurityEvent"("ipAddress", "createdAt");
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionAmount" REAL NOT NULL DEFAULT 0,
    "billingStatus" TEXT NOT NULL DEFAULT 'FREE',
    "isEnterprise" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT NOT NULL DEFAULT '{}',
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "trialStartDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" DATETIME,
    "nextBillingDate" DATETIME,
    "customDomain" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#4F46E5',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1E293B',
    "accentColor" TEXT NOT NULL DEFAULT '#F59E0B',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "sidebarColor" TEXT NOT NULL DEFAULT '#080c16',
    "subtitle" TEXT NOT NULL DEFAULT 'HRM OS',
    "themePreset" TEXT NOT NULL DEFAULT 'nexus-dark',
    "lightMode" BOOLEAN NOT NULL DEFAULT false,
    "discountPercentage" REAL DEFAULT 0,
    "discountFixed" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Organization" ("accentColor", "address", "billingStatus", "city", "country", "createdAt", "currency", "email", "id", "isSuspended", "lightMode", "logoUrl", "name", "nextBillingDate", "phone", "primaryColor", "secondaryColor", "subscriptionAmount", "subscriptionPlan", "themePreset", "updatedAt") SELECT "accentColor", "address", "billingStatus", "city", "country", "createdAt", "currency", "email", "id", "isSuspended", "lightMode", "logoUrl", "name", "nextBillingDate", "phone", "primaryColor", "secondaryColor", "subscriptionAmount", "subscriptionPlan", "themePreset", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");
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
    CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PayrollItem" ("allowances", "baseSalary", "bonus", "createdAt", "currency", "employeeId", "grossPay", "id", "netPay", "notes", "organizationId", "otherDeductions", "overtime", "runId", "ssnit", "tax") SELECT "allowances", "baseSalary", "bonus", "createdAt", "currency", "employeeId", "grossPay", "id", "netPay", "notes", "organizationId", "otherDeductions", "overtime", "runId", "ssnit", "tax" FROM "PayrollItem";
DROP TABLE "PayrollItem";
ALTER TABLE "new_PayrollItem" RENAME TO "PayrollItem";
CREATE INDEX "PayrollItem_organizationId_idx" ON "PayrollItem"("organizationId");
CREATE UNIQUE INDEX "PayrollItem_runId_employeeId_key" ON "PayrollItem"("runId", "employeeId");
CREATE TABLE "new_PayrollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "period" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalGross" REAL NOT NULL DEFAULT 0,
    "totalNet" REAL NOT NULL DEFAULT 0,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PayrollRun" ("approvedAt", "approvedBy", "createdAt", "id", "month", "organizationId", "period", "status", "totalGross", "totalNet", "updatedAt", "year") SELECT "approvedAt", "approvedBy", "createdAt", "id", "month", "organizationId", "period", "status", "totalGross", "totalNet", "updatedAt", "year" FROM "PayrollRun";
DROP TABLE "PayrollRun";
ALTER TABLE "new_PayrollRun" RENAME TO "PayrollRun";
CREATE INDEX "PayrollRun_organizationId_year_month_status_idx" ON "PayrollRun"("organizationId", "year", "month", "status");
CREATE INDEX "PayrollRun_period_status_idx" ON "PayrollRun"("period", "status");
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
    CONSTRAINT "Subscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("cancelledAt", "clientId", "contactEmail", "createdAt", "currentPeriodEnd", "currentPeriodStart", "id", "orgName", "organizationId", "paystackRef", "paystackSubCode", "plan", "priceGHS", "status", "trialEndsAt", "updatedAt") SELECT "cancelledAt", "clientId", "contactEmail", "createdAt", "currentPeriodEnd", "currentPeriodStart", "id", "orgName", "organizationId", "paystackRef", "paystackSubCode", "plan", "priceGHS", "status", "trialEndsAt", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");
CREATE TABLE "new_SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "isMaintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceNotice" TEXT,
    "securityLockdown" BOOLEAN NOT NULL DEFAULT false,
    "securityLockdownMessage" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFrom" TEXT,
    "paystackPublicKey" TEXT,
    "paystackSecretKey" TEXT,
    "paystackPayLink" TEXT,
    "monthlyPriceGHS" REAL,
    "annualPriceGHS" REAL,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "loginNotice" TEXT,
    "loginSubtitle" TEXT,
    "loginBullets" TEXT,
    "backupFrequencyDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SystemSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SystemSettings" ("annualPriceGHS", "id", "isMaintenanceMode", "loginBullets", "loginNotice", "loginSubtitle", "monthlyPriceGHS", "organizationId", "paystackPublicKey", "paystackSecretKey", "securityLockdown", "smtpFrom", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "trialDays", "updatedAt") SELECT "annualPriceGHS", "id", "isMaintenanceMode", "loginBullets", "loginNotice", "loginSubtitle", "monthlyPriceGHS", "organizationId", "paystackPublicKey", "paystackSecretKey", "securityLockdown", "smtpFrom", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "trialDays", "updatedAt" FROM "SystemSettings";
DROP TABLE "SystemSettings";
ALTER TABLE "new_SystemSettings" RENAME TO "SystemSettings";
CREATE UNIQUE INDEX "SystemSettings_organizationId_key" ON "SystemSettings"("organizationId");
CREATE TABLE "new_TrainingProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "durationHours" INTEGER,
    "cost" REAL,
    "maxSeats" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_TrainingProgram" ("cost", "createdAt", "createdById", "description", "durationHours", "endDate", "id", "maxSeats", "organizationId", "provider", "startDate", "status", "title") SELECT "cost", "createdAt", "createdById", "description", "durationHours", "endDate", "id", "maxSeats", "organizationId", "provider", "startDate", "status", "title" FROM "TrainingProgram";
DROP TABLE "TrainingProgram";
ALTER TABLE "new_TrainingProgram" RENAME TO "TrainingProgram";
CREATE INDEX "TrainingProgram_organizationId_status_idx" ON "TrainingProgram"("organizationId", "status");
CREATE INDEX "TrainingProgram_organizationId_idx" ON "TrainingProgram"("organizationId");
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
CREATE INDEX "KpiUpdate_organizationId_kpiItemId_idx" ON "KpiUpdate"("organizationId", "kpiItemId");

-- CreateIndex
CREATE INDEX "KpiUpdate_createdAt_idx" ON "KpiUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "ApiUsage_organizationId_createdAt_idx" ON "ApiUsage"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiUsage_path_createdAt_idx" ON "ApiUsage"("path", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_organizationId_createdAt_idx" ON "SystemLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_type_createdAt_idx" ON "SystemLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeReporting_organizationId_employeeId_idx" ON "EmployeeReporting"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeReporting_organizationId_managerId_idx" ON "EmployeeReporting"("organizationId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeReporting_employeeId_managerId_type_key" ON "EmployeeReporting"("employeeId", "managerId", "type");

-- CreateIndex
CREATE INDEX "ApprovalFlow_organizationId_isActive_idx" ON "ApprovalFlow"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "ApprovalStep_organizationId_flowId_idx" ON "ApprovalStep"("organizationId", "flowId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_flowId_stepOrder_key" ON "ApprovalStep"("flowId", "stepOrder");

-- CreateIndex
CREATE INDEX "AppraisalApproval_organizationId_appraisalId_idx" ON "AppraisalApproval"("organizationId", "appraisalId");

-- CreateIndex
CREATE INDEX "AppraisalApproval_approverId_idx" ON "AppraisalApproval"("approverId");

-- CreateIndex
CREATE INDEX "Competency_name_idx" ON "Competency"("name");

-- CreateIndex
CREATE INDEX "DepartmentKPI_organizationId_assignedToId_idx" ON "DepartmentKPI"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "DepartmentKPI_assignedById_idx" ON "DepartmentKPI"("assignedById");

-- CreateIndex
CREATE INDEX "EmployeeTarget_organizationId_teamTargetId_idx" ON "EmployeeTarget"("organizationId", "teamTargetId");

-- CreateIndex
CREATE INDEX "EmployeeTarget_assignedById_idx" ON "EmployeeTarget"("assignedById");

-- CreateIndex
CREATE INDEX "InterviewFeedback_organizationId_reviewerId_idx" ON "InterviewFeedback"("organizationId", "reviewerId");

-- CreateIndex
CREATE INDEX "InterviewFeedback_interviewStageId_idx" ON "InterviewFeedback"("interviewStageId");

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_reviewerId_idx" ON "KpiSheet"("organizationId", "reviewerId");

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_month_year_idx" ON "KpiSheet"("organizationId", "month", "year");

-- CreateIndex
CREATE INDEX "PerformanceReviewV2_organizationId_status_idx" ON "PerformanceReviewV2"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PerformanceReviewV2_managerId_directorId_idx" ON "PerformanceReviewV2"("managerId", "directorId");

-- CreateIndex
CREATE INDEX "TeamTarget_organizationId_managerId_measurementPeriod_idx" ON "TeamTarget"("organizationId", "managerId", "measurementPeriod");
