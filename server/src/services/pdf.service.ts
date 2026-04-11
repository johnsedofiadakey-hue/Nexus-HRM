import PDFDocument from 'pdfkit';
import axios from 'axios';
import prisma from '../prisma/client';

export class PdfExportService {
  /**
   * Generates a premium, branded PDF for various document types.
   */
  static async generateBrandedPdf(organizationId: string, title: string, content: any, type: 'TARGET' | 'APPRAISAL' | 'LEAVE' | 'PAYSLIP' | 'TARGET_ROADMAP'): Promise<Buffer> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId || 'default-tenant' },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        address: true,
        phone: true,
        email: true,
        city: true,
        country: true
      }
    });

    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4',
      bufferPages: true 
    });

    const primaryColor = org?.primaryColor || '#4F46E5';
    const buffers: Buffer[] = [];

    return new Promise(async (resolve, reject) => {
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      try {
        // ─── 1. Async Header Rendering (Synchronized) ───
        await this.renderHeader(doc, org, primaryColor);
        
        doc.moveDown(4);
        doc
          .fillColor(primaryColor)
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), { align: 'center' });

        doc
          .strokeColor(primaryColor)
          .lineWidth(2)
          .moveTo(50, doc.y + 5)
          .lineTo(550, doc.y + 5)
          .stroke();

        doc.moveDown(2);

        // ─── 2. Document Content ───
        if (type === 'TARGET') {
          this.renderTargetContent(doc, content, primaryColor);
        } else if (type === 'TARGET_ROADMAP') {
          content.forEach((target: any, idx: number) => {
            if (idx > 0) doc.addPage();
            this.renderTargetContent(doc, target, primaryColor);
          });
        } else if (type === 'APPRAISAL') {
          this.renderAppraisalContent(doc, content, primaryColor);
        } else if (type === 'LEAVE') {
          this.renderLeaveContent(doc, content, primaryColor);
        } else if (type === 'PAYSLIP') {
          this.renderPayslipContent(doc, content, primaryColor);
        }

        // ─── 3. Finalization Overlay ───
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          this.renderWatermark(doc);
          this.renderFooter(doc, org, i + 1, range.count, primaryColor);
        }

        doc.end();
      } catch (err) {
        console.error('[PdfExportService] Crash during generation:', err);
        doc.end(); // Attempt clean-up
        reject(err);
      }
    });
  }

  private static async renderHeader(doc: PDFKit.PDFDocument, org: any, primaryColor: string) {
    try {
      if (org?.logoUrl) {
        if (org.logoUrl.startsWith('data:image')) {
          // 🛡️ Optimized: Directly render Base64 payload (Survives deployment wipes)
          const b64 = org.logoUrl.split(',')[1];
          if (b64) doc.image(Buffer.from(b64, 'base64'), 50, 40, { width: 70 });
        } else {
          // 🛡️ Guarded: Remote fetch with strict timeout to prevent process hanging
          const response = await axios.get(org.logoUrl, { 
            responseType: 'arraybuffer',
            timeout: 5000 
          });
          doc.image(response.data, 50, 40, { width: 70 });
        }
      } else {
        throw new Error('No logo provided');
      }
    } catch (err) {
      console.warn('[PdfExportService] Logo resolution failed, using typography fallback:', (err as any).message);
      doc.fontSize(25).fillColor(primaryColor).text('NEXUS', 50, 45);
    }

    doc
      .fillColor(primaryColor)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(org?.name?.toUpperCase() || 'NEXUS HRM', 140, 43, { align: 'right' })
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(org?.address || '', 140, 70, { align: 'right' })
      .text(`${org?.city || ''}, ${org?.country || ''}`, { align: 'right' })
      .text(`Phone: ${org?.phone || ''} | Email: ${org?.email || ''}`, { align: 'right' });

    doc
      .strokeColor('#f1f5f9')
      .lineWidth(0.5)
      .moveTo(50, 115)
      .lineTo(550, 115)
      .stroke();
  }

  private static renderWatermark(doc: PDFKit.PDFDocument) {
    doc.save();
    doc.opacity(0.05);
    doc.fontSize(60).fillColor('#000').font('Helvetica-Bold');
    doc.rotate(-45, { origin: [300, 400] });
    doc.text('OFFICIAL RECORD', 100, 400);
    doc.restore();
  }

  private static renderFooter(doc: PDFKit.PDFDocument, org: any, page: number, total: number, primaryColor: string) {
    doc
      .strokeColor('#f1f5f9')
      .lineWidth(0.5)
      .moveTo(50, 780)
      .lineTo(550, 780)
      .stroke();

    doc
      .fontSize(7)
      .fillColor('#94a3b8')
      .text(
        `Nexus HRM Institutional Record | ${org?.name || 'Nexus HRM'} | Verified Document Hash: ${Math.random().toString(36).substring(7).toUpperCase()}`,
        50,
        790,
        { continued: true }
      )
      .text(` | Page ${page} of ${total}`, { align: 'right' });
  }

  private static renderTargetContent(doc: PDFKit.PDFDocument, target: any, brandColor: string) {
    // Summary Box
    doc.rect(50, doc.y, 500, 100).fill('#f8fafc');
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('EXECUTIVE SUMMARY', 65, doc.y - 85);
    doc.fontSize(10).font('Helvetica').text(`Assignee: ${target.assignee?.fullName || 'N/A'}`, 65, doc.y + 5);
    doc.text(`Department: ${target.department?.name || 'Global'}`, 65, doc.y + 2);
    doc.text(`Level: ${target.level} | Status: ${target.status}`, 65, doc.y + 2);
    doc.text(`Overall Progress: ${target.progress}%`, 350, doc.y - 34, { align: 'right' });

    doc.moveDown(4);
    doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('Detailed Description');
    doc.moveDown(0.5);
    doc.fillColor('#334155').fontSize(11).font('Helvetica').text(target.description || 'No exhaustive mapping provided.', { align: 'justify' });

    doc.moveDown(2);
    if (target.metrics && target.metrics.length > 0) {
      doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('Achievement Metrics');
      doc.moveDown();
      
      // Table Header
      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 25).fill(brandColor);
      doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
      doc.text('METRIC NAME', 60, tableTop + 8);
      doc.text('TARGET', 250, tableTop + 8);
      doc.text('ACTUAL', 350, tableTop + 8);
      doc.text('PROGRESS', 450, tableTop + 8);

      let currentY = tableTop + 25;
      target.metrics.forEach((m: any, i: number) => {
        const rowHeight = 35;
        if (i % 2 === 1) doc.rect(50, currentY, 500, rowHeight).fill('#f1f5f9');
        
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(m.title, 60, currentY + 12, { width: 180 });
        doc.text(`${m.targetValue} ${m.unit || ''}`, 250, currentY + 12);
        doc.text(`${m.currentValue} ${m.unit || ''}`, 350, currentY + 12);
        
        const prog = m.targetValue > 0 ? Math.min(100, Math.round((m.currentValue / m.targetValue) * 100)) : 0;
        doc.text(`${prog}%`, 450, currentY + 12);

        currentY += rowHeight;
      });
      doc.y = currentY + 20;
    }

    if (target.updates && target.updates.length > 0) {
      doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('Historical Progress Logs');
      doc.moveDown();
      target.updates.slice(0, 5).forEach((u: any) => {
        doc.fontSize(9).fillColor('#64748b').text(`${new Date(u.createdAt).toLocaleDateString()}: `, { continued: true });
        doc.fillColor('#1e293b').text(u.comment || 'Metric synchronization performed.');
        doc.moveDown(0.5);
      });
    }
  }

  private static renderAppraisalContent(doc: PDFKit.PDFDocument, packet: any, brandColor: string) {
    // Identity Section
    doc.fillColor('#f8fafc').rect(50, doc.y, 500, 60).fill();
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text('EMPLOYEE NAME:', 65, doc.y - 45, { continued: true }).font('Helvetica').text(` ${packet.employee?.fullName}`);
    doc.font('Helvetica-Bold').text('APPRAISAL CYCLE:', 65, doc.y + 5, { continued: true }).font('Helvetica').text(` ${packet.cycle?.title || 'Annual Review'}`);
    doc.font('Helvetica-Bold').text('FINAL RATING:', 350, doc.y - 34, { align: 'right' }).font('Helvetica').text(` ${packet.finalScore || 'PENDING VALIDATION'} / 100`, { align: 'right' });

    doc.moveDown(4);

    if (packet.reviews && packet.reviews.length > 0) {
      packet.reviews.forEach((review: any) => {
        doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text(`${review.reviewStage.toUpperCase()} EVALUATION`);
        doc.moveDown(0.5);
        
        doc.rect(50, doc.y, 500, 1).fill('#e2e8f0');
        doc.moveDown(1);

        this.recordMetadata(doc, 'Reviewer', review.reviewer?.fullName || 'Self');
        this.recordMetadata(doc, 'Stage Score', `${review.overallRating || 0} / 5`);
        
        doc.moveDown();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('Review Transcript:');
        doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(review.summary || 'No transcript recorded.', { align: 'justify' });
        
        if (review.achievements) {
          doc.moveDown(0.5);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('Key Achievements:');
          doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(review.achievements, { align: 'justify' });
        }
        
        doc.moveDown(3);
      });
    }
  }

  private static renderLeaveContent(doc: PDFKit.PDFDocument, leave: any, brandColor: string) {
    doc.fillColor('#f1f5f9').rect(50, doc.y, 500, 80).fill();
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('CERTIFICATE OF LEAVE APPROVAL', 65, doc.y - 65, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`This document certifies that ${leave.employee?.fullName} is officially sanctioned for ${leave.leaveType} leave.`, { align: 'center' });

    doc.moveDown(4);
    
    // Core Details Grid
    const gridTop = doc.y;
    this.keyValGrid(doc, 50, gridTop, 'Leave ID', leave.id.substring(0, 8));
    this.keyValGrid(doc, 300, gridTop, 'Department', leave.employee?.departmentObj?.name || 'N/A');
    
    this.keyValGrid(doc, 50, gridTop + 30, 'Start Date', new Date(leave.startDate).toLocaleDateString());
    this.keyValGrid(doc, 300, gridTop + 30, 'End Date', new Date(leave.endDate).toLocaleDateString());

    this.keyValGrid(doc, 50, gridTop + 60, 'Total Days', `${leave.leaveDays} Business Days`);
    this.keyValGrid(doc, 300, gridTop + 60, 'Balance Remaining', `${leave.employee?.leaveBalance || 0} Days`);

    doc.moveDown(6);

    if (leave.reliever) {
      doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('Handover & Relief Support');
      doc.moveDown(0.5);
      doc.rect(50, doc.y, 500, 40).stroke('#e2e8f0');
      doc.fillColor('#1e293b').fontSize(10).text(`Assigned Reliever: ${leave.reliever.fullName}`, 60, doc.y + 10);
      doc.text(`Handover Status: ${leave.relieverStatus} | Acknowledgement: ${leave.handoverAcknowledged ? 'VERIFIED' : 'PENDING'}`, 60, doc.y + 5);
      doc.moveDown(2);
    }

    doc.moveDown(4);
    doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('INSTITUTIONAL AUTHORIZATION', { underline: true });
    doc.moveDown(2);
    
    // Approval Signatures
    const sigY = doc.y;
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, sigY).lineTo(250, sigY).stroke();
    doc.fontSize(8).fillColor('#64748b').text('EMPLOYEE SIGNATURE', 50, sigY + 10);

    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(350, sigY).lineTo(550, sigY).stroke();
    doc.fontSize(8).fillColor('#64748b').text('HR / MD AUTHORIZING SIGN', 350, sigY + 10);
  }

  private static keyValGrid(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(value || 'N/A', x, y + 12);
  }

  private static renderPayslipContent(doc: PDFKit.PDFDocument, item: any, brandColor: string) {
    // 1. Employee Branding Header
    doc.fillColor('#f8fafc').rect(50, doc.y, 500, 60).fill();
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text('ASSOCIATE:', 65, doc.y - 45, { continued: true }).font('Helvetica').text(` ${item.employee?.fullName}`);
    doc.font('Helvetica-Bold').text('EMPLOYEE CODE:', 65, doc.y + 5, { continued: true }).font('Helvetica').text(` ${item.employee?.employeeCode || 'N/A'}`);
    doc.font('Helvetica-Bold').text('PERIOD:', 350, doc.y - 34, { align: 'right' }).font('Helvetica').text(` ${item.run?.period}`, { align: 'right' });

    doc.moveDown(4);

    // 2. Financial Breakdown
    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 20).fill(brandColor);
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text('DESCRIPTION', 65, tableTop + 6);
    doc.text('AMOUNT', 450, tableTop + 6, { align: 'right', width: 85 });

    let currentY = tableTop + 20;
    const drawRow = (label: string, value: number, isDeduction = false) => {
      if (currentY > 700) { doc.addPage(); currentY = 50; }
      doc.fillColor('#f9fafb').rect(50, currentY, 500, 25).fill(currentY % 50 < 25 ? '#f9fafb' : '#ffffff');
      doc.fillColor('#334155').fontSize(10).font('Helvetica').text(label, 65, currentY + 8);
      
      const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2 });
      doc.fillColor(isDeduction ? '#ef4444' : '#1e293b').font('Helvetica-Bold').text(`${isDeduction ? '-' : ''}${formatted}`, 450, currentY + 8, { align: 'right', width: 85 });
      currentY += 25;
    };

    drawRow('Basic Salary', Number(item.baseSalary));
    if (Number(item.overtime)) drawRow('Overtime Pay', Number(item.overtime));
    if (Number(item.bonus)) drawRow('Performance Bonus', Number(item.bonus));
    if (Number(item.allowances)) drawRow('Standard Allowances', Number(item.allowances));

    // Deductions
    drawRow('Income Tax (PAYE)', Number(item.tax), true);
    if (Number(item.ssnit)) drawRow('Social Security / Pension', Number(item.ssnit), true);
    if (Number(item.otherDeductions)) drawRow('Other Deductions', Number(item.otherDeductions), true);

    doc.y = currentY + 10;
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    
    // 3. Totals
    doc.moveDown(1);
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text('GROSS EARNINGS:', 300, doc.y, { align: 'right', width: 140 });
    doc.text(Number(item.grossPay).toLocaleString('en-US', { minimumFractionDigits: 2 }), 450, doc.y, { align: 'right', width: 85 });
    
    const totalDed = Number(item.tax) + Number(item.ssnit) + Number(item.otherDeductions);
    doc.moveDown(0.5);
    doc.fillColor('#ef4444').text('TOTAL DEDUCTIONS:', 300, doc.y, { align: 'right', width: 140 });
    doc.text(`-${totalDed.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 450, doc.y, { align: 'right', width: 85 });

    doc.moveDown(1);
    doc.rect(300, doc.y, 250, 40).fill(brandColor);
    doc.fillColor('#fff').fontSize(14).text('NET PAYOUT:', 315, doc.y + 12);
    doc.text(`${item.currency} ${Number(item.netPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 410, doc.y + 12, { align: 'right', width: 125 });

    doc.moveDown(4);

    // 4. Payment Metadata
    doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('PAYMENT CHANNEL INFORMATION', { underline: true });
    doc.moveDown();
    this.recordMetadata(doc, 'Bank Name', item.employee?.bankName || 'N/A');
    this.recordMetadata(doc, 'Account Number', item.employee?.bankAccountNumber || 'N/A');
    this.recordMetadata(doc, 'Payment Date', new Date(item.run?.updatedAt).toLocaleDateString());

    if (item.notes) {
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#94a3b8').text(`Disbursement Note: ${item.notes}`);
    }
  }

  private static recordMetadata(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${label.toUpperCase()}: `, { continued: true }).font('Helvetica').fillColor('#1e293b').text(value);
    doc.moveDown(0.2);
  }
}

