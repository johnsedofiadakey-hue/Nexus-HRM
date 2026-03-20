
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.KpiSheetScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  month: 'month',
  year: 'year',
  lockedAt: 'lockedAt',
  title: 'title',
  employeeId: 'employeeId',
  reviewerId: 'reviewerId',
  totalScore: 'totalScore',
  status: 'status',
  isLocked: 'isLocked',
  isTemplate: 'isTemplate',
  targetDepartmentId: 'targetDepartmentId',
  createdAt: 'createdAt'
};

exports.Prisma.KpiItemScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  description: 'description',
  category: 'category',
  metricType: 'metricType',
  targetValue: 'targetValue',
  actualValue: 'actualValue',
  weight: 'weight',
  score: 'score',
  frequency: 'frequency',
  startDate: 'startDate',
  endDate: 'endDate',
  lastEntryDate: 'lastEntryDate',
  sheetId: 'sheetId',
  createdAt: 'createdAt'
};

exports.Prisma.TargetScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  title: 'title',
  description: 'description',
  level: 'level',
  type: 'type',
  status: 'status',
  dueDate: 'dueDate',
  weight: 'weight',
  parentTargetId: 'parentTargetId',
  departmentId: 'departmentId',
  assigneeId: 'assigneeId',
  originatorId: 'originatorId',
  lineManagerId: 'lineManagerId',
  reviewerId: 'reviewerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TargetMetricScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  targetId: 'targetId',
  title: 'title',
  description: 'description',
  metricType: 'metricType',
  targetValue: 'targetValue',
  currentValue: 'currentValue',
  unit: 'unit',
  currency: 'currency',
  weight: 'weight',
  qualitativePrompt: 'qualitativePrompt'
};

exports.Prisma.TargetAcknowledgementScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  targetId: 'targetId',
  userId: 'userId',
  status: 'status',
  message: 'message',
  createdAt: 'createdAt'
};

exports.Prisma.TargetUpdateScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  targetId: 'targetId',
  metricId: 'metricId',
  submittedById: 'submittedById',
  value: 'value',
  comment: 'comment',
  attachmentUrl: 'attachmentUrl',
  createdAt: 'createdAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  description: 'description',
  isCompanyProperty: 'isCompanyProperty',
  serialNumber: 'serialNumber',
  make: 'make',
  model: 'model',
  type: 'type',
  status: 'status',
  purchaseDate: 'purchaseDate',
  warrantyExpiry: 'warrantyExpiry',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  details: 'details',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.EmployeeHistoryScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  createdById: 'createdById',
  title: 'title',
  description: 'description',
  change: 'change',
  type: 'type',
  severity: 'severity',
  status: 'status',
  loggedById: 'loggedById',
  createdAt: 'createdAt'
};

exports.Prisma.ApiUsageScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  path: 'path',
  method: 'method',
  statusCode: 'statusCode',
  duration: 'duration',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.AssetAssignmentScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  returnedAt: 'returnedAt',
  details: 'details',
  status: 'status',
  conditionOnAssign: 'conditionOnAssign',
  conditionOnReturn: 'conditionOnReturn',
  loggedById: 'loggedById',
  userId: 'userId',
  assetId: 'assetId',
  assignedAt: 'assignedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  fullName: 'fullName',
  role: 'role',
  employeeCode: 'employeeCode',
  status: 'status',
  position: 'position',
  departmentId: 'departmentId',
  subUnitId: 'subUnitId',
  jobTitle: 'jobTitle',
  joinDate: 'joinDate',
  employmentType: 'employmentType',
  dob: 'dob',
  gender: 'gender',
  nationalId: 'nationalId',
  contactNumber: 'contactNumber',
  address: 'address',
  profilePhoto: 'profilePhoto',
  nextOfKinName: 'nextOfKinName',
  nextOfKinRelation: 'nextOfKinRelation',
  nextOfKinContact: 'nextOfKinContact',
  avatarUrl: 'avatarUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  salary: 'salary',
  currency: 'currency',
  bankName: 'bankName',
  bankAccountNumber: 'bankAccountNumber',
  bankBranch: 'bankBranch',
  ssnitNumber: 'ssnitNumber',
  bankAccountEnc: 'bankAccountEnc',
  ghanaCardEnc: 'ghanaCardEnc',
  ssnitEnc: 'ssnitEnc',
  salaryEnc: 'salaryEnc',
  nationalIdDocUrl: 'nationalIdDocUrl',
  leaveBalance: 'leaveBalance',
  leaveAllowance: 'leaveAllowance',
  leaveAccruedAt: 'leaveAccruedAt',
  supervisorId: 'supervisorId',
  isArchived: 'isArchived',
  archivedDate: 'archivedDate',
  organizationId: 'organizationId'
};

