import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../prisma/client';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export const initializePayment = async (req: Request, res: Response) => {
  try {
    const { plan } = req.body; // 'MONTHLY' or 'ANNUALLY'
     const userReq = (req as any).user;
    
    // Fetch global master config for Paystack keys
    const masterSettings = await prisma.systemSettings.findFirst({
      where: { organizationId: 'default-tenant' }
    });

    const secretKey = masterSettings?.paystackSecretKey || PAYSTACK_SECRET;

    if (!secretKey) {
      return res.status(500).json({ error: 'Paystack is not configured on the platform.' });
    }

    const amount = plan === 'ANNUALLY' 
      ? (masterSettings?.annualPriceGHS || 1000) 
      : (masterSettings?.monthlyPriceGHS || 100);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: userReq.email || 'billing@nexus-hrm.com',
        amount: Math.round(Number(amount) * 100), // In pesewas
        callback_url: `${process.env.FRONTEND_URL}/billing/callback`,
        metadata: {
          organizationId: userReq.organizationId,
          plan: plan,
          userId: userReq.id
        }
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('[Paystack Init] Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  // TODO: Verify Paystack signature (x-paystack-signature)
  const event = req.body;

  if (event.event === 'charge.success') {
    const { metadata, reference } = event.data;
    const { organizationId, plan } = metadata;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        billingStatus: 'ACTIVE',
        subscriptionPlan: plan === 'ANNUALLY' ? 'ENTERPRISE' : 'PRO',
        nextBillingDate: new Date(Date.now() + (plan === 'ANNUALLY' ? 365 : 30) * 24 * 60 * 60 * 1000)
      }
    });

    // Create a subscription record for history
    await prisma.subscription.create({
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

export const manualBillingOverride = async (req: Request, res: Response) => {
  try {
    const { organizationId, plan, type } = req.body;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        billingStatus: 'ACTIVE',
        subscriptionPlan: plan || 'PRO',
        nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default to 1 year for manual
      }
    });

    res.json({ message: 'Billing overridden successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';

     const [org, settings, masterSettings] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          subscriptionPlan: true,
          billingStatus: true,
          trialEndsAt: true,
          nextBillingDate: true,
          isSuspended: true
        }
      }),
      prisma.systemSettings.findFirst({
        where: { organizationId },
        select: {
          monthlyPriceGHS: true,
          annualPriceGHS: true,
          paystackPublicKey: true
        }
      }),
      prisma.systemSettings.findFirst({
        where: { organizationId: 'default-tenant' }
      })
    ]);

    if (!org) return res.status(404).json({ error: 'Organization not found' });

    // Fetch latest subscription record for history
    const history = await prisma.subscription.findMany({
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
      paystackConfigured: !!(settings?.paystackPublicKey || masterSettings?.paystackPublicKey),
      paystackPayLink: masterSettings?.paystackPayLink,
      trialDays: masterSettings?.trialDays || 14,
      history
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
