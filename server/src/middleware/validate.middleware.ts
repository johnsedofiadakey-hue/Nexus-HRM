import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Generic Zod validation middleware.
 * Usage: router.post('/route', validate(MySchema), controller)
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.body = result.data;
    next();
  };
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const str = (max = 255) => z.string().trim().min(1).max(max);
const optStr = (max = 255) => z.string().trim().max(max).optional();
const email = z.string().email().trim().toLowerCase().max(255);
const uuid = z.string().uuid();
const optUuid = z.string().uuid().optional();
const isoDate = z.string().min(1).refine(v => !isNaN(Date.parse(v)), { message: 'Must be a valid date string' });
const optIsoDate = z.string().refine(v => !v || !isNaN(Date.parse(v)), { message: 'Must be a valid date string' }).optional();
const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email,
  password: z.string().min(1).max(128)
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: password
});

export const ForgotPasswordSchema = z.object({ email });

export const ResetPasswordSchema = z.object({
  token: z.string().min(1).max(128),
  newPassword: password
});

export const TenantSignupSchema = z.object({
  fullName: str(100),
  email,
  password,
  companyName: str(200),
  phone: optStr(20),
  city: optStr(100),
  country: optStr(100),
});

// ─── USER / EMPLOYEE ──────────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  email,
  fullName: str(100),
  role: z.enum(['DEV', 'MD', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'STAFF', 'CASUAL']),
  jobTitle: str(100),
  department: optStr(100),
  departmentId: z.number().int().positive().optional(),
  employeeCode: optStr(30),
  password: optStr(128),
  status: z.enum(['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED']).optional(),
  joinDate: optIsoDate,
  supervisorId: optUuid,
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(),
  nationalId: optStr(30),
  contactNumber: optStr(20),
  address: optStr(300),
  nextOfKinName: optStr(100),
  nextOfKinRelation: optStr(50),
  nextOfKinContact: optStr(20),
  salary: z.number().min(0).max(999999999).optional(),
  currency: z.enum(['GHS', 'USD', 'EUR', 'GBP', 'GNF']).optional(),
  dob: optIsoDate,
  subUnitId: optUuid,
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ email: true });

export const AssignRoleSchema = z.object({
  userId: uuid,
  role: z.enum(['MD', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'STAFF', 'CASUAL']),
  supervisorId: optUuid,
});

// ─── LEAVE ────────────────────────────────────────────────────────────────────
export const LeaveRequestSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  reason: str(500),
  leaveType: z.enum(['Annual', 'Sick', 'Maternity', 'Paternity', 'Emergency', 'Unpaid', 'Other']).optional(),
  relieverId: optUuid,
  handoverNotes: optStr(1000),
  relieverAcceptanceRequired: z.boolean().optional(),
});

export const LeaveDaysSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
});

export const ProcessLeaveSchema = z.object({
  id: uuid,
  action: z.enum(['APPROVE', 'REJECT', 'CANCEL']),
  comment: optStr(500),
  role: optStr(50),
});

export const AdjustLeaveBalanceSchema = z.object({
  targetUserId: uuid,
  leaveBalance: z.number().min(0).max(365).optional(),
  leaveAllowance: z.number().min(0).max(365).optional(),
  leaveBroughtForward: z.number().min(0).max(365).optional(),
  reason: str(500),
});

// ─── PAYROLL ─────────────────────────────────────────────────────────────────
export const PayrollRunSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  employeeIds: z.array(uuid).optional(),
});

export const UpdatePayrollItemSchema = z.object({
  bonus: z.number().min(0).max(999999999).optional(),
  deductions: z.number().min(0).max(999999999).optional(),
  notes: optStr(500),
  allowances: z.record(z.number()).optional(),
});

