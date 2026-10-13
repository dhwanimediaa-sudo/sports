import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';
import { User, Tournament } from '../../types';
import {
  Shield,
  UserPlus,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  Radio,
  Tv,
  Crown,
  Eye,
  RefreshCw,
  Mail,
  Search,
} from 'lucide-react';

export interface TournamentAclManagerProps {
  tournament: Tournament;
  onRefresh?: () => void;
}

interface Collaborator {
  userId: string;
  role: 'MANAGER' | 'SCORER' | 'BROADCAST_OPERATOR' | 'VIEWER';
  name: string;
  email: string;
  assignedAt: string;
}

export const TournamentAclManager: React.FC<TournamentAclManagerProps> = ({
  tournament,
  onRefresh,
}) => {
  const [owner, setOwner] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Add Collaborator Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'MANAGER' | 'SCORER' | 'BROADCAST_OPERATOR' | 'VIEWER'>('SCORER');
  const [adding, setAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAclData = async () => {
    try {
      setLoading(true);
      const [aclRes, usersRes] = await Promise.all([
        api.getTournamentAcl(tournament.id),
        api.getUsers().catch(() => ({ users: [] })),
      ]);
      setOwner(aclRes.owner);
      setCollaborators(aclRes.collaborators || []);
      setAvailableUsers(usersRes.users || []);
    } catch (err: any) {
      console.error('Failed to fetch ACL data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAclData();
  }, [tournament.id]);

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const targetUser = availableUsers.find((u) => u.id === selectedUserId);
    const emailToUse = targetUser ? targetUser.email : manualEmail.trim();

    if (!selectedUserId && !emailToUse) {
      setStatusMessage({ text: 'Please select a user or enter an email address.', type: 'error' });
      return;
    }

    try {
      setAdding(true);
      await api.addTournamentCollaborator(tournament.id, {
        userId: selectedUserId || undefined,
        email: emailToUse || undefined,
        role: selectedRole,
      });

      setStatusMessage({ text: 'Collaborator added successfully!', type: 'success' });
      setSelectedUserId('');
      setManualEmail('');
      fetchAclData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to add collaborator.', type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from tournament collaborators?`)) return;

    try {
      await api.removeTournamentCollaborator(tournament.id, userId);
      setStatusMessage({ text: `Removed ${name} from tournament.`, type: 'success' });
      fetchAclData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to remove collaborator');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Shield className="w-3 h-3" /> MANAGER
          </span>
        );
      case 'SCORER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Radio className="w-3 h-3" /> SCORER
          </span>
        );
      case 'BROADCAST_OPERATOR':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Tv className="w-3 h-3" /> BROADCAST OPERATOR
          </span>
        );
      case 'VIEWER':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            <Eye className="w-3 h-3" /> VIEWER
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              TOURNAMENT ACCESS CONTROL & STAFF (ACL)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Assign authorized tournament managers, scorers, and broadcast operators. Only assigned users have permission to edit tournament data or score matches.
          </p>
        </div>

        <Button
          onClick={fetchAclData}
          variant="outline"
          size="sm"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />}
        >
          Refresh ACL
        </Button>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Owner & Collaborators List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Owner Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{owner?.name || 'Tournament Creator'}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                    OWNER
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-slate-500" />
                  <span>{owner?.email || 'N/A'}</span>
                </div>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-semibold hidden sm:inline">Full Administrative Control</span>
          </div>

          {/* Collaborators List */}
          <Card className="p-5 bg-slate-900/80 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Assigned Staff & Collaborators ({collaborators.length})
                </h3>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Loading access control list...</span>
              </div>
            ) : collaborators.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40 p-4">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300">No additional collaborators assigned</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                  Only the tournament owner and platform admins currently have access. Use the form on the right to grant access to scorers or managers.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {collaborators.map((c) => (
                  <div key={c.userId} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{c.name}</span>
                          {getRoleBadge(c.role)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                          <span>{c.email}</span>
                          {c.assignedAt && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-500">Added {new Date(c.assignedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleRemoveCollaborator(c.userId, c.name)}
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                      className="text-rose-400 hover:bg-rose-500/10 shrink-0"
                      title="Remove Collaborator"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Add Collaborator Form & Role Descriptions */}
        <div className="space-y-4">
          <Card className="p-5 bg-slate-900/90 border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Grant Access / Add Staff
              </h3>
            </div>

            <form onSubmit={handleAddCollaborator} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Select Registered User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    if (e.target.value) setManualEmail('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose User from Platform --</option>
                  {availableUsers
                    .filter((u) => u.id !== owner?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Or Enter User Email
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => {
                    setManualEmail(e.target.value);
                    if (e.target.value) setSelectedUserId('');
                  }}
                  placeholder="e.g. scorer@sportspulse.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Select Role & Permissions
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="SCORER">MATCH SCORER (Can record ball/point events)</option>
                  <option value="BROADCAST_OPERATOR">BROADCAST OPERATOR (Can trigger graphics & on-air)</option>
                  <option value="MANAGER">TOURNAMENT MANAGER (Manage groups, teams, fixtures)</option>
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="emerald"
                size="sm"
                icon={<UserPlus className="w-3.5 h-3.5" />}
                className="w-full justify-center"
                disabled={adding}
              >
                {adding ? 'Granting Access...' : 'GRANT PERMISSION'}
              </Button>
            </form>
          </Card>

          {/* Role Explanations */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-[11px] text-slate-400">
            <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Permission Scopes</p>
            <div className="space-y-1.5">
              <div>
                <span className="font-semibold text-indigo-400">MANAGER:</span> Add/edit groups, teams, players, schedule matches, and manage standings.
              </div>
              <div>
                <span className="font-semibold text-emerald-400">SCORER:</span> Access scoring console and submit live match balls, goals, points, or cards.
              </div>
              <div>
                <span className="font-semibold text-amber-400">BROADCAST:</span> Control overlays, scenes, lower thirds, manual triggers, and graphics.
              </div>
              <div>
                <span className="font-semibold text-slate-300">VIEWER:</span> View match details and standings without mutation privileges.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
