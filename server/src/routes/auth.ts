import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { mockRepository } from '../db/index.js';
import { signToken, authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AuthenticatedRequest, UserAccountEntity, PatientEntity } from '../types/index.js';
import { SECTION_5_RBAC_MATRIX } from '../middleware/rbac.js';
import { badRequest, conflict, unauthorized } from '../utils/errors.js';
import { detectDuplicatePatient, generatePatientId, calculateAge } from '../utils/healthLogic.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerPatientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(['Female', 'Male']),
  civilStatus: z.enum(['Single', 'Married', 'Widowed', 'Separated']).default('Single'),
  contactNumber: z.string().min(7),
  address: z.string().min(3),
  barangay: z.string().min(2),
  password: z.string().min(6),
  consentAccepted: z.boolean().refine((val) => val === true, {
    message: 'Republic Act No. 10173 consent is required for registration.',
  }),
});

/**
 * 1. POST /api/v1/auth/login
 */
router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res: Response) => {
    const { email: identifier, password } = req.body;
    const store = mockRepository.getStore();
    const cleanId = identifier.trim().toLowerCase();

    const user = store.users.find((u) => {
      const uEmail = u.email.toLowerCase();
      const uCode = u.userCode.toLowerCase();
      const uPrefix = uEmail.split('@')[0];
      return (
        uEmail === cleanId ||
        uCode === cleanId ||
        uPrefix === cleanId ||
        (cleanId.includes('@') && uPrefix === cleanId.split('@')[0])
      );
    });
    if (!user) {
      throw unauthorized('Invalid email or password.');
    }

  // Cryptographic bcrypt verification
  const isMatch = await bcrypt.compare(password, user.passwordHash).catch(() => false);

    if (!isMatch) {
      throw unauthorized('Invalid email or password.');
    }

    if (user.status !== 'Active') {
      throw unauthorized('User account is currently inactive or suspended.');
    }

    user.lastLoginAt = new Date().toISOString();
    const token = signToken({
      id: user.id,
      userCode: user.userCode,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      patientId: user.patientId ?? undefined,
    });

    // Record audit log
    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      logCode: `AUD-${store.auditLogs.length + 9001}`,
      timestamp: new Date().toISOString(),
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      actionType: 'Authentication',
      module: 'Authentication',
      targetEntityId: user.userCode,
      details: `User ${user.fullName} (${user.role}) logged in successfully.`,
      createdAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.userCode,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          department: user.department,
          status: user.status,
          patientId: user.patientId,
        },
      },
    });
  }));

/**
 * 2. POST /api/v1/auth/register-patient (and alias /register)
 */
const handleRegisterPatient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const store = mockRepository.getStore();

  // Check duplicate patient candidate
  const duplicateCheck = detectDuplicatePatient(
    { fullName: body.fullName, dateOfBirth: body.dateOfBirth },
    store.patients
  );

  if (duplicateCheck.isDuplicate) {
    throw conflict(
      duplicateCheck.reason || 'Candidate patient record already exists.',
      'PATIENT_DUPLICATE_RECORD'
    );
  }

  // Check email collision
  if (store.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
    throw conflict('Email address is already registered to an account.', 'EMAIL_ALREADY_EXISTS');
  }

  const newPatientCode = generatePatientId(store.patients);
  const patientId = `pat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newPatient: PatientEntity = {
    id: patientId,
    patientCode: newPatientCode,
    fullName: body.fullName.trim(),
    dateOfBirth: body.dateOfBirth,
    age: calculateAge(body.dateOfBirth),
    sex: body.sex,
    civilStatus: body.civilStatus,
    contactNumber: body.contactNumber,
    email: body.email,
    address: body.address,
    barangay: body.barangay,
    emergencyContactName: 'Self Registered',
    emergencyContactNumber: body.contactNumber,
    status: 'Active',
    registrationDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.patients.unshift(newPatient);

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(body.password, salt);

  const newUser: UserAccountEntity = {
    id: `usr-${Date.now()}`,
    userCode: `USR-${String(store.users.length + 1).padStart(2, '0')}`,
    fullName: newPatient.fullName,
    email: body.email,
    passwordHash,
    role: 'patient',
    department: 'Patient Portal',
    status: 'Active',
    patientId: newPatient.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(newUser);

  const token = signToken({
    id: newUser.id,
    userCode: newUser.userCode,
    fullName: newUser.fullName,
    email: newUser.email,
    role: newUser.role,
    department: newUser.department,
    patientId: newPatient.id,
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      patientId: newPatient.patientCode,
      user: {
        id: newUser.userCode,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        status: newUser.status,
        patientId: newPatient.id,
      },
    },
  });
});

router.post('/register-patient', validate({ body: registerPatientSchema }), handleRegisterPatient);
router.post('/register', validate({ body: registerPatientSchema }), handleRegisterPatient);

/**
 * 3. GET /api/v1/auth/me
 */
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const rbacPermissions = Object.fromEntries(
    Object.entries(SECTION_5_RBAC_MATRIX).map(([mod, perms]) => [mod, perms[user.role]])
  );

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.userCode || user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        patientId: user.patientId,
      },
      permissions: rbacPermissions,
    },
  });
});

/**
 * 4. POST /api/v1/auth/password-recovery (and alias /forgot-password)
 */
const handlePasswordRecovery = (req: AuthenticatedRequest, res: Response) => {
  const identifier = req.body?.identifier || req.body?.email;
  if (!identifier) {
    throw badRequest('Identifier (email or patient ID) is required.');
  }

  res.status(200).json({
    success: true,
    message: 'Recovery instructions dispatched.',
  });
};

router.post('/password-recovery', handlePasswordRecovery);
router.post('/forgot-password', handlePasswordRecovery);

/**
 * 5. PUT /api/v1/auth/update-password (and alias /change-password)
 */
const handleUpdatePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw badRequest('Current password and new password are required.');
  }

  if (newPassword.length < 6) {
    throw badRequest('New password must be at least 6 characters long.');
  }

  const store = mockRepository.getStore();
  const user = store.users.find((u) => u.id === req.user!.id || u.userCode === req.user!.userCode);

  if (user) {
    // Cryptographic bcrypt verification
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash).catch(() => false);

    if (!isCurrentValid) {
      throw badRequest('Current password incorrect.');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.updatedAt = new Date().toISOString();
  }

  res.status(200).json({
    success: true,
    message: 'Password updated successfully.',
  });
});

router.put('/update-password', authMiddleware, handleUpdatePassword);
router.post('/update-password', authMiddleware, handleUpdatePassword);
router.post('/change-password', authMiddleware, handleUpdatePassword);

export default router;