// ─── KPI ──────────────────────────────────────────────────────────────────────
const KpiItemSchema = z.object({
  name: str(200),
  category: optStr(100),
  description: optStr(500),
  targetValue: z.number().min(0),
  weight: z.number().min(0).max(100).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL']).optional(),
  metricType: z.enum(['NUMERIC', 'PERCENTAGE', 'BOOLEAN', 'CURRENCY']).optional(),
  startDate: optIsoDate,
  endDate: optIsoDate,
});

export const AssignKpiSchema = z.object({
  title: str(200),
  employeeId: optUuid,
  targetDepartmentId: z.number().int().positive().optional(),
  isTemplate: z.boolean().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  items: z.array(KpiItemSchema).min(1),
});

export const ReviewKpiSchema = z.object({
  sheetId: uuid,
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_REVISION']),
  feedback: optStr(1000),
});

export const UpdateKpiProgressSchema = z.object({
  sheetId: uuid,
  items: z.array(z.object({
    id: uuid,
    actualValue: z.number(),
    note: optStr(500),
  })).min(1),
  submit: z.boolean().optional(),
});

export const AssignKpiFromTemplateSchema = z.object({
  templateId: uuid,
  employeeId: uuid,
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

// ─── TARGET ───────────────────────────────────────────────────────────────────
const TargetMetricSchema = z.object({
  title: str(200),
  description: optStr(500),
  metricType: z.enum(['NUMERICAL', 'PERCENTAGE', 'BOOLEAN', 'QUALITATIVE', 'CURRENCY']).optional(),
  targetValue: z.number().optional(),
  unit: optStr(50),
  currency: optStr(10),
  weight: z.number().min(0).max(100).optional(),
  qualitativePrompt: optStr(500),
});

export const CreateTargetSchema = z.object({
  title: str(200),
  description: optStr(1000),
  level: z.enum(['INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'COMPANY']).optional(),
  type: z.enum(['SINGLE', 'CASCADED']).optional(),
  dueDate: optIsoDate,
  weight: z.number().min(0).max(100).optional(),
  departmentId: z.number().int().positive().optional(),
  assigneeId: optUuid,
  lineManagerId: optUuid,
  reviewerId: optUuid,
  parentTargetId: optUuid,
  metrics: z.array(TargetMetricSchema).optional(),
});

export const UpdateTargetSchema = CreateTargetSchema.partial();

export const UpdateTargetProgressSchema = z.object({
  metricUpdates: z.array(z.object({
    metricId: uuid,
    value: z.number().optional(),
    comment: optStr(500),
    attachmentUrl: optStr(500),
  })).optional(),
  updates: z.array(z.object({
    metricId: uuid,
    value: z.number().optional(),
    comment: optStr(500),
  })).optional(),
  submit: z.boolean().optional(),
});

export const ReviewTargetSchema = z.object({
  approved: z.boolean(),
  feedback: optStr(1000),
});

export const CascadeTargetSchema = z.object({
  assignments: z.array(z.object({
    assigneeId: uuid,
    weight: z.number().min(0).max(100).optional(),
    dueDate: optIsoDate,
  })).min(1),
});

export const AcknowledgeTargetSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'DISPUTED']).optional(),
  message: optStr(500),
});

// ─── APPRAISAL ───────────────────────────────────────────────────────────────
export const InitAppraisalCycleSchema = z.object({
  title: str(200),
  period: optStr(100),
  startDate: isoDate,
  endDate: isoDate,
  description: optStr(500),
});

export const AppraisalReviewSchema = z.object({
  selfReview: optStr(2000),
  selfScore: z.number().min(0).max(100).optional(),
  managerReview: optStr(2000),
  managerScore: z.number().min(0).max(100).optional(),
  competencies: z.array(z.object({
    competencyId: uuid,
    score: z.number().min(0).max(5),
    comment: optStr(500),
  })).optional(),
});

export const FinalSignOffSchema = z.object({
  packetId: uuid,
  finalVerdict: z.enum(['EXCEEDS', 'MEETS', 'BELOW', 'UNSATISFACTORY']),
  finalScore: z.number().min(0).max(100).optional(),
  arbitrationLogic: optStr(1000),
  assignedTargets: z.array(z.string()).optional(),
});

