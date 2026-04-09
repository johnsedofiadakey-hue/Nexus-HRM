"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportTargetPDF = exports.exportAppraisalPDF = exports.exportLeavePDF = exports.exportEmployeesPDF = exports.exportPerformanceReportCSV = exports.exportLeaveReportCSV = exports.exportEmployeesCSV = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const i18n_service_1 = require("../services/i18n.service");
const axios_1 = __importDefault(require("axios"));
const date_fns_1 = require("date-fns");
const exportEmployeesCSV = async (req, res) => {
    try {
        const employees = await client_1.default.user.findMany({
            where: { status: { not: 'TERMINATED' } },
            include: { departmentObj: { select: { name: true } }, supervisor: { select: { fullName: true } } },
            orderBy: { fullName: 'asc' }
        });
        const lang = req.query.lang || 'en';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="employees-${lang}.csv"`);
        const headers = [
            i18n_service_1.i18n.translate('csv.employee.code', lang),
            i18n_service_1.i18n.translate('csv.employee.name', lang),
            i18n_service_1.i18n.translate('csv.employee.email', lang),
            i18n_service_1.i18n.translate('csv.employee.job_title', lang),
            i18n_service_1.i18n.translate('csv.employee.dept', lang),
            i18n_service_1.i18n.translate('csv.employee.role', lang),
            i18n_service_1.i18n.translate('csv.employee.status', lang),
            i18n_service_1.i18n.translate('csv.employee.type', lang),
            i18n_service_1.i18n.translate('csv.employee.join_date', lang),
            i18n_service_1.i18n.translate('csv.employee.supervisor', lang),
            i18n_service_1.i18n.translate('csv.employee.contact', lang),
            i18n_service_1.i18n.translate('csv.employee.gender', lang)
        ].join(',');
        let csv = headers + '\n';
        employees.forEach(e => {
            csv += `"${e.employeeCode || ''}","${e.fullName}","${e.email}","${e.jobTitle}","${e.departmentObj?.name || ''}","${e.role}","${e.status}","${e.employmentType || ''}","${e.joinDate ? new Date(e.joinDate).toLocaleDateString() : ''}","${e.supervisor?.fullName || ''}","${e.contactNumber || ''}","${e.gender || ''}"\n`;
        });
        res.send(csv);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportEmployeesCSV = exportEmployeesCSV;
const exportLeaveReportCSV = async (req, res) => {
    try {
        const { year } = req.query;
        const leaves = await client_1.default.leaveRequest.findMany({
            where: {
                ...(year ? { startDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${parseInt(year) + 1}-01-01`) } } : {}),
                isArchived: false
            },
            include: { employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } } },
            orderBy: { startDate: 'desc' }
        });
        const lang = req.query.lang || 'en';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="leave-report-${year || 'all'}-${lang}.csv"`);
        const headers = [
            i18n_service_1.i18n.translate('csv.leave.employee', lang),
            i18n_service_1.i18n.translate('csv.leave.dept', lang),
            i18n_service_1.i18n.translate('csv.leave.job_title', lang),
            i18n_service_1.i18n.translate('csv.leave.start', lang),
            i18n_service_1.i18n.translate('csv.leave.end', lang),
            i18n_service_1.i18n.translate('csv.leave.days', lang),
            i18n_service_1.i18n.translate('csv.leave.status', lang),
            i18n_service_1.i18n.translate('csv.leave.reason', lang)
        ].join(',');
        let csv = headers + '\n';
        leaves.forEach(l => {
            csv += `"${l.employee.fullName}","${l.employee.departmentObj?.name || ''}","${l.employee.jobTitle}","${new Date(l.startDate).toLocaleDateString()}","${new Date(l.endDate).toLocaleDateString()}","${l.leaveDays}","${l.status}","${l.reason}"\n`;
        });
        res.send(csv);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportLeaveReportCSV = exportLeaveReportCSV;
const exportPerformanceReportCSV = async (req, res) => {
    try {
        const orgId = req.user?.organizationId || 'default-tenant';
        const packets = await client_1.default.appraisalPacket.findMany({
            where: { organizationId: orgId, status: 'COMPLETED' },
            include: {
                employee: { select: { fullName: true, employeeCode: true, departmentObj: { select: { name: true } } } },
                cycle: { select: { title: true, period: true } },
                reviews: {
                    where: { reviewStage: 'MANAGER' },
                    select: { overallRating: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const lang = req.query.lang || 'en';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="performance-v3-report-${lang}.csv"`);
        const headers = [
            i18n_service_1.i18n.translate('csv.performance.cycle', lang),
            i18n_service_1.i18n.translate('csv.performance.period', lang),
            i18n_service_1.i18n.translate('csv.performance.employee', lang),
            i18n_service_1.i18n.translate('csv.performance.id', lang),
            i18n_service_1.i18n.translate('csv.performance.dept', lang),
            i18n_service_1.i18n.translate('csv.performance.manager_score', lang),
            i18n_service_1.i18n.translate('csv.performance.final_score', lang),
            i18n_service_1.i18n.translate('csv.performance.verdict', lang)
        ].join(',');
        let csv = headers + '\n';
        packets.forEach(p => {
            const managerScore = p.reviews[0]?.overallRating || '—';
            csv += `"${p.cycle.title}","${p.cycle.period}","${p.employee.fullName}","${p.employee.employeeCode || ''}","${p.employee.departmentObj?.name || ''}","${managerScore}","${p.finalScore || '—'}","${p.finalVerdict || ''}"\n`;
        });
        res.send(csv);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportPerformanceReportCSV = exportPerformanceReportCSV;
