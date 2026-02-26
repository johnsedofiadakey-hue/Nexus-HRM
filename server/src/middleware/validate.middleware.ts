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
    req.body = result.data; // Use sanitized/coerced data
    next();
  };
};

// ─── SCHEMAS ──────────────────────────────────────────────────────────────

const str = (max = 255) => z.string().trim().min(1).max(max);
const optStr = (max = 255) => z.string().trim().max(max).optional();
const email = z.string().email().trim().toLowerCase().max(255);
const password = z.string().min(8).max(128);

export const LoginSchema = z.object({
  email: email,
  password: z.string().min(1).max(128)
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password
});

export const ForgotPasswordSchema = z.object({
  email: email
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1).max(128),
  newPassword: password
});

export const CreateUserSchema = z.object({
  email: email,
  fullName: str(100),
  role: z.enum(['MD', 'SUPERVISOR', 'EMPLOYEE', 'HR_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']),
  jobTitle: str(100),
  department: optStr(100),
  departmentId: z.number().int().positive().optional(),
  employeeCode: optStr(30),
  password: optStr(128),
  status: z.enum(['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED']).optional(),
  joinDate: z.string().optional(),
  supervisorId: optStr(36),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(),
  nationalId: optStr(30),
  contactNumber: optStr(20),
  address: optStr(300),
  nextOfKinName: optStr(100),
  nextOfKinRelation: optStr(50),
  nextOfKinContact: optStr(20),
  salary: z.number().min(0).max(999999999).optional(),
  currency: z.enum(['GHS', 'USD', 'EUR', 'GBP', 'GNF']).optional(),
  dob: z.string().optional()
});

export const PayrollRunSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  employeeIds: z.array(z.string().uuid()).optional()
});

export const LeaveRequestSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: str(500),
  leaveType: z.enum(['Annual', 'Sick', 'Maternity', 'Paternity', 'Emergency', 'Unpaid', 'Other']).optional(),
  relieverId: optStr(36)
});

export const OnboardingTemplateSchema = z.object({
  name: str(100),
  description: optStr(500),
  tasks: z.array(z.object({
    title: str(200),
    description: optStr(500),
    category: z.enum(['HR', 'IT', 'Admin', 'Manager', 'General']).default('General'),
    dueAfterDays: z.number().int().min(0).max(365).default(1),
    isRequired: z.boolean().default(true)
  })).optional()
});
