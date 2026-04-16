import PDFDocument from 'pdfkit';
import axios from 'axios';
import prisma from '../prisma/client';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';

export class PdfExportService {
  private static readonly SAFE_MARGIN = 50;
  private static readonly CONTENT_WIDTH = 500;

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
        
        doc.moveDown(5);
        doc
          .fillColor(primaryColor)
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), { align: 'center' });

        doc.moveDown(0.5);
        doc
          .strokeColor(primaryColor)
          .lineWidth(1.5)
          .moveTo(100, doc.y)
          .lineTo(500, doc.y)
          .stroke();

        doc.moveDown(3);

        // ─── 2. Document Content ───
        if (type === 'TARGET') {
          this.renderTargetContent(doc, content, primaryColor);
        } else if (type === 'TARGET_ROADMAP') {
          this.renderRoadmapSummary(doc, content, primaryColor);
          content.forEach((target: any) => {
            doc.addPage();
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
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(org?.name?.toUpperCase() || 'NEXUS HRM', this.SAFE_MARGIN, 43, { align: 'center', width: this.CONTENT_WIDTH })
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`${org?.address || ''} | ${org?.city || ''}, ${org?.country || ''}`, this.SAFE_MARGIN, 70, { align: 'center', width: this.CONTENT_WIDTH })
      .text(`Phone: ${org?.phone || ''} | Email: ${org?.email || ''}`, { align: 'center', width: this.CONTENT_WIDTH });

    doc
      .strokeColor('#f1f5f9')
      .lineWidth(0.5)
      .moveTo(this.SAFE_MARGIN, 115)
      .lineTo(595 - this.SAFE_MARGIN, 115)
      .stroke();
  }

  private static renderWatermark(doc: PDFKit.PDFDocument) {
    doc.save();
    doc.opacity(0.04);
    doc.fontSize(60).fillColor('#000').font('Helvetica-Bold');
    doc.rotate(-45, { origin: [300, 400] });
    doc.text('OFFICIAL INSTITUTIONAL RECORD', 50, 400);
    doc.restore();
  }

  private static renderFooter(doc: PDFKit.PDFDocument, org: any, page: number, total: number, primaryColor: string) {
    doc
      .strokeColor('#f1f5f9')
      .lineWidth(0.5)
      .moveTo(50, 780)
      .lineTo(550, 780)
      .stroke();

    const footerText = `Institutional Record | ${org?.name || 'Nexus HRM'} | Page ${page} of ${total}`;
    doc
      .fontSize(7)
      .fillColor('#94a3b8')
      .text(footerText, this.SAFE_MARGIN, 790, { align: 'center', width: this.CONTENT_WIDTH });
  }

  private static renderTargetContent(doc: PDFKit.PDFDocument, target: any, brandColor: string) {
    const headerTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, headerTop, this.CONTENT_WIDTH, 60).fill();
    
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold');
    doc.text('TARGET HOLDER:', this.SAFE_MARGIN + 15, headerTop + 15, { continued: true }).font('Helvetica').text(` ${target.assignee?.fullName || 'N/A'}`);
    doc.font('Helvetica-Bold').text('DEPARTMENT:', this.SAFE_MARGIN + 15, headerTop + 35, { continued: true }).font('Helvetica').text(` ${target.department?.name || 'Global Operations'}`);
    
    doc.font('Helvetica-Bold').text('CURRENT PROGRESS:', this.SAFE_MARGIN + 300, headerTop + 25, { width: 185, align: 'right' });
    doc.font('Helvetica').text(`${target.progress}% ACHIEVEMENT`, { width: 185, align: 'right' });
    
    doc.y = headerTop + 75;

    doc.moveDown(4);

    // 2. Mission Statement
    doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('OBJECTIVE SPECIFICATION', this.SAFE_MARGIN);
    doc.moveDown(0.5);
    doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 1.5).fill(brandColor);
    doc.moveDown(1);
    doc.fillColor('#334155').fontSize(11).font('Helvetica').text(target.description || 'No exhaustive mapping provided.', { align: 'left', lineGap: 3, width: this.CONTENT_WIDTH });

    doc.moveDown(2);

    // 3. Achievement Metrics Table
    if (target.metrics && target.metrics.length > 0) {
      doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('STRATEGIC KEY PERFORMANCE INDICATORS (KPIs)');
      doc.moveDown();
      
      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 25).fill('#f1f5f9');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
      doc.text('METRIC COMPONENT', 65, tableTop + 8);
      doc.text('ALLOCATION', 250, tableTop + 8);
      doc.text('ACTUAL', 350, tableTop + 8);
      doc.text('VARIANCE', 450, tableTop + 8);

      let currentY = tableTop + 25;
      target.metrics.forEach((m: any, i: number) => {
        const rowHeight = 30;
        if (currentY > 700) { doc.addPage(); currentY = 50; }
        
        doc.fillColor(i % 2 === 0 ? '#ffffff' : '#f9fafb').rect(50, currentY, 500, rowHeight).fill();
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(m.title, 65, currentY + 10, { width: 180 });
        doc.text(`${m.targetValue} ${m.unit || ''}`, 250, currentY + 10);
        doc.text(`${m.currentValue} ${m.unit || ''}`, 350, currentY + 10);
        
        const variance = m.targetValue > 0 ? Math.round(((m.currentValue - m.targetValue) / m.targetValue) * 100) : 0;
        doc.fillColor(variance >= 0 ? '#059669' : '#dc2626').font('Helvetica-Bold').text(`${variance > 0 ? '+' : ''}${variance}%`, 450, currentY + 10);

        currentY += rowHeight;
      });
      doc.y = currentY + 30;
    }

    // 4. Management Validation
    doc.moveDown(2);
    const sanctionTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, sanctionTop, this.CONTENT_WIDTH, 45).fill();
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('INSTITUTIONAL SANCTION:', this.SAFE_MARGIN + 15, sanctionTop + 10);
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text('This objective is officially recognized and synchronized with organization-wide strategic KPIs for the current fiscal period. Completion contributes to global performance arbitration.', this.SAFE_MARGIN + 15, sanctionTop + 20, { width: this.CONTENT_WIDTH - 30 });
    
    doc.moveDown(4);
    
    // Signatures
    const sigY = doc.y;
    const sigLineWidth = 160;

    // 🖊️ Assignee Signature
    if (target.assignee?.signatureUrl) {
       this.renderSignature(doc, target.assignee.signatureUrl, 70, sigY, sigLineWidth);
    }
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(70 + sigLineWidth, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('ASSIGNEE ENDORSEMENT', 70, sigY + 8);
    
    // 🖊️ Manager Signature
    const reviewerSig = target.reviewer?.signatureUrl || target.lineManager?.signatureUrl || target.originator?.signatureUrl;
    if (reviewerSig) {
       this.renderSignature(doc, reviewerSig, 370, sigY, sigLineWidth);
    }
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(370, sigY).lineTo(370 + sigLineWidth, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('DIRECTOR / LINE MANAGER', 370, sigY + 8);
  }

  private static renderRoadmapSummary(doc: PDFKit.PDFDocument, targets: any[], brandColor: string) {
    doc.fillColor(brandColor).fontSize(16).font('Helvetica-Bold').text('EXECUTIVE ROADMAP SUMMARY', this.SAFE_MARGIN, doc.y, { align: 'center', width: this.CONTENT_WIDTH });
    doc.moveDown(0.5);
    doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 2).fill(brandColor);
    doc.moveDown(2);

    // Summary Analytics
    const totalTargets = targets.length;
    const completed = targets.filter(t => t.progress >= 100).length;
    const avgProgress = Math.round(targets.reduce((acc, t) => acc + (t.progress || 0), 0) / (totalTargets || 1));

    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 80).fill();
    this.keyValGrid(doc, this.SAFE_MARGIN + 20, doc.y - 65, 'TOTAL INITIATIVES', totalTargets.toString());
    this.keyValGrid(doc, this.SAFE_MARGIN + 170, doc.y - 12, 'AGGREGATE COMPLETION', `${avgProgress}%`);
    this.keyValGrid(doc, this.SAFE_MARGIN + 350, doc.y - 12, 'COMPLETED RECORDS', completed.toString());

    doc.moveDown(6);

    // Roadmap Matrix
    doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('STRATEGIC PHASE DISBURSEMENT');
    doc.moveDown();

    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 25).fill('#1e293b');
    doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
    doc.text('OBJECTIVE IDENTIFIER', 65, tableTop + 8);
    doc.text('PHASE STATUS', 350, tableTop + 8);
    doc.text('WEIGHT', 480, tableTop + 8);

    let currentY = tableTop + 25;
    targets.forEach((t, i) => {
      if (currentY > 700) { doc.addPage(); currentY = 50; }
      doc.fillColor(i % 2 === 0 ? '#ffffff' : '#f9fafb').rect(50, currentY, 500, 30).fill();
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(t.title.toUpperCase(), 65, currentY + 10, { width: 250, lineBreak: false });
      
      const statusLabel = t.progress >= 100 ? 'FINALIZED' : t.progress > 0 ? 'ACTIVE DEVELOPMENT' : 'INITIALIZED';
      doc.fillColor(t.progress >= 100 ? '#059669' : '#64748b').font('Helvetica-Bold').text(statusLabel, 350, currentY + 10);
      doc.fillColor('#1e293b').text(`${t.progress}%`, 480, currentY + 10);
      
      currentY += 30;
    });

    doc.moveDown(3);
    if (doc.y > 600) doc.addPage();
    const summaryTop = doc.y;
    doc.fillColor('#f8fafc').rect(50, summaryTop, 500, 100).fill();
    doc.fillColor(brandColor).fontSize(11).font('Helvetica-Bold').text('MANAGEMENT SUMMARY', 65, summaryTop + 15);
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text('The above roadmap encapsulates the prioritized strategic vectors for the designated operative. All phases are synchronized with departmental goals. Sustained achievement rates are critical for institutional growth milestones.', 65, summaryTop + 35, { width: 470, lineGap: 4 });
  }

  private static renderAppraisalContent(doc: PDFKit.PDFDocument, packet: any, brandColor: string) {
    // Identity Section
    const idTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, idTop, this.CONTENT_WIDTH, 65).fill();
    
    // Centered Identity Block
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold');
    doc.text(packet.employee?.fullName?.toUpperCase(), this.SAFE_MARGIN, idTop + 15, { align: 'center', width: this.CONTENT_WIDTH });
    
    doc.fontSize(9).font('Helvetica').fillColor('#64748b');
    doc.text(packet.cycle?.title || 'ANNUAL PERFORMANCE REVIEW', this.SAFE_MARGIN, idTop + 32, { align: 'center', width: this.CONTENT_WIDTH });
    
    doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold');
    doc.text(`SCORE: ${packet.finalScore || 'PENDING'} / 100`, this.SAFE_MARGIN, idTop + 45, { align: 'center', width: this.CONTENT_WIDTH });
    
    doc.y = idTop + 85;

    doc.moveDown(4);

    if (packet.reviews && packet.reviews.length > 0) {
      packet.reviews.forEach((review: any) => {
        if (doc.y > 650) doc.addPage();
        
        doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text(`${review.reviewStage.replace('_', ' ').toUpperCase()} EVALUATION`, this.SAFE_MARGIN, doc.y, { width: this.CONTENT_WIDTH });
        doc.moveDown(0.5);
        
        doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 1.5).fill('#f1f5f9');
        doc.moveDown(1);

        this.recordMetadata(doc, 'Arbitrator', review.reviewer?.fullName || 'Personnel (Self)');
        this.recordMetadata(doc, 'Rating Map', `${review.overallRating || 0} / 5.0`);
        
        doc.moveDown();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('Executive Summary:', this.SAFE_MARGIN);
        doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(review.summary || 'No transcript recorded.', { align: 'left', lineGap: 3, width: this.CONTENT_WIDTH });
        
        // Render Qualitative Insights
        const sections = [
          { label: 'Key Strengths & Achievements', value: review.strengths || review.achievements },
          { label: 'Areas for Improvement', value: review.weaknesses },
          { label: 'Development & Growth Needs', value: review.developmentNeeds }
        ];

        sections.forEach(s => {
          if (s.value) {
            doc.moveDown(1.5);
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${s.label.toUpperCase()}:`, this.SAFE_MARGIN);
            doc.fontSize(10).font('Helvetica').fillColor('#334155').text(s.value, { align: 'left', lineGap: 3, width: this.CONTENT_WIDTH });
          }
        });

        // Competency Narrative Statement
        if (review.responses) {
          try {
            const data = typeof review.responses === 'string' ? JSON.parse(review.responses) : review.responses;
            if (data.competencyScores) {
              doc.moveDown(2.5);
              doc.fontSize(10).font('Helvetica-Bold').fillColor(brandColor).text('PERFORMANCE STATEMENT & COMPETENCY AUDIT', this.SAFE_MARGIN);
              doc.moveDown(1);
              
              data.competencyScores.forEach((cat: any) => {
                if (doc.y > 700) doc.addPage();
                
                const avg = cat.categoryAverage || 0;
                const scoreLabel = avg >= 4.5 ? 'EXCEPTIONAL' : avg >= 4 ? 'HIGH PROFICIENCY' : avg >= 3 ? 'PROFICIENT' : avg >= 2 ? 'CORE COMPETENCE' : 'DEVELOPMENTAL';
                
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(cat.category.toUpperCase(), this.SAFE_MARGIN);
                doc.fontSize(8).font('Helvetica-Bold').fillColor(brandColor).text(scoreLabel, { align: 'right', width: this.CONTENT_WIDTH });
                doc.moveDown(0.2);
                doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 0.5).fill('#e2e8f0');
                doc.moveDown(0.5);
                
                cat.competencies.forEach((c: any) => {
                  if (doc.y > 720) doc.addPage();
                  
                  doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155').text(c.name, this.SAFE_MARGIN + 10, doc.y, { continued: true });
                  doc.font('Helvetica').fillColor('#64748b').text(` — Rating: ${c.score || 0}/5`);
                  
                  if (c.comment) {
                    doc.moveDown(0.2);
                    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#475569').text(`"${c.comment}"`, this.SAFE_MARGIN + 25, doc.y, { width: this.CONTENT_WIDTH - 35, lineGap: 2 });
                  }
                  doc.moveDown(0.4);
                });
                doc.moveDown(1);
              });
            }
          } catch (e) {
            console.warn('Failed to parse competency scores for PDF');
          }
        }
        
        doc.moveDown(3);
      });
    }

    // Official Sanction Section
    const verdictText = packet.finalVerdict || 'This performance appraisal has been arbitrated and synchronized with the official personnel dossier.';
    const verdictHeight = doc.heightOfString(verdictText, { width: this.CONTENT_WIDTH - 30, lineGap: 2 });
    const boxHeight = Math.max(90, verdictHeight + 50); 

    // 🛡️ Proactive page-break (Start sanction section on new page if it won't fit comfortably)
    if (doc.y + boxHeight + 100 > 800) {
      doc.addPage();
    }
    
    const sanctionTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, sanctionTop, this.CONTENT_WIDTH, boxHeight).fill();
    doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(this.SAFE_MARGIN, sanctionTop, this.CONTENT_WIDTH, boxHeight).stroke();
    
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('OFFICIAL ARBITRATION BASIS:', this.SAFE_MARGIN + 15, sanctionTop + 15);
    const logicLabel = packet.arbitrationLogic === 'WEIGHTED_AVG' ? 'WEIGHTED MULTI-SOURCE ANALYSIS (SELF/MANAGER)' : 
                       packet.arbitrationLogic === 'MANAGER_REC' ? 'MANAGER RECOMMENDATION VALIDATED' : 'INSTITUTIONAL CALIBRATION';
    
    doc.fillColor(brandColor).fontSize(8).font('Helvetica-Bold').text(logicLabel, this.SAFE_MARGIN + 155, sanctionTop + 15);
    
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Oblique').text(verdictText, this.SAFE_MARGIN + 15, sanctionTop + 40, { width: this.CONTENT_WIDTH - 30, lineGap: 3 });
    
    // 🖊️ Digital Signoff Row Logic
    doc.y = sanctionTop + boxHeight + 60;
    const sigY = doc.y;
    const sigLineWidth = 165;
    
    // 🖊️ Employee Signature
    if (packet.employee?.signatureUrl) {
       this.renderSignature(doc, packet.employee.signatureUrl, 70, sigY, sigLineWidth);
    }
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(70 + sigLineWidth, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('EMPLOYEE SIGN-OFF', 70, sigY + 8);
    
    // 🖊️ Management Signature (MD or Final Reviewer)
    const managementSig = packet.finalReviewer?.signatureUrl || packet.reviews?.find((r: any) => r.reviewStage === 'MANAGER')?.reviewer?.signatureUrl;
    if (managementSig) {
       this.renderSignature(doc, managementSig, 365, sigY, sigLineWidth);
    }
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(365, sigY).lineTo(365 + sigLineWidth, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('AUTHORIZED MANAGEMENT', 365, sigY + 8);
  }

  private static renderSignature(doc: PDFKit.PDFDocument, sigUrl: string, xPos: number, yPos: number, lineWidth: number) {
     try {
       if (sigUrl.startsWith('data:image')) {
         const b64 = sigUrl.split(',')[1];
         const img = Buffer.from(b64, 'base64');
         const imgWidth = 110; 
         // Align the signature image to the center of the line
         const centeredX = xPos + (lineWidth - imgWidth) / 2;
         // Place it slightly above the line (yPos - 35)
         doc.image(img, centeredX, yPos - 35, { width: imgWidth, height: 40, fit: [imgWidth, 40] });
       }
     } catch (e) {
       console.warn('[PdfExportService] Failed to render signature:', (e as any).message);
     }
  }

  private static renderLeaveContent(doc: PDFKit.PDFDocument, leave: any, brandColor: string) {
    // 🛡️ Formal Authorization Statement
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold').text('LEAVE AUTHORIZATION SANCTION', { align: 'center', characterSpacing: 2, width: this.CONTENT_WIDTH });
    doc.moveDown(0.5);
    
    const statement = `This document confirms that ${leave.employee?.fullName} has been given permission for ${leave.leaveType} Leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}. All arrangements for work coverage during this period have been finalized to ensure stability.`;
    
    // Explicitly center and bound the statement to prevent right-leaning
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(statement, this.SAFE_MARGIN, doc.y, { align: 'center', width: this.CONTENT_WIDTH, lineGap: 4 });

    doc.moveDown(2);
    
    // 📋 Core Details
    const gridTop = doc.y;
    this.keyValGrid(doc, 70, gridTop, 'Leave ID', `${leave.id.substring(0, 8).toUpperCase()}`);
    this.keyValGrid(doc, 330, gridTop, 'Employee', leave.employee?.fullName || 'N/A');
    
    doc.moveDown(2);
    const nextRow = doc.y;
    this.keyValGrid(doc, 70, nextRow, 'Start Date', new Date(leave.startDate).toLocaleDateString());
    this.keyValGrid(doc, 330, nextRow, 'End Date', new Date(leave.endDate).toLocaleDateString());

    doc.moveDown(2);
    const lastRow = doc.y;
    this.keyValGrid(doc, 70, lastRow, 'Total Days', `${leave.leaveDays} Days`);
    const metrics = getEffectiveLeaveMetrics(leave.employee);
    this.keyValGrid(doc, 330, lastRow, 'Current Balance', `${metrics.balance} Days`);

    doc.moveDown(2.5);

    // 📝 Justification
    if (leave.reason) {
      doc.fillColor(brandColor).fontSize(10).font('Helvetica-Bold').text('REASON FOR LEAVE', 70);
      doc.moveDown(0.3);
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text(leave.reason || 'General Leave', 70, doc.y, { width: 450, align: 'justify' });
      doc.moveDown(1.5);
    }

    if (leave.reliever) {
      const relieverBoxTop = doc.y;
      doc.fillColor('#f8fafc').rect(50, relieverBoxTop, 500, 45).fill();
      doc.fillColor(brandColor).fontSize(10).font('Helvetica-Bold').text('COVERAGE & HANDOVER', 70, relieverBoxTop + 10);
      
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(`Handover Partner: ${leave.reliever.fullName} (${leave.relieverStatus})`, 70, relieverBoxTop + 22);
      doc.text(`Handover Status: ${leave.handoverAcknowledged ? 'VERIFIED' : 'PENDING'}`, 70, relieverBoxTop + 32);
      doc.moveDown(2);
    }

    doc.moveDown(4);
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold').text('APPROVAL SIGNATURES', this.SAFE_MARGIN, doc.y, { align: 'center', width: this.CONTENT_WIDTH, characterSpacing: 1 });
    doc.moveDown(3.5);
    
    // Approval Signatures
    const sigY = doc.y;
    const sigLineWidth = 160;

    // 🖊️ Employee Signature
    if (leave.employee?.signatureUrl) {
       this.renderSignature(doc, leave.employee.signatureUrl, 70, sigY, sigLineWidth);
    }
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(70 + sigLineWidth, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text(leave.employee?.fullName?.toUpperCase() || 'EMPLOYEE', 70, sigY + 8);
    doc.font('Helvetica').fontSize(6).text('EMPLOYEE SIGNATURE', 70, sigY + 17);

    // 🖊️ Management Signature
    const reviewerSig = leave.hrReviewer?.signatureUrl || leave.manager?.signatureUrl;
    if (reviewerSig) {
       this.renderSignature(doc, reviewerSig, 370, sigY, sigLineWidth);
    }
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(370, sigY).lineTo(370 + sigLineWidth, sigY).stroke();
    const authorizedName = leave.hrReviewer?.fullName || leave.manager?.fullName || 'AUTHORIZED SIGNATORY';
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text(authorizedName.toUpperCase(), 370, sigY + 8);
    doc.font('Helvetica').fontSize(6).text('MANAGEMENT / HR SIGNATURE', 370, sigY + 17);
  }

  private static keyValGrid(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(value || 'N/A', x, y + 12);
  }

  private static renderPayslipContent(doc: PDFKit.PDFDocument, item: any, brandColor: string) {
    // 1. Employee Branding Header
    const headerTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, headerTop, this.CONTENT_WIDTH, 70).fill();
    
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(item.employee?.fullName?.toUpperCase(), this.SAFE_MARGIN + 15, headerTop + 15);
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`EMPLOYEE CODE: ${item.employee?.employeeCode || 'N/A'}`, this.SAFE_MARGIN + 15, headerTop + 32);
    doc.text(`DESIGNATION: ${item.employee?.jobTitle || 'N/A'}`, this.SAFE_MARGIN + 15, headerTop + 42);
    
    doc.fillColor(brandColor).fontSize(10).font('Helvetica-Bold').text('PAYMENT PERIOD', this.SAFE_MARGIN +this.CONTENT_WIDTH - 200, headerTop + 15, { align: 'right', width: 185 });
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica').text(item.run?.period, 350, headerTop + 28, { align: 'right', width: 185 });

    doc.moveDown(5);

    // 2. Financial Breakdown
    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 22).fill(brandColor);
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text('EARNINGS & DEDUCTIONS', 65, tableTop + 7);
    doc.text('AMOUNT (GHS)', 450, tableTop + 7, { align: 'right', width: 85 });

    let currentY = tableTop + 22;
    const drawRow = (label: string, value: number, isDeduction = false) => {
      if (currentY > 650) { doc.addPage(); currentY = 50; }
      doc.fillColor(currentY % 44 === 22 ? '#f9fafb' : '#ffffff').rect(50, currentY, 500, 22).fill();
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(label.toUpperCase(), 65, currentY + 7);
      
      const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2 });
      doc.fillColor(isDeduction ? '#ef4444' : '#1e293b').font('Helvetica-Bold').text(`${isDeduction ? '-' : ''}${formatted}`, 450, currentY + 7, { align: 'right', width: 85 });
      currentY += 22;
    };

    drawRow('Basic Salary', Number(item.baseSalary));
    if (Number(item.overtime)) drawRow('Overtime / Extra Hours', Number(item.overtime));
    if (Number(item.bonus)) drawRow('Performance Bonus', Number(item.bonus));
    if (Number(item.allowances)) drawRow('Consolidated Allowances', Number(item.allowances));

    // Deductions
    drawRow('Income Tax (PAYE)', Number(item.tax), true);
    if (Number(item.ssnit)) drawRow('Statutory Pension (SSNIT)', Number(item.ssnit), true);
    if (Number(item.otherDeductions)) drawRow('Other Benefits / Deductions', Number(item.otherDeductions), true);

    const totalDed = Number(item.tax) + Number(item.ssnit) + Number(item.otherDeductions);
    
    // 3. Featured Net Payout Summary
    doc.y = currentY + 30;
    const summaryTop = doc.y;
    
    // Background highlight for Net Payout
    doc.fillColor('#f8fafc').rect(50, summaryTop, 500, 100).fill();
    doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(50, summaryTop, 500, 100).stroke();

    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('GROSS EARNINGS', 70, summaryTop + 20);
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(Number(item.grossPay).toLocaleString('en-US', { minimumFractionDigits: 2 }), 70, summaryTop + 32);

    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('TOTAL DEDUCTIONS', 200, summaryTop + 20);
    doc.fillColor('#ef4444').fontSize(11).font('Helvetica').text(totalDed.toLocaleString('en-US', { minimumFractionDigits: 2 }), 200, summaryTop + 32);

    // Vertical Divider
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(330, summaryTop + 15).lineTo(330, summaryTop + 85).stroke();

    doc.fillColor(brandColor).fontSize(9).font('Helvetica-Bold').text('NET PAYOUT', 350, summaryTop + 30, { characterSpacing: 1 });
    doc.fillColor('#1e293b').fontSize(24).font('Helvetica-Bold').text(`GHS ${Number(item.netPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 350, summaryTop + 45, { characterSpacing: -1 });

    doc.moveDown(8);
    
    // 4. Record Metadata
    this.recordMetadata(doc, 'Bank Name', item.employee?.bankName || 'N/A');
    this.recordMetadata(doc, 'Account Number', item.employee?.bankAccountNumber || 'N/A');
    this.recordMetadata(doc, 'Payment Date', new Date(item.run?.updatedAt).toLocaleDateString());

    if (item.notes) {
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#94a3b8').text(`Disbursement Note: ${item.notes}`);
    }
  }

  private static recordMetadata(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${label.toUpperCase()}: `, this.SAFE_MARGIN, doc.y, { continued: true }).font('Helvetica').fillColor('#1e293b').text(value);
    doc.moveDown(0.2);
  }
}

