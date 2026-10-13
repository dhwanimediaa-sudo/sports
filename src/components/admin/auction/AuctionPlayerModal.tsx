/**
 * SportsPulse - Create & Edit Auction Player Modal
 */

import React, { useState, useEffect } from 'react';
import { X, User, DollarSign, Award, Globe, Activity, Image as ImageIcon } from 'lucide-react';
import { AuctionPlayer, PlayerCategory, AuctionCurrency } from '../../../types';
import { Button } from '../../ui/Button';

interface AuctionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AuctionPlayer>) => Promise<void>;
  initialPlayer?: AuctionPlayer | null;
  currency?: AuctionCurrency;
  loading?: boolean;
}

export const AuctionPlayerModal: React.FC<AuctionPlayerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPlayer,
  currency = 'INR',
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [country, setCountry] = useState('India');
  const [isOverseas, setIsOverseas] = useState(false);
  const [age, setAge] = useState('27');
  const [role, setRole] = useState('BATTER');
  const [primarySkill, setPrimarySkill] = useState('');
  const [secondarySkill, setSecondarySkill] = useState('');
  const [battingStyle, setBattingStyle] = useState('Right Hand Bat');
  const [bowlingStyle, setBowlingStyle] = useState('Right Arm Fast-Medium');
  const [basePriceLakh, setBasePriceLakh] = useState('20'); // in Lakhs (or thousands in USD)
  const [category, setCategory] = useState<PlayerCategory>('UNCAPPED');
  const [orderNumber, setOrderNumber] = useState('1');
  const [playerNumber, setPlayerNumber] = useState('');
  const [previousTeam, setPreviousTeam] = useState('');
  const [biography, setBiography] = useState('');

  // Stats
  const [matches, setMatches] = useState('');
  const [runs, setRuns] = useState('');
  const [wickets, setWickets] = useState('');
  const [battingAverage, setBattingAverage] = useState('');
  const [strikeRate, setStrikeRate] = useState('');
  const [economyRate, setEconomyRate] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlayer) {
      setName(initialPlayer.name);
      setPhoto(initialPlayer.photo || '');
      setCountry(initialPlayer.country || 'India');
      setIsOverseas(Boolean(initialPlayer.isOverseas));
      setAge(initialPlayer.age ? initialPlayer.age.toString() : '');
      setRole(initialPlayer.role || 'BATTER');
      setPrimarySkill(initialPlayer.primarySkill || '');
      setSecondarySkill(initialPlayer.secondarySkill || '');
      setBattingStyle(initialPlayer.battingStyle || 'Right Hand Bat');
      setBowlingStyle(initialPlayer.bowlingStyle || '');
      const divisor = currency === 'INR' ? 100000 : 1000;
      setBasePriceLakh((initialPlayer.basePrice / divisor).toString());
      setCategory(initialPlayer.category || 'UNCAPPED');
      setOrderNumber((initialPlayer.orderNumber || 1).toString());
      setPlayerNumber(initialPlayer.playerNumber?.toString() || '');
      setPreviousTeam(initialPlayer.previousTeam || '');
      setBiography(initialPlayer.biography || '');

      setMatches(initialPlayer.stats?.matches?.toString() || '');
      setRuns(initialPlayer.stats?.runs?.toString() || '');
      setWickets(initialPlayer.stats?.wickets?.toString() || '');
      setBattingAverage(initialPlayer.stats?.battingAverage?.toString() || '');
      setStrikeRate(initialPlayer.stats?.strikeRate?.toString() || '');
      setEconomyRate(initialPlayer.stats?.economyRate?.toString() || '');
    } else {
      setName('');
      setPhoto('');
      setCountry('India');
      setIsOverseas(false);
      setAge('25');
      setRole('BATTER');
      setPrimarySkill('');
      setSecondarySkill('');
      setBattingStyle('Right Hand Bat');
      setBowlingStyle('');
      setBasePriceLakh('20');
      setCategory('UNCAPPED');
      setOrderNumber('1');
      setPlayerNumber('');
      setPreviousTeam('');
      setBiography('');

      setMatches('');
      setRuns('');
      setWickets('');
      setBattingAverage('');
      setStrikeRate('');
      setEconomyRate('');
    }
    setError(null);
  }, [initialPlayer, isOpen, currency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a player name.');
      return;
    }

    const multiplier = currency === 'INR' ? 100000 : 1000;
    const finalBasePrice = Math.round(Number(basePriceLakh) * multiplier) || (currency === 'INR' ? 2000000 : 20000);

    try {
      await onSave({
        name: name.trim(),
        photo: photo.trim(),
        country: country.trim(),
        nationality: country.trim(),
        isOverseas,
        age: age ? Number(age) : undefined,
        role,
        primarySkill: primarySkill.trim(),
        secondarySkill: secondarySkill.trim(),
        battingStyle,
        bowlingStyle,
        basePrice: finalBasePrice,
        category,
        orderNumber: Number(orderNumber) || 1,
        playerNumber: playerNumber ? playerNumber.trim() : undefined,
        previousTeam: previousTeam.trim(),
        biography: biography.trim(),
        stats: {
          matches: matches ? Number(matches) : undefined,
          runs: runs ? Number(runs) : undefined,
          wickets: wickets ? Number(wickets) : undefined,
          battingAverage: battingAverage ? Number(battingAverage) : undefined,
          strikeRate: strikeRate ? Number(strikeRate) : undefined,
          economyRate: economyRate ? Number(economyRate) : undefined,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save player.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {initialPlayer ? 'Edit Auction Player' : 'Add Player to Auction Pool'}
              </h2>
              <p className="text-xs text-slate-400">Profile, role, skills, base price, category & stats</p>
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
                  Player Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Virat Kohli / Ben Stokes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Jersey #</label>
                <input
                  type="text"
                  placeholder="e.g. 18"
                  value={playerNumber}
                  onChange={(e) => setPlayerNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="BATTER">Batter</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="ALL_ROUNDER">All-Rounder</option>
                  <option value="WICKET_KEEPER">Wicketkeeper-Batter</option>
                  <option value="FORWARD">Forward</option>
                  <option value="DEFENDER">Defender</option>
                  <option value="RAIDER">Raider</option>
                  <option value="SETTER">Setter</option>
                  <option value="LIBERO">Libero</option>
                  <option value="OTHER">Other Role</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Auction Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PlayerCategory)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="ICON">Icon Player</option>
                  <option value="MARQUEE">Marquee Set (Set 1)</option>
                  <option value="A">Grade A (Capped)</option>
                  <option value="B">Grade B (Capped)</option>
                  <option value="C">Grade C</option>
                  <option value="EMERGING">Emerging Talent</option>
                  <option value="UNCAPPED">Uncapped Indian</option>
                  <option value="OVERSEAS">Overseas Specialist</option>
                  <option value="LOCAL">Local / State</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Base Price {currency === 'INR' ? '(in Lakhs)' : '(in $k)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={basePriceLakh}
                    onChange={(e) => setBasePriceLakh(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 pl-8"
                  />
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {currency === 'INR'
                    ? `₹${Number(basePriceLakh) || 20} Lakh = ₹${((Number(basePriceLakh) || 20) * 100000).toLocaleString('en-IN')}`
                    : `$${Number(basePriceLakh) || 20}k`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Country</label>
                <input
                  type="text"
                  placeholder="e.g. India / Australia"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (e.target.value.trim().toLowerCase() !== 'india') {
                      setIsOverseas(true);
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="relative flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={isOverseas}
                    onChange={(e) => setIsOverseas(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:outline-none bg-slate-950 border-slate-700"
                  />
                  <span>Is Overseas Player?</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Age</label>
                <input
                  type="number"
                  placeholder="e.g. 26"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Batting Style</label>
                <input
                  type="text"
                  placeholder="e.g. Right Hand Bat / Left Hand Bat"
                  value={battingStyle}
                  onChange={(e) => setBattingStyle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bowling Style</label>
                <input
                  type="text"
                  placeholder="e.g. Right Arm Fast / Leg Break Googly"
                  value={bowlingStyle}
                  onChange={(e) => setBowlingStyle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Player Photo URL</label>
              <input
                type="text"
                placeholder="https://example.com/players/virat.png"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Career Statistics Block */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Player Career Statistics (Displayed on Broadcast Card)
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Matches</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={matches}
                    onChange={(e) => setMatches(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Runs</label>
                  <input
                    type="number"
                    placeholder="4200"
                    value={runs}
                    onChange={(e) => setRuns(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Wickets</label>
                  <input
                    type="number"
                    placeholder="85"
                    value={wickets}
                    onChange={(e) => setWickets(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bat Avg</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="38.5"
                    value={battingAverage}
                    onChange={(e) => setBattingAverage(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Strike Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="145.2"
                    value={strikeRate}
                    onChange={(e) => setStrikeRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Order #</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading} icon={<User className="w-4 h-4" />}>
              {initialPlayer ? 'Update Player' : 'Add Player'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
