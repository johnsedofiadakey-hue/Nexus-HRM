"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfExportService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const axios_1 = __importDefault(require("axios"));
const client_1 = __importDefault(require("../prisma/client"));
class PdfExportService {
    /**
     * Generates a premium, branded PDF for various document types.
     */
    static async generateBrandedPdf(organizationId, title, content, type) {
        const org = await client_1.default.organization.findUnique({
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
        const doc = new pdfkit_1.default({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });
        const primaryColor = org?.primaryColor || '#4F46E5';
        const buffers = [];
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
                }
                else if (type === 'TARGET_ROADMAP') {
                    this.renderRoadmapSummary(doc, content, primaryColor);
                    content.forEach((target) => {
                        doc.addPage();
                        this.renderTargetContent(doc, target, primaryColor);
                    });
                }
                else if (type === 'APPRAISAL') {
                    this.renderAppraisalContent(doc, content, primaryColor);
                }
                else if (type === 'LEAVE') {
                    this.renderLeaveContent(doc, content, primaryColor);
                }
                else if (type === 'PAYSLIP') {
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
            }
            catch (err) {
                console.error('[PdfExportService] Crash during generation:', err);
                doc.end(); // Attempt clean-up
                reject(err);
            }
        });
    }
    static async renderHeader(doc, org, primaryColor) {
        try {
            if (org?.logoUrl) {
                if (org.logoUrl.startsWith('data:image')) {
                    // 🛡️ Optimized: Directly render Base64 payload (Survives deployment wipes)
                    const b64 = org.logoUrl.split(',')[1];
                    if (b64)
                        doc.image(Buffer.from(b64, 'base64'), 50, 40, { width: 70 });
                }
                else {
                    // 🛡️ Guarded: Remote fetch with strict timeout to prevent process hanging
                    const response = await axios_1.default.get(org.logoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 5000
                    });
                    doc.image(response.data, 50, 40, { width: 70 });
                }
            }
            else {
                throw new Error('No logo provided');
            }
        }
        catch (err) {
            console.warn('[PdfExportService] Logo resolution failed, using typography fallback:', err.message);
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
    static renderWatermark(doc) {
        doc.save();
        doc.opacity(0.04);
        doc.fontSize(60).fillColor('#000').font('Helvetica-Bold');
        doc.rotate(-45, { origin: [300, 400] });
        doc.text('OFFICIAL INSTITUTIONAL RECORD', 50, 400);
        doc.restore();
    }
    static renderFooter(doc, org, page, total, primaryColor) {
        doc
            .strokeColor('#f1f5f9')
            .lineWidth(0.5)
            .moveTo(50, 780)
            .lineTo(550, 780)
            .stroke();
        const footerText = `Nexus HRM Institutional Record | ${org?.name || 'Nexus HRM'} | Verified ID: ${Math.random().toString(36).substring(7).toUpperCase()} | Page ${page} of ${total}`;
        doc
            .fontSize(7)
            .fillColor('#94a3b8')
            .text(footerText, 50, 790, { align: 'right', width: 500 });
    }
    static renderTargetContent(doc, target, brandColor) {
        const headerTop = doc.y;
        doc.fillColor('#f8fafc').rect(50, headerTop, 500, 60).fill();
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text('TARGET HOLDER:', 65, headerTop + 15, { continued: true }).font('Helvetica').text(` ${target.assignee?.fullName || 'N/A'}`);
        doc.font('Helvetica-Bold').text('DEPARTMENT:', 65, headerTop + 35, { continued: true }).font('Helvetica').text(` ${target.department?.name || 'Global Operations'}`);
        doc.font('Helvetica-Bold').text('CURRENT PROGRESS:', 350, headerTop + 25, { align: 'right', width: 180 }).font('Helvetica').text(` ${target.progress}% ACHIEVEMENT`, { align: 'right', width: 180 });
        doc.y = headerTop + 60;
        doc.moveDown(4);
        // 2. Mission Statement
        doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('OBJECTIVE SPECIFICATION');
        doc.moveDown(0.5);
        doc.rect(50, doc.y, 500, 1.5).fill(brandColor);
        doc.moveDown(1);
        doc.fillColor('#334155').fontSize(11).font('Helvetica').text(target.description || 'No exhaustive mapping provided.', { align: 'justify', lineGap: 3 });
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
            target.metrics.forEach((m, i) => {
                const rowHeight = 30;
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                }
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
        doc.fillColor('#f8fafc').rect(50, doc.y, 500, 45).fill();
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('INSTITUTIONAL SANCTION:', 65, doc.y - 35);
        doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text('This objective is officially recognized and synchronized with organization-wide strategic KPIs for the current fiscal period. Completion contributes to global performance arbitration.', 65, doc.y + 5, { width: 470 });
        doc.moveDown(4);
        // Signatures
        const sigY = doc.y;
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(230, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('ASSIGNEE ENDORSEMENT', 70, sigY + 8);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(370, sigY).lineTo(530, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('DIRECTOR / LINE MANAGER', 370, sigY + 8);
    }
    static renderRoadmapSummary(doc, targets, brandColor) {
        doc.fillColor(brandColor).fontSize(16).font('Helvetica-Bold').text('EXECUTIVE ROADMAP SUMMARY');
        doc.moveDown(0.5);
        doc.rect(50, doc.y, 500, 2).fill(brandColor);
        doc.moveDown(2);
        // Summary Analytics
        const totalTargets = targets.length;
        const completed = targets.filter(t => t.progress >= 100).length;
        const avgProgress = Math.round(targets.reduce((acc, t) => acc + (t.progress || 0), 0) / (totalTargets || 1));
        doc.fillColor('#f8fafc').rect(50, doc.y, 500, 80).fill();
        this.keyValGrid(doc, 70, doc.y - 65, 'TOTAL INITIATIVES', totalTargets.toString());
        this.keyValGrid(doc, 220, doc.y - 12, 'AGGREGATE COMPLETION', `${avgProgress}%`);
        this.keyValGrid(doc, 400, doc.y - 12, 'COMPLETED RECORDS', completed.toString());
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
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }
            doc.fillColor(i % 2 === 0 ? '#ffffff' : '#f9fafb').rect(50, currentY, 500, 30).fill();
            doc.fillColor('#334155').fontSize(9).font('Helvetica').text(t.title.toUpperCase(), 65, currentY + 10, { width: 250, lineBreak: false });
            const statusLabel = t.progress >= 100 ? 'FINALIZED' : t.progress > 0 ? 'ACTIVE DEVELOPMENT' : 'INITIALIZED';
            doc.fillColor(t.progress >= 100 ? '#059669' : '#64748b').font('Helvetica-Bold').text(statusLabel, 350, currentY + 10);
            doc.fillColor('#1e293b').text(`${t.progress}%`, 480, currentY + 10);
            currentY += 30;
        });
        doc.moveDown(3);
        if (doc.y > 600)
            doc.addPage();
        const summaryTop = doc.y;
        doc.fillColor('#f8fafc').rect(50, summaryTop, 500, 100).fill();
        doc.fillColor(brandColor).fontSize(11).font('Helvetica-Bold').text('MANAGEMENT SUMMARY', 65, summaryTop + 15);
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text('The above roadmap encapsulates the prioritized strategic vectors for the designated operative. All phases are synchronized with departmental goals. Sustained achievement rates are critical for institutional growth milestones.', 65, summaryTop + 35, { width: 470, lineGap: 4 });
    }
    static renderAppraisalContent(doc, packet, brandColor) {
        // Identity Section
        const idTop = doc.y;
        doc.fillColor('#f8fafc').rect(50, idTop, 500, 60).fill();
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text('EMPLOYEE NAME:', 65, idTop + 15, { continued: true }).font('Helvetica').text(` ${packet.employee?.fullName}`);
        doc.font('Helvetica-Bold').text('APPRAISAL CYCLE:', 65, idTop + 35, { continued: true }).font('Helvetica').text(` ${packet.cycle?.title || 'Annual Review'}`);
        doc.font('Helvetica-Bold').text('FINAL ARBITRATION:', 350, idTop + 25, { align: 'right', width: 180 }).font('Helvetica-Bold').fillColor(brandColor).text(` ${packet.finalScore || 'PENDING'} / 100`, { align: 'right', width: 180 });
        doc.y = idTop + 60;
        doc.moveDown(4);
        if (packet.reviews && packet.reviews.length > 0) {
            packet.reviews.forEach((review) => {
                if (doc.y > 600)
                    doc.addPage();
                doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text(`${review.reviewStage.replace('_', ' ').toUpperCase()} EVALUATION`);
                doc.moveDown(0.5);
                doc.rect(50, doc.y, 500, 1.5).fill('#f1f5f9');
                doc.moveDown(1);
                this.recordMetadata(doc, 'Arbitrator', review.reviewer?.fullName || 'Personnel (Self)');
                this.recordMetadata(doc, 'Rating Map', `${review.overallRating || 0} / 5.0`);
                doc.moveDown();
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('Executive Summary:');
                doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(review.summary || 'No transcript recorded.', { align: 'justify', lineGap: 3, width: 480 });
                // Render Qualitative Insights
                const sections = [
                    { label: 'Key Strengths & Achievements', value: review.strengths || review.achievements },
                    { label: 'Areas for Improvement', value: review.weaknesses },
                    { label: 'Development & Growth Needs', value: review.developmentNeeds }
                ];
                sections.forEach(s => {
                    if (s.value) {
                        doc.moveDown(1.5);
                        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${s.label.toUpperCase()}:`);
                        doc.fontSize(10).font('Helvetica').fillColor('#334155').text(s.value, { align: 'justify', lineGap: 3, width: 480 });
                    }
                });
                // Competency Narrative Statement
                if (review.responses) {
                    try {
                        const data = typeof review.responses === 'string' ? JSON.parse(review.responses) : review.responses;
                        if (data.competencyScores) {
                            doc.moveDown(2.5);
                            doc.fontSize(10).font('Helvetica-Bold').fillColor(brandColor).text('PERFORMANCE STATEMENT & COMPETENCY AUDIT');
                            doc.moveDown(1);
                            data.competencyScores.forEach((cat) => {
                                const avg = cat.categoryAverage || 0;
                                const scoreLabel = avg >= 4.5 ? 'EXCEPTIONAL' : avg >= 4 ? 'HIGH PROFICIENCY' : avg >= 3 ? 'PROFICIENT' : avg >= 2 ? 'CORE COMPETENCE' : 'DEVELOPMENTAL';
                                doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text(`${cat.category.toUpperCase()}: `, { continued: true });
                                doc.fillColor(brandColor).text(scoreLabel);
                                const compList = cat.competencies.map((c) => c.name).join(', ');
                                doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Assessment covers: ${compList}`, { lineGap: 2 });
                                doc.moveDown(0.5);
                            });
                        }
                    }
                    catch (e) {
                        console.warn('Failed to parse competency scores for PDF');
                    }
                }
                doc.moveDown(3);
            });
        }
        // Official Sanction Section
        if (doc.y > 550)
            doc.addPage();
        const sanctionTop = doc.y;
        doc.fillColor('#f8fafc').rect(50, sanctionTop, 500, 80).fill();
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('OFFICIAL ARBITRATION BASIS:', 65, sanctionTop + 15);
        const logicLabel = packet.arbitrationLogic === 'WEIGHTED_AVG' ? 'Weighted suggested score (20% Self / 80% Manager)' :
            packet.arbitrationLogic === 'MANAGER_REC' ? 'Manager Recommendation accepted as final' : 'MD / Institutional Calibration';
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text(logicLabel, 190, sanctionTop + 15);
        doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text(packet.finalVerdict || 'This performance appraisal has been arbitrated and synchronized with the official personnel dossier.', 65, sanctionTop + 35, { width: 470, lineGap: 2 });
        doc.y = sanctionTop + 80;
        doc.moveDown(4);
        const sigY = doc.y;
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(230, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('EMPLOYEE SIGN-OFF', 70, sigY + 8);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(370, sigY).lineTo(530, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('AUTHORIZED MANAGEMENT', 370, sigY + 8);
    }
    static renderLeaveContent(doc, leave, brandColor) {
        // 🛡️ Formal Authorization Statement
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold').text('LEAVE AUTHORIZATION SANCTION', { align: 'center', characterSpacing: 2 });
        doc.moveDown(0.5);
        const statement = `This document confirms that ${leave.employee?.fullName} has been given permission for ${leave.leaveType} Leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}. All arrangements for work coverage during this period have been finalized to ensure stability.`;
        // Explicitly center and bound the statement to prevent right-leaning
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(statement, 50, doc.y, { align: 'center', width: 500, lineGap: 4 });
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
        this.keyValGrid(doc, 330, lastRow, 'Current Balance', `${leave.employee?.leaveBalance || 0} Days`);
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
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold').text('APPROVAL SIGNATURES', 50, doc.y, { align: 'center', characterSpacing: 1 });
        doc.moveDown(3.5);
        // Approval Signatures
        const sigY = doc.y;
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(230, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text(leave.employee?.fullName?.toUpperCase() || 'EMPLOYEE', 70, sigY + 8);
        doc.font('Helvetica').fontSize(6).text('EMPLOYEE SIGNATURE', 70, sigY + 17);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(370, sigY).lineTo(530, sigY).stroke();
        const authorizedName = leave.hrReviewer?.fullName || leave.manager?.fullName || 'AUTHORIZED SIGNATORY';
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text(authorizedName.toUpperCase(), 370, sigY + 8);
        doc.font('Helvetica').fontSize(6).text('MANAGEMENT / HR SIGNATURE', 370, sigY + 17);
    }
    static keyValGrid(doc, x, y, label, value) {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(value || 'N/A', x, y + 12);
    }
    static renderPayslipContent(doc, item, brandColor) {
        // 1. Employee Branding Header
        const headerTop = doc.y;
        doc.fillColor('#f8fafc').rect(50, headerTop, 500, 70).fill();
        doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(item.employee?.fullName?.toUpperCase(), 65, headerTop + 15);
        doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`EMPLOYEE CODE: ${item.employee?.employeeCode || 'N/A'}`, 65, headerTop + 32);
        doc.text(`DESIGNATION: ${item.employee?.jobTitle || 'N/A'}`, 65, headerTop + 42);
        doc.fillColor(brandColor).fontSize(10).font('Helvetica-Bold').text('PAYMENT PERIOD', 350, headerTop + 15, { align: 'right', width: 185 });
        doc.fillColor('#1e293b').fontSize(12).font('Helvetica').text(item.run?.period, 350, headerTop + 28, { align: 'right', width: 185 });
        doc.moveDown(5);
        // 2. Financial Breakdown
        const tableTop = doc.y;
        doc.rect(50, tableTop, 500, 22).fill(brandColor);
        doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text('EARNINGS & DEDUCTIONS', 65, tableTop + 7);
        doc.text('AMOUNT (GHS)', 450, tableTop + 7, { align: 'right', width: 85 });
        let currentY = tableTop + 22;
        const drawRow = (label, value, isDeduction = false) => {
            if (currentY > 650) {
                doc.addPage();
                currentY = 50;
            }
            doc.fillColor(currentY % 44 === 22 ? '#f9fafb' : '#ffffff').rect(50, currentY, 500, 22).fill();
            doc.fillColor('#334155').fontSize(9).font('Helvetica').text(label.toUpperCase(), 65, currentY + 7);
            const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2 });
            doc.fillColor(isDeduction ? '#ef4444' : '#1e293b').font('Helvetica-Bold').text(`${isDeduction ? '-' : ''}${formatted}`, 450, currentY + 7, { align: 'right', width: 85 });
            currentY += 22;
        };
        drawRow('Basic Salary', Number(item.baseSalary));
        if (Number(item.overtime))
            drawRow('Overtime / Extra Hours', Number(item.overtime));
        if (Number(item.bonus))
            drawRow('Performance Bonus', Number(item.bonus));
        if (Number(item.allowances))
            drawRow('Consolidated Allowances', Number(item.allowances));
        // Deductions
        drawRow('Income Tax (PAYE)', Number(item.tax), true);
        if (Number(item.ssnit))
            drawRow('Statutory Pension (SSNIT)', Number(item.ssnit), true);
        if (Number(item.otherDeductions))
            drawRow('Other Benefits / Deductions', Number(item.otherDeductions), true);
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
    static recordMetadata(doc, label, value) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${label.toUpperCase()}: `, { continued: true }).font('Helvetica').fillColor('#1e293b').text(value);
        doc.moveDown(0.2);
    }
}
exports.PdfExportService = PdfExportService;