export const DisputeSchema = z.object({
  reason: str(1000),
});

export const ResolveDisputeSchema = z.object({
  resolution: str(1000),
  finalScore: z.number().min(0).max(100).optional(),
  finalVerdict: z.enum(['EXCEEDS', 'MEETS', 'BELOW', 'UNSATISFACTORY']).optional(),
});

export const UpdateAppraisalCycleSchema = z.object({
  title: optStr(200),
  period: optStr(100),
  startDate: optIsoDate,
  endDate: optIsoDate,
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']).optional(),
});

// ─── PERFORMANCE V2 ───────────────────────────────────────────────────────────
export const CreateDeptKpiSchema = z.object({
  departmentId: z.number().int().positive(),
  title: str(200),
  description: optStr(500),
  metricType: z.enum(['NUMERICAL', 'PERCENTAGE', 'BOOLEAN', 'QUALITATIVE', 'CURRENCY']).optional(),
  targetValue: z.number().optional(),
  measurementPeriod: optStr(50),
});

export const CreateTeamTargetSchema = z.object({
  departmentKpiId: uuid,
  title: str(200),
  description: optStr(500),
  metricType: z.enum(['NUMERICAL', 'PERCENTAGE', 'BOOLEAN', 'QUALITATIVE', 'CURRENCY']).optional(),
  targetValue: z.number().optional(),
  measurementPeriod: optStr(50),
  teamName: optStr(100),
});

export const CreateEmployeeTargetSchema = z.object({
  teamTargetId: uuid,
  employeeId: uuid,
  title: str(200),
  description: optStr(500),
  metricType: z.enum(['NUMERICAL', 'PERCENTAGE', 'BOOLEAN', 'QUALITATIVE', 'CURRENCY']).optional(),
  targetValue: z.number().optional(),
  measurementPeriod: optStr(50),
});

export const CreateReviewSchema = z.object({
  employeeId: uuid,
  cycleId: optUuid,
  selfReview: optStr(2000),
  selfScore: z.number().min(0).max(100).optional(),
});

export const ManagerReviewSchema = z.object({
  managerReview: str(2000),
  managerScore: z.number().min(0).max(100),
});

export const DirectorFinalizeSchema = z.object({
  directorReview: str(2000),
  directorScore: z.number().min(0).max(100),
  finalScore: z.number().min(0).max(100).optional(),
});

// ─── CYCLE ────────────────────────────────────────────────────────────────────
export const CreateCycleSchema = z.object({
  title: str(200),
  startDate: isoDate,
  endDate: isoDate,
  type: z.enum(['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY', 'CUSTOM']).optional(),
  description: optStr(500),
});

export const UpdateCycleStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']),
  title: optStr(200),
  startDate: optIsoDate,
  endDate: optIsoDate,
});

// ─── DEPARTMENT ───────────────────────────────────────────────────────────────
export const CreateDepartmentSchema = z.object({
  name: str(100),
  managerId: optUuid,
});

// ─── SUB-UNIT ─────────────────────────────────────────────────────────────────
export const CreateSubUnitSchema = z.object({
  name: str(100),
  departmentId: z.number().int().positive(),
  managerId: optUuid,
});

export const UpdateSubUnitSchema = z.object({
  name: optStr(100),
  managerId: optUuid,
});

// ─── ANNOUNCEMENT ─────────────────────────────────────────────────────────────
export const CreateAnnouncementSchema = z.object({
  title: str(200),
  body: str(5000),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  targetRoles: z.array(z.string()).optional(),
  targetDepartmentId: z.number().int().positive().optional(),
  expiresAt: optIsoDate,
});

