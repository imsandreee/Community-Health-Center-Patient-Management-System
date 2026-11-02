import React from 'react';
import { AlertTriangle, HeartPulse, UserCheck, Accessibility, User } from 'lucide-react';
import { QueuePriority } from '../../types/health';

export interface PriorityChipProps {
  priority: QueuePriority | string;
  showStatutoryCode?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

interface PriorityConfig {
  label: string;
  statutoryCode?: string;
  badge: string;
  icon: React.ReactNode;
}

export const PriorityChip: React.FC<PriorityChipProps> = ({
  priority,
  showStatutoryCode = false,
  size = 'sm',
  className = '',
}) => {
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5 mr-1 shrink-0' : 'w-4 h-4 mr-1.5 shrink-0';

  const configMap: Record<string, PriorityConfig> = {
    Emergency: {
      label: 'Emergency',
      statutoryCode: 'STAT-URGENT',
      badge: 'bg-red-700 text-white border-red-800 font-bold uppercase tracking-wide shadow-xs',
      icon: <AlertTriangle className={iconClass} aria-hidden="true" />,
    },
    Pregnant: {
      label: 'Pregnant',
      statutoryCode: 'Maternal Care',
      badge: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
      icon: <HeartPulse className={iconClass} aria-hidden="true" />,
    },
    'Senior Citizen': {
      label: 'Senior Citizen',
      statutoryCode: 'RA 9994',
      badge: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      icon: <UserCheck className={iconClass} aria-hidden="true" />,
    },
    PWD: {
      label: 'PWD',
      statutoryCode: 'BP 344',
      badge: 'bg-blue-100 text-blue-900 border-blue-300 font-semibold',
      icon: <Accessibility className={iconClass} aria-hidden="true" />,
    },
    Regular: {
      label: 'Regular',
      badge: 'bg-stone-100 text-stone-700 border-stone-300 font-medium',
      icon: <User className={iconClass} aria-hidden="true" />,
    },
  };

  const config = configMap[priority] || {
    label: priority,
    badge: 'bg-stone-100 text-stone-700 border-stone-300 font-medium',
    icon: <User className={iconClass} aria-hidden="true" />,
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-none border transition-colors select-none ${config.badge} ${sizeClasses} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
      {showStatutoryCode && config.statutoryCode && (
        <span className="ml-1 opacity-75 font-mono text-[10px] uppercase">
          ({config.statutoryCode})
        </span>
      )}
    </span>
  );
};

