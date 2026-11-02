import { Router, Response } from 'express';
import { mockRepository, supabaseRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { AuthenticatedRequest } from '../types/index.js';
import { computeCommunityStats } from '../utils/healthLogic.js';

const router = Router();

/**
 * 34. GET /api/v1/community/stats
 */
router.get(
  '/stats',
  authMiddleware,
  enforceSection5RBAC('monitoring', 'read'),
  (_req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    const stats = computeCommunityStats(store.patients, store.consultations, store.vitals);

    res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

/**
 * GET /api/v1/community/demographics
 */
router.get(
  '/demographics',
  authMiddleware,
  enforceSection5RBAC('monitoring', 'read'),
  (_req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    const active = store.patients.filter((p) => p.status === 'Active');

    const byBarangay: Record<string, number> = {};
    const bySex: Record<string, number> = { Female: 0, Male: 0 };

    for (const p of active) {
      byBarangay[p.barangay] = (byBarangay[p.barangay] || 0) + 1;
      if (p.sex === 'Female' || p.sex === 'Male') {
        bySex[p.sex] = (bySex[p.sex] || 0) + 1;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalPatients: active.length,
        byBarangay,
        bySex,
      },
    });
  }
);

/**
 * GET /api/v1/community/morbidity
 */
router.get(
  '/morbidity',
  authMiddleware,
  enforceSection5RBAC('monitoring', 'read'),
  (_req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    const diagnosisCounts: Record<string, { count: number; icdCode: string }> = {};

    for (const c of store.consultations) {
      const diag = c.diagnosis || 'Unspecified';
      if (!diagnosisCounts[diag]) {
        diagnosisCounts[diag] = { count: 0, icdCode: c.icdCode };
      }
      diagnosisCounts[diag].count++;
    }

    const ranking = Object.entries(diagnosisCounts)
      .map(([diagnosis, item]) => ({
        diagnosis,
        icdCode: item.icdCode,
        count: item.count,
      }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      data: ranking,
    });
  }
);

/**
 * GET /api/v1/community/activities
 */
router.get(
  '/activities',
  authMiddleware,
  enforceSection5RBAC('monitoring', 'read'),
  (_req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    res.status(200).json({
      success: true,
      data: store.communityActivities,
    });
  }
);

/**
 * POST /api/v1/community/activities
 */
router.post(
  '/activities',
  authMiddleware,
  enforceSection5RBAC('monitoring', 'manage'),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body;
    const store = mockRepository.getStore();

    const activityCode = `ACT-2026-${String(store.communityActivities.length + 1).padStart(2, '0')}`;
    const newActivity = {
      id: `act-${Date.now()}`,
      activityCode,
      title: body.title,
      category: body.category,
      barangay: body.barangay,
      activityDate: body.activityDate,
      coordinatorName: req.user!.fullName,
      participantsCount: body.participantsCount || 0,
      targetCount: body.targetCount || 50,
      status: body.status || 'Scheduled',
      summaryNotes: body.summaryNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.communityActivities.unshift(newActivity);
    supabaseRepository.persistCommunityActivity(newActivity as any).catch(() => {});

    res.status(201).json({
      success: true,
      data: newActivity,
    });
  }
);

export default router;

