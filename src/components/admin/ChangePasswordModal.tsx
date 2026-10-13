import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../services/authContext';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill out all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New Password and Confirm New Password do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('New password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }

    try {
      setSubmitting(true);
      await changePassword(currentPassword, newPassword, confirmPassword);
      onSuccessToast('Password changed successfully.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Change Administrator Password"
      subtitle="Update your security credentials for system access"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Current Password"
          type={showCurrent ? 'text' : 'password'}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="text-slate-400 hover:text-white p-1 focus:outline-none"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          placeholder="Enter current password"
          required
        />

        <Input
          label="New Password"
          type={showNew ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4 text-emerald-400" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="text-slate-400 hover:text-white p-1 focus:outline-none"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          placeholder="Min 8 chars (1 Upper, 1 Lower, 1 Number)"
          required
        />

        <Input
          label="Confirm New Password"
          type={showNew ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4 text-emerald-400" />}
          placeholder="Re-enter new password"
          required
        />

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Security Rules:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
            <li>Minimum 8 characters in length</li>
            <li>Must contain at least 1 uppercase and 1 lowercase letter</li>
            <li>Must contain at least 1 number</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="emerald" isLoading={submitting} icon={<CheckCircle2 className="w-4 h-4" />}>
            Update Password
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
