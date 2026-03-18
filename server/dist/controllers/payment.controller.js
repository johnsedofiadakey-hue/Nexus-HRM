"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentStatus = exports.manualBillingOverride = exports.handleWebhook = exports.initializePayment = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = __importDefault(require("../prisma/client"));
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const initializePayment = async (req, res) => {
    try {
        const { plan } = req.body; // 'MONTHLY' or 'ANNUALLY'
        const userReq = req.user;
        // Fetch global master config for Paystack keys
        const masterSettings = await client_1.default.systemSettings.findFirst({
            where: { organizationId: 'default-tenant' }
        });
        const secretKey = masterSettings?.paystackSecretKey || PAYSTACK_SECRET;
        if (!secretKey) {
            return res.status(500).json({ error: 'Paystack is not configured on the platform.' });
        }
        const org = await client_1.default.organization.findUnique({
            where: { id: userReq.organizationId },
            select: { discountPercentage: true, discountFixed: true }
        });
        let amount = plan === 'ANNUALLY'
            ? (masterSettings?.annualPriceGHS || 1000)
            : (masterSettings?.monthlyPriceGHS || 100);
        // Apply potential discounts
        if (org?.discountPercentage) {
            amount = amount * (1 - org.discountPercentage / 100);
        }
        if (org?.discountFixed) {
            amount = Math.max(0, amount - org.discountFixed);
        }
        const response = await axios_1.default.post('https://api.paystack.co/transaction/initialize', {
            email: userReq.email || 'billing@nexus-hrm.com',
            amount: Math.round(Number(amount) * 100), // In pesewas
            callback_url: `${process.env.FRONTEND_URL}/billing/callback`,
            metadata: {
                organizationId: userReq.organizationId,
                plan: plan,
                userId: userReq.id
            }
        }, {
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('[Paystack Init] Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to initialize payment' });
    }
};
exports.initializePayment = initializePayment;
const handleWebhook = async (req, res) => {
    // TODO: Verify Paystack signature (x-paystack-signature)
    const event = req.body;
    if (event.event === 'charge.success') {
        const { metadata, reference } = event.data;
        const { organizationId, plan } = metadata;
        await client_1.default.organization.update({
            where: { id: organizationId },
            data: {
                billingStatus: 'ACTIVE',
                subscriptionPlan: plan === 'ANNUALLY' ? 'ENTERPRISE' : 'PRO',
                nextBillingDate: new Date(Date.now() + (plan === 'ANNUALLY' ? 365 : 30) * 24 * 60 * 60 * 1000)
            }
        });
        // Create a subscription record for history
        await client_1.default.subscription.create({
            data: {
                organizationId,
                clientId: metadata.userId,
                plan: plan,
                priceGHS: event.data.amount / 100,
                status: 'ACTIVE',
                paystackRef: reference,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + (plan === 'ANNUALLY' ? 365 : 30) * 24 * 60 * 60 * 1000)
            }
        });
    }
    res.sendStatus(200);
};
exports.handleWebhook = handleWebhook;
const manualBillingOverride = async (req, res) => {
    try {
        const { organizationId, plan, type } = req.body;
        await client_1.default.organization.update({
            where: { id: organizationId },
            data: {
                billingStatus: 'ACTIVE',
                subscriptionPlan: plan || 'PRO',
                nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default to 1 year for manual
            }
        });
        res.json({ message: 'Billing overridden successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.manualBillingOverride = manualBillingOverride;
const getPaymentStatus = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'default-tenant';
        const [org, settings, masterSettings] = await Promise.all([
            client_1.default.organization.findUnique({
                where: { id: organizationId },
                select: {
                    subscriptionPlan: true,
                    billingStatus: true,
                    trialEndsAt: true,
                    nextBillingDate: true,
                    isSuspended: true,
                    discountPercentage: true,
                    discountFixed: true
                }
            }),
            client_1.default.systemSettings.findFirst({
                where: { organizationId },
                select: {
                    monthlyPriceGHS: true,
                    annualPriceGHS: true,
                    paystackPublicKey: true
                }
            }),
            client_1.default.systemSettings.findFirst({
                where: { organizationId: 'default-tenant' }
            })
        ]);
        if (!org)
            return res.status(404).json({ error: 'Organization not found' });
        // Fetch latest subscription record for history
        const history = await client_1.default.subscription.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        res.json({
            plan: org.subscriptionPlan,
            status: org.billingStatus,
            isSuspended: org.isSuspended,
            trialEndsAt: org.trialEndsAt,
            nextBillingDate: org.nextBillingDate,
            monthlyPrice: settings?.monthlyPriceGHS || masterSettings?.monthlyPriceGHS || 100,
            annualPrice: settings?.annualPriceGHS || masterSettings?.annualPriceGHS || 1000,
            discountPercentage: org.discountPercentage || 0,
            discountFixed: org.discountFixed || 0,
            paystackConfigured: !!(settings?.paystackPublicKey || masterSettings?.paystackPublicKey),
            paystackPayLink: masterSettings?.paystackPayLink,
            trialDays: masterSettings?.trialDays || 14,
            history
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getPaymentStatus = getPaymentStatus;
