/**
 * SportsPulse - Auction Player Batch Import Modal
 */

import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Sparkles, Download } from 'lucide-react';
import { Button } from '../../ui/Button';
import { AuctionPlayer } from '../../../types';

interface AuctionPlayerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (players: any[]) => Promise<void>;
  loading?: boolean;
}

const SAMPLE_PLAYERS_POOL = [
  {
    name: 'Virat Kohli',
    country: 'India',
    isOverseas: false,
    role: 'BATTER',
    category: 'ICON',
    basePrice: 20000000,
    battingStyle: 'Right Hand Bat',
    bowlingStyle: 'Right Arm Medium',
    stats: { matches: 237, runs: 7263, strikeRate: 130.0, battingAverage: 37.2 },
  },
  {
    name: 'Rohit Sharma',
    country: 'India',
    isOverseas: false,
    role: 'BATTER',
    category: 'ICON',
    basePrice: 20000000,
    battingStyle: 'Right Hand Bat',
    bowlingStyle: 'Right Arm Off Break',
    stats: { matches: 243, runs: 6211, strikeRate: 130.0, battingAverage: 29.6 },
  },
  {
    name: 'Jasprit Bumrah',
    country: 'India',
    isOverseas: false,
    role: 'BOWLER',
    category: 'MARQUEE',
    basePrice: 20000000,
    battingStyle: 'Right Hand Bat',
    bowlingStyle: 'Right Arm Fast',
    stats: { matches: 120, wickets: 145, economyRate: 7.4, strikeRate: 18.2 },
  },
  {
    name: 'Pat Cummins',
    country: 'Australia',
    isOverseas: true,
    role: 'ALL_ROUNDER',
    category: 'MARQUEE',
    basePrice: 20000000,
    battingStyle: 'Right Hand Bat',
    bowlingStyle: 'Right Arm Fast',
    stats: { matches: 42, runs: 379, wickets: 45, strikeRate: 152.0 },
  },
  {
    name: 'Mitchell Starc',
    country: 'Australia',
    isOverseas: true,
    role: 'BOWLER',
    category: 'MARQUEE',
    basePrice: 20000000,
    battingStyle: 'Left Hand Bat',
    bowlingStyle: 'Left Arm Fast',
    stats: { matches: 27, wickets: 34, economyRate: 7.16 },
  },
  {
    name: 'Heinrich Klaasen',
    country: 'South Africa',
    isOverseas: true,
    role: 'WICKET_KEEPER',
    category: 'A',
    basePrice: 15000000,
    battingStyle: 'Right Hand Bat',
    stats: { matches: 19, runs: 514, strikeRate: 177.2, battingAverage: 36.7 },
  },
  {
    name: 'Rinku Singh',
    country: 'India',
    isOverseas: false,
    role: 'BATTER',
    category: 'A',
    basePrice: 10000000,
    battingStyle: 'Left Hand Bat',
    stats: { matches: 31, runs: 725, strikeRate: 142.2, battingAverage: 36.2 },
  },
  {
    name: 'Rashid Khan',
    country: 'Afghanistan',
    isOverseas: true,
    role: 'BOWLER',
    category: 'MARQUEE',
    basePrice: 20000000,
    battingStyle: 'Right Hand Bat',
    bowlingStyle: 'Right Arm Leg Spin',
    stats: { matches: 109, wickets: 139, economyRate: 6.67 },
  },
  {
    name: 'Travis Head',
    country: 'Australia',
    isOverseas: true,
    role: 'BATTER',
    category: 'MARQUEE',
    basePrice: 20000000,
    battingStyle: 'Left Hand Bat',
    bowlingStyle: 'Right Arm Off Break',
    stats: { matches: 15, runs: 567, strikeRate: 191.5 },
  },
  {
    name: 'Shubman Gill',
    country: 'India',
    isOverseas: false,
    role: 'BATTER',
    category: 'MARQUEE',
    basePrice: 20000000,
    battingStyle: 'Right Hand Bat',
    stats: { matches: 91, runs: 2790, strikeRate: 134.1, battingAverage: 37.7 },
  },
  {
    name: 'Yashasvi Jaiswal',
    country: 'India',
    isOverseas: false,
    role: 'BATTER',
    category: 'A',
    basePrice: 10000000,
    battingStyle: 'Left Hand Bat',
    bowlingStyle: 'Right Arm Leg Spin',
    stats: { matches: 37, runs: 1172, strikeRate: 148.5, battingAverage: 32.6 },
  },
  {
    name: 'Andre Russell',
    country: 'West Indies',
    isOverseas: true,
    role: 'ALL_ROUNDER',
    category: 'MARQUEE',
    basePrice: 20000000,
    battingStyle: 'Right Hand Bat',
    bowlingStyle: 'Right Arm Fast',
    stats: { matches: 112, runs: 2262, wickets: 96, strikeRate: 174.0 },
  },
  {
    name: 'Kuldeep Yadav',
    country: 'India',
    isOverseas: false,
    role: 'BOWLER',
    category: 'A',
    basePrice: 10000000,
    battingStyle: 'Left Hand Bat',
    bowlingStyle: 'Left Arm Chinaman',
    stats: { matches: 73, wickets: 71, economyRate: 8.1 },
  },
  {
    name: 'Sanju Samson',
    country: 'India',
    isOverseas: false,
    role: 'WICKET_KEEPER',
    category: 'MARQUEE',
    basePrice: 20000000,
    battingStyle: 'Right Hand Bat',
    stats: { matches: 152, runs: 3888, strikeRate: 137.2, battingAverage: 29.2 },
  },
  {
    name: 'Nicholas Pooran',
    country: 'West Indies',
    isOverseas: true,
    role: 'WICKET_KEEPER',
    category: 'A',
    basePrice: 15000000,
    battingStyle: 'Left Hand Bat',
    stats: { matches: 62, runs: 1270, strikeRate: 156.8 },
  },
  {
    name: 'Mayank Yadav',
    country: 'India',
    isOverseas: false,
    role: 'BOWLER',
    category: 'EMERGING',
    basePrice: 3000000,
    battingStyle: 'Right Hand Bat',
    bowlingStyle: 'Right Arm Express Fast (156kph)',
    stats: { matches: 4, wickets: 7, economyRate: 6.9 },
  },
];

