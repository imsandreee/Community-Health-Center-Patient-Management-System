import { mockRepository, supabaseRepository } from '../db/index.js';
import { AuditLogEntity, UserRole } from '../types/index.js';

export interface RecordAuditLogParams {
  actorId?: string | null;
  actorName: string;
  actorRole: UserRole;
  actionType: 'Authentication' | 'Patient Record' | 'Clinical Amendment' | 'Appointment' | 'System Config' | 'Access Control';
  module: string;
  targetEntityId: string;
  details: string;
  ipAddress?: string | null;
}

/**
 * Centrally records an immutable administrative or clinical mutation into the audit trail.
 */
export function logAuditEvent(params: RecordAuditLogParams): AuditLogEntity {
  const store = mockRepository.getStore();
  const logCode = `AUD-${store.auditLogs.length + 9001}`;
  const now = new Date().toISOString();

  const auditEntry: AuditLogEntity = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    logCode,
    timestamp: now,
    actorId: params.actorId || null,
    actorName: params.actorName,
    actorRole: params.actorRole,
    actionType: params.actionType,
    module: params.module,
    targetEntityId: params.targetEntityId,
    details: params.details,
    ipAddress: params.ipAddress || null,
    createdAt: now,
  };

  store.auditLogs.unshift(auditEntry);
  if (supabaseRepository && typeof supabaseRepository.persistAuditLog === 'function') {
    supabaseRepository.persistAuditLog(auditEntry).catch(() => {});
  }
  return auditEntry;
}

