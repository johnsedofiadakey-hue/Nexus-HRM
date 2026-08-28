import prisma from '../prisma/client';

const MIN_KPIS = 2;
const MAX_KPIS = 3;
const MIN_SUB_INDICATORS = 2;
const MAX_SUB_INDICATORS = 4;

interface SubIndicatorInput {
  question: string;
  situationWeight?: number;
  taskWeight?: number;
  actionWeight?: number;
  resultWeight?: number;
}

interface KpiInput {
  title: string;
  description?: string;
  subIndicators: SubIndicatorInput[];
}

interface TemplateInput {
  departmentId: number;
  jobTitle?: string | null;
  welcomeMessage?: string;
  requireManagerReview?: boolean;
  requireDepartmentHeadReview?: boolean;
  requireHrReview?: boolean;
  departmentHeadId?: string | null;
  selfManagerBlendRatio?: number;
  gapAlertThreshold?: number;
  kpis: KpiInput[];
}

function validateStarWeights(sub: SubIndicatorInput, kpiTitle: string, index: number) {
  const situation = sub.situationWeight ?? 15;
  const task = sub.taskWeight ?? 10;
  const action = sub.actionWeight ?? 60;
  const result = sub.resultWeight ?? 15;

  const label = `KPI "${kpiTitle}", question ${index + 1}`;

  if (situation < 10 || situation > 20) {
    throw new Error(`${label}: Situation weight must be between 10 and 20 (got ${situation})`);
  }
  if (result < 10 || result > 20) {
    throw new Error(`${label}: Result weight must be between 10 and 20 (got ${result})`);
  }
  if (task !== 10) {
    throw new Error(`${label}: Task weight must be exactly 10 (got ${task})`);
  }
  if (action !== 60) {
    throw new Error(`${label}: Action weight must be exactly 60 (got ${action})`);
  }
  const total = situation + task + action + result;
  if (total !== 100) {
    throw new Error(`${label}: STAR weights must total 100 (got ${total})`);
  }

  return { situationWeight: situation, taskWeight: task, actionWeight: action, resultWeight: result };
}

function validateTemplateShape(input: TemplateInput) {
  if (!input.kpis || input.kpis.length < MIN_KPIS || input.kpis.length > MAX_KPIS) {
    throw new Error(`A template must have between ${MIN_KPIS} and ${MAX_KPIS} KPIs (got ${input.kpis?.length ?? 0})`);
  }

  for (const kpi of input.kpis) {
    if (!kpi.title?.trim()) {
      throw new Error('Every KPI must have a title');
    }
    if (!kpi.subIndicators || kpi.subIndicators.length < MIN_SUB_INDICATORS || kpi.subIndicators.length > MAX_SUB_INDICATORS) {
      throw new Error(
        `KPI "${kpi.title}" must have between ${MIN_SUB_INDICATORS} and ${MAX_SUB_INDICATORS} sub-indicator questions (got ${kpi.subIndicators?.length ?? 0})`
      );
    }
    kpi.subIndicators.forEach((sub, i) => {
      if (!sub.question?.trim()) {
        throw new Error(`KPI "${kpi.title}", question ${i + 1}: question text is required`);
      }
      validateStarWeights(sub, kpi.title, i);
    });
  }

  if (input.selfManagerBlendRatio !== undefined) {
    if (input.selfManagerBlendRatio < 0 || input.selfManagerBlendRatio > 1) {
      throw new Error('Self/manager blend ratio must be between 0 and 1');
    }
  }
}

