import nodemailer from 'nodemailer';
import prisma from '../prisma/client';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = async () => {
  if (transporter) return transporter;
  // Try DB settings first, then fall back to env vars
  const settings = await prisma.systemSettings.findFirst();
  const host = settings?.smtpHost || process.env.SMTP_HOST;
  const port = settings?.smtpPort || parseInt(process.env.SMTP_PORT || '587');
  const user = settings?.smtpUser || process.env.SMTP_USER;
  const pass = settings?.smtpPass || process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured — emails will be logged only');
    return null;
  }

  transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  return transporter;
};

export const invalidateEmailCache = () => { transporter = null; };

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

const brandedTemplate = (content: string, companyName = 'Nexus HRM') => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(99,102,241,0.2)">
    <div style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:32px 40px">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${companyName}</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">Human Resource Management</p>
    </div>
    <div style="padding:32px 40px;color:#cbd5e1;font-size:15px;line-height:1.6">
      ${content}
    </div>
    <div style="padding:20px 40px;border-top:1px solid rgba(99,102,241,0.15);color:#64748b;font-size:12px;text-align:center">
      This is an automated message from ${companyName} HRM. Please do not reply directly.
    </div>
  </div>
</body>
</html>`;

export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    const t = await getTransporter();
    const settings = await prisma.systemSettings.findFirst();
    const fromEmail = settings?.smtpFrom || process.env.SMTP_FROM || 'noreply@nexushrm.com';
    const companyName = settings?.companyName || 'Nexus HRM';

    if (!t) {
      // Log to console in dev mode
      console.log(`\n📧 [EMAIL SIMULATED]\nTo: ${payload.to}\nSubject: ${payload.subject}\n`);
      return true;
    }

    await t.sendMail({
      from: `"${companyName}" <${fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      html: brandedTemplate(payload.html, companyName)
    });
    return true;
  } catch (err) {
    console.error('[Email] Send failed:', err);
    return false;
  }
};

// ─── Templated emails ─────────────────────────────────────────────────────

export const sendWelcomeEmail = async (to: string, name: string, tempPassword: string, companyName: string) =>
  sendEmail({
    to, subject: `Welcome to ${companyName} — Your Account is Ready`,
    html: `<h2 style="color:#f1f5f9;margin:0 0 16px">Welcome aboard, ${name}! 🎉</h2>
    <p>Your ${companyName} HRM account has been created. Here are your login credentials:</p>
    <div style="background:#0f172a;border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px"><strong style="color:#818cf8">Email:</strong> <span style="color:#e2e8f0">${to}</span></p>
      <p style="margin:0"><strong style="color:#818cf8">Temp Password:</strong> <span style="color:#e2e8f0;font-family:monospace">${tempPassword}</span></p>
    </div>
    <p style="color:#f59e0b;font-size:13px">⚠️ Please change your password immediately after your first login for security.</p>`
  });

export const sendLeaveApprovalEmail = async (to: string, name: string, status: string, startDate: string, endDate: string) =>
  sendEmail({
    to, subject: `Leave Request ${status === 'APPROVED' ? 'Approved ✅' : 'Rejected ❌'}`,
    html: `<h2 style="color:#f1f5f9;margin:0 0 16px">Leave Request Update</h2>
    <p>Hi ${name}, your leave request has been <strong style="color:${status === 'APPROVED' ? '#10b981' : '#f43f5e'}">${status.toLowerCase()}</strong>.</p>
    <div style="background:#0f172a;border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px"><strong style="color:#818cf8">Period:</strong> <span style="color:#e2e8f0">${startDate} → ${endDate}</span></p>
      <p style="margin:0"><strong style="color:#818cf8">Status:</strong> <span style="color:${status === 'APPROVED' ? '#10b981' : '#f43f5e'}">${status}</span></p>
    </div>`
  });

export const sendLeaveRequestedEmail = async (to: string, managerName: string, employeeName: string, days: number) =>
  sendEmail({
    to, subject: `Action Required: Leave Request from ${employeeName}`,
    html: `<h2 style="color:#f1f5f9;margin:0 0 16px">Leave Approval Needed</h2>
    <p>Hi ${managerName}, <strong>${employeeName}</strong> has submitted a leave request for <strong>${days} working day(s)</strong> that requires your approval.</p>
    <p>Please log into the HRM system to review and approve or reject this request.</p>`
  });

export const sendAppraisalDueEmail = async (to: string, name: string, cycleName: string) =>
  sendEmail({
    to, subject: `Action Required: Complete Your ${cycleName} Appraisal`,
    html: `<h2 style="color:#f1f5f9;margin:0 0 16px">Appraisal Pending</h2>
    <p>Hi ${name}, your self-evaluation for the <strong style="color:#818cf8">${cycleName}</strong> cycle is still pending.</p>
    <p>Please log in and complete your appraisal to keep the review process on track.</p>`
  });

export const sendPayslipEmail = async (to: string, name: string, period: string, netPay: string, currency: string) =>
  sendEmail({
    to, subject: `Your Payslip for ${period} is Ready`,
    html: `<h2 style="color:#f1f5f9;margin:0 0 16px">Payslip Available</h2>
    <p>Hi ${name}, your payslip for <strong style="color:#818cf8">${period}</strong> has been processed.</p>
    <div style="background:#0f172a;border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:20px;margin:20px 0;text-align:center">
      <p style="color:#94a3b8;margin:0 0 4px;font-size:13px">Net Pay</p>
      <p style="color:#10b981;font-size:32px;font-weight:700;margin:0">${currency} ${netPay}</p>
    </div>
    <p>Log into your HRM portal to view the full breakdown and download your payslip PDF.</p>`
  });
