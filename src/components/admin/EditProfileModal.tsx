import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { User } from '../../types';
import { useAuth } from '../../services/authContext';
import { UserCheck, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccessToast: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccessToast,
}) => {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setEmail(user.email);
      setError(null);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name cannot be blank.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address / username.');
      return;
    }

    try {
      setSubmitting(true);
      await updateProfile(name.trim(), email.trim());
      onSuccessToast('Profile details updated successfully.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Admin Profile & Username"
      subtitle="Update existing administrator account details in the database"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Account Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserCheck className="w-4 h-4 text-emerald-400" />}
          placeholder="System Administrator"
          required
        />

        <Input
          label="Username / Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4 text-emerald-400" />}
          placeholder="admin@sportspulse.com"
          helperText="Used for system login authentication. Must be unique."
          required
        />

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <strong>Database Note:</strong> This updates the existing user record (ID: <code className="text-slate-300 font-mono">{user.id.slice(0, 8)}...</code>). No duplicate records will be created.
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="emerald" isLoading={submitting} icon={<CheckCircle2 className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
