import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
  auditMiddleware: vi.fn(),
}));

import prisma from '../prisma/client';
import { AppraisalTemplateService } from '../services/appraisal-template.service';

const ORG_ID = 'org-test';
const DEPT_ID = 1;
const MD_ID = 'md-001';

const validSubIndicator = (question: string) => ({
  question,
  situationWeight: 15,
  taskWeight: 10,
  actionWeight: 60,
  resultWeight: 15,
});

const validKpi = (title: string) => ({
  title,
  description: 'desc',
  subIndicators: [validSubIndicator('Q1'), validSubIndicator('Q2')],
});

const validInput = () => ({
  departmentId: DEPT_ID,
  welcomeMessage: 'Welcome',
  requireManagerReview: true,
  requireDepartmentHeadReview: false,
  requireHrReview: false,
  selfManagerBlendRatio: 0.2,
  gapAlertThreshold: 15,
  kpis: [validKpi('Collections'), validKpi('Accuracy')],
});

describe('AppraisalTemplateService — validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (prisma.department as any).findFirst = vi.fn().mockResolvedValue({ id: DEPT_ID, organizationId: ORG_ID });
    (prisma.appraisalTemplate as any).findFirst = vi.fn().mockResolvedValue(null);
    (prisma.$transaction as any) = vi.fn().mockImplementation(async (fn: any) => fn(prisma));
    (prisma.appraisalTemplate as any).create = vi.fn().mockResolvedValue({ id: 'tmpl-1', departmentId: DEPT_ID });
    (prisma.appraisalTemplate as any).update = vi.fn().mockResolvedValue({ id: 'tmpl-1', departmentId: DEPT_ID });
    (prisma.appraisalTemplate as any).findUnique = vi.fn().mockResolvedValue({ id: 'tmpl-1', kpis: [] });
    (prisma.appraisalTemplateKpi as any).create = vi.fn().mockResolvedValue({ id: 'kpi-1' });
    (prisma.appraisalTemplateKpi as any).deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    (prisma.appraisalTemplateSubIndicator as any).create = vi.fn().mockResolvedValue({ id: 'sub-1' });
  });

  it('rejects fewer than 2 KPIs', async () => {
    const input = { ...validInput(), kpis: [validKpi('Only One')] };
    await expect(AppraisalTemplateService.upsert(ORG_ID, MD_ID, input)).rejects.toThrow('between 2 and 3 KPIs');
  });

  it('rejects more than 3 KPIs', async () => {
    const input = { ...validInput(), kpis: [validKpi('A'), validKpi('B'), validKpi('C'), validKpi('D')] };
    await expect(AppraisalTemplateService.upsert(ORG_ID, MD_ID, input)).rejects.toThrow('between 2 and 3 KPIs');
  });

  it('rejects a KPI with only 1 sub-indicator', async () => {
    const input = { ...validInput(), kpis: [{ title: 'Solo', subIndicators: [validSubIndicator('Q1')] }, validKpi('B')] };
    await expect(AppraisalTemplateService.upsert(ORG_ID, MD_ID, input)).rejects.toThrow('between 2 and 4 sub-indicator');
  });

  it('rejects STAR weights that do not total 100', async () => {
    const input = {
      ...validInput(),
      kpis: [
        { title: 'A', subIndicators: [{ question: 'Q1', situationWeight: 25, taskWeight: 10, actionWeight: 60, resultWeight: 15 }, validSubIndicator('Q2')] },
        validKpi('B'),
      ],
    };
    await expect(AppraisalTemplateService.upsert(ORG_ID, MD_ID, input)).rejects.toThrow('Situation weight must be between 10 and 20');
  });

  it('rejects a fixed Task weight that has been changed', async () => {
    const input = {
      ...validInput(),
      kpis: [
        { title: 'A', subIndicators: [{ question: 'Q1', situationWeight: 15, taskWeight: 20, actionWeight: 50, resultWeight: 15 }, validSubIndicator('Q2')] },
        validKpi('B'),
      ],
    };
    await expect(AppraisalTemplateService.upsert(ORG_ID, MD_ID, input)).rejects.toThrow('Task weight must be exactly 10');
  });

  it('accepts a valid 2-KPI, 2-sub-indicator template', async () => {
    const result = await AppraisalTemplateService.upsert(ORG_ID, MD_ID, validInput());
    expect(result).toBeTruthy();
    expect((prisma.appraisalTemplate as any).create).toHaveBeenCalled();
  });

  it('throws if the department does not exist', async () => {
    (prisma.department as any).findFirst = vi.fn().mockResolvedValue(null);
    await expect(AppraisalTemplateService.upsert(ORG_ID, MD_ID, validInput())).rejects.toThrow('Department not found');
  });
});
