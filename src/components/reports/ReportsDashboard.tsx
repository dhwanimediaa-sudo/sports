import React, { useState, useEffect } from 'react';
import { Match } from '../../types';
import { api } from '../../services/api';
import { MatchReportView } from './MatchReportView';
import {
  FileText,
  Search,
  Calendar,
  MapPin,
  Trophy,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Lock,
  Unlock,
  Printer,
  FileBarChart,
} from 'lucide-react';

export const ReportsDashboard: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMatches();
      setMatches(res.matches || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  if (selectedMatchId) {
    return (
      <div>
        <button
          onClick={() => setSelectedMatchId(null)}
          className="mb-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-2 transition border border-slate-700"
        >
          ← Back to Reports Catalog
        </button>
        <MatchReportView matchId={selectedMatchId} onClose={() => setSelectedMatchId(null)} />
      </div>
    );
  }

  const filteredMatches = matches.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.teamA?.name?.toLowerCase().includes(q) ||
      m.teamB?.name?.toLowerCase().includes(q) ||
      m.tournament?.name?.toLowerCase().includes(q) ||
      m.venue?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FileBarChart className="w-4 h-4" />
            <span>Cricket Reporting & Statistics Engine</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Match Reports & Scorecards</h1>
          <p className="text-xs text-slate-400 mt-1">
            Derived directly from immutable ball-by-ball scoring events. Generates complete scorecards, awards & statistics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500 w-56"
            />
          </div>

          <button
            onClick={loadMatches}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh Catalog"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reports List Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto text-emerald-400" />
          <p className="text-xs text-slate-400 font-medium">Loading match reports catalog...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/40 border border-red-800 text-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Match Reports Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No matches match your filter criteria or no matches have been created yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedMatchId(m.id)}
              className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition cursor-pointer group shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 bg-slate-950 text-slate-400 text-[10px] font-bold uppercase rounded-full border border-slate-800">
                    {m.tournament?.name || 'Cricket Match'}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      m.status === 'COMPLETED'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition">
                  {m.teamA?.name || 'Team A'} vs {m.teamB?.name || 'Team B'}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-400 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{m.date} at {m.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{m.venue || 'Main Stadium'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>View Complete Match Report & Scorecard</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
