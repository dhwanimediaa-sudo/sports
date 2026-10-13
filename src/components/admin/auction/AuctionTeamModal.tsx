/**
 * SportsPulse - Create & Edit Auction Team Modal
 */

import React, { useState, useEffect } from 'react';
import { X, Shield, DollarSign, UserCheck, Users, Palette } from 'lucide-react';
import { AuctionTeam, AuctionCurrency } from '../../../types';
import { Button } from '../../ui/Button';

interface AuctionTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AuctionTeam>) => Promise<void>;
  initialTeam?: AuctionTeam | null;
  defaultStartingPurse?: number;
  currency?: AuctionCurrency;
  loading?: boolean;
}

export const AuctionTeamModal: React.FC<AuctionTeamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTeam,
  defaultStartingPurse = 100000000,
  currency = 'INR',
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [logo, setLogo] = useState('');
  const [color, setColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [ownerName, setOwnerName] = useState('');
  const [coach, setCoach] = useState('');
  const [manager, setManager] = useState('');
  const [startingPurseCr, setStartingPurseCr] = useState('10');
  const [maxSquadSize, setMaxSquadSize] = useState('25');
  const [minSquadSize, setMinSquadSize] = useState('15');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTeam) {
      setName(initialTeam.name);
      setShortCode(initialTeam.shortCode);
      setLogo(initialTeam.logo || '');
      setColor(initialTeam.color || '#10b981');
      setSecondaryColor(initialTeam.secondaryColor || '#0f172a');
      setOwnerName(initialTeam.ownerName || '');
      setCoach(initialTeam.coach || '');
      setManager(initialTeam.manager || '');
      const purseMultiplier = currency === 'INR' ? 10000000 : 1000000;
      setStartingPurseCr((initialTeam.startingPurse / purseMultiplier).toString());
      setMaxSquadSize((initialTeam.maxSquadSize || 25).toString());
      setMinSquadSize((initialTeam.minSquadSize || 15).toString());
    } else {
      setName('');
      setShortCode('');
      setLogo('');
      setColor('#10b981');
      setSecondaryColor('#0f172a');
      setOwnerName('');
      setCoach('');
      setManager('');
      const purseMultiplier = currency === 'INR' ? 10000000 : 1000000;
      setStartingPurseCr((defaultStartingPurse / purseMultiplier).toString());
      setMaxSquadSize('25');
      setMinSquadSize('15');
    }
    setError(null);
  }, [initialTeam, isOpen, defaultStartingPurse, currency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a team name.');
      return;
    }

    const purseMultiplier = currency === 'INR' ? 10000000 : 1000000;
    const finalPurse = Math.round(Number(startingPurseCr) * purseMultiplier) || defaultStartingPurse;

    try {
      await onSave({
        name: name.trim(),
        shortCode: (shortCode || name.substring(0, 3)).trim().toUpperCase(),
        logo: logo.trim(),
        color,
        secondaryColor,
        ownerName: ownerName.trim(),
        coach: coach.trim(),
        manager: manager.trim(),
        startingPurse: finalPurse,
        maxSquadSize: Number(maxSquadSize) || 25,
        minSquadSize: Number(minSquadSize) || 15,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save team.');
    }
  };

  const presetColors = [
    '#eab308', // Yellow (CSK)
    '#2563eb', // Blue (MI/DC)
    '#dc2626', // Red (RCB/PBKS)
    '#7c3aed', // Purple (KKR)
    '#ec4899', // Pink (RR)
    '#0d9488', // Teal (GT)
    '#f97316', // Orange (SRH)
    '#06b6d4', // Cyan (LSG)
    '#10b981', // Emerald
    '#64748b', // Slate
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm"
              style={{ backgroundColor: `${color}20`, borderColor: `${color}60`, color: color }}
            >
              {shortCode || <Shield className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {initialTeam ? 'Edit Auction Team' : 'Add Auction Team'}
              </h2>
              <p className="text-xs text-slate-400">Independent franchise purse, logo & roster configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Team Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chennai Super Kings"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!shortCode && e.target.value.length >= 3) {
                      setShortCode(e.target.value.substring(0, 3).toUpperCase());
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Code (3-4 Chars) <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="e.g. CSK"
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Team Logo URL</label>
              <input
                type="text"
                placeholder="https://example.com/csk-logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Team Primary Color & Presets */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                Team Brand Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-700 p-0.5"
                />
                <div className="flex flex-wrap gap-1.5">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border transition-transform ${
                        color === c ? 'scale-125 border-white shadow-lg' : 'border-slate-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Purse & Limits */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Initial Purse {currency === 'INR' ? '(in Crores)' : '(in Millions)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={startingPurseCr}
                      onChange={(e) => setStartingPurseCr(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 pl-9"
                    />
                    <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Max Squad Size</label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={maxSquadSize}
                    onChange={(e) => setMaxSquadSize(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Owner & Coach */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Franchise Owner</label>
                <input
                  type="text"
                  placeholder="e.g. India Cements"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Head Coach</label>
                <input
                  type="text"
                  placeholder="e.g. Stephen Fleming"
                  value={coach}
                  onChange={(e) => setCoach(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Manager</label>
                <input
                  type="text"
                  placeholder="e.g. Russell Radhakrishnan"
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading} icon={<Shield className="w-4 h-4" />}>
              {initialTeam ? 'Update Team' : 'Save Team'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
