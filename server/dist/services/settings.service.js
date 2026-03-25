"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const client_1 = __importDefault(require("../prisma/client"));
/**
 * Returns branding + config data for the client.
 * Branding lives on Organization; security/email/payment config on SystemSettings.
 */
const getSettings = async (organizationId = 'default-tenant', isAdmin = false) => {
    const org = await client_1.default.organization.findUnique({
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
            language: true,
            bgMain: true,
            bgCard: true,
            textPrimary: true,
            textSecondary: true,
            textMuted: true,
            sidebarBg: true,
            sidebarActive: true,
            sidebarText: true,
            subscriptionPlan: true,
            discountPercentage: true,
            discountFixed: true,
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
    if (!org)
        return null;
    // Fallback to Global (Master) prices if not set on this tenant
    let pricing = {
        monthlyPriceGHS: org.settings?.monthlyPriceGHS,
        annualPriceGHS: org.settings?.annualPriceGHS,
        trialDays: org.settings?.trialDays,
        paystackPublicKey: org.settings?.paystackPublicKey,
        paystackPayLink: org.settings?.paystackPayLink,
    };
    if (organizationId !== 'default-tenant' && (!pricing.monthlyPriceGHS || !pricing.paystackPublicKey)) {
        const master = await client_1.default.systemSettings.findUnique({
            where: { organizationId: 'default-tenant' },
            select: {
                monthlyPriceGHS: true,
                annualPriceGHS: true,
                trialDays: true,
                paystackPublicKey: true,
                paystackPayLink: true
            }
        });
        if (master) {
            pricing.monthlyPriceGHS = pricing.monthlyPriceGHS ?? master.monthlyPriceGHS;
            pricing.annualPriceGHS = pricing.annualPriceGHS ?? master.annualPriceGHS;
            pricing.trialDays = pricing.trialDays ?? master.trialDays;
            pricing.paystackPublicKey = pricing.paystackPublicKey ?? master.paystackPublicKey;
            pricing.paystackPayLink = pricing.paystackPayLink ?? master.paystackPayLink;
        }
    }
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
        bgMain: org.bgMain,
        bgCard: org.bgCard,
        textPrimary: org.textPrimary,
        textSecondary: org.textSecondary,
        textMuted: org.textMuted,
        sidebarBg: org.sidebarBg,
        sidebarActive: org.sidebarActive,
        sidebarText: org.sidebarText,
        language: org.language || 'en',
        plan: org.subscriptionPlan,
        discountPercentage: org.discountPercentage,
        discountFixed: org.discountFixed,
        ...(org.settings || {}),
        ...pricing
    };
};
exports.getSettings = getSettings;
const updateSettings = async (organizationId = 'default-tenant', data) => {
    // Split: branding → Organization, config → SystemSettings
    const { companyName, name, subtitle, companyLogoUrl, logoUrl, lightMode, primaryColor, secondaryColor, accentColor, textColor, sidebarColor, themePreset, language, bgMain, bgCard, textPrimary, textSecondary, textMuted, sidebarBg, sidebarActive, sidebarText, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, paystackPublicKey, paystackSecretKey, paystackPayLink, monthlyPriceGHS, annualPriceGHS, trialDays, isMaintenanceMode, maintenanceNotice, securityLockdown, securityLockdownMessage, backupFrequencyDays, loginNotice, loginSubtitle, loginBullets, discountPercentage, discountFixed, ...rest } = data;
    const orgUpdate = {};
    if (companyName !== undefined)
        orgUpdate.name = companyName;
    if (name !== undefined)
        orgUpdate.name = name;
    if (companyLogoUrl !== undefined)
        orgUpdate.logoUrl = companyLogoUrl;
    if (logoUrl !== undefined)
        orgUpdate.logoUrl = logoUrl;
    if (primaryColor !== undefined)
        orgUpdate.primaryColor = primaryColor;
    if (secondaryColor !== undefined)
        orgUpdate.secondaryColor = secondaryColor;
    if (accentColor !== undefined)
        orgUpdate.accentColor = accentColor;
    if (textColor !== undefined)
        orgUpdate.textColor = textColor;
    if (sidebarColor !== undefined)
        orgUpdate.sidebarColor = sidebarColor;
    if (subtitle !== undefined)
        orgUpdate.subtitle = subtitle;
    if (themePreset !== undefined)
        orgUpdate.themePreset = themePreset;
    if (lightMode !== undefined)
        orgUpdate.lightMode = lightMode;
    if (language !== undefined)
        orgUpdate.language = language;
    if (bgMain !== undefined)
        orgUpdate.bgMain = bgMain;
    if (bgCard !== undefined)
        orgUpdate.bgCard = bgCard;
    if (textPrimary !== undefined)
        orgUpdate.textPrimary = textPrimary;
    if (textSecondary !== undefined)
        orgUpdate.textSecondary = textSecondary;
    if (textMuted !== undefined)
        orgUpdate.textMuted = textMuted;
    if (sidebarBg !== undefined)
        orgUpdate.sidebarBg = sidebarBg;
    if (sidebarActive !== undefined)
        orgUpdate.sidebarActive = sidebarActive;
    if (sidebarText !== undefined)
        orgUpdate.sidebarText = sidebarText;
    if (data.discountPercentage !== undefined)
        orgUpdate.discountPercentage = parseFloat(data.discountPercentage);
    if (data.discountFixed !== undefined)
        orgUpdate.discountFixed = parseFloat(data.discountFixed);
    const settingsUpdate = {};
    if (smtpHost !== undefined)
        settingsUpdate.smtpHost = smtpHost;
    if (smtpPort !== undefined)
        settingsUpdate.smtpPort = smtpPort;
    if (smtpUser !== undefined)
        settingsUpdate.smtpUser = smtpUser;
    if (smtpPass !== undefined && smtpPass !== '')
        settingsUpdate.smtpPass = smtpPass; // Never clear with blank
    if (smtpFrom !== undefined)
        settingsUpdate.smtpFrom = smtpFrom;
    if (paystackPublicKey !== undefined)
        settingsUpdate.paystackPublicKey = paystackPublicKey;
    if (paystackSecretKey !== undefined)
        settingsUpdate.paystackSecretKey = paystackSecretKey;
    if (paystackPayLink !== undefined)
        settingsUpdate.paystackPayLink = paystackPayLink;
    if (monthlyPriceGHS !== undefined)
        settingsUpdate.monthlyPriceGHS = monthlyPriceGHS;
    if (annualPriceGHS !== undefined)
        settingsUpdate.annualPriceGHS = annualPriceGHS;
    if (trialDays !== undefined)
        settingsUpdate.trialDays = trialDays;
    if (isMaintenanceMode !== undefined)
        settingsUpdate.isMaintenanceMode = isMaintenanceMode;
    if (maintenanceNotice !== undefined)
        settingsUpdate.maintenanceNotice = maintenanceNotice;
    if (securityLockdown !== undefined)
        settingsUpdate.securityLockdown = securityLockdown;
    if (securityLockdownMessage !== undefined)
        settingsUpdate.securityLockdownMessage = securityLockdownMessage;
    if (backupFrequencyDays !== undefined)
        settingsUpdate.backupFrequencyDays = backupFrequencyDays;
    if (data.loginNotice !== undefined)
        settingsUpdate.loginNotice = loginNotice;
    if (data.loginSubtitle !== undefined)
        settingsUpdate.loginSubtitle = loginSubtitle;
    if (data.loginBullets !== undefined)
        settingsUpdate.loginBullets = loginBullets;
    await Promise.all([
        Object.keys(orgUpdate).length > 0
            ? client_1.default.organization.update({ where: { id: organizationId }, data: orgUpdate })
            : Promise.resolve(),
        Object.keys(settingsUpdate).length > 0
            ? client_1.default.systemSettings.upsert({
                where: { organizationId },
                create: { organizationId, ...settingsUpdate },
                update: settingsUpdate,
            })
            : Promise.resolve(),
    ]);
    return (0, exports.getSettings)(organizationId, true);
};
exports.updateSettings = updateSettings;
