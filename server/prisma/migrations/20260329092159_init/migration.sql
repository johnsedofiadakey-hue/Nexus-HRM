-- CreateTable
CREATE TABLE "KpiSheet" (
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

-- CreateTable
CREATE TABLE "KpiItem" (
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
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isCompanyProperty" BOOLEAN NOT NULL DEFAULT true,
    "serialNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "purchaseDate" DATETIME,
    "warrantyExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
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

-- CreateTable
CREATE TABLE "EmployeeHistory" (
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
CREATE TABLE "AssetAssignment" (
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

-- CreateTable
CREATE TABLE "User" (
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
    "education" TEXT,
    "nationalId" TEXT,
    "contactNumber" TEXT,
    "address" TEXT,
    "profilePhoto" TEXT,
    "nextOfKinName" TEXT,
    "nextOfKinRelation" TEXT,
    "nextOfKinContact" TEXT,
    "hometown" TEXT,
    "maritalStatus" TEXT,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "certifications" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salary" REAL,
    "currency" TEXT NOT NULL DEFAULT 'GNF',
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankBranch" TEXT,
    "ssnitNumber" TEXT,
    "bankAccountEnc" TEXT,
    "ghanaCardEnc" TEXT,
    "ssnitEnc" TEXT,
    "salaryEnc" TEXT,
    "nationalIdDocUrl" TEXT,
    "leaveBalance" REAL NOT NULL DEFAULT 24,
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

-- CreateTable
CREATE TABLE "CompensationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "previousSalary" REAL NOT NULL,
    "newSalary" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GNF',
    "reason" TEXT,
    "effectiveDate" DATETIME NOT NULL,
    "authorizedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompensationHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeQuery" (
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

-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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

-- CreateTable
CREATE TABLE "LeaveRequest" (
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

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Announcement" (
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
    "matrixSupervisorId" TEXT,
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

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GNF',
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
    "bgMain" TEXT DEFAULT '#f8fafc',
    "bgCard" TEXT DEFAULT '#ffffff',
    "textPrimary" TEXT DEFAULT '#0f172a',
    "textSecondary" TEXT DEFAULT '#475569',
    "textMuted" TEXT DEFAULT '#94a3b8',
    "sidebarBg" TEXT DEFAULT '#080c16',
    "sidebarActive" TEXT DEFAULT '#1e293b',
    "sidebarText" TEXT DEFAULT '#ffffff',
    "subtitle" TEXT NOT NULL DEFAULT 'HRM OS',
    "themePreset" TEXT NOT NULL DEFAULT 'nexus-dark',
    "lightMode" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "discountPercentage" REAL DEFAULT 0,
    "discountFixed" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemSettings" (
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

-- CreateTable
CREATE TABLE "Notification" (
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

-- CreateTable
CREATE TABLE "PayrollRun" (
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

-- CreateTable
CREATE TABLE "PayrollItem" (
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

-- CreateTable
CREATE TABLE "OnboardingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "dueAfterDays" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OnboardingTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
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

-- CreateTable
CREATE TABLE "OnboardingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "sessionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "completedBy" TEXT,
    "notes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "OnboardingItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingProgram" (
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

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
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

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GH',
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "year" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Subscription" (
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

-- CreateTable
CREATE TABLE "Loan" (
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

-- CreateTable
CREATE TABLE "LoanInstallment" (
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

-- CreateTable
CREATE TABLE "ExpenseClaim" (
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

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "clockIn" DATETIME,
    "clockOut" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "locationIn" TEXT,
    "locationOut" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaasSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "clientId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'MONTHLY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "amount" DECIMAL NOT NULL DEFAULT 50.00,
    "nextBillingDate" DATETIME NOT NULL,
    "lastPaymentDate" DATETIME,
    "paystackRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaasSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT DEFAULT 'default-tenant',
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginSecurityEvent" (
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

-- CreateTable
CREATE TABLE "DepartmentKPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TeamTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "departmentKpiId" TEXT NOT NULL,
    "originKPIId" TEXT,
    "managerId" TEXT NOT NULL,
    "teamName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "teamTargetId" TEXT NOT NULL,
    "originKPIId" TEXT,
    "managerId" TEXT,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "measurementPeriod" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PerformanceReviewV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT,
    "directorId" TEXT,
    "cycle" TEXT NOT NULL,
    "selfReview" TEXT,
    "managerReview" TEXT,
    "directorReview" TEXT,
    "selfScore" REAL,
    "managerScore" REAL,
    "directorScore" REAL,
    "finalScore" REAL,
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "validatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PerformanceReviewV2_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "performanceReviewId" TEXT NOT NULL,
    "kpiTitle" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "targetValue" REAL,
    "achievedValue" REAL,
    "weightedScore" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "JobPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" INTEGER,
    "description" TEXT,
    "location" TEXT,
    "employmentType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "jobPositionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InterviewStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "interviewerId" TEXT,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "interviewStageId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "rating" REAL,
    "feedback" TEXT,
    "recommendation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OfferLetter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "salaryOffered" DECIMAL,
    "currency" TEXT DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" DATETIME,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OnboardingChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "source" TEXT DEFAULT 'ATS',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OnboardingChecklistTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "completedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OffboardingProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "effectiveDate" DATETIME,
    "accountDisabledAt" DATETIME,
    "finalPayrollRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExitInterview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "interviewerId" TEXT,
    "interviewDate" DATETIME,
    "reason" TEXT,
    "feedback" TEXT,
    "rehireEligible" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssetReturn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "assetId" TEXT,
    "assetName" TEXT,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" DATETIME,
    "conditionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BenefitPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "employerAmount" DECIMAL DEFAULT 0,
    "employeeAmount" DECIMAL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "payrollCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeBenefitEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "benefitPlanId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "employeeAmount" DECIMAL DEFAULT 0,
    "employerAmount" DECIMAL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
    "gracePeriodMins" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeShift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "assignedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShiftAttendanceRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "lateAfterMins" INTEGER NOT NULL DEFAULT 10,
    "halfDayAfterMins" INTEGER NOT NULL DEFAULT 240,
    "absentAfterMins" INTEGER NOT NULL DEFAULT 480,
    "requiresGeoFence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesTo" TEXT DEFAULT 'PAYROLL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxBracket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "taxRuleId" TEXT NOT NULL,
    "minAmount" DECIMAL NOT NULL,
    "maxAmount" DECIMAL,
    "rate" DECIMAL NOT NULL,
    "fixedAmount" DECIMAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeReporting_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeReporting_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_employeeId_idx" ON "KpiSheet"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_reviewerId_idx" ON "KpiSheet"("organizationId", "reviewerId");

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_targetDepartmentId_idx" ON "KpiSheet"("organizationId", "targetDepartmentId");

-- CreateIndex
CREATE INDEX "KpiSheet_organizationId_month_year_idx" ON "KpiSheet"("organizationId", "month", "year");

-- CreateIndex
CREATE INDEX "KpiItem_organizationId_sheetId_idx" ON "KpiItem"("organizationId", "sheetId");

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
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");

-- CreateIndex
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeHistory_organizationId_employeeId_idx" ON "EmployeeHistory"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "ApiUsage_organizationId_createdAt_idx" ON "ApiUsage"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiUsage_path_createdAt_idx" ON "ApiUsage"("path", "createdAt");

-- CreateIndex
CREATE INDEX "AssetAssignment_organizationId_userId_idx" ON "AssetAssignment"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_departmentId_isArchived_status_idx" ON "User"("departmentId", "isArchived", "status");

-- CreateIndex
CREATE INDEX "User_supervisorId_idx" ON "User"("supervisorId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_organizationId_key" ON "User"("employeeCode", "organizationId");

-- CreateIndex
CREATE INDEX "CompensationHistory_organizationId_employeeId_idx" ON "CompensationHistory"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_organizationId_userId_idx" ON "PasswordResetToken"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_organizationId_employeeId_idx" ON "EmployeeDocument"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeQuery_organizationId_employeeId_idx" ON "EmployeeQuery"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE INDEX "SubUnit_organizationId_idx" ON "SubUnit"("organizationId");

-- CreateIndex
CREATE INDEX "SubUnit_departmentId_idx" ON "SubUnit"("departmentId");

-- CreateIndex
CREATE INDEX "SubUnit_managerId_idx" ON "SubUnit"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "SubUnit_name_departmentId_key" ON "SubUnit"("name", "departmentId");

-- CreateIndex
CREATE INDEX "LeaveRequest_organizationId_employeeId_status_idx" ON "LeaveRequest"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "Cycle_organizationId_idx" ON "Cycle"("organizationId");

-- CreateIndex
CREATE INDEX "Announcement_organizationId_targetAudience_expirationDate_idx" ON "Announcement"("organizationId", "targetAudience", "expirationDate");

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

-- CreateIndex
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_organizationId_key" ON "SystemSettings"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_isRead_idx" ON "Notification"("organizationId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "PayrollRun_organizationId_year_month_status_idx" ON "PayrollRun"("organizationId", "year", "month", "status");

-- CreateIndex
CREATE INDEX "PayrollRun_period_status_idx" ON "PayrollRun"("period", "status");

-- CreateIndex
CREATE INDEX "PayrollItem_organizationId_idx" ON "PayrollItem"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_runId_employeeId_key" ON "PayrollItem"("runId", "employeeId");

-- CreateIndex
CREATE INDEX "OnboardingTemplate_organizationId_idx" ON "OnboardingTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "OnboardingTask_organizationId_templateId_idx" ON "OnboardingTask"("organizationId", "templateId");

-- CreateIndex
CREATE INDEX "OnboardingSession_organizationId_employeeId_idx" ON "OnboardingSession"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "OnboardingItem_organizationId_sessionId_idx" ON "OnboardingItem"("organizationId", "sessionId");

-- CreateIndex
CREATE INDEX "TrainingProgram_organizationId_status_idx" ON "TrainingProgram"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TrainingProgram_organizationId_idx" ON "TrainingProgram"("organizationId");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_organizationId_employeeId_idx" ON "TrainingEnrollment"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEnrollment_programId_employeeId_key" ON "TrainingEnrollment"("programId", "employeeId");

-- CreateIndex
CREATE INDEX "PublicHoliday_organizationId_country_date_idx" ON "PublicHoliday"("organizationId", "country", "date");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Loan_organizationId_employeeId_idx" ON "Loan"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "LoanInstallment_organizationId_loanId_idx" ON "LoanInstallment"("organizationId", "loanId");

-- CreateIndex
CREATE INDEX "ExpenseClaim_organizationId_employeeId_status_idx" ON "ExpenseClaim"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "AttendanceLog_organizationId_date_status_idx" ON "AttendanceLog"("organizationId", "date", "status");

-- CreateIndex
CREATE INDEX "AttendanceLog_employeeId_clockIn_clockOut_idx" ON "AttendanceLog"("employeeId", "clockIn", "clockOut");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_employeeId_date_key" ON "AttendanceLog"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SaasSubscription_paystackRef_key" ON "SaasSubscription"("paystackRef");

-- CreateIndex
CREATE INDEX "SaasSubscription_organizationId_idx" ON "SaasSubscription"("organizationId");

-- CreateIndex
CREATE INDEX "BackupLog_organizationId_idx" ON "BackupLog"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_organizationId_userId_idx" ON "RefreshToken"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginSecurityEvent_organizationId_email_createdAt_idx" ON "LoginSecurityEvent"("organizationId", "email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginSecurityEvent_ipAddress_createdAt_idx" ON "LoginSecurityEvent"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "DepartmentKPI_organizationId_departmentId_measurementPeriod_idx" ON "DepartmentKPI"("organizationId", "departmentId", "measurementPeriod");

-- CreateIndex
CREATE INDEX "DepartmentKPI_organizationId_assignedToId_idx" ON "DepartmentKPI"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "DepartmentKPI_assignedById_idx" ON "DepartmentKPI"("assignedById");

-- CreateIndex
CREATE INDEX "TeamTarget_organizationId_departmentKpiId_idx" ON "TeamTarget"("organizationId", "departmentKpiId");

-- CreateIndex
CREATE INDEX "TeamTarget_organizationId_managerId_measurementPeriod_idx" ON "TeamTarget"("organizationId", "managerId", "measurementPeriod");

-- CreateIndex
CREATE INDEX "EmployeeTarget_organizationId_employeeId_measurementPeriod_idx" ON "EmployeeTarget"("organizationId", "employeeId", "measurementPeriod");

-- CreateIndex
CREATE INDEX "EmployeeTarget_organizationId_teamTargetId_idx" ON "EmployeeTarget"("organizationId", "teamTargetId");

-- CreateIndex
CREATE INDEX "EmployeeTarget_assignedById_idx" ON "EmployeeTarget"("assignedById");

-- CreateIndex
CREATE INDEX "PerformanceReviewV2_organizationId_employeeId_cycleId_idx" ON "PerformanceReviewV2"("organizationId", "employeeId", "cycleId");

-- CreateIndex
CREATE INDEX "PerformanceReviewV2_organizationId_status_idx" ON "PerformanceReviewV2"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PerformanceReviewV2_managerId_directorId_idx" ON "PerformanceReviewV2"("managerId", "directorId");

-- CreateIndex
CREATE INDEX "PerformanceScore_organizationId_performanceReviewId_idx" ON "PerformanceScore"("organizationId", "performanceReviewId");

-- CreateIndex
CREATE INDEX "JobPosition_organizationId_status_createdAt_idx" ON "JobPosition"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Candidate_organizationId_jobPositionId_status_idx" ON "Candidate"("organizationId", "jobPositionId", "status");

-- CreateIndex
CREATE INDEX "Candidate_email_phone_idx" ON "Candidate"("email", "phone");

-- CreateIndex
CREATE INDEX "InterviewStage_organizationId_candidateId_stage_idx" ON "InterviewStage"("organizationId", "candidateId", "stage");

-- CreateIndex
CREATE INDEX "InterviewFeedback_organizationId_candidateId_idx" ON "InterviewFeedback"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "InterviewFeedback_organizationId_reviewerId_idx" ON "InterviewFeedback"("organizationId", "reviewerId");

-- CreateIndex
CREATE INDEX "InterviewFeedback_interviewStageId_idx" ON "InterviewFeedback"("interviewStageId");

-- CreateIndex
CREATE INDEX "OfferLetter_organizationId_candidateId_status_idx" ON "OfferLetter"("organizationId", "candidateId", "status");

-- CreateIndex
CREATE INDEX "OnboardingChecklist_organizationId_employeeId_status_idx" ON "OnboardingChecklist"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "OnboardingChecklistTask_organizationId_checklistId_status_idx" ON "OnboardingChecklistTask"("organizationId", "checklistId", "status");

-- CreateIndex
CREATE INDEX "OffboardingProcess_organizationId_employeeId_status_idx" ON "OffboardingProcess"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "ExitInterview_organizationId_offboardingId_idx" ON "ExitInterview"("organizationId", "offboardingId");

-- CreateIndex
CREATE INDEX "AssetReturn_organizationId_offboardingId_returned_idx" ON "AssetReturn"("organizationId", "offboardingId", "returned");

-- CreateIndex
CREATE INDEX "BenefitPlan_organizationId_status_category_idx" ON "BenefitPlan"("organizationId", "status", "category");

-- CreateIndex
CREATE INDEX "EmployeeBenefitEnrollment_organizationId_employeeId_status_idx" ON "EmployeeBenefitEnrollment"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "EmployeeBenefitEnrollment_benefitPlanId_idx" ON "EmployeeBenefitEnrollment"("benefitPlanId");

-- CreateIndex
CREATE INDEX "Shift_organizationId_status_idx" ON "Shift"("organizationId", "status");

-- CreateIndex
CREATE INDEX "EmployeeShift_organizationId_employeeId_effectiveFrom_idx" ON "EmployeeShift"("organizationId", "employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "EmployeeShift_shiftId_idx" ON "EmployeeShift"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftAttendanceRule_organizationId_shiftId_idx" ON "ShiftAttendanceRule"("organizationId", "shiftId");

-- CreateIndex
CREATE INDEX "TaxRule_organizationId_countryCode_taxType_isActive_idx" ON "TaxRule"("organizationId", "countryCode", "taxType", "isActive");

-- CreateIndex
CREATE INDEX "TaxBracket_organizationId_taxRuleId_idx" ON "TaxBracket"("organizationId", "taxRuleId");

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
CREATE INDEX "KpiUpdate_organizationId_kpiItemId_idx" ON "KpiUpdate"("organizationId", "kpiItemId");

-- CreateIndex
CREATE INDEX "KpiUpdate_createdAt_idx" ON "KpiUpdate"("createdAt");
