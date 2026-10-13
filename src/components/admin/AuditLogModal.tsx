import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { AuditLog } from '../../types';
import { api } from '../../services/api';
import { ShieldCheck, Search, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';
import { Spinner } from '../ui/LoadingState';

export interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs(100);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatTimestamp = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });
    } catch {
      return isoStr;
    }
  };

  const getBadgeStyle = (action: AuditLog['action']) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'LOGOUT':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'PASSWORD_CHANGE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'PROFILE_UPDATE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'SECURITY_ALERT':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="System Audit & Security Logs"
      subtitle="Complete activity trail recording system authentication and admin configuration"
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Search & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, email, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors focus:outline-none cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <Spinner size="md" className="py-12" />
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No audit log entries matching search criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300 whitespace-nowrap">
                      {log.userEmail || 'System'}
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Dialog>
  );
};
