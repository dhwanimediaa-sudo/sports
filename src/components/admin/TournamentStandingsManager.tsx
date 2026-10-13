import React, { useState } from 'react';
import {
  Tournament,
  TournamentGroupStandings,
  TournamentStandingRow,
  TournamentCompetitionConfig,
  TieBreakerRule,
} from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CompetitionConfigModal } from './CompetitionConfigModal';
import { StandingsOverrideModal } from './StandingsOverrideModal';
import {
  BarChart3,
  Settings2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Layers,
  Award,
  Flame,
  Info,
  Edit2,
  Sparkles,
} from 'lucide-react';

export interface TournamentStandingsManagerProps {
  tournament: Tournament;
  standings: {
    groups: TournamentGroupStandings[];
    overall: TournamentStandingRow[];
    competitionConfig?: TournamentCompetitionConfig;
  };
  onRefresh: () => void;
  onOpenTeam?: (teamId: string) => void;
}

export const TournamentStandingsManager: React.FC<TournamentStandingsManagerProps> = ({
  tournament,
  standings,
  onRefresh,
  onOpenTeam,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [overrideRow, setOverrideRow] = useState<TournamentStandingRow | null>(null);
  const [showRulesExplainer, setShowRulesExplainer] = useState<boolean>(false);
  const [expandedTeamDetails, setExpandedTeamDetails] = useState<string | null>(null);

  const groups = standings.groups || [];
  const activeGroups = selectedGroupId === 'ALL' ? groups : groups.filter((g) => g.groupId === selectedGroupId);

  const config = standings.competitionConfig || tournament.competitionConfig;
  const isCricket = tournament.sport === 'CRICKET';
  const isFootballOrHockey = tournament.sport === 'FOOTBALL' || tournament.sport === 'HOCKEY' || (tournament.sport as string) === 'FIELD_HOCKEY';
  const isVolleyball = tournament.sport === 'VOLLEYBALL';
  const isKabaddi = tournament.sport === 'KABADDI';
  const isBasketball = tournament.sport === 'BASKETBALL';
  const isRacketSport =
    tournament.sport === 'TENNIS' ||
    tournament.sport === 'BADMINTON' ||
    tournament.sport === 'TABLE_TENNIS';

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Tournament Standings & Points Table
            </h2>
            <Badge variant="secondary">{tournament.sport}</Badge>
            {config?.format && (
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                {config.format.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time deterministic standings calculated from completed match scorecards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRulesExplainer(!showRulesExplainer)}
            icon={<HelpCircle className="w-3.5 h-3.5" />}
          >
            {showRulesExplainer ? 'Hide Rules' : 'Ranking Rules'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfigModal(true)}
            icon={<Settings2 className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Configure Rules
          </Button>

          <Button
            variant="emerald"
            size="sm"
            onClick={onRefresh}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Recalculate
          </Button>
        </div>
      </div>

      {/* Rules Explainer Accordion */}
      {showRulesExplainer && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Active Standings Calculation & Tie-Breaking Rules
              </h4>
            </div>
            <span className="text-[10px] text-slate-400">Deterministic Engine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="font-bold text-slate-300 block">Points System</span>
              <ul className="text-slate-400 space-y-1 text-[11px]">
                <li>• Win: <strong className="text-emerald-400">{config?.pointsForWin ?? 2} pts</strong></li>
                <li>• Draw: <strong className="text-slate-300">{config?.pointsForDraw ?? 1} pts</strong></li>
                <li>• Tie: <strong className="text-slate-300">{config?.pointsForTie ?? 1} pts</strong></li>
                <li>• Loss: <strong className="text-rose-400">{config?.pointsForLoss ?? 0} pts</strong></li>
                <li>• No Result (NR) / Abandoned: <strong className="text-slate-400">{config?.pointsForNoResult ?? 1} pts</strong></li>
              </ul>
            </div>

            <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="font-bold text-slate-300 block">Tie-Breaker Hierarchy Order</span>
              <ol className="text-slate-400 space-y-1 text-[11px] list-decimal list-inside">
                {(config?.tieBreakerOrder || ['POINTS', 'NET_RUN_RATE', 'HEAD_TO_HEAD_POINTS', 'WINS_COUNT']).map((tb, idx) => (
                  <li key={idx} className="font-medium">
                    <span className="text-slate-200">{tb.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Group Switcher Tabs */}
      {groups.length > 1 && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedGroupId('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedGroupId === 'ALL'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Groups ({groups.length})
          </button>

          {groups.map((grp) => (
            <button
              key={grp.groupId}
              type="button"
              onClick={() => setSelectedGroupId(grp.groupId)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedGroupId === grp.groupId
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {grp.groupName}
            </button>
          ))}
        </div>
      )}

      {/* Standings Tables */}
      {activeGroups.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
          <BarChart3 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Standings Available</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Assign registered teams to groups and schedule matches to start populating live points tables.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeGroups.map((grp) => (
            <div
              key={grp.groupId}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl"
            >
              {/* Group Header */}
              <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    {grp.groupName}
                  </h3>
                  <span className="text-[11px] text-slate-400">({grp.rows.length} Teams)</span>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>
                    Advancing Top {grp.qualificationSlots || config?.qualificationSlotsPerGroup || 2} Teams
                  </span>
                  {grp.isCompleted && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Group Completed
                    </span>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-3 w-10 text-center">Pos</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-2.5 text-center">P</th>
                      <th className="py-3 px-2.5 text-center text-emerald-400">W</th>
                      <th className="py-3 px-2.5 text-center text-rose-400">L</th>

                      {/* Draws & Ties */}
                      <th className="py-3 px-2.5 text-center text-slate-300">
                        {isFootballOrHockey ? 'D' : 'D/T'}
                      </th>

                      {/* Cricket NR */}
                      {isCricket && <th className="py-3 px-2.5 text-center text-slate-400">NR</th>}

                      {/* Sport-Specific Secondary Columns */}
                      {isCricket && (
                        <>
                          <th className="py-3 px-3 text-center text-slate-300">NRR</th>
                          <th className="py-3 px-3 text-center text-slate-400 hidden lg:table-cell">For</th>
                          <th className="py-3 px-3 text-center text-slate-400 hidden lg:table-cell">Against</th>
                        </>
                      )}

                      {isFootballOrHockey && (
                        <>
                          <th className="py-3 px-2.5 text-center text-slate-300">GF</th>
                          <th className="py-3 px-2.5 text-center text-slate-300">GA</th>
                          <th className="py-3 px-3 text-center text-slate-300">GD</th>
                        </>
                      )}

                      {isVolleyball && (
                        <>
                          <th className="py-3 px-2.5 text-center text-slate-300">SW</th>
                          <th className="py-3 px-2.5 text-center text-slate-300">SL</th>
                          <th className="py-3 px-3 text-center text-slate-300">Set Ratio</th>
                          <th className="py-3 px-3 text-center text-slate-300 hidden lg:table-cell">Pt Ratio</th>
                        </>
                      )}

                      {isKabaddi && (
                        <>
                          <th className="py-3 px-2.5 text-center text-slate-300">Score Diff</th>
                          <th className="py-3 px-2.5 text-center text-slate-300">Bonus Pts</th>
                        </>
                      )}

                      {isBasketball && (
                        <>
                          <th className="py-3 px-2.5 text-center text-slate-300">PF</th>
                          <th className="py-3 px-2.5 text-center text-slate-300">PA</th>
                          <th className="py-3 px-3 text-center text-slate-300">PD</th>
                          <th className="py-3 px-3 text-center text-slate-300">Win %</th>
                        </>
                      )}

                      {isRacketSport && (
                        <>
                          <th className="py-3 px-2.5 text-center text-slate-300">Sets Diff</th>
                          <th className="py-3 px-2.5 text-center text-slate-300">Games Diff</th>
                        </>
                      )}

                      {/* Points */}
                      <th className="py-3 px-4 text-center font-black text-slate-100">PTS</th>

                      {/* Form Guide */}
                      <th className="py-3 px-3 text-center">Form</th>

                      {/* Qualification Status */}
                      <th className="py-3 px-3 text-center">Status</th>

                      {/* Admin Actions */}
                      <th className="py-3 px-3 text-center w-16">Edit</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {grp.rows.map((row) => {
                      const isRowExpanded = expandedTeamDetails === row.teamId;
                      const hasManualAdj = Boolean(row.manualAdjustment?.pointsAdjustment || row.manualAdjustment?.qualificationStatusOverride);

                      return (
                        <React.Fragment key={row.teamId}>
                          <tr
                            className={`hover:bg-slate-800/40 transition-colors ${
                              row.qualificationStatus === 'QUALIFIED' || row.qualified
                                ? 'bg-emerald-950/15'
                                : row.qualificationStatus === 'ELIMINATED' || row.eliminated
                                ? 'opacity-60 bg-rose-950/5'
                                : ''
                            }`}
                          >
                            {/* Rank Position */}
                            <td className="py-3 px-3 text-center font-bold">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] ${
                                  row.rank === 1
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black'
                                    : row.rank === 2
                                    ? 'bg-slate-400/20 text-slate-200 border border-slate-500/40 font-black'
                                    : 'text-slate-400'
                                }`}
                              >
                                {row.rank}
                              </span>
                            </td>

                            {/* Team Identity */}
                            <td className="py-3 px-4 font-bold text-slate-100">
                              <div
                                onClick={() => onOpenTeam && onOpenTeam(row.teamId)}
                                className="flex items-center gap-2.5 cursor-pointer hover:text-emerald-400 transition-colors"
                              >
                                {row.teamLogo ? (
                                  <img
                                    src={row.teamLogo}
                                    alt={row.teamName}
                                    referrerPolicy="no-referrer"
                                    className="w-5 h-5 rounded-full object-cover bg-slate-950 shrink-0"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">
                                    {row.teamShortName || row.teamName.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span>{row.teamName}</span>

                                {hasManualAdj && (
                                  <span
                                    title={`Admin Adjustment: ${row.manualAdjustment?.reason || 'Manual override'}`}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold"
                                  >
                                    ADJ
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Standard Counters */}
                            <td className="py-3 px-2.5 text-center text-slate-300 font-mono">{row.played}</td>
                            <td className="py-3 px-2.5 text-center font-semibold text-emerald-400 font-mono">{row.won}</td>
                            <td className="py-3 px-2.5 text-center text-rose-400 font-mono">{row.lost}</td>
                            <td className="py-3 px-2.5 text-center text-slate-400 font-mono">{row.drawn + row.tied}</td>

                            {/* Cricket NR */}
                            {isCricket && <td className="py-3 px-2.5 text-center text-slate-400 font-mono">{row.noResult}</td>}

                            {/* Sport Specific Metrics */}
                            {isCricket && (
                              <>
                                <td className="py-3 px-3 text-center font-mono text-[11px] font-bold">
                                  <span
                                    className={
                                      row.netRunRate > 0
                                        ? 'text-emerald-400'
                                        : row.netRunRate < 0
                                        ? 'text-rose-400'
                                        : 'text-slate-400'
                                    }
                                  >
                                    {row.netRunRate > 0
                                      ? `+${row.netRunRate.toFixed(3)}`
                                      : row.netRunRate.toFixed(3)}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-[10px] text-slate-400 font-mono hidden lg:table-cell">
                                  {row.runsScored}/{row.oversFaced}
                                </td>
                                <td className="py-3 px-3 text-center text-[10px] text-slate-400 font-mono hidden lg:table-cell">
                                  {row.runsConceded}/{row.oversBowled}
                                </td>
                              </>
                            )}

                            {isFootballOrHockey && (
                              <>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-300">{row.goalsFor}</td>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-400">{row.goalsAgainst}</td>
                                <td className="py-3 px-3 text-center font-mono text-xs font-bold">
                                  <span
                                    className={
                                      row.goalDifference > 0
                                        ? 'text-emerald-400'
                                        : row.goalDifference < 0
                                        ? 'text-rose-400'
                                        : 'text-slate-400'
                                    }
                                  >
                                    {row.goalDifference > 0
                                      ? `+${row.goalDifference}`
                                      : row.goalDifference}
                                  </span>
                                </td>
                              </>
                            )}

                            {isVolleyball && (
                              <>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-300">{row.setsWon}</td>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-400">{row.setsLost}</td>
                                <td className="py-3 px-3 text-center font-mono text-[11px] font-bold text-slate-200">
                                  {row.setRatio ? row.setRatio.toFixed(2) : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400 hidden lg:table-cell">
                                  {row.pointsRatio ? row.pointsRatio.toFixed(2) : '-'}
                                </td>
                              </>
                            )}

                            {isKabaddi && (
                              <>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-200">
                                  {row.scoreDifference > 0 ? `+${row.scoreDifference}` : row.scoreDifference}
                                </td>
                                <td className="py-3 px-2.5 text-center font-mono text-amber-400">
                                  {row.bonusPoints || 0}
                                </td>
                              </>
                            )}

                            {isBasketball && (
                              <>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-300">{row.pointsScored}</td>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-400">{row.pointsConceded}</td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                                  {row.scoreDifference > 0 ? `+${row.scoreDifference}` : row.scoreDifference}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">
                                  {row.winPercentage ? `${row.winPercentage.toFixed(1)}%` : '0%'}
                                </td>
                              </>
                            )}

                            {isRacketSport && (
                              <>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-200">
                                  {row.setsWon} - {row.setsLost}
                                </td>
                                <td className="py-3 px-2.5 text-center font-mono text-slate-200">
                                  {row.gamesWon} - {row.gamesLost}
                                </td>
                              </>
                            )}

                            {/* Total Points */}
                            <td className="py-3 px-4 text-center font-black text-sm text-emerald-400 font-mono">
                              {row.points}
                            </td>

                            {/* Form Badges */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {(row.form || []).length === 0 ? (
                                  <span className="text-[10px] text-slate-600">-</span>
                                ) : (
                                  (row.form || []).map((res, fIdx) => (
                                    <span
                                      key={fIdx}
                                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black font-mono ${
                                        res === 'W'
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : res === 'L'
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                                      }`}
                                    >
                                      {res}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>

                            {/* Qualification Status */}
                            <td className="py-3 px-3 text-center">
                              {row.qualificationStatus === 'QUALIFIED' || row.qualified ? (
                                <span
                                  title={row.qualificationNote || 'Qualified to Next Stage'}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Q
                                </span>
                              ) : row.qualificationStatus === 'ELIMINATED' || row.eliminated ? (
                                <span
                                  title={row.qualificationNote || 'Eliminated'}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700"
                                >
                                  ELIM
                                </span>
                              ) : (
                                <span
                                  title={row.qualificationNote || 'In Contention'}
                                  className="text-[10px] text-slate-500 font-medium"
                                >
                                  In Contention
                                </span>
                              )}
                            </td>

                            {/* Edit Action Button */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setOverrideRow(row)}
                                className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                                title="Administrative Adjustment"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showConfigModal && (
        <CompetitionConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          tournament={tournament}
          initialConfig={config}
          onSuccess={() => {
            onRefresh();
            setShowConfigModal(false);
          }}
        />
      )}

      {overrideRow && (
        <StandingsOverrideModal
          isOpen={Boolean(overrideRow)}
          onClose={() => setOverrideRow(null)}
          tournamentId={tournament.id}
          targetRow={overrideRow}
          onSuccess={() => {
            onRefresh();
            setOverrideRow(null);
          }}
        />
      )}
    </div>
  );
};