const exportEmployeesPDF = async (req, res) => {
    try {
        const employees = await client_1.default.user.findMany({
            where: { status: 'ACTIVE' },
            include: { departmentObj: { select: { name: true } } },
            orderBy: { fullName: 'asc' }
        });
        const lang = req.query.lang || 'en';
        const pdfDoc = new pdfkit_1.default({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=employees.pdf`);
        pdfDoc.pipe(res);
        // --- Header (Branded) ---
        const { brandColor, companyName } = await drawBrandedHeader(pdfDoc, req.user?.organizationId || 'default-tenant', i18n_service_1.i18n.translate('pdf.employee_directory.title', lang), lang);
        pdfDoc.fontSize(11).font('Helvetica').fillColor('#64748b').text(`${i18n_service_1.i18n.translate('pdf.common.generated', lang)}: ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')} · ${employees.length} ${i18n_service_1.i18n.translate('pdf.employee_directory.active_count', lang)}`, 50, 140);
        pdfDoc.moveTo(50, 155).lineTo(545, 155).strokeColor('#e2e8f0').stroke();
        let y = 175;
        employees.forEach((emp, i) => {
            if (y > 750) {
                pdfDoc.addPage();
                y = 50;
            }
            const isEven = i % 2 === 0;
            if (isEven)
                pdfDoc.rect(50, y - 3, 495, 22).fillColor('#f8fafc').fill();
            pdfDoc.fontSize(10).font('Helvetica').fillColor('#1e293b');
            pdfDoc.text(emp.fullName, 55, y, { width: 160 });
            pdfDoc.text(emp.jobTitle, 220, y, { width: 140 });
            pdfDoc.text(emp.departmentObj?.name || '—', 365, y, { width: 100 });
            pdfDoc.text(emp.status, 470, y, { width: 70 });
            y += 22;
        });
        pdfDoc.end();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportEmployeesPDF = exportEmployeesPDF;
const exportLeavePDF = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organizationId || 'default-tenant';
        const leave = await client_1.default.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: { select: { fullName: true, employeeCode: true, jobTitle: true, departmentObj: { select: { name: true } } } },
                reliever: { select: { fullName: true } },
                manager: { select: { fullName: true } },
                hrReviewer: { select: { fullName: true } }
            }
        });
        if (!leave || leave.isArchived)
            return res.status(404).json({ error: 'Leave request not found' });
        const lang = req.query.lang || 'en';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Leave_Request_${leave.employee.fullName.replace(/\s+/g, '_')}_${leave.id.slice(0, 5)}.pdf"`);
        const pdfDoc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        pdfDoc.pipe(res);
        // --- Header (Branded) ---
        const { brandColor, companyName } = await drawBrandedHeader(pdfDoc, orgId, i18n_service_1.i18n.translate('pdf.leave_request.title', lang), lang);
        let y = 170;
        // --- Layout Utility ---
        const drawDivider = (currentY) => {
            pdfDoc.moveTo(50, currentY).lineTo(545, currentY).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
            return currentY + 15;
        };
        const drawSectionHeader = (title, currentY) => {
            pdfDoc.fillColor(brandColor).font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), 50, currentY);
            return currentY + 20;
        };
        const drawField = (label, value, currentY, xStart = 50, width = 240) => {
            pdfDoc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), xStart, currentY);
            pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(10).text(value || '—', xStart, currentY + 12, { width: width - 10 });
            return currentY + 35;
        };
        // Personnel Grid
        y = drawSectionHeader(i18n_service_1.i18n.translate('pdf.leave_request.employee_info', lang), y);
        // Row 1
        const row1Y = y;
        drawField(i18n_service_1.i18n.translate('pdf.leave_request.name', lang), leave.employee.fullName, row1Y, 50, 240);
        drawField(i18n_service_1.i18n.translate('pdf.leave_request.id_code', lang), leave.employee.employeeCode || 'N/A', row1Y, 300, 240);
        y += 45;
        // Row 2
        const row2Y = y;
        drawField(i18n_service_1.i18n.translate('pdf.leave_request.job_title', lang), leave.employee.jobTitle, row2Y, 50, 240);
        drawField(i18n_service_1.i18n.translate('pdf.leave_request.dept', lang), leave.employee.departmentObj?.name || '—', row2Y, 300, 240);
        y += 50;
        y = drawDivider(y);
        // Section 2: Parameters
        y = drawSectionHeader(i18n_service_1.i18n.translate('pdf.leave_request.details', lang), y);
        // Row 3
        const row3Y = y;
        const leaveTypeLabel = i18n_service_1.i18n.translate(`leave.types.${leave.leaveType}`, lang);
        drawField(i18n_service_1.i18n.translate('pdf.leave_request.type', lang), leaveTypeLabel, row3Y, 50, 160);
        drawField(i18n_service_1.i18n.translate('pdf.leave_request.period', lang), `${(0, date_fns_1.format)(new Date(leave.startDate), 'dd MMM yyyy')} - ${(0, date_fns_1.format)(new Date(leave.endDate), 'dd MMM yyyy')}`, row3Y, 210, 220);
        drawField(i18n_service_1.i18n.translate('pdf.leave_request.duration', lang), `${leave.leaveDays} ${i18n_service_1.i18n.translate('pdf.leave_request.working_days', lang)}`, row3Y, 440, 100);
        y += 50;
        // Reliever Line
        y = drawField(i18n_service_1.i18n.translate('pdf.leave_request.reliever', lang), leave.reliever?.fullName || i18n_service_1.i18n.translate('pdf.leave_request.no_reliever', lang), y, 50, 495);
        y += 10;
        y = drawDivider(y);
        // Section 3: Justification & Protocol
        if (y > 650) {
            pdfDoc.addPage();
            y = 50;
        }
        y = drawSectionHeader(i18n_service_1.i18n.translate('pdf.leave_request.reason', lang), y);
        pdfDoc.fillColor('#475569').font('Helvetica-Oblique').fontSize(10).text(leave.reason, 50, y, { width: 495, align: 'justify', lineGap: 4 });
        y += Math.max(40, pdfDoc.heightOfString(leave.reason, { width: 495 }) + 30);
        if (leave.handoverNotes) {
            if (y > 700) {
                pdfDoc.addPage();
                y = 50;
            }
            y = drawSectionHeader(i18n_service_1.i18n.translate('pdf.leave_request.handover_notes', lang), y);
            pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(9).text(leave.handoverNotes, 50, y, { width: 495, align: 'justify', lineGap: 3 });
            y += pdfDoc.heightOfString(leave.handoverNotes, { width: 495 }) + 40;
        }
        // Section 4: Approvals
        if (y > 600) {
            pdfDoc.addPage();
            y = 50;
        }
        y = drawSectionHeader(i18n_service_1.i18n.translate('pdf.leave_request.approvals', lang), y);
        const drawApprovalColumn = (label, status, approver, date, xPosition, currentY) => {
            const statusColors = { 'APPROVED': '#10b981', 'REJECTED': '#ef4444', 'PENDING': '#f59e0b' };
            const color = statusColors[status] || '#94a3b8';
            pdfDoc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(7).text(label.toUpperCase(), xPosition, currentY);
            // Status Badge Shape (Subtle)
            pdfDoc.rect(xPosition, currentY + 10, 240, 60).fill('#f8fafc');
            pdfDoc.rect(xPosition, currentY + 10, 4, 60).fill(color);
            pdfDoc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10).text(approver || '—', xPosition + 15, currentY + 22);
            pdfDoc.fillColor('#64748b').font('Helvetica').fontSize(8).text(status, xPosition + 15, currentY + 38);
            if (date) {
                pdfDoc.fillColor('#94a3b8').fontSize(7).text((0, date_fns_1.format)(new Date(date), 'MMM dd, yyyy HH:mm'), xPosition + 15, currentY + 50);
            }
            return currentY + 80;
        };
        const s1 = leave.status.includes('REJECTED') ? 'REJECTED' : (['HR_REVIEW', 'APPROVED'].includes(leave.status) ? 'APPROVED' : 'PENDING');
        const s2 = leave.status === 'APPROVED' ? 'APPROVED' : (leave.status === 'HR_REJECTED' ? 'REJECTED' : 'PENDING');
        const approvalY = y;
        drawApprovalColumn(i18n_service_1.i18n.translate('pdf.leave_request.dept_approval', lang), s1, leave.manager?.fullName || 'Personnel Lead', null, 50, approvalY);
        drawApprovalColumn(i18n_service_1.i18n.translate('pdf.leave_request.final_signoff', lang), s2, leave.hrReviewer?.fullName || 'HR Executive', null, 305, approvalY);
        y += 100;
        // Footer
        const footerY = 750;
        pdfDoc.fontSize(7).fillColor('#cbd5e1').text(`${i18n_service_1.i18n.translate('pdf.common.generated', lang)}: ${(0, date_fns_1.format)(new Date(), 'PPpp')} • ${companyName.toUpperCase()} SECURE DOCUMENT GATEWAY`, 50, footerY, { align: 'center', width: 495 });
        pdfDoc.end();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportLeavePDF = exportLeavePDF;
