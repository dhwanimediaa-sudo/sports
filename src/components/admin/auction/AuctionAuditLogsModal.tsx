/**
 * SportsPulse - Auction Audit Logs Modal
 */

import React from 'react';
import { X, ShieldAlert, Clock, User, FileText } from 'lucide-react';
import { AuctionAuditLog } from '../../../types';
import { Button } from '../../ui/Button';

interface AuctionAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuctionAuditLog[];
  loading?: boolean;
}

export const AuctionAuditLogsModal: React.FC<AuctionAuditLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Auction Security & Audit Trail</h2>
              <p className="text-xs text-slate-400">Immutable ledger of every bid, stage change, sell, and admin modification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">No audit logs recorded for this auction yet.</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded text-[10px] font-bold">
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-200">{log.details}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Operator: {log.userName || 'Admin'}</span>
                      {log.entityType && <span>• Target: {log.entityType}</span>}
                    </div>
                  </div>

                  <span className="font-mono text-slate-400 text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
