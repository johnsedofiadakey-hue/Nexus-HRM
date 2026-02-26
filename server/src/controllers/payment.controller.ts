/**
 * Payment Controller — Paystack integration
 * MD/HR can view subscription status and initiate card payments
 * Webhook handles payment confirmation server-side
 */
import { Request, Response } from 'express';
import prisma from '../prisma/client';
import crypto from 'crypto';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

// ─── INITIALIZE TRANSACTION ───────────────────────────────────────────────
export const initializePayment = async (req: Request, res: Response) => {
  try {
    const { plan, email } = req.body; // plan: 'monthly' | 'annually'
    // @ts-ignore
    const userId = req.user?.id;

    const settings = await prisma.systemSettings.findFirst({
      select: { paystackPublicKey: true, paystackSecretKey: true, monthlyPriceGHS: true, annualPriceGHS: true }
    });

    if (!settings?.paystackSecretKey) {
      return res.status(400).json({ error: 'Payment not configured. Contact your system administrator.' });
    }

    const amount = plan === 'annually'
      ? Number(settings.annualPriceGHS) * 100  // Paystack uses pesewas (×100)
      : Number(settings.monthlyPriceGHS) * 100;

    // Call Paystack initialize API
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount,
        currency: 'GHS',
        metadata: { userId, plan, custom_fields: [{ display_name: 'Plan', variable_name: 'plan', value: plan }] }
      })
    });

    const psData = await paystackRes.json() as any;
    if (!psData.status) return res.status(400).json({ error: psData.message });

    await logAction(userId, 'PAYMENT_INITIATED', 'Subscription', psData.data.reference, { plan, amount }, req.ip);
    res.json({ authorizationUrl: psData.data.authorization_url, reference: psData.data.reference });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─── WEBHOOK (Paystack calls this on payment success) ────────────────────
export const paystackWebhook = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSettings.findFirst({ select: { paystackSecretKey: true } });
    if (!settings?.paystackSecretKey) return res.status(200).send(); // Ignore if not configured

    const hash = crypto
      .createHmac('sha512', settings.paystackSecretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    res.status(200).send(); // Always 200 to Paystack immediately

    if (event.event === 'charge.success') {
      const { metadata, amount } = event.data;
      const { userId, plan } = metadata;

      if (!userId) return;

      // Calculate period dates
      const now = new Date();
      const end = new Date(now);
      if (plan === 'annually') end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);

      // Update system settings
      await prisma.systemSettings.updateMany({
        data: {
          plan: 'PRO', subscriptionStatus: 'ACTIVE',
          lastPaymentDate: now, paymentLink: event.data.reference
        }
      });

      // Upsert subscription
      await prisma.subscription.create({
        data: {
          clientId: userId, plan: plan.toUpperCase(),
          priceGHS: amount / 100, status: 'ACTIVE',
          paystackRef: event.data.reference,
          currentPeriodStart: now, currentPeriodEnd: end,
        }
      }).catch(() => {}); // Non-blocking

      await notify(userId, '💳 Payment Successful',
        `Your ${plan} subscription is now active until ${end.toLocaleDateString()}.`, 'SUCCESS');
      await logAction(userId, 'PAYMENT_SUCCESS', 'Subscription', event.data.reference, { plan, amount }, req.ip);
    }
  } catch (err: any) {
    console.error('[Payment Webhook]', err.message);
  }
};

// ─── GET SUBSCRIPTION STATUS ──────────────────────────────────────────────
export const getSubscriptionStatus = async (req: Request, res: Response) => {
  const settings = await prisma.systemSettings.findFirst({
    select: { plan: true, subscriptionStatus: true, lastPaymentDate: true, monthlyPriceGHS: true, annualPriceGHS: true, paystackPublicKey: true }
  });

  const sub = await prisma.subscription.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { plan: true, status: true, currentPeriodEnd: true, paystackRef: true }
  });

  res.json({
    plan: settings?.plan || 'FREE',
    status: settings?.subscriptionStatus || 'ACTIVE',
    lastPaymentDate: settings?.lastPaymentDate,
    monthlyPrice: settings?.monthlyPriceGHS,
    annualPrice: settings?.annualPriceGHS,
    paystackConfigured: !!settings?.paystackPublicKey,
    paystackPublicKey: settings?.paystackPublicKey || null,
    currentSubscription: sub
  });
};
