import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  actionNode?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionNode,
  className = '',
}) => {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none ${className}`}
    >
      <div className="w-12 h-12 rounded-none bg-stone-100 border-2 border-stone-300 flex items-center justify-center text-stone-600 mb-3 shadow-xs">
        {icon || <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-bold text-stone-800 font-display mb-1">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-stone-500 max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionNode ? (
        <div className="mt-2">{actionNode}</div>
      ) : actionText && onAction ? (
        <div className="mt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

