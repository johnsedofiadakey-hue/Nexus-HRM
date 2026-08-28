import { Request, Response } from 'express';
import { AppraisalTemplateService } from '../services/appraisal-template.service';
import { getOrgId } from './enterprise.controller';
import { logAction } from '../services/audit.service';

export const listTemplates = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) ?? 'default-tenant';
    const templates = await AppraisalTemplateService.listForOrg(organizationId);
    return res.json(templates);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getTemplateForDepartment = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) ?? 'default-tenant';
    const departmentId = parseInt(req.query.departmentId as string, 10);
    const jobTitle = (req.query.jobTitle as string) || undefined;

    if (isNaN(departmentId)) {
      return res.status(400).json({ error: 'departmentId is required' });
    }

    const template = await AppraisalTemplateService.getForDepartment(organizationId, departmentId, jobTitle);
    return res.json(template);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) ?? 'default-tenant';
    const template = await AppraisalTemplateService.getById(organizationId, req.params.id);
    return res.json(template);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
};

export const upsertTemplate = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) ?? 'default-tenant';
    const userId = req.user.id;

    const template = await AppraisalTemplateService.upsert(organizationId, userId, req.body);

    await logAction(userId, 'APPRAISAL_TEMPLATE_SAVED', 'AppraisalTemplate', template!.id, {
      departmentId: template!.departmentId,
      jobTitle: template!.jobTitle
    }, req.ip);

    return res.status(200).json(template);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const deactivateTemplate = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) ?? 'default-tenant';
    const template = await AppraisalTemplateService.deactivate(organizationId, req.params.id);

    await logAction(req.user.id, 'APPRAISAL_TEMPLATE_DEACTIVATED', 'AppraisalTemplate', template.id, {}, req.ip);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