exports.Prisma.CompensationHistoryScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  type: 'type',
  previousSalary: 'previousSalary',
  newSalary: 'newSalary',
  currency: 'currency',
  reason: 'reason',
  effectiveDate: 'effectiveDate',
  authorizedById: 'authorizedById',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  token: 'token',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.EmployeeDocumentScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  title: 'title',
  category: 'category',
  fileUrl: 'fileUrl',
  uploadedAt: 'uploadedAt'
};

exports.Prisma.EmployeeQueryScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  issuedById: 'issuedById',
  subject: 'subject',
  description: 'description',
  status: 'status',
  resolution: 'resolution',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  managerId: 'managerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubUnitScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  departmentId: 'departmentId',
  managerId: 'managerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveRequestScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  startDate: 'startDate',
  endDate: 'endDate',
  leaveDays: 'leaveDays',
  reason: 'reason',
  relieverId: 'relieverId',
  relieverStatus: 'relieverStatus',
  relieverRespondedAt: 'relieverRespondedAt',
  relieverComment: 'relieverComment',
  managerId: 'managerId',
  managerComment: 'managerComment',
  hrReviewerId: 'hrReviewerId',
  hrComment: 'hrComment',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CycleScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  type: 'type',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReviewCycleScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  title: 'title',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  title: 'title',
  content: 'content',
  createdById: 'createdById',
  targetAudience: 'targetAudience',
  departmentId: 'departmentId',
  publishDate: 'publishDate',
  expirationDate: 'expirationDate',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AppraisalCycleScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  title: 'title',
  period: 'period',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AppraisalPacketScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  cycleId: 'cycleId',
  employeeId: 'employeeId',
  currentStage: 'currentStage',
  status: 'status',
  supervisorId: 'supervisorId',
  managerId: 'managerId',
  hrReviewerId: 'hrReviewerId',
  finalReviewerId: 'finalReviewerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AppraisalReviewScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  packetId: 'packetId',
  reviewerId: 'reviewerId',
  reviewStage: 'reviewStage',
  status: 'status',
  submittedAt: 'submittedAt',
  overallRating: 'overallRating',
  summary: 'summary',
  strengths: 'strengths',
  weaknesses: 'weaknesses',
  achievements: 'achievements',
  developmentNeeds: 'developmentNeeds',
  responses: 'responses'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  logoUrl: 'logoUrl',
  email: 'email',
  phone: 'phone',
  address: 'address',
  city: 'city',
  country: 'country',
  currency: 'currency',
  subscriptionPlan: 'subscriptionPlan',
  subscriptionAmount: 'subscriptionAmount',
  billingStatus: 'billingStatus',
  isEnterprise: 'isEnterprise',
  features: 'features',
  isSuspended: 'isSuspended',
  trialStartDate: 'trialStartDate',
  trialEndsAt: 'trialEndsAt',
  nextBillingDate: 'nextBillingDate',
  customDomain: 'customDomain',
  primaryColor: 'primaryColor',
  secondaryColor: 'secondaryColor',
  accentColor: 'accentColor',
  textColor: 'textColor',
  sidebarColor: 'sidebarColor',
  subtitle: 'subtitle',
  themePreset: 'themePreset',
  lightMode: 'lightMode',
  discountPercentage: 'discountPercentage',
  discountFixed: 'discountFixed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemSettingsScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  isMaintenanceMode: 'isMaintenanceMode',
  maintenanceNotice: 'maintenanceNotice',
  securityLockdown: 'securityLockdown',
  securityLockdownMessage: 'securityLockdownMessage',
  smtpHost: 'smtpHost',
  smtpPort: 'smtpPort',
  smtpUser: 'smtpUser',
  smtpPass: 'smtpPass',
  smtpFrom: 'smtpFrom',
  paystackPublicKey: 'paystackPublicKey',
  paystackSecretKey: 'paystackSecretKey',
  paystackPayLink: 'paystackPayLink',
  monthlyPriceGHS: 'monthlyPriceGHS',
  annualPriceGHS: 'annualPriceGHS',
  trialDays: 'trialDays',
  loginNotice: 'loginNotice',
  loginSubtitle: 'loginSubtitle',
  loginBullets: 'loginBullets',
  backupFrequencyDays: 'backupFrequencyDays',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  title: 'title',
  message: 'message',
  type: 'type',
  link: 'link',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.PayrollRunScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  period: 'period',
  month: 'month',
  year: 'year',
  status: 'status',
  totalGross: 'totalGross',
  totalNet: 'totalNet',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollItemScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  runId: 'runId',
  employeeId: 'employeeId',
  baseSalary: 'baseSalary',
  currency: 'currency',
  overtime: 'overtime',
  bonus: 'bonus',
  allowances: 'allowances',
  tax: 'tax',
  ssnit: 'ssnit',
  otherDeductions: 'otherDeductions',
  grossPay: 'grossPay',
  netPay: 'netPay',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.OnboardingTemplateScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  description: 'description',
  isDefault: 'isDefault',
  createdAt: 'createdAt'
};

