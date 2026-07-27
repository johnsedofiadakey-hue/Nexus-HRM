import nodemailer from 'nodemailer';
import prisma from '../prisma/client';

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  private static async resolveBranding(organizationId?: string) {
    let orgName = 'Nexus HRM';
    let primaryColor = '#4f46e5';
    let logoUrl: string | null = null;
    try {
      if (organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, logoUrl: true, primaryColor: true },
        });
        if (org?.name) orgName = org.name;
        if (org?.primaryColor) primaryColor = org.primaryColor;
        if (org?.logoUrl) logoUrl = org.logoUrl;
      }
    } catch (err) {
      console.warn('[EmailService] Org branding lookup failed, using defaults:', (err as any).message);
    }
    return { orgName, primaryColor, logoUrl };
  }

  /**
   * Renders the shared branded email shell — real org name/logo/color, French chrome.
   * Used by every transactional email (notifications, password reset, email
   * confirmation, welcome, payslip) so branding/language never drifts between them.
   */
  private static async renderBrandedEmail(
    organizationId: string | undefined,
    title: string,
    message: string,
    buttonText: string,
    buttonUrl: string
  ): Promise<{ html: string; orgName: string }> {
    const { orgName, primaryColor, logoUrl } = await this.resolveBranding(organizationId);

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 48px; max-width: 160px; margin-bottom: 12px;" />`
      : '';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background-color: ${primaryColor}; padding: 40px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #0f172a; }
        .message { font-size: 16px; color: #475569; margin-bottom: 32px; }
        .button-container { text-align: center; margin-top: 32px; }
        .button { background-color: ${primaryColor}; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; transition: transform 0.2s ease; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          <h1>${orgName}</h1>
        </div>
        <div class="content">
          <div class="greeting">${title}</div>
          <div class="message">${message}</div>
          <div class="button-container">
            <a href="${buttonUrl}" class="button">${buttonText}</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${orgName}. Tous droits réservés.</p>
          <p>Ceci est une notification automatique de l'espace de travail. Merci de ne pas répondre directement à cet e-mail.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return { html, orgName };
  }

  /**
   * Send a branded notification email
   */
  static async sendNotification(to: string, title: string, message: string, link?: string, organizationId?: string) {
    const dashboardUrl = process.env.FRONTEND_URL || 'https://hrm.enterprise.cloud';
    const actionUrl = link ? (link.startsWith('http') ? link : `${dashboardUrl}${link}`) : dashboardUrl;

    const { html } = await this.renderBrandedEmail(organizationId, title, message, 'Voir dans le tableau de bord', actionUrl);

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"HRM Platform" <notifications@enterprise.cloud>',
        to,
        subject: `[Notification] ${title}`,
        html,
      });
      console.log(`[EmailService] Notification sent: ${info.messageId} to ${to}`);
      return info;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      // We don't throw here to prevent blocking the main app if SMTP fails
      return null;
    }
  }

  static async sendEmail(params: { to: string; subject: string; html: string }) {
    try {
      return await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"HRM Platform" <notifications@enterprise.cloud>',
        ...params
      });
    } catch (error) {
      console.error('[EmailService] sendEmail error:', error);
      return null;
    }
  }

  /**
   * Send a branded, French transactional email (password reset, email
   * confirmation, welcome, payslip, etc.) — same shell/branding as sendNotification.
   */
  static async sendBrandedEmail(
    to: string,
    subject: string,
    organizationId: string | undefined,
    title: string,
    message: string,
    buttonText: string,
    buttonUrl: string
  ) {
    const { html } = await this.renderBrandedEmail(organizationId, title, message, buttonText, buttonUrl);
    return this.sendEmail({ to, subject, html });
  }

  static async sendWelcomeEmail(to: string, name: string, pass: string, organizationId?: string) {
    const dashboardUrl = process.env.FRONTEND_URL || 'https://hrm.enterprise.cloud';
    const message = `Bonjour ${name}, votre compte est prêt. Votre mot de passe temporaire est : <strong>${pass}</strong>. Nous vous recommandons de le changer dès votre première connexion.`;
    return this.sendBrandedEmail(to, 'Bienvenue', organizationId, 'Bienvenue !', message, 'Se connecter', dashboardUrl);
  }

  static async sendPayslipEmail(to: string, name: string, period: string, amount: string, currency: string, organizationId?: string) {
    const dashboardUrl = process.env.FRONTEND_URL || 'https://hrm.enterprise.cloud';
    const message = `Bonjour ${name}, votre bulletin de paie pour ${period} est maintenant disponible. Salaire net : ${currency} ${amount}.`;
    return this.sendBrandedEmail(to, `Bulletin de paie disponible — ${period}`, organizationId, 'Votre Bulletin de Paie est Prêt', message, 'Voir mon bulletin', `${dashboardUrl}/payroll`);
  }
}

export const sendNotification = EmailService.sendNotification.bind(EmailService);
export const sendEmail = EmailService.sendEmail.bind(EmailService);
export const sendBrandedEmail = EmailService.sendBrandedEmail.bind(EmailService);
export const sendWelcomeEmail = EmailService.sendWelcomeEmail.bind(EmailService);
export const sendPayslipEmail = EmailService.sendPayslipEmail.bind(EmailService);
