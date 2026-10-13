import React, { useEffect, useState } from 'react';
import {
  X,
  Shield,
  Trophy,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ExternalLink,
  Award,
} from 'lucide-react';
import { TournamentTeamProfileData } from '../../types';
import { api } from '../../services/api';

interface TournamentTeamProfileModalProps {
  tournamentId: string;
  teamId: string;
  onClose: () => void;
  onSelectPlayer?: (playerId: string) => void;
  onOpenMatch?: (matchId: string) => void;
}

export const TournamentTeamProfileModal: React.FC<TournamentTeamProfileModalProps> = ({
  tournamentId,
  teamId,
  onClose,
  onSelectPlayer,
  onOpenMatch,
}) => {
  const [profile, setProfile] = useState<TournamentTeamProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'ROSTER' | 'LEADERS'>('MATCHES');

  useEffect(() => {
    let isMounted = true;
    const fetchTeamProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getTournamentTeamProfile(tournamentId, teamId);
        if (isMounted) setProfile(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load team profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTeamProfile();
    return () => {
      isMounted = false;
    };
  }, [tournamentId, teamId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        id="team-profile-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tournament Team Profile</h2>
              <p className="text-xs text-slate-400">Roster, Standings, and Form Overview</p>
            </div>
          </div>
          <button
            id="close-team-profile-btn"
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
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading team performance records...</p>
            </div>
          ) : error || !profile ? (
            <div className="py-12 text-center text-rose-400 bg-rose-950/20 border border-rose-800/30 rounded-xl p-4">
              <p>{error || 'Team profile not found.'}</p>
            </div>
          ) : (
            <>
              {/* Team Hero Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 bg-gradient-to-r from-slate-800/80 via-slate-800/40 to-slate-900 border border-slate-700/60 rounded-xl">
                <div className="relative">
                  {profile.team.logoUrl ? (
                    <img
                      src={profile.team.logoUrl}
                      alt={profile.team.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md bg-slate-950"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-indigo-950/60 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-300 font-black text-2xl">
                      {profile.team.shortName || profile.team.name.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-xl font-black text-white tracking-wide">{profile.team.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                      Rank #{profile.rank}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        profile.qualificationStatus === 'QUALIFIED' || profile.qualificationStatus === 'MANUAL_QUALIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : profile.qualificationStatus === 'ELIMINATED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {profile.qualificationStatus}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-400">
                    Group: <strong className="text-slate-200">{profile.groupName || 'Main Stage'}</strong> • Sport:{' '}
                    <strong className="text-slate-200">{profile.sport}</strong>
                  </p>

                  {/* Form Badges */}
                  <div className="flex items-center justify-center sm:justify-start space-x-1.5 pt-1">
                    <span className="text-xs text-slate-400 mr-1 font-semibold">Form:</span>
                    {profile.form.length === 0 ? (
                      <span className="text-xs text-slate-500">No matches yet</span>
                    ) : (
                      profile.form.map((res, idx) => (
                        <span
                          key={idx}
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shadow ${
                            res === 'W'
                              ? 'bg-emerald-500 text-slate-950'
                              : res === 'L'
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {res}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Points & Win% Box */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center px-4 py-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl min-w-[90px]">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Points</span>
                    <span className="text-2xl font-black text-white">{profile.points}</span>
                    <span className="text-[10px] text-slate-400">{profile.played} Played</span>
                  </div>

                  <div className="flex flex-col items-center justify-center px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl min-w-[90px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Win %</span>
                    <span className="text-2xl font-black text-emerald-400">{profile.winPercentage}</span>
                    <span className="text-[10px] text-slate-400">
                      {profile.won}W - {profile.lost}L
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-800 space-x-2">
                <button
                  onClick={() => setActiveTab('MATCHES')}
                  className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'MATCHES'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Matches & Scorecards ({profile.recentMatches.length + profile.upcomingMatches.length})
                </button>

                <button
                  onClick={() => setActiveTab('LEADERS')}
                  className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'LEADERS'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  Player Leaders ({profile.playerLeaders.length})
                </button>

                <button
                  onClick={() => setActiveTab('ROSTER')}
                  className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'ROSTER'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Full Squad Roster ({profile.roster.length})
                </button>
              </div>

              {/* Tab: Matches */}
              {activeTab === 'MATCHES' && (
                <div className="space-y-4">
                  {/* Recent Completed */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Completed Matches ({profile.recentMatches.length})
                    </h4>
                    {profile.recentMatches.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                        No completed matches in this tournament yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {profile.recentMatches.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl transition"
                          >
                            <div className="flex items-center space-x-3">
                              <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                                  m.isWin
                                    ? 'bg-emerald-500 text-slate-950'
                                    : m.isLoss
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {m.isWin ? 'W' : m.isLoss ? 'L' : 'D'}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-slate-400">Match #{m.matchNumber || idx + 1}</span>
                                <p className="text-sm font-bold text-white">vs {m.opponentTeamName}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                              <span className="text-xs font-semibold text-slate-200 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                                {m.resultSummary}
                              </span>
                              {onOpenMatch && (
                                <button
                                  onClick={() => onOpenMatch(m.matchId)}
                                  className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded-lg border border-indigo-500/20 transition"
                                  title="Open match scorecard"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Fixtures */}
                  {profile.upcomingMatches.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        Upcoming Fixtures ({profile.upcomingMatches.length})
                      </h4>
                      <div className="space-y-2">
                        {profile.upcomingMatches.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl"
                          >
                            <div>
                              <span className="text-xs text-indigo-400 font-bold">
                                {m.round || 'Fixture'} • {m.date || 'TBD'} {m.time ? `@ ${m.time}` : ''}
                              </span>
                              <p className="text-sm font-bold text-white">vs {m.opponentTeamName}</p>
                            </div>
                            {m.venue && <span className="text-xs text-slate-400">{m.venue}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Player Leaders */}
              {activeTab === 'LEADERS' && (
                <div className="space-y-3">
                  {profile.playerLeaders.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                      No standout player leaderboard statistics recorded yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.playerLeaders.map((ldr, idx) => (
                        <div
                          key={idx}
                          onClick={() => onSelectPlayer && onSelectPlayer(ldr.playerId)}
                          className={`p-3.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between transition ${
                            onSelectPlayer ? 'cursor-pointer' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                              {ldr.playerName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white hover:text-indigo-400 transition">
                                {ldr.playerName}
                              </p>
                              <p className="text-xs text-slate-400">{ldr.statLabel}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-emerald-400">{ldr.statValue}</span>
                            {ldr.secondaryStat && (
                              <span className="block text-[10px] text-slate-500">{ldr.secondaryStat}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Squad Roster */}
              {activeTab === 'ROSTER' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {profile.roster.map((player) => (
                      <div
                        key={player.id}
                        onClick={() => onSelectPlayer && onSelectPlayer(player.id)}
                        className={`p-3 bg-slate-800/30 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl flex items-center space-x-3 transition ${
                          onSelectPlayer ? 'cursor-pointer' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {player.jerseyNumber ? `#${player.jerseyNumber}` : player.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate hover:text-indigo-400 transition">
                            {player.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{player.role || 'Squad Member'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition"
          >
            Close Team Profile
          </button>
        </div>
      </div>
    </div>
  );
};
