import { beforeEach, describe, expect, it } from 'vitest';
import prisma from '../prisma/client';
import { PdfExportService } from '../services/pdf.service';

// Counts real `/Type /Page` objects (not `/Type /Pages`, the container) in the
// raw PDF byte stream — a reliable heuristic for PDFKit's deterministic output
// when bufferPages is enabled, without depending on an external PDF library.
const countPages = (buf: Buffer): number => {
  const text = buf.toString('latin1');
  return (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
};

const org = {
  name: 'MC-BAUCHEMIE',
  logoUrl: null,
  primaryColor: '#4F46E5',
  address: 'Conakry',
  phone: '+224 000 000',
  email: 'hr@mc.com',
  city: 'Conakry',
  country: 'Guinea',
  currency: 'GNF',
};

describe('PdfExportService — single-sheet pagination', () => {
  beforeEach(() => {
    (prisma.organization.findUnique as any).mockResolvedValue(org);
  });

  it('keeps a short leave certificate to a single page', async () => {
    const leave = {
      id: 'abcdef1234567890',
      employee: {
        fullName: 'Test Account', leaveBalance: 20, leaveAllowance: 24, leaveBroughtForward: 0,
        organization: { defaultLeaveAllowance: 24 }, signatureUrl: null,
      },
      leaveType: 'Annual', startDate: new Date('2026-08-01'), endDate: new Date('2026-08-05'), leaveDays: 3,
      reason: 'Family vacation and rest before Q4 starts.',
      reliever: null, relieverStatus: null, handoverAcknowledged: false,
      hrReviewer: { fullName: 'MD Person', signatureUrl: null }, manager: null,
    };

    const buf = await PdfExportService.generateBrandedPdf('default-tenant', 'Leave Certificate', leave, 'LEAVE', 'en');
    expect(countPages(buf)).toBe(1);
  });

  it('keeps a leave certificate with a reliever and a longer reason to a single page', async () => {
    const leave = {
      id: 'abcdef1234567890',
      employee: {
        fullName: 'Test Account', leaveBalance: 20, leaveAllowance: 24, leaveBroughtForward: 0,
        organization: { defaultLeaveAllowance: 24 }, signatureUrl: null,
      },
      leaveType: 'Annual', startDate: new Date('2026-08-01'), endDate: new Date('2026-08-10'), leaveDays: 7,
      reason: 'Taking time off to visit family abroad and attend a family wedding ceremony, will be reachable by email for urgent matters only.',
      reliever: { fullName: 'Jane Reliever' }, relieverStatus: 'ACCEPTED', handoverAcknowledged: true,
      hrReviewer: { fullName: 'MD Person', signatureUrl: null }, manager: null,
    };

    const buf = await PdfExportService.generateBrandedPdf('default-tenant', 'Leave Certificate', leave, 'LEAVE', 'en');
    expect(countPages(buf)).toBe(1);
  });

  it('keeps a typical payslip to a single page', async () => {
    const payslip = {
      employee: { fullName: 'Test Account', employeeCode: 'MC-001', jobTitle: 'Staff', bankName: 'Ecobank', bankAccountNumber: '123456' },
      run: { period: 'July 2026', updatedAt: new Date() },
      baseSalary: 5000000, overtime: 0, bonus: 0, allowances: 200000,
      tax: 500000, ssnit: 250000, otherDeductions: 0,
      grossPay: 5200000, netPay: 4450000, notes: '',
    };

    const buf = await PdfExportService.generateBrandedPdf('default-tenant', 'Payslip', payslip, 'PAYSLIP');
    expect(countPages(buf)).toBe(1);
  });

  it('keeps a short single-review appraisal to a single page', async () => {
    const appraisal = {
      employee: { fullName: 'Test Account', signatureUrl: null },
      cycle: { title: 'Q2 2026 Review' },
      finalScore: 85, finalVerdict: 'Strong performance this cycle.',
      arbitrationLogic: 'MANAGER_REC',
      finalReviewer: { signatureUrl: null },
      reviews: [
        { reviewStage: 'MANAGER_REVIEW', reviewer: { fullName: 'Manager Name' }, overallRating: 4.2, summary: 'Solid quarter overall.', strengths: 'Great communication.', weaknesses: null, developmentNeeds: null, responses: null },
      ],
    };

    const buf = await PdfExportService.generateBrandedPdf('default-tenant', 'Appraisal', appraisal, 'APPRAISAL');
    expect(countPages(buf)).toBe(1);
  });

  it('still spans multiple pages for a genuinely long appraisal (does not suppress real pagination)', async () => {
    const longReview = (stage: string) => ({
      reviewStage: stage,
      reviewer: { fullName: 'Reviewer ' + stage },
      overallRating: 4.0,
      summary: 'A very detailed executive summary. '.repeat(30),
      strengths: 'Detailed strengths analysis. '.repeat(20),
      weaknesses: 'Detailed weaknesses analysis. '.repeat(20),
      developmentNeeds: 'Detailed development plan. '.repeat(20),
      responses: JSON.stringify({
        competencyScores: Array.from({ length: 6 }, (_, i) => ({
          category: `Competency Category ${i + 1}`,
          categoryAverage: 4.1,
          competencies: Array.from({ length: 5 }, (_, j) => ({ name: `Skill ${i}-${j}`, score: 4, comment: 'Some detailed qualitative comment about this skill area.' })),
        })),
      }),
    });
    const appraisal = {
      employee: { fullName: 'Test Account', signatureUrl: null },
      cycle: { title: 'Annual 2026 Review' },
      finalScore: 88, finalVerdict: 'Comprehensive review complete.',
      arbitrationLogic: 'WEIGHTED_AVG',
      finalReviewer: { signatureUrl: null },
      reviews: [longReview('SELF_REVIEW'), longReview('MANAGER_REVIEW'), longReview('HR')],
    };

    const buf = await PdfExportService.generateBrandedPdf('default-tenant', 'Appraisal', appraisal, 'APPRAISAL');
    expect(countPages(buf)).toBeGreaterThan(1);
  });
});