exports.Prisma.OnboardingTaskScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  templateId: 'templateId',
  title: 'title',
  description: 'description',
  category: 'category',
  dueAfterDays: 'dueAfterDays',
  isRequired: 'isRequired',
  order: 'order'
};

exports.Prisma.OnboardingSessionScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  templateId: 'templateId',
  startDate: 'startDate',
  completedAt: 'completedAt',
  progress: 'progress',
  createdAt: 'createdAt'
};

exports.Prisma.OnboardingItemScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  sessionId: 'sessionId',
  taskId: 'taskId',
  title: 'title',
  category: 'category',
  dueDate: 'dueDate',
  completedAt: 'completedAt',
  completedBy: 'completedBy',
  notes: 'notes',
  isRequired: 'isRequired'
};

exports.Prisma.TrainingProgramScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  title: 'title',
  description: 'description',
  provider: 'provider',
  startDate: 'startDate',
  endDate: 'endDate',
  durationHours: 'durationHours',
  cost: 'cost',
  maxSeats: 'maxSeats',
  status: 'status',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.TrainingEnrollmentScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  programId: 'programId',
  employeeId: 'employeeId',
  enrolledAt: 'enrolledAt',
  completedAt: 'completedAt',
  score: 'score',
  certificate: 'certificate',
  status: 'status'
};

exports.Prisma.PublicHolidayScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  date: 'date',
  country: 'country',
  isRecurring: 'isRecurring',
  year: 'year',
  createdAt: 'createdAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  clientId: 'clientId',
  plan: 'plan',
  priceGHS: 'priceGHS',
  status: 'status',
  orgName: 'orgName',
  contactEmail: 'contactEmail',
  paystackRef: 'paystackRef',
  paystackSubCode: 'paystackSubCode',
  trialEndsAt: 'trialEndsAt',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  cancelledAt: 'cancelledAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LoanScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  type: 'type',
  principalAmount: 'principalAmount',
  interestRate: 'interestRate',
  totalRepayment: 'totalRepayment',
  installmentAmount: 'installmentAmount',
  monthsDuration: 'monthsDuration',
  purpose: 'purpose',
  status: 'status',
  requestedAt: 'requestedAt',
  approvedAt: 'approvedAt',
  approvedById: 'approvedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LoanInstallmentScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  loanId: 'loanId',
  amount: 'amount',
  deductedRunId: 'deductedRunId',
  month: 'month',
  year: 'year',
  status: 'status',
  paidAt: 'paidAt'
};

exports.Prisma.ExpenseClaimScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  title: 'title',
  description: 'description',
  amount: 'amount',
  currency: 'currency',
  category: 'category',
  receiptUrl: 'receiptUrl',
  status: 'status',
  submittedAt: 'submittedAt',
  approvedAt: 'approvedAt',
  approvedById: 'approvedById',
  paidInRunId: 'paidInRunId'
};

exports.Prisma.AttendanceLogScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  date: 'date',
  clockIn: 'clockIn',
  clockOut: 'clockOut',
  status: 'status',
  notes: 'notes',
  locationIn: 'locationIn',
  locationOut: 'locationOut',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SaasSubscriptionScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  clientId: 'clientId',
  plan: 'plan',
  status: 'status',
  amount: 'amount',
  nextBillingDate: 'nextBillingDate',
  lastPaymentDate: 'lastPaymentDate',
  paystackRef: 'paystackRef',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BackupLogScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  filename: 'filename',
  sizeBytes: 'sizeBytes',
  status: 'status',
  errorMessage: 'errorMessage',
  createdAt: 'createdAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  organizationId: 'organizationId',
  tokenHash: 'tokenHash',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt'
};

