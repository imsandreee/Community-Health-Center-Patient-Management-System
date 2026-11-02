import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ModuleId, PermissionLevel, UserRole } from '../types/index.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export const SECTION_5_RBAC_MATRIX: Record<ModuleId, Record<UserRole, PermissionLevel>> = {
  dashboard: {
    patient: 'own',
    staff: 'view',
    nurse: 'view',
    doctor: 'view',
    admin: 'view',
  },
  patients: {
    patient: 'own',
    staff: 'manage',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  appointments: {
    patient: 'own',
    staff: 'manage',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  queue: {
    patient: 'own',
    staff: 'manage',
    nurse: 'manage',
    doctor: 'manage',
    admin: 'manage',
  },
  vitals: {
    patient: 'own',
    staff: 'restricted',
    nurse: 'manage',
    doctor: 'view',
    admin: 'restricted',
  },
  consultations: {
    patient: 'own',
    staff: 'restricted',
    nurse: 'view',
    doctor: 'manage',
    admin: 'restricted',
  },
  services: {
    patient: 'view',
    staff: 'view',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  monitoring: {
    patient: 'none',
    staff: 'view',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  reports: {
    patient: 'none',
    staff: 'view',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  notifications: {
    patient: 'own',
    staff: 'manage',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  users: {
    patient: 'own',
    staff: 'none',
    nurse: 'none',
    doctor: 'none',
    admin: 'manage',
  },
  audit: {
    patient: 'none',
    staff: 'none',
    nurse: 'none',
    doctor: 'none',
    admin: 'view',
  },
};

/**
 * Enforces Section 5 RBAC rules per module and operation type ('read' vs 'write')
 */
export function enforceSection5RBAC(
  module: ModuleId,
  accessType: 'read' | 'write' | 'manage' = 'read'
) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw unauthorized('Authentication required to access this resource.');
    }

    const role = req.user.role;
    const permission = SECTION_5_RBAC_MATRIX[module]?.[role] ?? 'none';

    // 1. Restricted (Statutory clinical privacy barrier - RA 10173)
    if (permission === 'restricted') {
      throw forbidden(
        `Access to ${module} is restricted for role '${role}' under Republic Act No. 10173 statutory clinical privacy protection.`,
        'RA10173_PRIVACY_RESTRICTION'
      );
    }

    // 2. None (Prohibited)
    if (permission === 'none') {
      throw forbidden(
        `Role '${role}' lacks permission to access module '${module}'.`,
        'RBAC_ACCESS_DENIED'
      );
    }

    // 3. Own (Partitioned to own patient records)
    if (permission === 'own') {
      req.scopeToOwn = true;
      return next();
    }

    // 4. View (Read-only)
    if (permission === 'view') {
      if (accessType === 'write' || accessType === 'manage') {
        throw forbidden(
          `Role '${role}' has read-only access to '${module}' and cannot perform mutations.`,
          'RBAC_READ_ONLY'
        );
      }
      return next();
    }

    // 5. Manage (Full access)
    if (permission === 'manage') {
      return next();
    }

    throw forbidden(`Unauthorized access level '${permission}' for module '${module}'.`);
  };
}

/**
 * Restricts route to specific explicit roles
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw unauthorized('Authentication required to access this resource.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw forbidden(
        `Role '${req.user.role}' is not authorized to access this route. Allowed roles: ${allowedRoles.join(', ')}.`,
        'ROLE_NOT_AUTHORIZED'
      );
    }

    next();
  };
}