export const AuctionPlayerImportModal: React.FC<AuctionPlayerImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  loading = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParseCsvOrJson = (rawText: string) => {
    setError(null);
    if (!rawText.trim()) {
      setParsedPlayers([]);
      return;
    }

    try {
      // 1. Try JSON first
      if (rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        setParsedPlayers(list);
        return;
      }

      // 2. Try CSV Parsing
      const lines = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length < 1) {
        setParsedPlayers([]);
        return;
      }

      const headerLine = lines[0].toLowerCase();
      let hasHeader = false;
      if (
        headerLine.includes('name') ||
        headerLine.includes('player') ||
        headerLine.includes('role') ||
        headerLine.includes('country')
      ) {
        hasHeader = true;
      }

      const rows = hasHeader ? lines.slice(1) : lines;
      const headers = hasHeader
        ? lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[\"\']/g, ''))
        : ['name', 'country', 'role', 'category', 'baseprice'];

      const result = rows.map((row) => {
        const cols = row.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          if (cols[idx] !== undefined) {
            if (h === 'name' || h === 'playername' || h === 'player') obj.name = cols[idx];
            else if (h === 'country' || h === 'nation') obj.country = cols[idx];
            else if (h === 'role' || h === 'playerrole') obj.role = cols[idx].toUpperCase();
            else if (h === 'category' || h === 'set') obj.category = cols[idx].toUpperCase();
            else if (h === 'baseprice' || h === 'price' || h === 'base') {
              const num = Number(cols[idx].replace(/[^0-9.]/g, ''));
              obj.basePrice = num > 10000 ? num : num * 100000; // auto-adjust if Lakhs
            } else if (h === 'overseas' || h === 'isoverseas') {
              obj.isOverseas = cols[idx].toLowerCase() === 'true' || cols[idx].toLowerCase() === 'yes';
            }
          }
        });

        // Default name if missing
        if (!obj.name && cols[0]) obj.name = cols[0];
        if (!obj.country) obj.country = 'India';
        if (obj.isOverseas === undefined) obj.isOverseas = obj.country.toLowerCase() !== 'india';
        if (!obj.role) obj.role = 'BATTER';
        if (!obj.category) obj.category = 'UNCAPPED';
        if (!obj.basePrice) obj.basePrice = 2000000;

        return obj;
      });

      setParsedPlayers(result.filter((p) => p.name && p.name.trim().length > 0));
    } catch (err: any) {
      setError(`Parsing error: ${err.message}`);
      setParsedPlayers([]);
    }
  };

  const handleLoadSampleRoster = () => {
    setParsedPlayers(SAMPLE_PLAYERS_POOL);
    setInputText(JSON.stringify(SAMPLE_PLAYERS_POOL, null, 2));
    setError(null);
  };

  const handleConfirmImport = async () => {
    if (parsedPlayers.length === 0) {
      setError('Please load or paste players before importing.');
      return;
    }
    try {
      await onImport(parsedPlayers);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Batch Import Players</h2>
              <p className="text-xs text-slate-400">Import player pool via CSV, JSON, or pre-built sample roster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-300">
              Paste CSV or JSON below, or load the pre-built IPL Star Roster:
            </div>
            <button
              type="button"
              onClick={handleLoadSampleRoster}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load IPL Star Roster (16 Players)
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              CSV Format (name, country, role, category, basePrice):
            </label>
            <textarea
              rows={4}
              placeholder="Virat Kohli, India, BATTER, ICON, 20000000&#10;Pat Cummins, Australia, ALL_ROUNDER, MARQUEE, 20000000"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                handleParseCsvOrJson(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Parsed Preview Table */}
          {parsedPlayers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Ready to Import ({parsedPlayers.length} Players Detected):
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {parsedPlayers.filter((p) => p.isOverseas).length} Overseas /{' '}
                  {parsedPlayers.filter((p) => !p.isOverseas).length} Domestic
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold sticky top-0">
                    <tr>
                      <th className="p-2 pl-3">#</th>
                      <th className="p-2">Player Name</th>
                      <th className="p-2">Country</th>
                      <th className="p-2">Role</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-right pr-3">Base Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {parsedPlayers.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2 pl-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2 font-medium text-slate-100">{p.name}</td>
                        <td className="p-2 text-slate-300">
                          {p.country}{' '}
                          {p.isOverseas && <span className="text-[10px] text-rose-400 font-semibold">(OS)</span>}
                        </td>
                        <td className="p-2 text-slate-300">{p.role}</td>
                        <td className="p-2 text-slate-300">{p.category}</td>
                        <td className="p-2 text-right pr-3 font-mono text-emerald-400">
                          ₹{((p.basePrice || 2000000) / 100000).toFixed(0)} Lakh
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedPlayers.length === 0}
            loading={loading}
            icon={<Upload className="w-4 h-4" />}
          >
            Import {parsedPlayers.length} Players
          </Button>
        </div>
      </div>
    </div>
  );
};