// ─── SUPPORT / TICKETS ────────────────────────────────────────────────────────
export const CreateTicketSchema = z.object({
  subject: str(200),
  description: str(2000),
  category: z.enum(['IT', 'HR', 'PAYROLL', 'LEAVE', 'GENERAL', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
});

export const AddCommentSchema = z.object({
  content: str(2000),
  attachmentUrl: optStr(500),
});

export const UpdateTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  assignedToId: optUuid,
});

// ─── QUERY (EMPLOYEE QUERIES) ─────────────────────────────────────────────────
export const CreateQuerySchema = z.object({
  subject: str(200),
  description: str(2000),
});

export const UpdateQueryStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  resolution: optStr(1000),
});

// ─── ASSET ────────────────────────────────────────────────────────────────────
export const CreateAssetSchema = z.object({
  name: str(200),
  description: optStr(500),
  serialNumber: str(100),
  make: optStr(100),
  model: optStr(100),
  type: str(100),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED']).optional(),
  purchaseDate: optIsoDate,
  warrantyExpiry: optIsoDate,
  isCompanyProperty: z.boolean().optional(),
});

export const AssignAssetSchema = z.object({
  assetId: uuid,
  userId: uuid,
  condition: optStr(500),
});

export const ReturnAssetSchema = z.object({
  assetId: uuid,
  condition: optStr(500),
});

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
export const OnboardingTemplateSchema = z.object({
  name: str(100),
  description: optStr(500),
  tasks: z.array(z.object({
    title: str(200),
    description: optStr(500),
    category: z.enum(['HR', 'IT', 'Admin', 'Manager', 'General']).default('General'),
    dueAfterDays: z.number().int().min(0).max(365).default(1),
    isRequired: z.boolean().default(true),
  })).optional(),
});

export const StartOnboardingSchema = z.object({
  employeeId: uuid,
  templateId: uuid,
  startDate: optIsoDate,
});

export const CompleteOnboardingTaskSchema = z.object({
  itemId: uuid,
  notes: optStr(1000),
});

// ─── OFFBOARDING ─────────────────────────────────────────────────────────────
export const OffboardingTemplateSchema = z.object({
  name: str(100),
  description: optStr(500),
  tasks: z.array(z.object({
    title: str(200),
    description: optStr(500),
    category: optStr(100),
    isRequired: z.boolean().default(true),
  })).optional(),
});

export const InitiateOffboardingSchema = z.object({
  employeeId: uuid,
  effectiveDate: isoDate,
  reason: str(500),
  templateId: optUuid,
});

export const CompleteOffboardingTaskSchema = z.object({
  itemId: uuid,
  notes: optStr(1000),
});

export const UpdateExitInterviewSchema = z.object({
  interviewerId: optUuid,
  interviewDate: optIsoDate,
  feedback: optStr(2000),
  rehireEligible: z.boolean().optional(),
});

export const OffboardingAssetReturnSchema = z.object({
  offboardingId: uuid,
  assetId: uuid,
  conditionNotes: optStr(500),
});

