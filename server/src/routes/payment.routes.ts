import { Router } from 'express';
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { initializePayment, paystackWebhook, getSubscriptionStatus } from '../controllers/payment.controller';

const router = Router();

// Webhook — Paystack POST, raw body needed for HMAC verification
router.post('/webhook', express.raw({ type: 'application/json' }), paystackWebhook);

// Authenticated routes
router.use(authenticate);
router.get('/status', getSubscriptionStatus);
router.post('/initialize', authorize(['MD']), initializePayment);

export default router;