exports.Prisma.LoginSecurityEventScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  email: 'email',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  success: 'success',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.DepartmentKPIScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  departmentId: 'departmentId',
  title: 'title',
  description: 'description',
  metricType: 'metricType',
  targetValue: 'targetValue',
  measurementPeriod: 'measurementPeriod',
  assignedById: 'assignedById',
  assignedToId: 'assignedToId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamTargetScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  departmentKpiId: 'departmentKpiId',
  originKPIId: 'originKPIId',
  managerId: 'managerId',
  teamName: 'teamName',
  title: 'title',
  description: 'description',
  metricType: 'metricType',
  targetValue: 'targetValue',
  measurementPeriod: 'measurementPeriod',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeTargetScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  teamTargetId: 'teamTargetId',
  originKPIId: 'originKPIId',
  managerId: 'managerId',
  employeeId: 'employeeId',
  title: 'title',
  description: 'description',
  metricType: 'metricType',
  targetValue: 'targetValue',
  measurementPeriod: 'measurementPeriod',
  assignedById: 'assignedById',
  assignedToId: 'assignedToId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PerformanceReviewV2ScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  managerId: 'managerId',
  directorId: 'directorId',
  cycle: 'cycle',
  selfReview: 'selfReview',
  managerReview: 'managerReview',
  directorReview: 'directorReview',
  selfScore: 'selfScore',
  managerScore: 'managerScore',
  directorScore: 'directorScore',
  finalScore: 'finalScore',
  cycleId: 'cycleId',
  status: 'status',
  submittedAt: 'submittedAt',
  validatedAt: 'validatedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PerformanceScoreScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  performanceReviewId: 'performanceReviewId',
  kpiTitle: 'kpiTitle',
  metricType: 'metricType',
  targetValue: 'targetValue',
  achievedValue: 'achievedValue',
  weightedScore: 'weightedScore',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.JobPositionScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  title: 'title',
  departmentId: 'departmentId',
  description: 'description',
  location: 'location',
  employmentType: 'employmentType',
  status: 'status',
  openedById: 'openedById',
  closedAt: 'closedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CandidateScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  jobPositionId: 'jobPositionId',
  fullName: 'fullName',
  email: 'email',
  phone: 'phone',
  resumeUrl: 'resumeUrl',
  source: 'source',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InterviewStageScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  candidateId: 'candidateId',
  stage: 'stage',
  scheduledAt: 'scheduledAt',
  interviewerId: 'interviewerId',
  outcome: 'outcome',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InterviewFeedbackScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  candidateId: 'candidateId',
  interviewStageId: 'interviewStageId',
  reviewerId: 'reviewerId',
  rating: 'rating',
  feedback: 'feedback',
  recommendation: 'recommendation',
  createdAt: 'createdAt'
};

exports.Prisma.OfferLetterScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  candidateId: 'candidateId',
  fileUrl: 'fileUrl',
  salaryOffered: 'salaryOffered',
  currency: 'currency',
  status: 'status',
  sentAt: 'sentAt',
  acceptedAt: 'acceptedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OnboardingChecklistScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  source: 'source',
  status: 'status',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OnboardingChecklistTaskScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  checklistId: 'checklistId',
  title: 'title',
  description: 'description',
  category: 'category',
  status: 'status',
  dueDate: 'dueDate',
  completedAt: 'completedAt',
  completedById: 'completedById',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OffboardingProcessScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  triggeredById: 'triggeredById',
  status: 'status',
  effectiveDate: 'effectiveDate',
  accountDisabledAt: 'accountDisabledAt',
  finalPayrollRunId: 'finalPayrollRunId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExitInterviewScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  offboardingId: 'offboardingId',
  interviewerId: 'interviewerId',
  interviewDate: 'interviewDate',
  reason: 'reason',
  feedback: 'feedback',
  rehireEligible: 'rehireEligible',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetReturnScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  offboardingId: 'offboardingId',
  assetId: 'assetId',
  assetName: 'assetName',
  returned: 'returned',
  returnedAt: 'returnedAt',
  conditionNotes: 'conditionNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BenefitPlanScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  category: 'category',
  description: 'description',
  employerAmount: 'employerAmount',
  employeeAmount: 'employeeAmount',
  taxable: 'taxable',
  payrollCode: 'payrollCode',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeBenefitEnrollmentScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  benefitPlanId: 'benefitPlanId',
  startDate: 'startDate',
  endDate: 'endDate',
  employeeAmount: 'employeeAmount',
  employerAmount: 'employerAmount',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShiftScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  startTime: 'startTime',
  endTime: 'endTime',
  timezone: 'timezone',
  gracePeriodMins: 'gracePeriodMins',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeShiftScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  shiftId: 'shiftId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  assignedById: 'assignedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShiftAttendanceRuleScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  shiftId: 'shiftId',
  lateAfterMins: 'lateAfterMins',
  halfDayAfterMins: 'halfDayAfterMins',
  absentAfterMins: 'absentAfterMins',
  requiresGeoFence: 'requiresGeoFence',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaxRuleScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  countryCode: 'countryCode',
  taxType: 'taxType',
  name: 'name',
  appliesTo: 'appliesTo',
  isActive: 'isActive',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaxBracketScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  taxRuleId: 'taxRuleId',
  minAmount: 'minAmount',
  maxAmount: 'maxAmount',
  rate: 'rate',
  fixedAmount: 'fixedAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemLogScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  type: 'type',
  message: 'message',
  action: 'action',
  details: 'details',
  source: 'source',
  operatorId: 'operatorId',
  operatorEmail: 'operatorEmail',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.EmployeeReportingScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  managerId: 'managerId',
  type: 'type',
  isPrimary: 'isPrimary',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdAt: 'createdAt'
};

