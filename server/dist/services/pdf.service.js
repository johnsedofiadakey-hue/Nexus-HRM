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
        return new Promise(async (resolve, reject) => {
            const doc = new pdfkit_1.default({
                margin: 50,
                size: 'A4',
                bufferPages: true
            });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            const primaryColor = org?.primaryColor || '#4F46E5';
            // --- Rendering Logic ---
            this.renderHeader(doc, org, primaryColor);
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
            // 3. Document Content (Based on type)
            if (type === 'TARGET') {
                this.renderTargetContent(doc, content, primaryColor);
            }
            else if (type === 'APPRAISAL') {
                this.renderAppraisalContent(doc, content, primaryColor);
            }
            else if (type === 'LEAVE') {
                this.renderLeaveContent(doc, content, primaryColor);
            }
            // 4. Add Watermark and Footers across all pages
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                this.renderWatermark(doc);
                this.renderFooter(doc, org, i + 1, range.count, primaryColor);
            }
            doc.end();
        });
    }
    static async renderHeader(doc, org, primaryColor) {
        try {
            if (org?.logoUrl) {
                const response = await axios_1.default.get(org.logoUrl, { responseType: 'arraybuffer' });
                doc.image(response.data, 50, 40, { width: 70 });
            }
        }
        catch (err) {
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
        doc.opacity(0.05);
        doc.fontSize(60).fillColor('#000').font('Helvetica-Bold');
        doc.rotate(-45, { origin: [300, 400] });
        doc.text('OFFICIAL RECORD', 100, 400);
        doc.restore();
    }
    static renderFooter(doc, org, page, total, primaryColor) {
        doc
            .strokeColor('#f1f5f9')
            .lineWidth(0.5)
            .moveTo(50, 780)
            .lineTo(550, 780)
            .stroke();
        doc
            .fontSize(7)
            .fillColor('#94a3b8')
            .text(`Nexus HRM Institutional Record | ${org?.name || 'Nexus HRM'} | Verified Document Hash: ${Math.random().toString(36).substring(7).toUpperCase()}`, 50, 790, { continued: true })
            .text(` | Page ${page} of ${total}`, { align: 'right' });
    }
    static renderTargetContent(doc, target, brandColor) {
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
            target.metrics.forEach((m, i) => {
                const rowHeight = 35;
                if (i % 2 === 1)
                    doc.rect(50, currentY, 500, rowHeight).fill('#f1f5f9');
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
            target.updates.slice(0, 5).forEach((u) => {
                doc.fontSize(9).fillColor('#64748b').text(`${new Date(u.createdAt).toLocaleDateString()}: `, { continued: true });
                doc.fillColor('#1e293b').text(u.comment || 'Metric synchronization performed.');
                doc.moveDown(0.5);
            });
        }
    }
    static renderAppraisalContent(doc, packet, brandColor) {
        // Identity Section
        doc.fillColor('#f8fafc').rect(50, doc.y, 500, 60).fill();
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text('EMPLOYEE NAME:', 65, doc.y - 45, { continued: true }).font('Helvetica').text(` ${packet.employee?.fullName}`);
        doc.font('Helvetica-Bold').text('APPRAISAL CYCLE:', 65, doc.y + 5, { continued: true }).font('Helvetica').text(` ${packet.cycle?.title || 'Annual Review'}`);
        doc.font('Helvetica-Bold').text('FINAL RATING:', 350, doc.y - 34, { align: 'right' }).font('Helvetica').text(` ${packet.finalScore || 'PENDING VALIDATION'} / 100`, { align: 'right' });
        doc.moveDown(4);
        if (packet.reviews && packet.reviews.length > 0) {
            packet.reviews.forEach((review) => {
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
    static renderLeaveContent(doc, leave, brandColor) {
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
    static keyValGrid(doc, x, y, label, value) {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(value || 'N/A', x, y + 12);
    }
    static recordMetadata(doc, label, value) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${label.toUpperCase()}: `, { continued: true }).font('Helvetica').fillColor('#1e293b').text(value);
        doc.moveDown(0.2);
    }
}
exports.PdfExportService = PdfExportService;
