import React from 'react';

export type EntityStatus =
  | 'Active'
  | 'Archived'
  | 'Pending'
  | 'Approved'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected'
  | 'Waiting'
  | 'Called'
  | 'In Consultation'
  | 'Skipped'
  | 'Inactive'
  | 'No-show'
  | 'Critical'
  | 'Scheduled'
  | 'Ongoing'
  | string;

export interface StatusBadgeProps {
  status: EntityStatus;
  label?: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

interface StatusStyleConfig {
  badge: string;
  dot: string;
}

const statusConfigMap: Record<string, StatusStyleConfig> = {
  // Emerald / Success / Confirmed
  Active: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Approved: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Confirmed: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },

  // Amber / Warning / Waiting / Pending
  Pending: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  Waiting: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },

  // Indigo / In Consultation
  'In Consultation': {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-500',
  },

  // Purple / Called
  Called: {
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },

  // Blue / Completed
  Completed: {
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },

  // Stone / Neutral / Inactive / Cancelled / Skipped
  Cancelled: {
    badge: 'bg-stone-100 text-stone-700 border-stone-300',
    dot: 'bg-stone-400',
  },
  Archived: {
    badge: 'bg-stone-100 text-stone-700 border-stone-300',
    dot: 'bg-stone-400',
  },
  Inactive: {
    badge: 'bg-stone-100 text-stone-700 border-stone-300',
    dot: 'bg-stone-400',
  },
  Skipped: {
    badge: 'bg-stone-100 text-stone-700 border-stone-300',
    dot: 'bg-stone-400',
  },
  'No-show': {
    badge: 'bg-stone-100 text-stone-700 border-stone-300',
    dot: 'bg-stone-400',
  },

  // Red / Critical / Rejected
  Rejected: {
    badge: 'bg-red-50 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  Critical: {
    badge: 'bg-red-50 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },

  // Teal / Activity / Ongoing
  Scheduled: {
    badge: 'bg-teal-50 text-teal-800 border-teal-200',
    dot: 'bg-teal-600',
  },
  Ongoing: {
    badge: 'bg-teal-50 text-teal-800 border-teal-200',
    dot: 'bg-teal-600',
  },
};

const fallbackConfig: StatusStyleConfig = {
  badge: 'bg-stone-100 text-stone-700 border-stone-300',
  dot: 'bg-stone-400',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
  showDot = true,
  className = '',
}) => {
  const config = statusConfigMap[status] || fallbackConfig;
  const displayLabel = label || status;

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-none border transition-colors select-none ${config.badge} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 status-indicator-dot shrink-0 mr-1.5 ${config.dot}`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
};

