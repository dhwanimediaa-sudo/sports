import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  title: string;
  description?: string;
  message?: string;
  confirmText?: string;
  confirmVariant?: string;
  dangerText?: string;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmText = 'Yes, Delete',
  confirmVariant = 'danger',
  dangerText = 'Deletion Safety Warning',
  loading = false,
}) => {
  const handleClose = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };
  const bodyText = message || description || '';

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={title} maxWidth="md">
      <div className="space-y-4 py-1">
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider">{dangerText}</p>
            <p className="text-slate-300 leading-relaxed">{bodyText}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={(confirmVariant as any) || 'danger'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
            icon={<Trash2 className="w-4 h-4" />}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
