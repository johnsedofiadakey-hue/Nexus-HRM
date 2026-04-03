"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const client_1 = __importDefault(require("../prisma/client"));
const date_fns_1 = require("date-fns");
class ReceiptService {
    static async generateSubscriptionReceipt(subscriptionId, res) {
        const sub = await client_1.default.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                client: {
                    select: {
                        fullName: true,
                        email: true,
                        organization: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });
        if (!sub) {
            throw new Error('Subscription records not found for receipt generation.');
        }
        const doc = new pdfkit_1.default({ margin: 50 });
        // Stream the PDF to the response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${sub.id.split('-')[0]}.pdf`);
        doc.pipe(res);
        // Header / Branding
        doc.fillColor('#444444').fontSize(20).text('OFFICIAL RECEIPT', 50, 50, { align: 'left' });
        doc.fontSize(10).text('Enterprise Human Resource Management', 50, 75);
        doc.text('Conakry, Republic of Guinea', 50, 90);
        doc.text('billing@hrm-enterprise.cloud', 50, 105);
        doc.fontSize(25).fillColor('#222222').text('OFFICIAL RECEIPT', 50, 160, { align: 'center' });
        doc.moveDown();
        // Horizontal Line
        doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 200).lineTo(550, 200).stroke();
        // Bill To
        doc.fontSize(10).fillColor('#888888').text('BILL TO:', 50, 220);
        doc.fontSize(12).fillColor('#222222').text(sub.client.organization?.name || 'Valued Client', 50, 235);
        doc.fontSize(10).text(sub.client.fullName || '', 50, 250);
        doc.text(sub.client.email || '', 50, 265);
        // Receipt details
        doc.fontSize(10).fillColor('#888888').text('RECEIPT NO:', 350, 220);
        doc.fontSize(10).fillColor('#222222').text(sub.id.toUpperCase(), 350, 235);
        doc.fontSize(10).fillColor('#888888').text('DATE:', 350, 255);
        doc.fontSize(10).fillColor('#222222').text((0, date_fns_1.format)(new Date(sub.createdAt), 'MMMM dd, yyyy'), 350, 270);
        // Table Header
        const tableTop = 320;
        doc.fillColor('#F9FAFB').rect(50, tableTop, 500, 30).fill();
        doc.fillColor('#4B5563').fontSize(10).font('Helvetica-Bold');
        doc.text('DESCRIPTION', 60, tableTop + 10);
        doc.text('PERIOD', 250, tableTop + 10);
        doc.text('AMOUNT', 480, tableTop + 10, { align: 'right' });
        // Table Content
        const rowTop = tableTop + 40;
        doc.font('Helvetica').fillColor('#222222');
        doc.text(`Enterprise HRM - ${sub.plan} Subscription`, 60, rowTop);
        doc.text(`${(0, date_fns_1.format)(sub.currentPeriodStart || new Date(), 'MMM yy')} - ${(0, date_fns_1.format)(sub.currentPeriodEnd || new Date(), 'MMM yy')}`, 250, rowTop);
        const displayCurrency = sub.currency || 'GNF';
        const displayPrice = sub.price ? Number(sub.price) : (sub.priceGHS || 0);
        doc.font('Helvetica-Bold').text(`${displayCurrency} ${displayPrice.toLocaleString()}`, 480, rowTop, { align: 'right' });
        // Footer
        const footerTop = 500;
        doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, footerTop).lineTo(550, footerTop).stroke();
        doc.fontSize(10).fillColor('#888888').text('Payment Method', 50, footerTop + 20);
        doc.fillColor('#222222').text(sub.paystackRef ? 'Credit/Debit Card (Online)' : 'Bank Transfer / SWIFT', 50, footerTop + 35);
        doc.fillColor('#10B981').fontSize(12).text('PAID', 480, footerTop + 30, { align: 'right' });
        doc.fontSize(8).fillColor('#999999').text('This is a computer-generated document. No signature is required.', 50, 700, { align: 'center' });
        doc.end();
    }
}
exports.ReceiptService = ReceiptService;
