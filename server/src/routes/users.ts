import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { mockRepository, supabaseRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { AuthenticatedRequest, UserAccountEntity, UserRole } from '../types/index.js';
import { notFound, badRequest } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logAuditEvent } from '../utils/audit.js';

const router = Router();

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['patient', 'staff', 'nurse', 'doctor', 'admin']),
  department: z.string().min(2),
  password: z.string().min(6).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['patient', 'staff', 'nurse', 'doctor', 'admin']),
});

/**
 * GET /api/v1/users (Admin only)
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('users', 'manage'),
  (_req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    const safeUsers = store.users.map((u) => ({
      id: u.id,
      userCode: u.userCode,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      department: u.department,
      status: u.status,
      patientId: u.patientId,
      lastLoginAt: u.lastLoginAt,
    }));

    res.status(200).json({
      success: true,
      data: safeUsers,
    });
  }
);

/**
 * POST /api/v1/users (Admin only)
 * Creates new personnel account and writes immutable audit log.
 */
router.post(
  '/',
  authMiddleware,
  enforceSection5RBAC('users', 'manage'),
  validate({ body: createUserSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fullName, email, role, department, password } = req.body;
    const store = mockRepository.getStore();

    const existing = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw badRequest(`User account with email '${email}' already exists.`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'Password123!', salt);
    const nextNum = store.users.length + 1;
    const userCode = `USR-${nextNum < 10 ? '0' : ''}${nextNum}`;

    const newUser: UserAccountEntity = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userCode,
      fullName,
      email,
      passwordHash,
      role,
      department,
      status: 'Active',
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    supabaseRepository.persistUserAccount(newUser).catch(() => {});

    logAuditEvent({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Access Control',
      module: 'Users',
      targetEntityId: newUser.userCode,
      details: `Provisioned personnel account for ${newUser.fullName} (${newUser.role}) in department '${newUser.department}'.`,
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        userCode: newUser.userCode,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        status: newUser.status,
      },
    });
  })
);

/**
 * PATCH /api/v1/users/:id/status (Admin only)
 */
router.patch(
  '/:id/status',
  authMiddleware,
  enforceSection5RBAC('users', 'manage'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !['Active', 'Inactive', 'Suspended'].includes(status)) {
      throw badRequest("Invalid status. Expected 'Active', 'Inactive', or 'Suspended'.");
    }

    const store = mockRepository.getStore();
    const user = store.users.find((u) => u.id === id || u.userCode === id);
    if (!user) {
      throw notFound(`User '${id}' not found.`);
    }

    user.status = status;
    user.updatedAt = new Date().toISOString();
    supabaseRepository.persistUserAccount(user).catch(() => {});

    logAuditEvent({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Access Control',
      module: 'Users',
      targetEntityId: user.userCode,
      details: `Updated account status for ${user.fullName} (${user.userCode}) to '${status}'.`,
    });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        userCode: user.userCode,
        status: user.status,
      },
    });
  }
);

/**
 * PATCH /api/v1/users/:id/role (Admin only)
 */
router.patch(
  '/:id/role',
  authMiddleware,
  enforceSection5RBAC('users', 'manage'),
  validate({ body: updateRoleSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body as { role: UserRole };

    const store = mockRepository.getStore();
    const user = store.users.find((u) => u.id === id || u.userCode === id);
    if (!user) {
      throw notFound(`User '${id}' not found.`);
    }

    const previousRole = user.role;
    user.role = role;
    user.updatedAt = new Date().toISOString();
    supabaseRepository.persistUserAccount(user).catch(() => {});

    logAuditEvent({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Access Control',
      module: 'Users',
      targetEntityId: user.userCode,
      details: `Reassigned RBAC role for ${user.fullName} (${user.userCode}) from '${previousRole}' to '${role}'.`,
    });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        userCode: user.userCode,
        role: user.role,
      },
    });
  }
);

/**
 * POST /api/v1/users/change-password
 */
router.post(
  '/change-password',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      throw badRequest('New password must be at least 6 characters.');
    }

    const store = mockRepository.getStore();
    const targetId = userId || req.user!.id;
    const user = store.users.find((u) => u.id === targetId || u.userCode === targetId);

    if (!user) {
      throw notFound('Target user not found.');
    }

    // Only admin can reset others' passwords
    if (user.id !== req.user!.id && req.user!.role !== 'admin') {
      throw badRequest('Only administrators can reset credentials for other accounts.');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.updatedAt = new Date().toISOString();

    logAuditEvent({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Access Control',
      module: 'Users',
      targetEntityId: user.userCode,
      details: `Password credentials reset for ${user.fullName} (${user.userCode}).`,
    });

    res.status(200).json({
      success: true,
      message: `Password updated for user ${user.fullName}.`,
    });
  })
);

export default router;
