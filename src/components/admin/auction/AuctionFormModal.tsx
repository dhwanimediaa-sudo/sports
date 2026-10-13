/**
 * SportsPulse - Create & Edit Auction Modal
 */

import React, { useState, useEffect } from 'react';
import { X, Gavel, DollarSign, Users, Clock, Sparkles, Building2, Calendar, Award } from 'lucide-react';
import { Auction, AuctionCurrency, AuctionType, AuctionStatus } from '../../../types';
import { Button } from '../../ui/Button';

interface AuctionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Auction>) => Promise<void>;
  initialAuction?: Auction | null;
  loading?: boolean;
}

export const AuctionFormModal: React.FC<AuctionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAuction,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [season, setSeason] = useState('2026');
  const [sport, setSport] = useState('CRICKET');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('14:00');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [auctionType, setAuctionType] = useState<AuctionType>('CRICKET_IPL');
  const [currency, setCurrency] = useState<AuctionCurrency>('INR');
  const [startingPurseCr, setStartingPurseCr] = useState('10'); // in Crores (or millions for USD)
  const [maxSquadSize, setMaxSquadSize] = useState('25');
  const [minSquadSize, setMinSquadSize] = useState('15');
  const [maxOverseasPlayers, setMaxOverseasPlayers] = useState('8');
  const [timerDurationSeconds, setTimerDurationSeconds] = useState('15');
  const [status, setStatus] = useState<AuctionStatus>('DRAFT');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLogo, setSponsorLogo] = useState('');
  const [bannerLogo, setBannerLogo] = useState('');
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'BUDGET' | 'TIMER' | 'BRANDING'>('GENERAL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAuction) {
      setName(initialAuction.name);
      setSeason(initialAuction.season || '2026');
      setSport(initialAuction.sport || 'CRICKET');
      setDate(initialAuction.date || new Date().toISOString().split('T')[0]);
      setStartTime(initialAuction.startTime || '14:00');
      setVenue(initialAuction.venue || '');
      setDescription(initialAuction.description || '');
      setAuctionType(initialAuction.auctionType || 'CRICKET_IPL');
      setCurrency(initialAuction.currency || 'INR');
      const purseCr = (initialAuction.startingPurse / (initialAuction.currency === 'INR' ? 10000000 : 1000000)).toString();
      setStartingPurseCr(purseCr);
      setMaxSquadSize(initialAuction.maxSquadSize.toString());
      setMinSquadSize(initialAuction.minSquadSize.toString());
      setMaxOverseasPlayers(initialAuction.maxOverseasPlayers.toString());
      setTimerDurationSeconds((initialAuction.timerDurationSeconds || 15).toString());
      setStatus(initialAuction.status || 'DRAFT');
      setSponsorName(initialAuction.sponsorName || '');
      setSponsorLogo(initialAuction.sponsorLogo || '');
      setBannerLogo(initialAuction.bannerLogo || '');
    } else {
      setName('');
      setSeason('2026');
      setSport('CRICKET');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('14:00');
      setVenue('');
      setDescription('');
      setAuctionType('CRICKET_IPL');
      setCurrency('INR');
      setStartingPurseCr('10');
      setMaxSquadSize('25');
      setMinSquadSize('15');
      setMaxOverseasPlayers('8');
      setTimerDurationSeconds('15');
      setStatus('DRAFT');
      setSponsorName('');
      setSponsorLogo('');
      setBannerLogo('');
    }
    setError(null);
  }, [initialAuction, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an auction name.');
      return;
    }

    const purseMultiplier = currency === 'INR' ? 10000000 : 1000000;
    const finalPurse = Math.round(Number(startingPurseCr) * purseMultiplier) || (currency === 'INR' ? 100000000 : 10000000);

    try {
      await onSave({
        name: name.trim(),
        season: season.trim(),
        sport,
        date,
        startTime,
        venue: venue.trim(),
        description: description.trim(),
        auctionType,
        currency,
        startingPurse: finalPurse,
        maxSquadSize: Number(maxSquadSize) || 25,
        minSquadSize: Number(minSquadSize) || 15,
        maxOverseasPlayers: Number(maxOverseasPlayers) || 8,
        timerDurationSeconds: Number(timerDurationSeconds) || 15,
        status,
        sponsorName: sponsorName.trim(),
        sponsorLogo: sponsorLogo.trim(),
        bannerLogo: bannerLogo.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save auction.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {initialAuction ? 'Edit Auction Configuration' : 'Create Professional Player Auction'}
              </h2>
              <p className="text-xs text-slate-400">IPL-style standalone live player bidding & broadcast system</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            className={`pb-3 px-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'GENERAL'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            General Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BUDGET')}
            className={`pb-3 px-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'BUDGET'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Budget & Squad Limits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TIMER')}
            className={`pb-3 px-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'TIMER'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Timer & Increments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BRANDING')}
            className={`pb-3 px-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'BRANDING'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Branding & Sponsors
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            {/* TAB: GENERAL */}
            {activeTab === 'GENERAL' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Auction Title <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premier Super League 2026 Mega Player Auction"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Season / Edition</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026 (Season 8)"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Sport Type</label>
                    <select
                      value={sport}
                      onChange={(e) => setSport(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="CRICKET">Cricket (IPL-Style)</option>
                      <option value="FOOTBALL">Football / Soccer</option>
                      <option value="KABADDI">Kabaddi</option>
                      <option value="VOLLEYBALL">Volleyball</option>
                      <option value="BASKETBALL">Basketball</option>
                      <option value="HOCKEY">Hockey</option>
                      <option value="OTHER">Multi-Sport / Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Auction Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as AuctionStatus)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="READY">Ready to Launch</option>
                      <option value="LIVE">Live Bidding Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Venue / City</label>
                    <input
                      type="text"
                      placeholder="e.g. Grand Ballroom, Mumbai"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Auction Overview / Rules Note</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the auction format, marquee sets, retention rules..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* TAB: BUDGET */}
            {activeTab === 'BUDGET' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as AuctionCurrency)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="INR">INR (₹ - Crores & Lakhs)</option>
                      <option value="USD">USD ($ - Millions & Thousands)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (Dirhams)</option>
                      <option value="AUD">AUD (A$)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Starting Team Purse {currency === 'INR' ? '(in Crores)' : '(in Millions)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={startingPurseCr}
                        onChange={(e) => setStartingPurseCr(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 pl-10"
                      />
                      <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {currency === 'INR'
                        ? `₹${Number(startingPurseCr) || 10} Crore = ₹${((Number(startingPurseCr) || 10) * 10000000).toLocaleString('en-IN')}`
                        : `$${Number(startingPurseCr) || 10} Million`}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Squad Composition Limits
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Max Squad Size</label>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={maxSquadSize}
                        onChange={(e) => setMaxSquadSize(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Default: 25 players</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Min Squad Size</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={minSquadSize}
                        onChange={(e) => setMinSquadSize(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Default: 15 players</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Max Overseas Players</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={maxOverseasPlayers}
                        onChange={(e) => setMaxOverseasPlayers(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">IPL standard: 8 overseas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TIMER */}
            {activeTab === 'TIMER' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Bidding Countdown Timer (Seconds)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={timerDurationSeconds}
                        onChange={(e) => setTimerDurationSeconds(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 pl-10"
                      />
                      <Clock className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                    </div>
                    <div className="flex gap-2">
                      {['10', '15', '20', '30'].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setTimerDurationSeconds(sec)}
                          className={`px-3 py-2 text-xs rounded-xl font-medium border ${
                            timerDurationSeconds === sec
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Timer automatically resets to this value whenever a new valid bid is placed.
                  </span>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Standard IPL Bidding Slabs Active
                  </h4>
                  <div className="text-xs text-slate-400 space-y-1.5 font-mono bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between">
                      <span>• ₹0 to ₹10 Lakh:</span> <span className="text-emerald-400">+₹50,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• ₹10 Lakh to ₹50 Lakh:</span> <span className="text-emerald-400">+₹1 Lakh</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• ₹50 Lakh to ₹1 Crore:</span> <span className="text-emerald-400">+₹2 Lakh</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• ₹1 Crore to ₹2 Crore:</span> <span className="text-emerald-400">+₹5 Lakh</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• ₹2 Crore to ₹5 Crore:</span> <span className="text-emerald-400">+₹10 Lakh</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• ₹5 Crore to ₹10 Crore:</span> <span className="text-emerald-400">+₹25 Lakh</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• ₹10 Crore+:</span> <span className="text-emerald-400">+₹50 Lakh</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BRANDING */}
            {activeTab === 'BRANDING' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Title Sponsor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. TATA / Dream11 / Pepsi"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sponsor Logo URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/sponsor-logo.png"
                    value={sponsorLogo}
                    onChange={(e) => setSponsorLogo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Auction Banner / League Logo URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/league-auction-logo.png"
                    value={bannerLogo}
                    onChange={(e) => setBannerLogo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading} icon={<Gavel className="w-4 h-4" />}>
              {initialAuction ? 'Save Changes' : 'Create Auction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
