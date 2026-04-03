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
const exportEmployeesCSV = async (req, res) => {
    try {
        const employees = await client_1.default.user.findMany({
            where: { status: { not: 'TERMINATED' } },
            include: { departmentObj: { select: { name: true } }, supervisor: { select: { fullName: true } } },
            orderBy: { fullName: 'asc' }
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
        let csv = 'Code,Full Name,Email,Job Title,Department,Role,Status,Employment Type,Join Date,Supervisor,Contact,Gender\n';
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
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="leave-report-${year || 'all'}.csv"`);
        let csv = 'Employee,Department,Job Title,Start Date,End Date,Days,Status,Reason\n';
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
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="performance-v3-report.csv"');
        let csv = 'Cycle,Period,Employee,ID,Department,Manager Score,Final Score,Verdict\n';
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
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="employee-directory.pdf"');
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        doc.fontSize(20).font('Helvetica-Bold').text(`${companyName} — Employee Directory`, 50, 50);
        doc.fontSize(11).font('Helvetica').fillColor('#64748b').text(`Generated: ${new Date().toLocaleDateString()} · ${employees.length} active employees`, 50, 78);
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
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="leave-request-${leave.id}.pdf"`);
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        // --- Header ---
        doc.fontSize(22).font('Helvetica-Bold').text('LEAVE REQUEST FORM', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text('Corporate OS Support Engine', { align: 'center' });
        doc.moveDown(2);
        // --- Employee Info Table ---
        doc.rect(50, doc.y, 495, 20).fill('#f8fafc');
        doc.fillColor('#1e293b').font('Helvetica-Bold').text('EMPLOYEE INFORMATION', 60, doc.y + 5);
        doc.moveDown(1.5);
        doc.font('Helvetica-Bold').text('Name: ', 60, doc.y);
        doc.font('Helvetica').text(leave.employee.fullName, 150, doc.y - 12);
        doc.font('Helvetica-Bold').text('ID Code: ', 60, doc.y);
        doc.font('Helvetica').text(leave.employee.employeeCode || 'N/A', 150, doc.y - 12);
        doc.font('Helvetica-Bold').text('Job Title: ', 60, doc.y);
        doc.font('Helvetica').text(leave.employee.jobTitle, 150, doc.y - 12);
        doc.font('Helvetica-Bold').text('Dept: ', 60, doc.y);
        doc.font('Helvetica').text(leave.employee.departmentObj?.name || '—', 150, doc.y - 12);
        doc.moveDown(2);
        // --- Leave Details ---
        doc.rect(50, doc.y, 495, 20).fill('#f8fafc');
        doc.fillColor('#1e293b').font('Helvetica-Bold').text('LEAVE DETAILS', 60, doc.y + 5);
        doc.moveDown(1.5);
        doc.font('Helvetica-Bold').text('Leave Type: ', 60, doc.y);
        doc.font('Helvetica').text(leave.leaveType, 150, doc.y - 12);
        doc.font('Helvetica-Bold').text('Period: ', 60, doc.y);
        doc.font('Helvetica').text(`${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}`, 150, doc.y - 12);
        doc.font('Helvetica-Bold').text('Duration: ', 60, doc.y);
        doc.font('Helvetica').text(`${leave.leaveDays} Working Day(s)`, 150, doc.y - 12);
        doc.font('Helvetica-Bold').text('Reliever: ', 60, doc.y);
        doc.font('Helvetica').text(leave.reliever?.fullName || 'No reliever selected', 150, doc.y - 12);
        doc.moveDown(1.5);
        doc.font('Helvetica-Bold').text('Reason for Leave: ', 60, doc.y);
        doc.font('Helvetica').text(leave.reason, 60, doc.y + 5, { width: 475, align: 'justify' });
        doc.moveDown(1.5);
        if (leave.handoverNotes) {
            doc.font('Helvetica-Bold').text('Handover Notes: ', 60, doc.y);
            doc.font('Helvetica').text(leave.handoverNotes, 60, doc.y + 5, { width: 475, align: 'justify' });
            doc.moveDown(1.5);
        }
        doc.moveDown(1.5);
        // --- Approvals Section ---
        doc.rect(50, doc.y, 495, 20).fill('#f8fafc');
        doc.fillColor('#1e293b').font('Helvetica-Bold').text('INSTITUTIONAL APPROVALS', 60, doc.y + 5);
        doc.moveDown(1.5);
        // Stage 1
        doc.font('Helvetica-Bold').text('1. Departmental Approval (Line Manager)', 60, doc.y);
        doc.moveDown(0.5);
        doc.font('Helvetica').text(`Status: ${leave.status.includes('REJECTED') ? 'REJECTED' : (['HR_REVIEW', 'APPROVED'].includes(leave.status) ? 'APPROVED' : 'PENDING')}`, 80, doc.y);
        doc.text(`Approver: ${leave.manager?.fullName || '—'}`, 80, doc.y);
        doc.text(`Comments: ${leave.managerComment || '—'}`, 80, doc.y, { width: 450 });
        doc.moveDown(1.5);
        // Stage 2
        doc.font('Helvetica-Bold').text('2. Final Sign-off (Head of HR / MD)', 60, doc.y);
        doc.moveDown(0.5);
        doc.font('Helvetica').text(`Status: ${leave.status === 'APPROVED' ? 'APPROVED' : (leave.status === 'HR_REJECTED' ? 'REJECTED' : 'PENDING')}`, 80, doc.y);
        doc.text(`Approver: ${leave.hrReviewer?.fullName || '—'}`, 80, doc.y);
        doc.text(`Comments: ${leave.hrComment || '—'}`, 80, doc.y, { width: 450 });
        doc.moveDown(3);
        // --- Footer / Signatures ---
        const bottomY = 720;
        doc.moveTo(50, bottomY).lineTo(250, bottomY).stroke();
        doc.fontSize(8).text('Employee Signature', 50, bottomY + 5);
        doc.moveTo(350, bottomY).lineTo(545, bottomY).stroke();
        doc.fontSize(8).text('Institutional Rubber Stamp & Date', 350, bottomY + 5);
        doc.end();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportLeavePDF = exportLeavePDF;
// --- BRANDING HELPER ---
const drawBrandedHeader = async (doc, orgId, title, subtitle) => {
    const organization = await client_1.default.organization.findUnique({ where: { id: orgId } });
    const companyName = organization?.name || 'the organization';
    const logoUrl = organization?.logoUrl;
    const brandColor = organization?.primaryColor || '#6366f1';
    // Draw Header Background (optional subtle line)
    doc.rect(50, 40, 495, 2).fill(brandColor);
    let headerY = 60;
    if (logoUrl) {
        const filename = logoUrl.split('/').pop();
        if (filename) {
            const filePath = path_1.default.join(__dirname, '../../public/uploads', filename);
            if (fs_1.default.existsSync(filePath)) {
                doc.image(filePath, 50, headerY, { fit: [45, 45] });
                headerY += 5;
            }
        }
    }
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(companyName.toUpperCase(), 105, headerY - 2);
    doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(subtitle || 'Official Institutional Record', 105, headerY + 18);
    doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(14).text(title, 50, 120, { align: 'right' });
    doc.moveTo(50, 145).lineTo(545, 145).strokeColor('#e2e8f0').lineWidth(1).stroke();
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
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="appraisal-${packet.id}.pdf"`);
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        // Header
        const { brandColor } = await drawBrandedHeader(doc, orgId, 'PERFORMANCE APPRAISAL', packet.cycle?.title);
        // Employee Summary Box
        doc.rect(50, 160, 495, 80).fill('#f8fafc');
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(8).text('EMPLOYEE DOSSIER', 65, 175);
        doc.fillColor('#1e293b').fontSize(14).text(packet.employee.fullName, 65, 190).font('Helvetica-Bold');
        doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`${packet.employee.jobTitle}  |  ${packet.employee.departmentObj?.name || 'Unassigned'}`, 65, 210);
        // Score Badge
        if (packet.finalScore) {
            doc.rect(430, 175, 100, 50).fill(brandColor);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text(`${packet.finalScore}%`, 430, 185, { width: 100, align: 'center' });
            doc.fontSize(7).text('FINAL RATING', 430, 210, { width: 100, align: 'center' });
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
                doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text('Reviewer Summary:', 65, y);
                doc.fillColor('#475569').font('Helvetica').fontSize(9).text(rev.summary, 65, y + 15, { width: 460, align: 'justify' });
                y += doc.heightOfString(rev.summary, { width: 460 }) + 30;
            }
            // If there are competency scores, parse and list them
            try {
                const parsed = JSON.parse(rev.responses || '{}');
                if (parsed.competencyScores) {
                    doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(8).text('COMPETENCY BREAKDOWN', 65, y);
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
            doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('INSTITUTIONAL VERDICT & CONCLUSION', 50, y);
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
        doc.fontSize(8).fillColor('#64748b').text('Employee Signature', 50, y + 5);
        doc.moveTo(395, y).lineTo(545, y).strokeColor(brandColor).stroke();
        doc.text('Institutional Authority', 395, y + 5);
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
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="target-roadmap-${id}.pdf"`);
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        const { brandColor } = await drawBrandedHeader(doc, orgId, 'STRATEGIC PERFORMANCE ROADMAP', 'Assigned Goals & Success Metrics');
        const employee = targets[0].assignee;
        if (!employee)
            return res.status(404).json({ error: 'Assignee profile not found' });
        doc.fontSize(11).font('Helvetica-Bold').fillColor(brandColor).text('Mission Strategic Roadmap', 50, 160);
        doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('INSTITUTIONAL ALIGNMENT DOSSIER', 50, 175);
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text(employee.fullName, 50, 190);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`${employee.jobTitle}  |  ${employee.departmentObj?.name || 'Unassigned'}`, 50, 210);
        // Summary Table Header
        let tableY = 240;
        doc.rect(50, tableY, 495, 20).fill(brandColor);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('STRATEGIC TARGET / MISSION', 60, tableY + 6);
        doc.text('DUE DATE', 350, tableY + 6);
        doc.text('WEIGHT', 420, tableY + 6);
        doc.text('STATUS', 480, tableY + 6);
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
            doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(7).text('KEY PERFORMANCE INDICATORS', 65, y);
            y += 15;
            for (const m of target.metrics) {
                doc.rect(65, y, 480, 20).fill('#ffffff').stroke('#f1f5f9');
                doc.fillColor('#1e293b').font('Helvetica').fontSize(9).text(m.title, 75, y + 6);
                const targetStr = m.targetValue ? `${m.targetValue} ${m.unit || ''}` : 'Qualitative';
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
