import React, { useState, useEffect } from 'react';
import { BroadcastAuditLog } from '../../types';
import { api } from '../../services/api';
import { History, RefreshCw, Search, CheckCircle2, XCircle, ShieldCheck, Zap, User } from 'lucide-react';

interface BroadcastAuditLogViewProps {
  matchId?: string;
}

export const BroadcastAuditLogView: React.FC<BroadcastAuditLogViewProps> = ({ matchId }) => {
  const [logs, setLogs] = useState<BroadcastAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getBroadcastAuditLogs(matchId);
      setLogs(res.auditLogs || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'ALL' && !log.action.includes(actionFilter)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.graphicOrSceneName && log.graphicOrSceneName.toLowerCase().includes(q)) ||
      (log.operatorName && log.operatorName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 font-mono shadow-xl space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            BROADCAST AUDIT & OPERATIONS LOG ({filteredLogs.length})
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Actions</option>
            <option value="TAKE">TAKE LIVE</option>
            <option value="CLEAR">CLEAR PGM</option>
            <option value="HOLD">HOLD / PAUSE</option>
            <option value="CONFLICT">CONFLICTS</option>
            <option value="LOCK">OPERATOR LOCK</option>
            <option value="KILL">EMERGENCY KILL</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Table / List */}
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            {loading ? 'Loading audit records...' : 'No broadcast actions logged yet.'}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                <th className="py-2 px-2">Time</th>
                <th className="py-2 px-2">Action</th>
                <th className="py-2 px-2">Graphic / Scene / Target</th>
                <th className="py-2 px-2">Details</th>
                <th className="py-2 px-2">Operator</th>
                <th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                let actionBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                if (log.action.includes('TAKE')) {
                  actionBadgeColor = 'bg-red-950/80 text-red-300 border-red-800';
                } else if (log.action.includes('CLEAR')) {
                  actionBadgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
                } else if (log.action.includes('HOLD')) {
                  actionBadgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800';
                } else if (log.action.includes('CONFLICT') || log.action.includes('INTERRUPT')) {
                  actionBadgeColor = 'bg-purple-950/80 text-purple-300 border-purple-800';
                } else if (log.action.includes('KILL')) {
                  actionBadgeColor = 'bg-rose-950 text-rose-300 border-rose-800';
                } else if (log.action.includes('LOCK')) {
                  actionBadgeColor = 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
                }

                return (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2 px-2 text-slate-400 whitespace-nowrap text-[11px]">{dateStr}</td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionBadgeColor}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-white font-bold max-w-[160px] truncate">
                      {log.graphicOrSceneName || '-'}
                    </td>
                    <td className="py-2 px-2 text-slate-300 max-w-[280px] truncate" title={log.details}>
                      {log.details || '-'}
                    </td>
                    <td className="py-2 px-2 text-slate-400 whitespace-nowrap text-[11px]">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {log.operatorName || 'System'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      {log.result === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-bold">
                          <XCircle className="w-3 h-3" /> FAILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
