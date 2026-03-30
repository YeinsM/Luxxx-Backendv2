import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new BillingController();

/**
 * @route   GET /api/billing/balance
 * @desc    Get current user's balance
 * @access  Private
 */
router.get('/balance', authMiddleware, controller.getBalance.bind(controller));

/**
 * @route   GET /api/billing/transactions
 * @desc    Get current user's transactions
 * @access  Private
 */
router.get('/transactions', authMiddleware, controller.getTransactions.bind(controller));

/**
 * @route   GET /api/billing/invoices
 * @desc    Get current user's invoices
 * @access  Private
 */
router.get('/invoices', authMiddleware, controller.getInvoices.bind(controller));

/**
 * @route   GET /api/billing/invoices/:id/download
 * @desc    Download an invoice PDF
 * @access  Private
 */
router.get('/invoices/:id/download', authMiddleware, controller.downloadInvoice.bind(controller));

/**
 * @route   POST /api/billing/credits/purchase
 * @desc    Simulate credit purchase — records an income transaction
 * @access  Private
 */
router.post('/credits/purchase', authMiddleware, controller.purchaseCredits.bind(controller));

/**
 * @route   GET /api/billing/boost-price
 * @desc    Get the current boost price per day (no adId required)
 * @access  Private
 */
router.get('/boost-price', authMiddleware, controller.getBoostPrice.bind(controller));

/**
 * @route   GET /api/billing/boost/:adId
 * @desc    Get boost status for an advertisement
 * @access  Private
 */
router.get('/boost/:adId', authMiddleware, controller.getBoostStatus.bind(controller));

/**
 * @route   POST /api/billing/boost/:adId
 * @desc    Boost an advertisement to top of category
 * @access  Private
 */
router.post('/boost/:adId', authMiddleware, controller.boost.bind(controller));

/**
 * @route   GET /api/billing/ranking/:adId
 * @desc    Get the model's ranking position in their category
 * @access  Private
 */
router.get('/ranking/:adId', authMiddleware, controller.getRanking.bind(controller));

export default router;