exports.Prisma.KpiUpdateScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  kpiItemId: 'kpiItemId',
  value: 'value',
  comment: 'comment',
  submittedById: 'submittedById',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  KpiSheet: 'KpiSheet',
  KpiItem: 'KpiItem',
  Target: 'Target',
  TargetMetric: 'TargetMetric',
  TargetAcknowledgement: 'TargetAcknowledgement',
  TargetUpdate: 'TargetUpdate',
  Asset: 'Asset',
  AuditLog: 'AuditLog',
  EmployeeHistory: 'EmployeeHistory',
  ApiUsage: 'ApiUsage',
  AssetAssignment: 'AssetAssignment',
  User: 'User',
  CompensationHistory: 'CompensationHistory',
  PasswordResetToken: 'PasswordResetToken',
  EmployeeDocument: 'EmployeeDocument',
  EmployeeQuery: 'EmployeeQuery',
  Department: 'Department',
  SubUnit: 'SubUnit',
  LeaveRequest: 'LeaveRequest',
  Cycle: 'Cycle',
  ReviewCycle: 'ReviewCycle',
  Announcement: 'Announcement',
  AppraisalCycle: 'AppraisalCycle',
  AppraisalPacket: 'AppraisalPacket',
  AppraisalReview: 'AppraisalReview',
  Organization: 'Organization',
  SystemSettings: 'SystemSettings',
  Notification: 'Notification',
  PayrollRun: 'PayrollRun',
  PayrollItem: 'PayrollItem',
  OnboardingTemplate: 'OnboardingTemplate',
  OnboardingTask: 'OnboardingTask',
  OnboardingSession: 'OnboardingSession',
  OnboardingItem: 'OnboardingItem',
  TrainingProgram: 'TrainingProgram',
  TrainingEnrollment: 'TrainingEnrollment',
  PublicHoliday: 'PublicHoliday',
  Subscription: 'Subscription',
  Loan: 'Loan',
  LoanInstallment: 'LoanInstallment',
  ExpenseClaim: 'ExpenseClaim',
  AttendanceLog: 'AttendanceLog',
  SaasSubscription: 'SaasSubscription',
  BackupLog: 'BackupLog',
  RefreshToken: 'RefreshToken',
  LoginSecurityEvent: 'LoginSecurityEvent',
  DepartmentKPI: 'DepartmentKPI',
  TeamTarget: 'TeamTarget',
  EmployeeTarget: 'EmployeeTarget',
  PerformanceReviewV2: 'PerformanceReviewV2',
  PerformanceScore: 'PerformanceScore',
  JobPosition: 'JobPosition',
  Candidate: 'Candidate',
  InterviewStage: 'InterviewStage',
  InterviewFeedback: 'InterviewFeedback',
  OfferLetter: 'OfferLetter',
  OnboardingChecklist: 'OnboardingChecklist',
  OnboardingChecklistTask: 'OnboardingChecklistTask',
  OffboardingProcess: 'OffboardingProcess',
  ExitInterview: 'ExitInterview',
  AssetReturn: 'AssetReturn',
  BenefitPlan: 'BenefitPlan',
  EmployeeBenefitEnrollment: 'EmployeeBenefitEnrollment',
  Shift: 'Shift',
  EmployeeShift: 'EmployeeShift',
  ShiftAttendanceRule: 'ShiftAttendanceRule',
  TaxRule: 'TaxRule',
  TaxBracket: 'TaxBracket',
  SystemLog: 'SystemLog',
  EmployeeReporting: 'EmployeeReporting',
  KpiUpdate: 'KpiUpdate'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
