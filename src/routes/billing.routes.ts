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

export default router;
