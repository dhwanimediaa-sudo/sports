import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { User } from '../../types';
import { UserCheck, Mail, Calendar, Clock, Shield, Edit3, Key, LogOut } from 'lucide-react';

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onOpenEditProfile: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenEditProfile,
  onOpenChangePassword,
  onLogout,
}) => {
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Account Profile"
      subtitle="View and manage administrator account credentials"
    >
      <div className="space-y-6">
        {/* Header Badge Card */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 border border-emerald-400/30 text-slate-950 flex items-center justify-center font-bold text-xl uppercase shadow-lg shadow-emerald-950/40">
            {user.name.slice(0, 2)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">{user.name}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {user.role.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {user.status}
              </span>
            </div>
          </div>
        </div>

        {/* Account Details Table */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl divide-y divide-slate-800/80 text-xs">
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Account Name
            </span>
            <span className="font-semibold text-slate-200">{user.name}</span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              Username / Email
            </span>
            <span className="font-mono text-emerald-300 font-semibold">{user.email}</span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Account Created
            </span>
            <span className="font-mono text-slate-300">{formatDate(user.createdAt)}</span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Last Session Login
            </span>
            <span className="font-mono text-slate-300">{formatDate(user.lastLoginAt)}</span>
          </div>
        </div>

        {user.mustChangePassword && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <strong>Security Notice:</strong> You are using default setup credentials. Please change your password for server security.
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={() => {
                onClose();
                onOpenEditProfile();
              }}
              variant="secondary"
              icon={<Edit3 className="w-4 h-4 text-emerald-400" />}
            >
              Edit Profile / Username
            </Button>

            <Button
              onClick={() => {
                onClose();
                onOpenChangePassword();
              }}
              variant="secondary"
              icon={<Key className="w-4 h-4 text-amber-400" />}
            >
              Change Password
            </Button>
          </div>

          <Button
            onClick={() => {
              onClose();
              onLogout();
            }}
            variant="danger"
            className="w-full"
            icon={<LogOut className="w-4 h-4" />}
          >
            Log Out Account
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
