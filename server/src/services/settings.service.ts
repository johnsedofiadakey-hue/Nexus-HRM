import prisma from '../prisma/client';
import { maybeEncrypt } from '../utils/encryption';

/**
 * Returns branding + config data for the client.
 * Branding lives on Organization; security/email/payment config on SystemSettings.
 */
export const getSettings = async (organizationId = 'default-tenant', isAdmin = false) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      textColor: true,
      sidebarColor: true,
      subtitle: true,
      themePreset: true,
      lightMode: true,
      subscriptionPlan: true,
      settings: {
        select: {
          isMaintenanceMode: true,
          loginNotice: true,
          loginSubtitle: true,
          loginBullets: true,
          ...(isAdmin ? {
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpFrom: true,
            securityLockdown: true,
            securityLockdownMessage: true,
            isMaintenanceMode: true,
            maintenanceNotice: true,
            paystackPublicKey: true,
            paystackSecretKey: true,
            paystackPayLink: true,
            monthlyPriceGHS: true,
            annualPriceGHS: true,
            trialDays: true,
            backupFrequencyDays: true,
            id: true,
            updatedAt: true,
          } : {})
        }
      }
    }
  });

  if (!org) return null;

  return {
    companyName: org.name,
    name: org.name,
    subtitle: org.subtitle,
    companyLogoUrl: org.logoUrl || '',
    logoUrl: org.logoUrl || '',
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    accentColor: org.accentColor,
    textColor: org.textColor,
    sidebarColor: org.sidebarColor,
    themePreset: org.themePreset,
    plan: org.subscriptionPlan,
    ...(org.settings || {}),
  };
};

export const updateSettings = async (
  organizationId = 'default-tenant',
  data: Record<string, any>
) => {
  // Split: branding → Organization, config → SystemSettings
  const { companyName, name, subtitle, companyLogoUrl, logoUrl, lightMode, primaryColor, secondaryColor, accentColor, textColor, sidebarColor, themePreset,
          smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
          paystackPublicKey, paystackSecretKey, paystackPayLink, monthlyPriceGHS, annualPriceGHS, trialDays,
          isMaintenanceMode, maintenanceNotice, securityLockdown, securityLockdownMessage, backupFrequencyDays,
          loginNotice, loginSubtitle, loginBullets,
          ...rest } = data;

  const orgUpdate: any = {};
  if (companyName !== undefined) orgUpdate.name = companyName;
  if (name !== undefined) orgUpdate.name = name;
  if (companyLogoUrl !== undefined) orgUpdate.logoUrl = companyLogoUrl;
  if (logoUrl !== undefined) orgUpdate.logoUrl = logoUrl;
  if (primaryColor !== undefined) orgUpdate.primaryColor = primaryColor;
  if (secondaryColor !== undefined) orgUpdate.secondaryColor = secondaryColor;
  if (accentColor !== undefined) orgUpdate.accentColor = accentColor;
  if (textColor !== undefined) orgUpdate.textColor = textColor;
  if (sidebarColor !== undefined) orgUpdate.sidebarColor = sidebarColor;
  if (subtitle !== undefined) orgUpdate.subtitle = subtitle;
  if (themePreset !== undefined) orgUpdate.themePreset = themePreset;
  if (lightMode !== undefined) orgUpdate.lightMode = lightMode;

  const settingsUpdate: any = {};
  if (smtpHost !== undefined) settingsUpdate.smtpHost = smtpHost;
  if (smtpPort !== undefined) settingsUpdate.smtpPort = smtpPort;
  if (smtpUser !== undefined) settingsUpdate.smtpUser = smtpUser;
  if (smtpPass !== undefined && smtpPass !== '') settingsUpdate.smtpPass = smtpPass; // Never clear with blank
  if (smtpFrom !== undefined) settingsUpdate.smtpFrom = smtpFrom;
  if (paystackPublicKey !== undefined) settingsUpdate.paystackPublicKey = paystackPublicKey;
  if (paystackSecretKey !== undefined) settingsUpdate.paystackSecretKey = paystackSecretKey;
  if (paystackPayLink !== undefined) settingsUpdate.paystackPayLink = paystackPayLink;
  if (monthlyPriceGHS !== undefined) settingsUpdate.monthlyPriceGHS = monthlyPriceGHS;
  if (annualPriceGHS !== undefined) settingsUpdate.annualPriceGHS = annualPriceGHS;
  if (trialDays !== undefined) settingsUpdate.trialDays = trialDays;
  if (isMaintenanceMode !== undefined) settingsUpdate.isMaintenanceMode = isMaintenanceMode;
  if (maintenanceNotice !== undefined) settingsUpdate.maintenanceNotice = maintenanceNotice;
  if (securityLockdown !== undefined) settingsUpdate.securityLockdown = securityLockdown;
  if (securityLockdownMessage !== undefined) settingsUpdate.securityLockdownMessage = securityLockdownMessage;
  if (backupFrequencyDays !== undefined) settingsUpdate.backupFrequencyDays = backupFrequencyDays;
  if (loginNotice !== undefined) settingsUpdate.loginNotice = loginNotice;
  if (loginSubtitle !== undefined) settingsUpdate.loginSubtitle = loginSubtitle;
  if (loginBullets !== undefined) settingsUpdate.loginBullets = loginBullets;

  await Promise.all([
    Object.keys(orgUpdate).length > 0
      ? prisma.organization.update({ where: { id: organizationId }, data: orgUpdate })
      : Promise.resolve(),
    Object.keys(settingsUpdate).length > 0
      ? prisma.systemSettings.upsert({
          where: { organizationId },
          create: { organizationId, ...settingsUpdate },
          update: settingsUpdate,
        })
      : Promise.resolve(),
  ]);

  return getSettings(organizationId, true);
};
