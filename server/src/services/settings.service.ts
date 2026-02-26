import { SystemSettings } from '@prisma/client';
import prisma from '../prisma/client';

// Fields safe to expose publicly (for login page branding)
const PUBLIC_FIELDS = {
  companyName: true,
  companyLogoUrl: true,
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
  themePreset: true,
  lightMode: true,
  isMaintenanceMode: true,
  loginNotice: true,
  loginSubtitle: true,
  loginBullets: true,
  // Explicitly excluded: smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
  // accountCreatedBy, securityLockdown, plan, paymentLink, subscriptionStatus
} as const;

// Fields safe for authenticated admin users
const ADMIN_FIELDS = {
  ...PUBLIC_FIELDS,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  // smtpPass is NEVER returned — write-only
  smtpFrom: true,
  accountCreatedBy: true,
  securityLockdown: true,
  plan: true,
  loginNotice: true,
  loginSubtitle: true,
  loginBullets: true,
  subscriptionStatus: true,
  id: true,
  updatedAt: true,
} as const;

export const getSettings = async (isAdmin = false) => {
  let settings = await prisma.systemSettings.findFirst({
    select: isAdmin ? ADMIN_FIELDS : PUBLIC_FIELDS
  });

  if (!settings) {
    // Create defaults
    await prisma.systemSettings.create({
      data: {
        companyName: 'Nexus HRM',
        companyLogoUrl: '',
        primaryColor: '#4F46E5',
        secondaryColor: '#1E293B',
        accentColor: '#F59E0B',
      }
    });
    settings = await prisma.systemSettings.findFirst({
      select: isAdmin ? ADMIN_FIELDS : PUBLIC_FIELDS
    });
  }

  return settings;
};

export const updateSettings = async (data: Partial<SystemSettings>) => {
  const current = await prisma.systemSettings.findFirst();
  if (!current) throw new Error('Settings not initialized');

  // Strip any attempt to null out smtpPass if not explicitly provided
  // (blank string = clear it; undefined = keep existing)
  const safeData = { ...data };
  if (safeData.smtpPass === undefined) delete safeData.smtpPass;

  return prisma.systemSettings.update({
    where: { id: current.id },
    data: safeData,
    select: ADMIN_FIELDS // Never return smtpPass even on update response
  });
};
