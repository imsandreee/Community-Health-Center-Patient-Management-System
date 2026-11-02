import { Router, Response } from 'express';
import { mockRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { AuthenticatedRequest } from '../types/index.js';
import { notFound } from '../utils/errors.js';
import { logAuditEvent } from '../utils/audit.js';

const router = Router();

/**
 * 29. GET /api/v1/billing/invoices
 */
router.get(
  '/invoices',
  authMiddleware,
  requireRoles(['staff', 'admin']),
  (req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    res.status(200).json({
      success: true,
      data: store.billingInvoices,
    });
  }
);

/**
 * 30. POST /api/v1/billing/invoices/:id/settle
 */
router.post(
  '/invoices/:id/settle',
  authMiddleware,
  requireRoles(['staff', 'admin']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { paymentStatus = 'Paid', officialReceiptNumber, philhealthClaimNumber } = req.body || {};
    const store = mockRepository.getStore();

    const invoice = store.billingInvoices.find((inv) => inv.id === id || inv.invoiceCode === id);
    if (!invoice) {
      throw notFound(`Billing invoice '${id}' not found.`);
    }

    invoice.paymentStatus = paymentStatus;
    if (officialReceiptNumber) invoice.officialReceiptNumber = officialReceiptNumber;
    if (philhealthClaimNumber) invoice.philhealthClaimNumber = philhealthClaimNumber;
    invoice.cashierId = req.user!.id;
    invoice.paidAt = new Date().toISOString();
    invoice.updatedAt = new Date().toISOString();

    logAuditEvent({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Patient Record',
      module: 'Billing',
      targetEntityId: invoice.invoiceCode,
      details: `Settled billing invoice ${invoice.invoiceCode} for patient ${invoice.patientName || invoice.patientId} with payment status '${paymentStatus}'${officialReceiptNumber ? ` (OR: ${officialReceiptNumber})` : ''}${philhealthClaimNumber ? ` (Claim: ${philhealthClaimNumber})` : ''}.`,
    });

    res.status(200).json({
      success: true,
      data: invoice,
    });
  }
);

export default router;

