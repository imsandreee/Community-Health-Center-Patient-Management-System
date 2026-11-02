import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

export type ConfirmVariant = 'destructive' | 'warning' | 'primary';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  requiresReason?: boolean;
  showReasonInput?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  isLoading = false,
  requiresReason = false,
  showReasonInput = false,
  reasonLabel = 'Justification Reason',
  reasonPlaceholder = 'Please enter a justification for this clinical/administrative action...',
}) => {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setReasonError('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (requiresReason && !reason.trim()) {
      setReasonError('A valid justification is required for this action.');
      return;
    }
    await onConfirm(reason.trim());
  };

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return (
          <div className="w-10 h-10 rounded-none border border-red-300 bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-none border border-amber-300 bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
        );
      case 'primary':
      default:
        return (
          <div className="w-10 h-10 rounded-none border border-indigo-300 bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={!isLoading}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            size="md"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={requiresReason && !reason.trim()}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        {getIcon()}
        <div className="space-y-2 flex-1">
          <h3 className="text-base font-bold text-stone-900 font-display">{title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{description}</p>

          {(requiresReason || showReasonInput) && (
            <div className="pt-2">
              <Input
                label={reasonLabel}
                required={requiresReason}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError('');
                }}
                placeholder={reasonPlaceholder}
                error={reasonError}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

