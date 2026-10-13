import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Group } from '../../types';
import { api } from '../../services/api';
import { Layers, Hash, CheckCircle2, AlertCircle } from 'lucide-react';

export interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  group?: Group | null;
  onSuccess: (savedGroup: Group, isEdit: boolean) => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  group,
  onSuccess,
}) => {
  const isEdit = Boolean(group?.id);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [maxTeams, setMaxTeams] = useState('10');
  const [qualificationRules, setQualificationRules] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name || '');
      setCode(group.code || '');
      setDescription(group.description || '');
      setMaxTeams(group.maxTeams?.toString() || '10');
      setQualificationRules(group.qualificationRules || '');
      setStatus(group.status || 'ACTIVE');
    } else {
      setName('');
      setCode('');
      setDescription('');
      setMaxTeams('10');
      setQualificationRules('');
      setStatus('ACTIVE');
    }
    setError(null);
  }, [group, isOpen]);

  const handleRequestClose = () => {
    const isDirty = group
      ? name !== (group.name || '') || description !== (group.description || '')
      : Boolean(name.trim() || description.trim());

    if (isDirty) {
      if (window.confirm('You have unsaved changes in this group. Discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Group Name is required (e.g. Group A).');
      return;
    }

    try {
      setLoading(true);
      const payload: Partial<Group> = {
        tournamentId,
        name: name.trim(),
        code: code.trim() || name.trim().charAt(0).toUpperCase(),
        description: description.trim(),
        maxTeams: Number(maxTeams) || 10,
        qualificationRules: qualificationRules.trim(),
        status,
      };

      if (isEdit && group) {
        const res = await api.updateGroup(group.id, payload);
        onSuccess(res.group, true);
      } else {
        const res = await api.createGroup(payload);
        onSuccess(res.group, false);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleRequestClose}
      title={isEdit ? 'EDIT GROUP' : 'CREATE GROUP'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Group Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Group A, Pool B, Zone North"
          icon={<Layers className="w-4 h-4" />}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Group Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. A"
            icon={<Hash className="w-4 h-4" />}
          />

          <Input
            label="Max Teams Capacity"
            type="number"
            min="2"
            max="64"
            value={maxTeams}
            onChange={(e) => setMaxTeams(e.target.value)}
            placeholder="10"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Qualification / Advancement Rules
          </label>
          <input
            type="text"
            value={qualificationRules}
            onChange={(e) => setQualificationRules(e.target.value)}
            placeholder="e.g. Top 2 teams advance to Semi-Finals"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional notes for this group stage..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={handleRequestClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="emerald"
            size="sm"
            type="submit"
            loading={loading}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isEdit ? 'SAVE CHANGES' : 'SAVE GROUP'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
