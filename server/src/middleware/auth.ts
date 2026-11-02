import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthenticatedRequest, AuthUser, UserRole } from '../types/index.js';
import { unauthorized } from '../utils/errors.js';

export function signToken(user: {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
  patientId?: string;
}): string {
  return jwt.sign(
    {
      sub: user.id,
      userCode: user.userCode,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      patientId: user.patientId,
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
}

const DEV_MOCK_USERS: Record<string, AuthUser> = {
  patient: {
    id: 'b101a111-0001-4000-8000-000000000001',
    userCode: 'USR-01',
    fullName: 'Maria Clara Santos',
    email: 'maria.santos@patient.chc.ph',
    role: 'patient',
    department: 'Patient Portal',
    status: 'Active',
    patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
  },
  staff: {
    id: 'b101a111-0002-4000-8000-000000000002',
    userCode: 'USR-02',
    fullName: 'Elena Villanueva',
    email: 'e.villanueva@sanroque-chc.gov.ph',
    role: 'staff',
    department: 'Front Desk & Records',
    status: 'Active',
  },
  nurse: {
    id: 'b101a111-0003-4000-8000-000000000003',
    userCode: 'USR-03',
    fullName: 'Nurse Joy Bautista, RN',
    email: 'j.bautista@sanroque-chc.gov.ph',
    role: 'nurse',
    department: 'Triage & Community Nursing',
    status: 'Active',
  },
  doctor: {
    id: 'b101a111-0004-4000-8000-000000000004',
    userCode: 'USR-04',
    fullName: 'Dr. Rafael Mendoza, MD',
    email: 'r.mendoza@sanroque-chc.gov.ph',
    role: 'doctor',
    department: 'Primary Care & Internal Medicine',
    status: 'Active',
  },
  admin: {
    id: 'b101a111-0005-4000-8000-000000000005',
    userCode: 'USR-05',
    fullName: 'Carlos Dizon',
    email: 'admin@sanroque-chc.gov.ph',
    role: 'admin',
    department: 'Health Information Systems',
    status: 'Active',
  },
};

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw unauthorized('Missing or malformed Authorization header. Expected Bearer token.');
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw unauthorized('Empty token provided.');
  }

  // Handle mock tokens for developer testing convenience (strictly gated behind non-production)
  if (token.startsWith('mock-token-')) {
    if (!config.isDev || config.nodeEnv === 'production') {
      throw unauthorized('Developer mock tokens are strictly disabled in production environments.');
    }
    const roleKey = token.replace('mock-token-', '').toLowerCase();
    const mockUser = DEV_MOCK_USERS[roleKey];
    if (mockUser) {
      req.user = mockUser;
      return next();
    }
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      userCode: string;
      fullName: string;
      email: string;
      role: UserRole;
      department: string;
      patientId?: string;
    };

    req.user = {
      id: decoded.sub,
      userCode: decoded.userCode,
      fullName: decoded.fullName,
      email: decoded.email,
      role: decoded.role,
      department: decoded.department,
      status: 'Active',
      patientId: decoded.patientId,
    };
    next();
  } catch (err) {
    throw unauthorized(
      err instanceof Error ? `JWT verification failed: ${err.message}` : 'Invalid token signature.'
    );
  }
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!token) return next();

  if (token.startsWith('mock-token-')) {
    if (!config.isDev || config.nodeEnv === 'production') {
      return next();
    }
    const roleKey = token.replace('mock-token-', '').toLowerCase();
    if (DEV_MOCK_USERS[roleKey]) {
      req.user = DEV_MOCK_USERS[roleKey];
      return next();
    }
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      userCode: string;
      fullName: string;
      email: string;
      role: UserRole;
      department: string;
      patientId?: string;
    };
    req.user = {
      id: decoded.sub,
      userCode: decoded.userCode,
      fullName: decoded.fullName,
      email: decoded.email,
      role: decoded.role,
      department: decoded.department,
      status: 'Active',
      patientId: decoded.patientId,
    };
  } catch {
    // Ignore error for optional authentication
  }
  next();
}

