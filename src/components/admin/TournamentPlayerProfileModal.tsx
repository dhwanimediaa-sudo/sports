import React, { useEffect, useState } from 'react';
import {
  X,
  Trophy,
  Award,
  TrendingUp,
  User,
  Shield,
  Zap,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { TournamentPlayerProfileData } from '../../types';
import { api } from '../../services/api';

interface TournamentPlayerProfileModalProps {
  tournamentId: string;
  playerId: string;
  onClose: () => void;
}

export const TournamentPlayerProfileModal: React.FC<TournamentPlayerProfileModalProps> = ({
  tournamentId,
  playerId,
  onClose,
}) => {
  const [profile, setProfile] = useState<TournamentPlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getTournamentPlayerProfile(tournamentId, playerId);
        if (isMounted) setProfile(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load player profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [tournamentId, playerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        id="player-profile-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tournament Player Profile</h2>
              <p className="text-xs text-slate-400">Performance and Match Breakdown</p>
            </div>
          </div>
          <button
            id="close-player-profile-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading player statistics...</p>
            </div>
          ) : error || !profile ? (
            <div className="py-12 text-center text-rose-400 bg-rose-950/20 border border-rose-800/30 rounded-xl p-4">
              <p>{error || 'Player profile not found.'}</p>
            </div>
          ) : (
            <>
              {/* Player Hero Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 bg-gradient-to-r from-slate-800/80 via-slate-800/40 to-slate-900 border border-slate-700/60 rounded-xl">
                <div className="relative">
                  {profile.player.photoUrl ? (
                    <img
                      src={profile.player.photoUrl}
                      alt={profile.player.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 font-bold text-2xl">
                      {profile.player.name.charAt(0)}
                    </div>
                  )}
                  {profile.player.jerseyNumber && (
                    <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-md shadow">
                      #{profile.player.jerseyNumber}
                    </span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-xl font-black text-white tracking-wide">{profile.player.name}</h3>
                    {profile.tournamentRank && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                        <Trophy className="w-3 h-3 mr-1" />
                        Tournament Rank #{profile.tournamentRank}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-emerald-400">
                    {profile.team?.name || 'Free Agent'} •{' '}
                    <span className="text-slate-300">{profile.player.role || 'Player'}</span>
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-slate-400">
                    <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50">
                      Sport: <strong className="text-white">{profile.sport}</strong>
                    </span>
                    <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50">
                      Matches: <strong className="text-white">{profile.matchesPlayed}</strong>
                    </span>
                    <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50">
                      Avg: <strong className="text-white">{profile.averagePerformance}</strong>
                    </span>
                  </div>
                </div>

                {/* Performance Index Score Box */}
                <div className="flex flex-col items-center justify-center px-4 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl min-w-[120px]">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Perf. Index</span>
                  <span className="text-2xl font-black text-white">{profile.performanceIndex}</span>
                  <span className="text-[10px] text-emerald-300/80">Tournament Score</span>
                </div>
              </div>

              {/* Performance Index Formula Breakdown */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowFormula(!showFormula)}
                >
                  <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Performance Index Metric Breakdown</span>
                  </div>
                  <button className="text-slate-400 hover:text-white">
                    {showFormula ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {showFormula && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                    <p className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-300">
                      {profile.performanceIndexFormula}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {Object.entries(profile.stats).map(([k, v]) => (
                        <div key={k} className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[11px]">{k}</span>
                          <span className="font-bold text-white text-xs">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Awards Earned */}
              {profile.awards && profile.awards.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    Tournament Awards & Citations
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.awards.map((aw, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl"
                      >
                        <span className="text-xl">{aw.icon || '🏆'}</span>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-amber-300">{aw.title}</p>
                          {aw.citation && <p className="text-xs text-slate-300 leading-relaxed">{aw.citation}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Match-by-Match Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Match Performances ({profile.matchPerformances.length})
                </h4>

                {profile.matchPerformances.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                    No active match performances recorded yet in this tournament.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {profile.matchPerformances.map((mp, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl transition"
                      >
                        <div className="flex items-center space-x-3">
                          {mp.isWinner ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-400">Match #{mp.matchNumber || idx + 1}</span>
                              {mp.round && (
                                <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded">
                                  {mp.round}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-white">vs {mp.opponentTeamName}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                          <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-500/20">
                            {mp.statsSummary}
                          </span>
                          {mp.date && <span className="text-[11px] text-slate-400">{mp.date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
