import { Router, Response } from 'express';
import { mockRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

/**
 * GET /api/v1/audit-logs
 * Section 5 RBAC: Admin only (Immutable Security Trail)
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('audit', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    const { actionType, module, search } = req.query as Record<string, string>;

    let logs = [...store.auditLogs];

    if (actionType) {
      logs = logs.filter((l) => l.actionType.toLowerCase() === actionType.toLowerCase());
    }
    if (module) {
      logs = logs.filter((l) => l.module.toLowerCase() === module.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.actorName.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.logCode.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      data: logs,
    });
  }
);

/**
 * POST /api/v1/audit-logs
 */
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const store = mockRepository.getStore();

  const newLog = {
    id: `aud-${Date.now()}`,
    logCode: `AUD-${store.auditLogs.length + 9001}`,
    timestamp: new Date().toISOString(),
    actorId: req.user?.id || null,
    actorName: req.user?.fullName || body.actorName || 'System',
    actorRole: req.user?.role || body.actorRole || 'admin',
    actionType: body.actionType || 'System Config',
    module: body.module || 'System',
    targetEntityId: body.targetEntityId || 'N/A',
    details: body.details || 'System event',
    createdAt: new Date().toISOString(),
  };

  store.auditLogs.unshift(newLog);

  res.status(201).json({
    success: true,
    data: newLog,
  });
});

export default router;

