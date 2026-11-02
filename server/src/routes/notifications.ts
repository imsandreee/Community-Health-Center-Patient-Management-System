import { Router, Response } from 'express';
import { mockRepository, supabaseRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { AuthenticatedRequest } from '../types/index.js';
import { notFound } from '../utils/errors.js';

const router = Router();

/**
 * GET /api/v1/notifications
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('notifications', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    const userRole = req.user?.role || 'patient';
    const patientId = req.user?.patientId;

    let records = store.notifications.filter(
      (n) =>
        n.targetRole === 'all' ||
        n.targetRole === userRole ||
        (patientId && n.targetPatientId === patientId)
    );

    res.status(200).json({
      success: true,
      data: records,
    });
  }
);

/**
 * PATCH /api/v1/notifications/:id/read
 */
router.patch(
  '/:id/read',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const store = mockRepository.getStore();

    const notif = store.notifications.find((n) => n.id === id || n.notificationCode === id);
    if (!notif) {
      throw notFound(`Notification '${id}' not found.`);
    }

    notif.isRead = true;
    supabaseRepository.persistNotification(notif).catch(() => {});

    res.status(200).json({
      success: true,
      data: notif,
    });
  }
);

/**
 * PATCH /api/v1/notifications/mark-all-read
 */
router.patch(
  '/mark-all-read',
  authMiddleware,
  (_req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    for (const notif of store.notifications) {
      notif.isRead = true;
    supabaseRepository.persistNotification(notif).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  }
);

/**
 * POST /api/v1/notifications (Admin broadcast)
 */
router.post(
  '/',
  authMiddleware,
  enforceSection5RBAC('notifications', 'manage'),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body;
    const store = mockRepository.getStore();

    const newNotification = {
      id: `not-${Date.now()}`,
      notificationCode: `NOT-2026-${String(store.notifications.length + 1).padStart(2, '0')}`,
      title: body.title,
      message: body.message,
      type: body.type || 'Announcement',
      targetRole: body.targetRole || 'all',
      targetPatientId: body.targetPatientId || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    store.notifications.unshift(newNotification);
    supabaseRepository.persistNotification(newNotification).catch(() => {});

    res.status(201).json({
      success: true,
      data: newNotification,
    });
  }
);

export default router;

