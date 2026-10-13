import React, { useState, useEffect } from 'react';
import {
  User,
  SportType,
  UserRole,
  UserStatus,
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../services/authContext';
import {
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Trophy,
  AlertTriangle,
  X,
  Edit2,
  Check,
} from 'lucide-react';

const ALL_AVAILABLE_SPORTS: { id: SportType; label: string; icon: string }[] = [
  { id: 'CRICKET', label: 'Cricket', icon: '🏏' },
  { id: 'VOLLEYBALL', label: 'Volleyball', icon: '🏐' },
  { id: 'KABADDI', label: 'Kabaddi', icon: '🤼' },
  { id: 'FOOTBALL', label: 'Football', icon: '⚽' },
  { id: 'HOCKEY', label: 'Hockey', icon: '🏑' },
  { id: 'BASKETBALL', label: 'Basketball', icon: '🏀' },
  { id: 'TENNIS', label: 'Tennis', icon: '🎾' },
  { id: 'BADMINTON', label: 'Badminton', icon: '🏸' },
  { id: 'TABLE_TENNIS', label: 'Table Tennis', icon: '🏓' },
  { id: 'CUSTOM', label: 'Custom Sport', icon: '⚙️' },
];

export const UserManagement: React.FC<{
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ onToast }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<(User & { tournamentCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(User & { tournamentCount: number }) | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER' as UserRole,
    status: 'ACTIVE' as UserStatus,
    allowedSports: ['CRICKET'] as SportType[],
  });

  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    allowedSports: SportType[];
  }>({
    name: '',
    email: '',
    role: 'USER',
    status: 'ACTIVE',
    allowedSports: [],
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminUsers(searchTerm);
      setUsers(res.users);
    } catch (err: any) {
      onToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      onToast('Full name and email are required.', 'error');
      return;
    }
    if (createForm.password.length < 6) {
      onToast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      onToast('Passwords do not match.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createAdminUser(createForm);
      onToast(res.message || 'User created successfully.', 'success');
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'USER',
        status: 'ACTIVE',
        allowedSports: ['CRICKET'],
      });
      fetchUsers();
    } catch (err: any) {
      onToast(err.message || 'Failed to create user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSubmitting(true);
      const res = await api.updateAdminUser(editingUser.id, editForm);
      onToast(res.message || 'User updated successfully.', 'success');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      onToast(err.message || 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (passwordForm.newPassword.length < 6) {
      onToast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      onToast('Passwords do not match.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.resetAdminUserPassword(resettingUser.id, passwordForm);
      onToast(res.message || 'Password reset successfully.', 'success');
      setResettingUser(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      onToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      onToast('You cannot disable your own administrator account.', 'error');
      return;
    }
    const newStatus: UserStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await api.setAdminUserStatus(user.id, newStatus);
      onToast(res.message || `Account ${newStatus.toLowerCase()}.`, 'success');
      fetchUsers();
    } catch (err: any) {
      onToast(err.message || 'Failed to update status', 'error');
    }
  };

  const toggleSportInCreate = (sportId: SportType) => {
    setCreateForm((prev) => {
      const exists = prev.allowedSports.includes(sportId);
      return {
        ...prev,
        allowedSports: exists
          ? prev.allowedSports.filter((s) => s !== sportId)
          : [...prev.allowedSports, sportId],
      };
    });
  };

  const toggleSportInEdit = (sportId: SportType) => {
    setEditForm((prev) => {
      const exists = prev.allowedSports.includes(sportId);
      return {
        ...prev,
        allowedSports: exists
          ? prev.allowedSports.filter((s) => s !== sportId)
          : [...prev.allowedSports, sportId],
      };
    });
  };

  const handleCloseCreate = () => {
    const isDirty = Boolean(createForm.name.trim() || createForm.email.trim() || createForm.password.trim());
    if (isDirty) {
      if (window.confirm('You have unsaved changes in the new user form. Discard them?')) {
        setIsCreateOpen(false);
      }
    } else {
      setIsCreateOpen(false);
    }
  };

  const handleCloseEdit = () => {
    const isDirty = Boolean(
      editingUser &&
        (editForm.name !== editingUser.name ||
          editForm.email !== editingUser.email ||
          editForm.role !== editingUser.role ||
          editForm.status !== editingUser.status)
    );
    if (isDirty) {
      if (window.confirm('You have unsaved changes in this user account form. Discard them?')) {
        setEditingUser(null);
      }
    } else {
      setEditingUser(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Super Admin User Management</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Create user accounts, set credentials, and explicitly grant sport access permissions. Users independently manage tournaments, groups, teams, players, and matches within their assigned sports.
          </p>
        </div>

        <button
          id="btn-create-new-user"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Create New User
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={() => fetchUsers()}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-4">User Details</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Sports</th>
                <th className="p-4">Tournaments</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isSuperAdmin = u.role === 'SUPER_ADMIN';
                  const activeSports = isSuperAdmin
                    ? ALL_AVAILABLE_SPORTS.map((s) => s.id)
                    : u.allowedSports || [];

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : u.role === 'ADMIN'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : u.role === 'SCORER'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : u.role === 'BROADCASTER'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30'
                          } ${isCurrent ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                          title={isCurrent ? 'Cannot modify your own status' : 'Click to toggle status'}
                        >
                          {u.status === 'ACTIVE' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Disabled
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-4">
                        {isSuperAdmin ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            All Sports (Super Admin)
                          </span>
                        ) : activeSports.length === 0 ? (
                          <span className="text-[10px] text-rose-400 flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded w-fit">
                            <AlertTriangle className="w-3 h-3" /> No Sports Assigned
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {activeSports.map((sp) => (
                              <span
                                key={sp}
                                className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium"
                              >
                                {sp}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>{u.tournamentCount || 0}</span>
                        </div>
                      </td>

                      <td className="p-4 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditForm({
                              name: u.name,
                              email: u.email,
                              role: u.role,
                              status: u.status,
                              allowedSports: u.allowedSports || [],
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all inline-flex items-center gap-1 text-[11px] px-2.5"
                          title="Edit user role & sport access"
                        >
                          <Edit2 className="w-3 h-3 text-blue-400" />
                          Edit Access
                        </button>

                        <button
                          onClick={() => {
                            setResettingUser(u);
                            setPasswordForm({ newPassword: '', confirmPassword: '' });
                          }}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all inline-flex items-center gap-1 text-[11px] px-2.5"
                          title="Set user password"
                        >
                          <KeyRound className="w-3 h-3 text-amber-400" />
                          Password
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Create New User Account</h3>
              </div>
              <button
                onClick={handleCloseCreate}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Email / Username *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="e.g. organizer@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Password (min 6 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USER">USER (Organizer / Self-Service)</option>
                    <option value="SCORER">SCORER (Match Scorer)</option>
                    <option value="BROADCASTER">BROADCASTER (Graphics Operator)</option>
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                    <option value="SUPER_ADMIN">SUPER ADMIN (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as UserStatus })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE (Can Login & Create)</option>
                    <option value="DISABLED">DISABLED (Access Blocked)</option>
                  </select>
                </div>
              </div>

              {/* SPORT PERMISSIONS SELECTOR */}
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Allowed Sports (Hard Access Permissions)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_AVAILABLE_SPORTS.map((sport) => {
                    const isSelected = createForm.allowedSports.includes(sport.id);
                    return (
                      <button
                        type="button"
                        key={sport.id}
                        onClick={() => toggleSportInCreate(sport.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-300 font-semibold'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{sport.icon}</span>
                          <span>{sport.label}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseCreate}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER & SPORTS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Edit User: {editingUser.name}</h3>
              </div>
              <button
                onClick={handleCloseEdit}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Email / Username
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USER">USER (Organizer / Self-Service)</option>
                    <option value="SCORER">SCORER (Match Scorer)</option>
                    <option value="BROADCASTER">BROADCASTER (Graphics Operator)</option>
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                    <option value="SUPER_ADMIN">SUPER ADMIN (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserStatus })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              {/* SPORT PERMISSIONS SELECTOR */}
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Assigned Sports (Hard Access Enforcement)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_AVAILABLE_SPORTS.map((sport) => {
                    const isSelected = editForm.allowedSports.includes(sport.id);
                    return (
                      <button
                        type="button"
                        key={sport.id}
                        onClick={() => toggleSportInEdit(sport.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-300 font-semibold'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{sport.icon}</span>
                          <span>{sport.label}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-950/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Set Password: {resettingUser.name}</h3>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  New Password (min 6 chars) *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