// ─── RECRUITMENT ─────────────────────────────────────────────────────────────
export const CreateJobSchema = z.object({
  title: str(200),
  departmentId: z.number().int().positive().optional(),
  description: optStr(5000),
  location: optStr(200),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial().extend({
  status: z.enum(['OPEN', 'CLOSED', 'ON_HOLD', 'DRAFT']).optional(),
});

export const ApplyForJobSchema = z.object({
  jobPositionId: uuid,
  fullName: str(100),
  email,
  phone: optStr(20),
  resumeUrl: optStr(500),
  source: optStr(100),
  notes: optStr(1000),
});

export const UpdateCandidateStatusSchema = z.object({
  status: z.enum(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN']),
  notes: optStr(500),
});

export const ScheduleInterviewSchema = z.object({
  candidateId: uuid,
  stage: str(100),
  scheduledAt: isoDate,
  interviewerId: uuid,
});

export const InterviewFeedbackSchema = z.object({
  candidateId: uuid,
  interviewStageId: uuid,
  rating: z.number().min(1).max(5),
  feedback: str(2000),
  recommendation: z.enum(['ADVANCE', 'REJECT', 'HOLD']).optional(),
});

// ─── FINANCE ─────────────────────────────────────────────────────────────────
export const LoanRequestSchema = z.object({
  employeeId: optUuid,
  type: z.enum(['PERSONAL', 'EMERGENCY', 'EDUCATION', 'HOUSING', 'OTHER']).optional(),
  principalAmount: z.number().positive().max(999999999),
  monthsDuration: z.number().int().min(1).max(120),
  purpose: str(500),
});

export const ExpenseSubmitSchema = z.object({
  employeeId: optUuid,
  title: str(200),
  description: optStr(500),
  amount: z.number().positive().max(999999999),
  category: str(100),
});

// ─── EXPENSE CLAIMS ───────────────────────────────────────────────────────────
export const CreateExpenseClaimSchema = z.object({
  title: str(200),
  category: str(100),
  amount: z.number().positive().max(999999999),
  currency: z.enum(['GHS', 'USD', 'EUR', 'GBP', 'GNF']).optional(),
  description: optStr(500),
  receiptUrl: optStr(500),
});

export const RejectExpenseSchema = z.object({
  reason: str(500),
});

// ─── COMPENSATION ─────────────────────────────────────────────────────────────
export const CompensationRecordSchema = z.object({
  type: z.enum(['SALARY_CHANGE', 'BONUS', 'DEDUCTION', 'ALLOWANCE', 'OTHER']),
  previousSalary: z.number().min(0).optional(),
  newSalary: z.number().min(0).optional(),
  currency: z.enum(['GHS', 'USD', 'EUR', 'GBP', 'GNF']).optional(),
  reason: str(500),
  effectiveDate: isoDate,
});

// ─── HISTORY ─────────────────────────────────────────────────────────────────
export const CreateHistoryRecordSchema = z.object({
  employeeId: uuid,
  title: str(200),
  description: optStr(1000),
  change: optStr(500),
  type: str(100),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const UpdateHistoryStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

// ─── HOLIDAY ─────────────────────────────────────────────────────────────────
export const CreateHolidaySchema = z.object({
  name: str(200),
  date: isoDate,
  type: z.enum(['PUBLIC', 'RESTRICTED', 'COMPANY']).optional(),
  description: optStr(500),
});

// ─── TRAINING ─────────────────────────────────────────────────────────────────
export const CreateTrainingSchema = z.object({
  title: str(200),
  description: optStr(1000),
  provider: optStr(200),
  startDate: optIsoDate,
  endDate: optIsoDate,
  maxEnrollments: z.number().int().positive().optional(),
  isMandatory: z.boolean().optional(),
});

export const EnrollTrainingSchema = z.object({
  programId: uuid,
  employeeId: optUuid,
});

export const CompleteTrainingSchema = z.object({
  enrollmentId: uuid,
  score: z.number().min(0).max(100).optional(),
  certificate: optStr(500),
});

// ─── ORG CHART ────────────────────────────────────────────────────────────────
export const ReassignSupervisorSchema = z.object({
  employeeId: uuid,
  supervisorId: uuid,
});

// ─── REPORTING LINES ─────────────────────────────────────────────────────────
export const AddReportingLineSchema = z.object({
  employeeId: uuid,
  managerId: uuid,
  type: z.enum(['DIRECT', 'DOTTED']).optional(),
  isPrimary: z.boolean().optional(),
});

export const UpdateReportingLineSchema = z.object({
  type: z.enum(['DIRECT', 'DOTTED']).optional(),
  isPrimary: z.boolean().optional(),
  effectiveTo: optIsoDate,
});

// ─── ERP INTEGRATION ─────────────────────────────────────────────────────────
export const CreateErpIntegrationSchema = z.object({
  name: str(100),
  type: str(100),
  config: z.record(z.unknown()).optional(),
});
