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
        const settings = await client_1.default.systemSettings.findFirst();
        const companyName = settings?.companyName || 'Nexus HRM';
        const lang = req.query.lang || 'en';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="employee-directory-${lang}.pdf"`);
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        doc.fontSize(20).font('Helvetica-Bold').text(`${companyName} — ${i18n_service_1.i18n.translate('pdf.employee_directory.title', lang)}`, 50, 50);
        doc.fontSize(11).font('Helvetica').fillColor('#64748b').text(`${i18n_service_1.i18n.translate('pdf.common.generated', lang)}: ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')} · ${employees.length} ${i18n_service_1.i18n.translate('pdf.employee_directory.active_count', lang)}`, 50, 78);
        doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#e2e8f0').stroke();
        let y = 115;
        employees.forEach((emp, i) => {
            if (y > 750) {
                doc.addPage();
                y = 50;
            }
            const isEven = i % 2 === 0;
            if (isEven)
                doc.rect(50, y - 3, 495, 22).fillColor('#f8fafc').fill();
            doc.fontSize(10).font('Helvetica').fillColor('#1e293b');
            doc.text(emp.fullName, 55, y, { width: 160 });
            doc.text(emp.jobTitle, 220, y, { width: 140 });
            doc.text(emp.departmentObj?.name || '—', 365, y, { width: 100 });
            doc.text(emp.status, 470, y, { width: 70 });
            y += 22;
        });
        doc.end();
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
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        // --- Header (Branded) ---
        const { brandColor, companyName } = await drawBrandedHeader(doc, orgId, i18n_service_1.i18n.translate('pdf.leave_request.title', lang), lang);
        let y = 170;
        // --- Layout Utility ---
        const drawDivider = (currentY) => {
            doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
            return currentY + 15;
        };
        const drawSectionHeader = (title, currentY) => {
            doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), 50, currentY);
            return currentY + 20;
        };
        const drawField = (label, value, currentY, xStart = 50, width = 240) => {
            doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), xStart, currentY);
            doc.fillColor('#1e293b').font('Helvetica').fontSize(10).text(value || '—', xStart, currentY + 12, { width: width - 10 });
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
            doc.addPage();
            y = 50;
        }
        y = drawSectionHeader(i18n_service_1.i18n.translate('pdf.leave_request.reason', lang), y);
        doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(10).text(leave.reason, 50, y, { width: 495, align: 'justify', lineGap: 4 });
        y += Math.max(40, doc.heightOfString(leave.reason, { width: 495 }) + 30);
        if (leave.handoverNotes) {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
            y = drawSectionHeader(i18n_service_1.i18n.translate('pdf.leave_request.handover_notes', lang), y);
            doc.fillColor('#1e293b').font('Helvetica').fontSize(9).text(leave.handoverNotes, 50, y, { width: 495, align: 'justify', lineGap: 3 });
            y += doc.heightOfString(leave.handoverNotes, { width: 495 }) + 40;
        }
        // Section 4: Approvals
        if (y > 600) {
            doc.addPage();
            y = 50;
        }
        y = drawSectionHeader(i18n_service_1.i18n.translate('pdf.leave_request.approvals', lang), y);
        const drawApprovalColumn = (label, status, approver, date, xPosition, currentY) => {
            const statusColors = { 'APPROVED': '#10b981', 'REJECTED': '#ef4444', 'PENDING': '#f59e0b' };
            const color = statusColors[status] || '#94a3b8';
            doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(7).text(label.toUpperCase(), xPosition, currentY);
            // Status Badge Shape (Subtle)
            doc.rect(xPosition, currentY + 10, 240, 60).fill('#f8fafc');
            doc.rect(xPosition, currentY + 10, 4, 60).fill(color);
            doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10).text(approver || '—', xPosition + 15, currentY + 22);
            doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(status, xPosition + 15, currentY + 38);
            if (date) {
                doc.fillColor('#94a3b8').fontSize(7).text((0, date_fns_1.format)(new Date(date), 'MMM dd, yyyy HH:mm'), xPosition + 15, currentY + 50);
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
        doc.fontSize(7).fillColor('#cbd5e1').text(`${i18n_service_1.i18n.translate('pdf.common.generated', lang)}: ${(0, date_fns_1.format)(new Date(), 'PPpp')} • ${companyName.toUpperCase()} SECURE DOCUMENT GATEWAY`, 50, footerY, { align: 'center', width: 495 });
        doc.end();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportLeavePDF = exportLeavePDF;
// --- BRANDING HELPER ---
const drawBrandedHeader = async (doc, orgId, title, lang = 'en', subtitleOverride) => {
    const organization = await client_1.default.organization.findUnique({ where: { id: orgId } });
    const companyName = organization?.name || i18n_service_1.i18n.translate('pdf.common.authority', lang);
    const logoUrl = organization?.logoUrl;
    const brandColor = organization?.primaryColor || '#6366f1';
    // Draw Header Background (optional subtle line)
    doc.rect(50, 40, 495, 2).fill(brandColor);
    let headerY = 60;
    if (logoUrl) {
        try {
            if (logoUrl.startsWith('http')) {
                // Cloud Fetch: Correct binary handling
                const response = await axios_1.default.get(logoUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data); // Fixed: No utf-8 encoding for binary!
                doc.image(buffer, 50, headerY, { fit: [60, 60] });
                headerY += 10;
            }
            else {
                // Legacy/Local Fallback
                const filename = logoUrl.split('/').pop();
                if (filename) {
                    const filePath = path_1.default.join(__dirname, '../../public/uploads', filename);
                    if (fs_1.default.existsSync(filePath)) {
                        doc.image(filePath, 50, headerY, { fit: [60, 60] });
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
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22).text(companyName.toUpperCase(), textX, 60);
    doc.fillColor('#64748b').font('Helvetica').fontSize(10).text(subtitleOverride || i18n_service_1.i18n.translate('pdf.common.official_record', lang), textX, 88);
    doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(16).text(title, 50, 130, { align: 'right' });
    doc.moveTo(50, 155).lineTo(545, 155).strokeColor('#e2e8f0').lineWidth(1).stroke();
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
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        // Header
        const { brandColor } = await drawBrandedHeader(doc, orgId, i18n_service_1.i18n.translate('pdf.performance.title', lang), lang, packet.cycle?.title);
        // Employee Summary Box
        doc.rect(50, 160, 495, 80).fill('#f8fafc');
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(8).text(i18n_service_1.i18n.translate('pdf.performance.dossier', lang), 65, 175);
        doc.fillColor('#1e293b').fontSize(14).text(packet.employee.fullName, 65, 190).font('Helvetica-Bold');
        doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`${packet.employee.jobTitle}  |  ${packet.employee.departmentObj?.name || i18n_service_1.i18n.translate('pdf.roadmap.unassigned', lang)}`, 65, 210);
        // Score Badge
        if (packet.finalScore) {
            doc.rect(430, 175, 100, 50).fill(brandColor);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text(`${packet.finalScore}%`, 430, 185, { width: 100, align: 'center' });
            doc.fontSize(7).text(i18n_service_1.i18n.translate('pdf.performance.final_rating', lang), 430, 210, { width: 100, align: 'center' });
        }
        let y = 260;
        // Iterate through reviews
        for (const rev of packet.reviews) {
            if (y > 650) {
                doc.addPage();
                y = 50;
            }
            const stageName = rev.reviewStage.replace(/_/g, ' ');
            doc.rect(50, y, 495, 25).fill('#f1f5f9');
            doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(10).text(`${stageName} — ${rev.reviewer?.fullName || 'Self'}`, 65, y + 8);
            y += 40;
            if (rev.summary) {
                doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text(`${i18n_service_1.i18n.translate('pdf.performance.reviewer_summary', lang)}:`, 65, y);
                doc.fillColor('#475569').font('Helvetica').fontSize(9).text(rev.summary, 65, y + 15, { width: 460, align: 'justify' });
                y += doc.heightOfString(rev.summary, { width: 460 }) + 30;
            }
            // If there are competency scores, parse and list them
            try {
                const parsed = JSON.parse(rev.responses || '{}');
                if (parsed.competencyScores) {
                    doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(8).text(i18n_service_1.i18n.translate('pdf.performance.competency_breakdown', lang), 65, y);
                    y += 15;
                    for (const cat of parsed.competencyScores) {
                        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8).text(cat.category, 65, y);
                        doc.fillColor('#64748b').text(`${Math.round(cat.categoryAverage * 20)}%`, 480, y, { align: 'right', width: 60 });
                        y += 12;
                    }
                    y += 20;
                }
            }
            catch (e) { }
        }
        // Final Verdict Section
        if (packet.finalVerdict || packet.disputeResolution) {
            if (y > 600) {
                doc.addPage();
                y = 50;
            }
            doc.rect(50, y, 495, 2).fill(brandColor);
            y += 15;
            doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(i18n_service_1.i18n.translate('pdf.performance.verdict_conclusion', lang), 50, y);
            y += 20;
            const verdict = packet.finalVerdict || packet.disputeResolution;
            doc.fillColor('#475569').font('Helvetica').fontSize(10).text(verdict, 50, y, { width: 495, align: 'justify' });
            y += doc.heightOfString(verdict, { width: 495 }) + 40;
        }
        // Signatures
        if (y > 700) {
            doc.addPage();
            y = 100;
        }
        else {
            y = 720;
        }
        doc.moveTo(50, y).lineTo(200, y).strokeColor(brandColor).stroke();
        doc.fontSize(8).fillColor('#64748b').text(i18n_service_1.i18n.translate('pdf.common.signature', lang), 50, y + 5);
        doc.moveTo(395, y).lineTo(545, y).strokeColor(brandColor).stroke();
        doc.text(i18n_service_1.i18n.translate('pdf.common.authority', lang), 395, y + 5);
        doc.end();
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
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        const { brandColor } = await drawBrandedHeader(doc, orgId, i18n_service_1.i18n.translate('pdf.roadmap.title', lang), lang, i18n_service_1.i18n.translate('pdf.roadmap.subtitle', lang));
        const employee = targets[0].assignee;
        if (!employee)
            return res.status(404).json({ error: 'Assignee profile not found' });
        doc.fontSize(11).font('Helvetica-Bold').fillColor(brandColor).text(i18n_service_1.i18n.translate('pdf.roadmap.strategic_roadmap', lang), 50, 160);
        doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(i18n_service_1.i18n.translate('pdf.roadmap.alignment_dossier', lang), 50, 175);
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text(employee.fullName, 50, 190);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`${employee.jobTitle}  |  ${employee.departmentObj?.name || i18n_service_1.i18n.translate('pdf.roadmap.unassigned', lang)}`, 50, 210);
        // Summary Table Header
        let tableY = 240;
        doc.rect(50, tableY, 495, 20).fill(brandColor);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(i18n_service_1.i18n.translate('pdf.roadmap.target_mission', lang), 60, tableY + 6);
        doc.text(i18n_service_1.i18n.translate('pdf.roadmap.due_date', lang), 350, tableY + 6);
        doc.text(i18n_service_1.i18n.translate('pdf.roadmap.weight', lang), 420, tableY + 6);
        doc.text(i18n_service_1.i18n.translate('pdf.roadmap.status', lang), 480, tableY + 6);
        let y = 245;
        for (const target of targets) {
            if (y > 650) {
                doc.addPage();
                y = 50;
            }
            doc.rect(50, y, 495, 30).fill('#f8fafc');
            doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(11).text(target.title.toUpperCase(), 65, y + 10);
            doc.fillColor('#64748b').fontSize(8).text(target.status, 470, y + 10, { width: 70, align: 'right' });
            y += 45;
            if (target.description) {
                doc.fillColor('#475569').font('Helvetica').fontSize(9).text(target.description, 65, y, { width: 460, align: 'justify' });
                y += doc.heightOfString(target.description, { width: 460 }) + 20;
            }
            // Metrics
            doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(7).text(i18n_service_1.i18n.translate('pdf.roadmap.kpi_metrics', lang), 65, y);
            y += 15;
            for (const m of target.metrics) {
                doc.rect(65, y, 480, 20).fill('#ffffff').stroke('#f1f5f9');
                doc.fillColor('#1e293b').font('Helvetica').fontSize(9).text(m.title, 75, y + 6);
                const targetStr = m.targetValue ? `${m.targetValue} ${m.unit || ''}` : i18n_service_1.i18n.translate('pdf.roadmap.qualitative', lang);
                doc.fillColor(brandColor).font('Helvetica-Bold').text(targetStr, 400, y + 6, { width: 135, align: 'right' });
                y += 25;
            }
            y += 30;
        }
        doc.end();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportTargetPDF = exportTargetPDF;
