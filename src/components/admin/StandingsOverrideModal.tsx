import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import {
  TournamentStandingRow,
  StandingsOverrideAuditLog,
  StandingsManualAdjustment,
} from '../../types';
import { api } from '../../services/api';
import {
  ShieldAlert,
  History,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  User,
  Clock,
  FileText,
} from 'lucide-react';

export interface StandingsOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  targetRow: TournamentStandingRow | null;
  onSuccess: () => void;
}

export const StandingsOverrideModal: React.FC<StandingsOverrideModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  targetRow,
  onSuccess,
}) => {
  const [pointsAdjustment, setPointsAdjustment] = useState<number>(0);
  const [statusOverride, setStatusOverride] = useState<'AUTO' | 'QUALIFIED' | 'ELIMINATED' | 'CONTENTION'>('AUTO');
  const [reason, setReason] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<StandingsOverrideAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targetRow) {
      setPointsAdjustment(targetRow.manualAdjustment?.pointsAdjustment || 0);
      setStatusOverride(targetRow.manualAdjustment?.qualificationStatusOverride || 'AUTO');
      setReason('');
      fetchAuditLogs();
    }
  }, [targetRow, isOpen]);

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const logs = await api.getTournamentStandingsAuditLogs(tournamentId);
      const teamLogs = (logs || []).filter((l) => l.teamId === targetRow?.teamId);
      setAuditLogs(teamLogs);
    } catch {
      setAuditLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRow) return;
    if (!reason.trim()) {
      setError('A mandatory reason is required for all manual administrative standings adjustments.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.setStandingsOverride(tournamentId, targetRow.teamId, {
        pointsAdjustment: Number(pointsAdjustment),
        qualificationStatusOverride: statusOverride,
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save manual adjustment');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!targetRow) return;
    setLoading(true);
    setError(null);

    try {
      await api.resetStandingsOverride(tournamentId, targetRow.teamId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reset manual adjustment');
    } finally {
      setLoading(false);
    }
  };

  if (!targetRow) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Standings Manual Adjustment & Audit Trail — ${targetRow.teamName}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Current State Summary */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Team Overview</span>
            <h4 className="text-sm font-bold text-slate-100">{targetRow.teamName}</h4>
            <span className="text-xs text-slate-400">
              Matches: {targetRow.played} | W: {targetRow.won} | L: {targetRow.lost} | Base Points:{' '}
              {targetRow.points - (targetRow.manualAdjustment?.pointsAdjustment || 0)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Final Standings PTS</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{targetRow.points}</span>
          </div>
        </div>

        {/* Adjustments Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Manual Points Adjustment (+ Bonus or - Penalty)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                value={pointsAdjustment}
                onChange={(e) => setPointsAdjustment(Number(e.target.value))}
                placeholder="e.g. -2 (disciplinary deduction) or 1 (fair play bonus)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Enter a positive number to add bonus points, or a negative number (e.g. -2) for disciplinary deductions.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Qualification Status Force Override
            </label>
            <select
              value={statusOverride}
              onChange={(e) => setStatusOverride(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="AUTO">Automatic (Computed dynamically by engine)</option>
              <option value="QUALIFIED">Force Status: Qualified (Q)</option>
              <option value="ELIMINATED">Force Status: Eliminated (ELIM)</option>
              <option value="CONTENTION">Force Status: In Contention</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-amber-400">
              Administrative Reason (Mandatory Audit Requirement) *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Disciplinary deduction of 2 points due to slow over-rate in Match #4"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
        </div>

        {/* Audit Log History */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Immutable Adjustment Audit History
            </h4>
          </div>

          {logsLoading ? (
            <p className="text-xs text-slate-500 py-2">Loading audit logs...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              No previous manual adjustments recorded for this team.
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-semibold text-slate-200">{log.userName}</span>
                    <span className="text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-300">
                    <strong>Action:</strong> {log.field} | <strong>Reason:</strong> {log.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {targetRow.manualAdjustment ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={loading}
              icon={<RotateCcw className="w-3.5 h-3.5 text-rose-400" />}
              className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              Reset to Automatic
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="emerald" size="sm" type="submit" disabled={loading}>
              {loading ? 'Applying Override...' : 'Apply Standings Override'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};
