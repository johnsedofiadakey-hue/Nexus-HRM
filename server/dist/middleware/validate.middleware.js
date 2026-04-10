"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantSignupSchema = exports.OnboardingTemplateSchema = exports.LeaveRequestSchema = exports.PayrollRunSchema = exports.CreateUserSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.ChangePasswordSchema = exports.LoginSchema = exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Generic Zod validation middleware.
 * Usage: router.post('/route', validate(MySchema), controller)
 */
const validate = (schema) => {
    return (req, res, next) => {
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
exports.validate = validate;
// ─── SCHEMAS ──────────────────────────────────────────────────────────────
const str = (max = 255) => zod_1.z.string().trim().min(1).max(max);
const optStr = (max = 255) => zod_1.z.string().trim().max(max).optional();
const email = zod_1.z.string().email().trim().toLowerCase().max(255);
const password = zod_1.z.string().min(8).max(128);
exports.LoginSchema = zod_1.z.object({
    email: email,
    password: zod_1.z.string().min(1).max(128)
});
exports.ChangePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1).max(128),
    newPassword: password
});
exports.ForgotPasswordSchema = zod_1.z.object({
    email: email
});
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1).max(128),
    newPassword: password
});
exports.CreateUserSchema = zod_1.z.object({
    email: email,
    fullName: str(100),
    role: zod_1.z.enum(['DEV', 'MD', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'STAFF', 'CASUAL']),
    jobTitle: str(100),
    department: optStr(100),
    departmentId: zod_1.z.number().int().positive().optional(),
    employeeCode: optStr(30),
    password: optStr(128),
    status: zod_1.z.enum(['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED']).optional(),
    joinDate: zod_1.z.string().optional(),
    supervisorId: optStr(36),
    gender: zod_1.z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(),
    nationalId: optStr(30),
    contactNumber: optStr(20),
    address: optStr(300),
    nextOfKinName: optStr(100),
    nextOfKinRelation: optStr(50),
    nextOfKinContact: optStr(20),
    salary: zod_1.z.number().min(0).max(999999999).optional(),
    currency: zod_1.z.enum(['GHS', 'USD', 'EUR', 'GBP', 'GNF']).optional(),
    dob: zod_1.z.string().optional()
});
exports.PayrollRunSchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12),
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
    employeeIds: zod_1.z.array(zod_1.z.string().uuid()).optional()
});
exports.LeaveRequestSchema = zod_1.z.object({
    startDate: zod_1.z.string().min(1),
    endDate: zod_1.z.string().min(1),
    reason: str(500),
    leaveType: zod_1.z.enum(['Annual', 'Sick', 'Maternity', 'Paternity', 'Emergency', 'Unpaid', 'Other']).optional(),
    relieverId: optStr(36)
});
exports.OnboardingTemplateSchema = zod_1.z.object({
    name: str(100),
    description: optStr(500),
    tasks: zod_1.z.array(zod_1.z.object({
        title: str(200),
        description: optStr(500),
        category: zod_1.z.enum(['HR', 'IT', 'Admin', 'Manager', 'General']).default('General'),
        dueAfterDays: zod_1.z.number().int().min(0).max(365).default(1),
        isRequired: zod_1.z.boolean().default(true)
    })).optional()
});
exports.TenantSignupSchema = zod_1.z.object({
    fullName: str(100),
    email: email,
    password: password,
    companyName: str(200),
    phone: optStr(20),
    city: optStr(100),
    country: optStr(100),
});
