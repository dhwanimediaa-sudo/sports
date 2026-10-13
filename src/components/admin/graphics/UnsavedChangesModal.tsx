import React from 'react';
import { AlertCircle, Save, Trash2, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSaveAndProceed: () => void;
  onDiscardAndProceed: () => void;
  onCancel: () => void;
  graphicName: string;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onSaveAndProceed,
  onDiscardAndProceed,
  onCancel,
  graphicName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Unsaved Changes</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">{graphicName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-xs text-slate-300">
          <p className="leading-relaxed">
            You have unsaved changes in <strong className="text-white">"{graphicName}"</strong>. If you leave without saving, your latest edits will be discarded.
          </p>
          <p className="text-slate-400 text-[11px]">
            Would you like to save your changes before proceeding?
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDiscardAndProceed}
              className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs rounded-xl border border-rose-800 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
            <button
              type="button"
              onClick={onSaveAndProceed}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