// --- BRANDING HELPER ---
const drawBrandedHeader = async (pdfDoc, orgId, title, lang = 'en', subtitleOverride) => {
    const organization = await client_1.default.organization.findUnique({ where: { id: orgId } });
    const companyName = organization?.name || i18n_service_1.i18n.translate('pdf.common.authority', lang);
    const logoUrl = organization?.logoUrl;
    const brandColor = organization?.primaryColor || '#6366f1';
    // Draw Header Background (optional subtle line)
    pdfDoc.rect(50, 40, 495, 2).fill(brandColor);
    let headerY = 60;
    if (logoUrl) {
        try {
            if (logoUrl.startsWith('http')) {
                // Cloud Fetch: Correct binary handling
                const response = await axios_1.default.get(logoUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data); // Fixed: No utf-8 encoding for binary!
                pdfDoc.image(buffer, 50, headerY, { fit: [60, 60] });
                headerY += 10;
            }
            else {
                // Legacy/Local Fallback
                const filename = logoUrl.split('/').pop();
                if (filename) {
                    const filePath = path_1.default.join(__dirname, '../../public/uploads', filename);
                    if (fs_1.default.existsSync(filePath)) {
                        pdfDoc.image(filePath, 50, headerY, { fit: [60, 60] });
                        headerY += 10;
                    }
                }
            }
        }
        catch (e) {
            console.warn('[PDF] Failed to load brand logo:', e);
        }
    }
    const textX = logoUrl ? 130 : 50;
    pdfDoc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22).text(companyName.toUpperCase(), textX, 60);
    pdfDoc.fillColor('#64748b').font('Helvetica').fontSize(9).text(subtitleOverride || i18n_service_1.i18n.translate('pdf.common.official_record', lang), textX, 86);
    // Add Org Details if available
    if (organization?.address || organization?.phone) {
        const details = [organization.address, organization.phone, organization.email].filter(Boolean).join('  |  ');
        pdfDoc.fillColor('#94a3b8').font('Helvetica').fontSize(7).text(details, textX, 100);
    }
    pdfDoc.fillColor(brandColor).font('Helvetica-Bold').fontSize(16).text(title, 50, 130, { align: 'right' });
    pdfDoc.moveTo(50, 155).lineTo(545, 155).strokeColor('#e2e8f0').lineWidth(1).stroke();
    return { brandColor, companyName };
};
const exportAppraisalPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organizationId || 'default-tenant';
        const packet = await client_1.default.appraisalPacket.findUnique({
            where: { id },
            include: {
                employee: { select: { fullName: true, employeeCode: true, jobTitle: true, departmentObj: { select: { name: true } } } },
                cycle: true,
                reviews: {
                    include: { reviewer: { select: { fullName: true } } },
                    orderBy: { submittedAt: 'asc' }
                },
                resolvedBy: { select: { fullName: true } }
            }
        });
        if (!packet)
            return res.status(404).json({ error: 'Appraisal packet not found' });
        const lang = req.query.lang || 'en';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="appraisal-${packet.id}-${lang}.pdf"`);
        const pdfDoc = new pdfkit_1.default({ margin: 50, size: "A4" });
        pdfDoc.pipe(res);
        // Header
        const { brandColor } = await drawBrandedHeader(pdfDoc, orgId, i18n_service_1.i18n.translate('pdf.performance.title', lang), lang, packet.cycle?.title);
        // ─── EMPLOYEE DOSSIER ───
        pdfDoc.rect(50, 160, 495, 90).fill('#f8fafc');
        pdfDoc.fillColor(brandColor).font('Helvetica-Bold').fontSize(7).text(i18n_service_1.i18n.translate('pdf.performance.dossier', lang).toUpperCase(), 65, 175);
        pdfDoc.fillColor('#1e293b').fontSize(16).text(packet.employee.fullName, 65, 188).font('Helvetica-Bold');
        pdfDoc.fillColor('#475569').fontSize(10).font('Helvetica').text(`${packet.employee.employeeCode || 'STAFF'}  •  ${packet.employee.jobTitle}`, 65, 210);
        pdfDoc.fillColor('#64748b').fontSize(9).text(packet.employee.departmentObj?.name || 'Institutional Operations', 65, 225);
        // Score Circular Badge
        if (packet.finalScore) {
            pdfDoc.circle(485, 205, 35).fill(brandColor);
            pdfDoc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text(`${packet.finalScore}%`, 450, 195, { width: 70, align: 'center' });
            pdfDoc.fontSize(6).text(i18n_service_1.i18n.translate('pdf.performance.final_rating', lang).toUpperCase(), 450, 220, { width: 70, align: 'center' });
        }
        let y = 280;
        // --- Section Utility ---
        const drawSectionMarker = (label, curY) => {
            pdfDoc.rect(50, curY, 3, 20).fill(brandColor);
            pdfDoc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(label.toUpperCase(), 65, curY + 5);
            return curY + 30;
        };
        // ─── REVIEW BLOCKS ───
        for (const rev of packet.reviews) {
            if (y > 650) {
                pdfDoc.addPage();
                y = 60;
            }
            const stageLabel = i18n_service_1.i18n.translate(`appraisal.stages.${rev.reviewStage}`, lang) || rev.reviewStage.replace(/_/g, ' ');
            y = drawSectionMarker(`${stageLabel}: ${rev.reviewer?.fullName || 'SELF'}`, y);
            if (rev.summary) {
                pdfDoc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text(i18n_service_1.i18n.translate('pdf.performance.reviewer_summary', lang).toUpperCase(), 65, y);
                pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(9).text(rev.summary, 65, y + 12, { width: 460, align: 'justify', lineGap: 3 });
                y += Math.max(40, pdfDoc.heightOfString(rev.summary, { width: 460 }) + 25);
            }
            // Highlights (Strengths/Weaknesses) if present
            if (rev.strengths || rev.weaknesses) {
                const swY = y;
                if (rev.strengths) {
                    pdfDoc.fillColor('#10b981').font('Helvetica-Bold').fontSize(7).text('KEY STRENGTHS', 65, swY);
                    pdfDoc.fillColor('#334155').font('Helvetica').fontSize(8).text(rev.strengths, 65, swY + 10, { width: 220 });
                }
                if (rev.weaknesses) {
                    pdfDoc.fillColor('#ef4444').font('Helvetica-Bold').fontSize(7).text('DEVELOPMENT AREAS', 295, swY);
                    pdfDoc.fillColor('#334155').font('Helvetica').fontSize(8).text(rev.weaknesses, 295, swY + 10, { width: 220 });
                }
                y += 45;
            }
            pdfDoc.moveTo(65, y).lineTo(525, y).strokeColor('#f1f5f9').stroke();
            y += 20;
        }
        // ─── FINAL VERDICT ───
        if (packet.finalVerdict || packet.disputeResolution) {
            if (y > 600) {
                pdfDoc.addPage();
                y = 60;
            }
            y = drawSectionMarker(i18n_service_1.i18n.translate('pdf.performance.verdict_conclusion', lang), y);
            pdfDoc.rect(65, y, 460, 60).fill('#fffcf2').stroke('#fef3c7');
            const verdict = packet.finalVerdict || packet.disputeResolution;
            pdfDoc.fillColor('#92400e').font('Helvetica-Oblique').fontSize(9).text(verdict, 75, y + 10, { width: 440, align: 'justify' });
            y += 80;
        }
        // ─── SIGNATURE BLOCK ───
        if (y > 680) {
            pdfDoc.addPage();
            y = 100;
        }
        else {
            y = 700;
        }
        pdfDoc.moveTo(65, y).lineTo(230, y).strokeColor('#e2e8f0').stroke();
        pdfDoc.fontSize(7).fillColor('#94a3b8').text(i18n_service_1.i18n.translate('pdf.performance.employee_signature', lang).toUpperCase(), 65, y + 8);
        pdfDoc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8).text(packet.employee.fullName, 65, y + 18);
        pdfDoc.moveTo(365, y).lineTo(530, y).strokeColor('#e2e8f0').stroke();
        pdfDoc.fillColor('#94a3b8').fontSize(7).text(i18n_service_1.i18n.translate('pdf.performance.authority_signoff', lang).toUpperCase(), 365, y + 8, { align: 'right', width: 165 });
        pdfDoc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8).text(packet.resolvedBy?.fullName || 'INSTITUTIONAL AUTHORITY', 365, y + 18, { align: 'right', width: 165 });
        pdfDoc.end();
        pdfDoc.end();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportAppraisalPDF = exportAppraisalPDF;
const exportTargetPDF = async (req, res) => {
    try {
        const { id } = req.params; // Using target ID or employee ID? Let's use employee ID for a roadmap
        const orgId = req.user?.organizationId || 'default-tenant';
        const targets = await client_1.default.target.findMany({
            where: { assigneeId: id, organizationId: orgId },
            include: {
                assignee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
                metrics: true,
                department: { select: { name: true } }
            },
            orderBy: { dueDate: 'asc' }
        });
        if (!targets.length)
            return res.status(404).json({ error: 'No targets found for this employee' });
        const lang = req.query.lang || 'en';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="target-roadmap-${id}-${lang}.pdf"`);
        const pdfDoc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        pdfDoc.pipe(res);
        const { brandColor } = await drawBrandedHeader(pdfDoc, orgId, i18n_service_1.i18n.translate('pdf.roadmap.title', lang), lang, i18n_service_1.i18n.translate('pdf.roadmap.subtitle', lang));
        const employee = targets[0].assignee;
        if (!employee)
            return res.status(404).json({ error: 'Assignee profile not found' });
        pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor(brandColor).text(i18n_service_1.i18n.translate('pdf.roadmap.strategic_roadmap', lang), 50, 160);
        pdfDoc.fontSize(8).font('Helvetica').fillColor('#64748b').text(i18n_service_1.i18n.translate('pdf.roadmap.alignment_dossier', lang), 50, 175);
        pdfDoc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text(employee.fullName, 50, 190);
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`${employee.jobTitle}  |  ${employee.departmentObj?.name || i18n_service_1.i18n.translate('pdf.roadmap.unassigned', lang)}`, 50, 210);
        // Summary Table Header
        let tableY = 240;
        pdfDoc.rect(50, tableY, 495, 20).fill(brandColor);
        pdfDoc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(i18n_service_1.i18n.translate('pdf.roadmap.target_mission', lang), 60, tableY + 6);
        pdfDoc.text(i18n_service_1.i18n.translate('pdf.roadmap.due_date', lang), 350, tableY + 6);
        pdfDoc.text(i18n_service_1.i18n.translate('pdf.roadmap.weight', lang), 420, tableY + 6);
        pdfDoc.text(i18n_service_1.i18n.translate('pdf.roadmap.status', lang), 480, tableY + 6);
        let y = 245;
        for (const target of targets) {
            if (y > 650) {
                pdfDoc.addPage();
                y = 50;
            }
            pdfDoc.rect(50, y, 495, 30).fill('#f8fafc');
            pdfDoc.fillColor(brandColor).font('Helvetica-Bold').fontSize(11).text(target.title.toUpperCase(), 65, y + 10);
            pdfDoc.fillColor('#64748b').fontSize(8).text(target.status, 470, y + 10, { width: 70, align: 'right' });
            y += 45;
            if (target.description) {
                pdfDoc.fillColor('#475569').font('Helvetica').fontSize(9).text(target.description, 65, y, { width: 460, align: 'justify' });
                y += pdfDoc.heightOfString(target.description, { width: 460 }) + 20;
            }
            // Metrics
            pdfDoc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(7).text(i18n_service_1.i18n.translate('pdf.roadmap.kpi_metrics', lang), 65, y);
            y += 15;
            for (const m of target.metrics) {
                pdfDoc.rect(65, y, 480, 20).fill('#ffffff').stroke('#f1f5f9');
                pdfDoc.fillColor('#1e293b').font('Helvetica').fontSize(9).text(m.title, 75, y + 6);
                const targetStr = m.targetValue ? `${m.targetValue} ${m.unit || ''}` : i18n_service_1.i18n.translate('pdf.roadmap.qualitative', lang);
                pdfDoc.fillColor(brandColor).font('Helvetica-Bold').text(targetStr, 400, y + 6, { width: 135, align: 'right' });
                y += 25;
            }
            y += 30;
        }
        pdfDoc.end();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportTargetPDF = exportTargetPDF;
