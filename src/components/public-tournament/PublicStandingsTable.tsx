import React, { useState } from 'react';
import {
  Tournament,
  TournamentGroupStandings,
  TournamentStandingRow,
  SportType,
} from '../../types';
import {
  Shield,
  HelpCircle,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Info,
} from 'lucide-react';

interface PublicStandingsTableProps {
  tournament: Tournament;
  standings: {
    groups: TournamentGroupStandings[];
    overall: TournamentStandingRow[];
  };
  onOpenTeam?: (teamId: string) => void;
}

export const PublicStandingsTable: React.FC<PublicStandingsTableProps> = ({
  tournament,
  standings,
  onOpenTeam,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [showRulesInfo, setShowRulesInfo] = useState<boolean>(false);

  const groups = standings.groups || [];
  const hasMultipleGroups = groups.length > 1;

  const displayGroups =
    selectedGroup === 'ALL'
      ? groups.length > 0
        ? groups
        : [{ groupId: 'overall', groupName: 'Overall Table', rows: standings.overall || [] }]
      : groups.filter((g) => g.groupId === selectedGroup);

  const sport = tournament.sport;
  const isCricket = sport === 'CRICKET';
  const isFootball = sport === 'FOOTBALL' || sport === 'HOCKEY';
  const isVolleyball = sport === 'VOLLEYBALL';
  const isKabaddi = sport === 'KABADDI';
  const isBasketball = sport === 'BASKETBALL';

  const getFormBadge = (result: 'W' | 'L' | 'D' | 'T' | 'NR', idx: number) => {
    switch (result) {
      case 'W':
        return (
          <span
            key={idx}
            className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center justify-center"
            title="Win"
          >
            W
          </span>
        );
      case 'L':
        return (
          <span
            key={idx}
            className="w-5 h-5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-[10px] flex items-center justify-center"
            title="Loss"
          >
            L
          </span>
        );
      case 'D':
      case 'T':
        return (
          <span
            key={idx}
            className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-[10px] flex items-center justify-center"
            title="Draw / Tie"
          >
            D
          </span>
        );
      default:
        return (
          <span
            key={idx}
            className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 font-bold text-[10px] flex items-center justify-center"
            title="No Result"
          >
            -
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls & Group Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          {hasMultipleGroups && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedGroup('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGroup === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Groups
              </button>
              {groups.map((g) => (
                <button
                  key={g.groupId}
                  onClick={() => setSelectedGroup(g.groupId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedGroup === g.groupId
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g.groupName || `Group ${g.groupId}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowRulesInfo(!showRulesInfo)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Tie-Breaker & Points Rules</span>
        </button>
      </div>

      {/* Rules Explainer Callout */}
      {showRulesInfo && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Info className="w-4 h-4" />
            <span>Official Standings Criteria for {tournament.sport}</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Teams are ranked by total competition points. In the event of equal points, tie-breakers apply sequentially:
            {isCricket
              ? ' 1) Net Run Rate (NRR), 2) Total Wins, 3) Head-to-Head Result, 4) Highest Batting Average.'
              : isFootball
              ? ' 1) Goal Difference (GD), 2) Goals For (GF), 3) Head-to-Head Points, 4) Total Wins.'
              : isVolleyball
              ? ' 1) Total Matches Won, 2) Set Ratio (Sets Won ÷ Sets Lost), 3) Points Ratio, 4) Head-to-Head.'
              : isKabaddi
              ? ' 1) Score Difference, 2) Total Wins, 3) Head-to-Head, 4) Total Raid Points.'
              : ' 1) Points Difference, 2) Head-to-Head, 3) Total Wins.'}
          </p>
        </div>
      )}

      {/* Standings Tables */}
      {displayGroups.map((group, gIdx) => (
        <div
          key={group.groupId || gIdx}
          className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl"
        >
          {/* Table Group Banner */}
          <div className="px-5 py-3.5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                {group.groupName || 'Standings Table'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {group.rows?.length || 0} Teams Competing
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800">
                  <th className="py-3 px-4 text-center w-12">POS</th>
                  <th className="py-3 px-4">TEAM</th>
                  <th className="py-3 px-3 text-center">P</th>
                  <th className="py-3 px-3 text-center">W</th>
                  <th className="py-3 px-3 text-center">L</th>
                  {isCricket && <th className="py-3 px-3 text-center">NR/T</th>}
                  {isFootball && <th className="py-3 px-3 text-center">D</th>}
                  {isFootball && <th className="py-3 px-3 text-center">GF</th>}
                  {isFootball && <th className="py-3 px-3 text-center">GA</th>}
                  {isFootball && <th className="py-3 px-3 text-center">GD</th>}
                  {isVolleyball && <th className="py-3 px-3 text-center">SW</th>}
                  {isVolleyball && <th className="py-3 px-3 text-center">SL</th>}
                  {isVolleyball && <th className="py-3 px-3 text-center">RATIO</th>}
                  {isKabaddi && <th className="py-3 px-3 text-center">DIFF</th>}
                  {isCricket && <th className="py-3 px-3 text-center">NRR</th>}
                  <th className="py-3 px-4 text-center font-black text-amber-400">PTS</th>
                  <th className="py-3 px-4 text-center hidden md:table-cell">FORM</th>
                  <th className="py-3 px-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {group.rows && group.rows.length > 0 ? (
                  group.rows.map((row, rIdx) => {
                    const isQualified = row.qualificationStatus === 'QUALIFIED' || row.qualificationStatus === 'MANUAL_QUALIFIED';
                    const isEliminated = row.qualificationStatus === 'ELIMINATED' || row.qualificationStatus === 'MANUAL_ELIMINATED';

                    return (
                      <tr
                        key={row.teamId || rIdx}
                        onClick={() => row.teamId && onOpenTeam && onOpenTeam(row.teamId)}
                        className={`hover:bg-slate-800/50 cursor-pointer transition-colors group ${
                          isQualified ? 'bg-emerald-950/10' : isEliminated ? 'bg-rose-950/5 opacity-80' : ''
                        }`}
                      >
                        {/* Position */}
                        <td className="py-3.5 px-4 text-center font-mono font-black text-slate-300">
                          <span
                            className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs ${
                              row.rank === 1
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : row.rank === 2
                                ? 'bg-slate-400/20 text-slate-200 border border-slate-400/40'
                                : row.rank === 3
                                ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.rank || rIdx + 1}
                          </span>
                        </td>

                        {/* Team Name and Logo */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {row.teamLogoUrl ? (
                              <img
                                src={row.teamLogoUrl}
                                alt={row.teamName}
                                className="w-6 h-6 rounded-md object-cover border border-slate-700 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-300 flex-shrink-0">
                                {row.teamShortName?.slice(0, 2) || row.teamName?.slice(0, 2) || 'TM'}
                              </div>
                            )}
                            <span className="font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate max-w-[160px] sm:max-w-xs">
                              {row.teamName}
                            </span>
                          </div>
                        </td>

                        {/* Stats Columns */}
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">{row.played || 0}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-emerald-400 font-bold">{row.won || 0}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-rose-400">{row.lost || 0}</td>

                        {isCricket && (
                          <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                            {(row.noResult || 0) + (row.tied || 0)}
                          </td>
                        )}

                        {isFootball && <td className="py-3.5 px-3 text-center font-mono text-slate-400">{row.drawn || 0}</td>}
                        {isFootball && <td className="py-3.5 px-3 text-center font-mono text-slate-300">{row.goalsFor || 0}</td>}
                        {isFootball && <td className="py-3.5 px-3 text-center font-mono text-slate-400">{row.goalsAgainst || 0}</td>}
                        {isFootball && (
                          <td
                            className={`py-3.5 px-3 text-center font-mono font-bold ${
                              (row.goalDifference || 0) > 0
                                ? 'text-emerald-400'
                                : (row.goalDifference || 0) < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {(row.goalDifference || 0) > 0 ? `+${row.goalDifference}` : row.goalDifference || 0}
                          </td>
                        )}

                        {isVolleyball && <td className="py-3.5 px-3 text-center font-mono text-slate-300">{row.setsWon || 0}</td>}
                        {isVolleyball && <td className="py-3.5 px-3 text-center font-mono text-slate-400">{row.setsLost || 0}</td>}
                        {isVolleyball && (
                          <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                            {row.setRatio?.toFixed(2) || '-'}
                          </td>
                        )}

                        {isKabaddi && (
                          <td
                            className={`py-3.5 px-3 text-center font-mono font-bold ${
                              (row.scoreDifference || 0) > 0
                                ? 'text-emerald-400'
                                : (row.scoreDifference || 0) < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {(row.scoreDifference || 0) > 0 ? `+${row.scoreDifference}` : row.scoreDifference || 0}
                          </td>
                        )}

                        {isCricket && (
                          <td
                            className={`py-3.5 px-3 text-center font-mono font-bold ${
                              (row.netRunRate || 0) > 0
                                ? 'text-emerald-400'
                                : (row.netRunRate || 0) < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {(row.netRunRate || 0) > 0
                              ? `+${row.netRunRate?.toFixed(3)}`
                              : row.netRunRate?.toFixed(3) || '0.000'}
                          </td>
                        )}

                        {/* Points */}
                        <td className="py-3.5 px-4 text-center font-mono font-black text-amber-400 text-sm">
                          {row.points || 0}
                        </td>

                        {/* Form Last 5 */}
                        <td className="py-3.5 px-4 text-center hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {row.form && row.form.length > 0 ? (
                              row.form.map((f, i) => getFormBadge(f, i))
                            ) : (
                              <span className="text-slate-500 text-[10px]">-</span>
                            )}
                          </div>
                        </td>

                        {/* Qualification Status */}
                        <td className="py-3.5 px-3 text-center">
                          {isQualified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Q</span>
                            </span>
                          ) : isEliminated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              <XCircle className="w-2.5 h-2.5" />
                              <span>E</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-500 text-xs">
                      No team standings computed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
