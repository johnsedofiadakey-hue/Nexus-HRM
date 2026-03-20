"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportEmployeesPDF = exports.exportPerformanceReportCSV = exports.exportLeaveReportCSV = exports.exportEmployeesCSV = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const exportEmployeesCSV = async (req, res) => {
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
};
exports.exportEmployeesCSV = exportEmployeesCSV;
const exportLeaveReportCSV = async (req, res) => {
    const { year } = req.query;
    const leaves = await client_1.default.leaveRequest.findMany({
        where: year ? { startDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${parseInt(year) + 1}-01-01`) } } : {},
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
};
exports.exportLeaveReportCSV = exportLeaveReportCSV;
const exportPerformanceReportCSV = async (req, res) => {
    /* TODO: V3 - Update to use AppraisalPacket and AppraisalReview
    const appraisals = await prisma.appraisal.findMany({
      where: { status: 'COMPLETED' },
      ...
    });
    */
    res.status(501).json({ message: 'Performance report export is being updated for V3. Please use the Appraisal module directly.' });
};
exports.exportPerformanceReportCSV = exportPerformanceReportCSV;
const exportEmployeesPDF = async (req, res) => {
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
};
exports.exportEmployeesPDF = exportEmployeesPDF;