export class AppraisalTemplateService {
  /**
   * Fetch the active template for a department (optionally scoped to a specific job title).
   * Falls back to the department-wide template (jobTitle: null) if no job-title-specific one exists.
   */
  static async getForDepartment(organizationId: string, departmentId: number, jobTitle?: string | null) {
    if (jobTitle) {
      const specific = await prisma.appraisalTemplate.findFirst({
        where: { organizationId, departmentId, jobTitle, isActive: true },
        include: { kpis: { include: { subIndicators: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } }
      });
      if (specific) return specific;
    }

    return prisma.appraisalTemplate.findFirst({
      where: { organizationId, departmentId, jobTitle: null, isActive: true },
      include: { kpis: { include: { subIndicators: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } }
    });
  }

  static async getById(organizationId: string, id: string) {
    const template = await prisma.appraisalTemplate.findFirst({
      where: { id, organizationId },
      include: { kpis: { include: { subIndicators: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } }
    });
    if (!template) throw new Error('Template not found');
    return template;
  }

  static async listForOrg(organizationId: string) {
    return prisma.appraisalTemplate.findMany({
      where: { organizationId, isActive: true },
      include: {
        department: { select: { name: true } },
        kpis: { select: { id: true } }
      },
      orderBy: [{ departmentId: 'asc' }, { jobTitle: 'asc' }]
    });
  }

  /**
   * Create or replace the active template for a department (+ optional job title).
   * Editing an existing template updates it in place and bumps its version —
   * packets already snapshot their own copy at cycle-start time, so this never
   * disturbs an appraisal already in progress (see AppraisalPacket.templateSnapshot).
   */
  static async upsert(organizationId: string, userId: string, input: TemplateInput) {
    validateTemplateShape(input);

    const department = await prisma.department.findFirst({ where: { id: input.departmentId, organizationId } });
    if (!department) throw new Error('Department not found');

    const existing = await prisma.appraisalTemplate.findFirst({
      where: { organizationId, departmentId: input.departmentId, jobTitle: input.jobTitle || null, isActive: true }
    });

    return prisma.$transaction(async (tx) => {
      let template;

      if (existing) {
        // Replace the KPI tree wholesale — simpler and safer than diffing, and
        // safe because in-progress packets already hold their own snapshot.
        await tx.appraisalTemplateKpi.deleteMany({ where: { templateId: existing.id } });

        template = await tx.appraisalTemplate.update({
          where: { id: existing.id },
          data: {
            welcomeMessage: input.welcomeMessage,
            requireManagerReview: input.requireManagerReview ?? true,
            requireDepartmentHeadReview: input.requireDepartmentHeadReview ?? false,
            requireHrReview: input.requireHrReview ?? false,
            departmentHeadId: input.departmentHeadId || null,
            selfManagerBlendRatio: input.selfManagerBlendRatio ?? 0.2,
            gapAlertThreshold: input.gapAlertThreshold ?? 15,
            version: { increment: 1 }
          }
        });
      } else {
        template = await tx.appraisalTemplate.create({
          data: {
            organizationId,
            departmentId: input.departmentId,
            jobTitle: input.jobTitle || null,
            welcomeMessage: input.welcomeMessage,
            requireManagerReview: input.requireManagerReview ?? true,
            requireDepartmentHeadReview: input.requireDepartmentHeadReview ?? false,
            requireHrReview: input.requireHrReview ?? false,
            departmentHeadId: input.departmentHeadId || null,
            selfManagerBlendRatio: input.selfManagerBlendRatio ?? 0.2,
            gapAlertThreshold: input.gapAlertThreshold ?? 15,
            createdById: userId
          }
        });
      }

      for (let kpiOrder = 0; kpiOrder < input.kpis.length; kpiOrder++) {
        const kpiInput = input.kpis[kpiOrder];
        const kpi = await tx.appraisalTemplateKpi.create({
          data: {
            templateId: template.id,
            title: kpiInput.title,
            description: kpiInput.description || null,
            order: kpiOrder
          }
        });

        for (let subOrder = 0; subOrder < kpiInput.subIndicators.length; subOrder++) {
          const sub = kpiInput.subIndicators[subOrder];
          const weights = validateStarWeights(sub, kpiInput.title, subOrder);
          await tx.appraisalTemplateSubIndicator.create({
            data: {
              kpiId: kpi.id,
              question: sub.question,
              order: subOrder,
              ...weights
            }
          });
        }
      }

      return tx.appraisalTemplate.findUnique({
        where: { id: template.id },
        include: { kpis: { include: { subIndicators: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } }
      });
    });
  }

  /**
   * Retire a template. Soft-delete only — packets that already snapshotted it
   * keep working; this just stops it being handed out to new cycles.
   */
  static async deactivate(organizationId: string, id: string) {
    const template = await prisma.appraisalTemplate.findFirst({ where: { id, organizationId } });
    if (!template) throw new Error('Template not found');

    return prisma.appraisalTemplate.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
