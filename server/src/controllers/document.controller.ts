import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getEmployeeDocuments = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'default-tenant';
    const docs = await prisma.employeeDocument.findMany({
      where: { employeeId: req.params.id, organizationId },
      orderBy: { uploadedAt: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { title, category, fileUrl } = req.body;
    if (!title || !category || !fileUrl) return res.status(400).json({ error: 'Missing required fields' });
    
    const organizationId = req.user?.organizationId || 'default-tenant';
    const doc = await prisma.employeeDocument.create({
      data: {
        organizationId,
        employeeId: req.params.id,
        title,
        category,
        fileUrl
      }
    });
    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'default-tenant';
    await prisma.employeeDocument.deleteMany({ 
      where: { id: req.params.id, organizationId } 
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};
