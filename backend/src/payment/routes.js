const express = require('express');
const router = express.Router();
const paymentController = require('./controller');
const { authenticateUser, authorizeRoles } = require('../auth');

// Stripe webhook needs raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleStripeWebhook);

/**
 * @route POST /api/payments/create-checkout
 * @desc Create a Stripe checkout session for payment
 * @access Private (patient or admin)
 */
router.post(
    '/create-checkout',
    authenticateUser,
    authorizeRoles(['patient', 'admin']),
    paymentController.createCheckoutSession
);

/**
 * @route GET /api/payments/session/:sessionId
 * @desc Verify payment session status
 * @access Public (needed for redirect after payment)
 */
router.get(
    '/session/:sessionId',
    paymentController.verifySessionStatus
);

module.exports = router;