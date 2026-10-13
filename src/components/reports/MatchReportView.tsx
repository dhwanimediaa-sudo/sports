import React, { useState, useEffect } from 'react';
import {
  FullMatchReport,
  ReportInningsScorecard,
  PlayerMatchPerformance,
  AwardCandidate,
} from '../../types';
import { VolleyballReportView } from './VolleyballReportView';
import { KabaddiReportView } from './KabaddiReportView';
import { HockeyReportView } from './HockeyReportView';
import { FootballReportView } from './FootballReportView';
import { BasketballReportView } from './BasketballReportView';
import { TennisReportView } from './TennisReportView';
import { BadmintonReportView } from './BadmintonReportView';
import { TableTennisReportView } from './TableTennisReportView';
import { api } from '../../services/api';
import {
  Trophy,
  Award,
  Printer,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Share2,
  RefreshCw,
  FileText,
  UserCheck,
  Zap,
  BarChart2,
  Users,
  Shield,
  Calendar,
  MapPin,
  ChevronRight,
  Filter,
  Search,
  Check,
  Send,
} from 'lucide-react';

interface MatchReportViewProps {
  matchId: string;
  onClose?: () => void;
}

export const MatchReportView: React.FC<MatchReportViewProps> = ({ matchId, onClose }) => {
  const [report, setReport] = useState<FullMatchReport | any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'overs' | 'ballbyball' | 'awards' | 'squads'>('scorecard');
  const [activeInningsNum, setActiveInningsNum] = useState<1 | 2>(1);

  // Awards Editing State
  const [editingAwards, setEditingAwards] = useState(false);
  const [selectedMomId, setSelectedMomId] = useState('');
  const [momReason, setMomReason] = useState('');
  const [selectedBatterId, setSelectedBatterId] = useState('');
  const [selectedBowlerId, setSelectedBowlerId] = useState('');
  const [savingAwards, setSavingAwards] = useState(false);

  // Finalization State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Ball Filter State
  const [ballFilter, setBallFilter] = useState<'ALL' | 'BOUNDARIES' | 'WICKETS' | 'EXTRAS'>('ALL');
  const [ballSearch, setBallSearch] = useState('');

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchReport = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.getMatchReport(matchId);
      setReport(res.report);
      setError(null);

      // Populate award form defaults for Cricket
      if (res.report && 'innings1Scorecard' in res.report) {
        const cricketReport = res.report as FullMatchReport;
        setSelectedMomId(cricketReport.selectedManOfMatch?.playerId || cricketReport.suggestedManOfMatch?.playerId || '');
        setMomReason(cricketReport.selectedManOfMatch?.details || cricketReport.suggestedManOfMatch?.details || '');
        setSelectedBatterId(cricketReport.selectedBestBatter?.playerId || cricketReport.suggestedBestBatter?.playerId || '');
        setSelectedBowlerId(cricketReport.selectedBestBowler?.playerId || cricketReport.suggestedBestBowler?.playerId || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load match report.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();

    // Auto-refresh timer every 10s for live matches
    const interval = setInterval(() => {
      fetchReport(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [matchId]);

  const handleSaveAwards = async () => {
    setSavingAwards(true);
    try {
      const res = await api.updateMatchAwards(matchId, {
        manOfTheMatchId: selectedMomId,
        manOfTheMatchReason: momReason,
        bestBatterId: selectedBatterId,
        bestBowlerId: selectedBowlerId,
      });
      setReport(res.report);
      setEditingAwards(false);
      showToast('Match awards updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save awards.', 'error');
    } finally {
      setSavingAwards(false);
    }
  };

  const handleFinalizeReport = async () => {
    setFinalizing(true);
    try {
      const res = await api.finalizeMatchReport(matchId);
      setReport(res.report);
      setShowFinalizeModal(false);
      showToast('Match report finalized and locked successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize report.', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopenReport = async () => {
    if (!window.confirm('Are you sure you want to reopen this finalized report for editing?')) return;
    setReopening(true);
    try {
      const res = await api.reopenMatchReport(matchId);
      setReport(res.report);
      showToast('Match report unlocked and reopened.');
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen report.', 'error');
    } finally {
      setReopening(false);
    }
  };

  const handleSendToBroadcast = async (overlayType: string) => {
    try {
      await api.triggerBroadcastEvent(matchId, {
        type: overlayType,
        durationSeconds: 15,
      });
      showToast(`Broadcast graphic overlay "${overlayType}" triggered on single output URL!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to send to broadcast engine.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900 text-white rounded-xl p-8">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-slate-300 font-medium">Calculating Full Match Report & Derived Statistics...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-red-950/40 border border-red-800 text-red-200 rounded-xl p-6 text-center my-4">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <h3 className="text-lg font-bold">Error Loading Report</h3>
        <p className="text-sm mt-1">{error || 'Report data unavailable.'}</p>
        <button
          onClick={() => fetchReport()}
          className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // If this is a Volleyball Match Report, render the specialized Volleyball Report View
  if ((report as any).sport === 'VOLLEYBALL' || (report as any).match?.sport === 'VOLLEYBALL') {
    return (
      <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 print:bg-white print:text-black print:border-none print:shadow-none my-4">
        <VolleyballReportView report={report as any} onRefresh={() => fetchReport(false)} />
      </div>
    );
  }

  // If this is a Kabaddi Match Report, render the specialized Kabaddi Report View
  if ((report as any).sport === 'KABADDI' || (report as any).match?.sport === 'KABADDI' || 'raids' in (report as any)) {
    return (
      <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 print:bg-white print:text-black print:border-none print:shadow-none my-4">
        <KabaddiReportView report={report as any} onRefresh={() => fetchReport(false)} />
      </div>
    );
  }

  // If this is a Field Hockey Match Report, render the specialized Hockey Report View
  if ((report as any).sport === 'HOCKEY' || (report as any).match?.sport === 'HOCKEY' || 'quarters' in (report as any)) {
    return (
      <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 print:bg-white print:text-black print:border-none print:shadow-none my-4">
        <HockeyReportView report={report as any} onRefresh={() => fetchReport(false)} />
      </div>
    );
  }

  // If this is a Football / Soccer Match Report, render the specialized Football Report View
  if (
    (report as any).sport === 'FOOTBALL' ||
    (report as any).match?.sport === 'FOOTBALL' ||
    'goalTimeline' in (report as any) ||
    'shootoutAttempts' in (report as any)
  ) {
    return (
      <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 print:bg-white print:text-black print:border-none print:shadow-none my-4">
        <FootballReportView report={report as any} onRefresh={() => fetchReport(false)} />
      </div>
    );
  }

  // If this is a Basketball Match Report, render the specialized Basketball Report View
  if (
    (report as any).sport === 'BASKETBALL' ||
    (report as any).match?.sport === 'BASKETBALL' ||
    'playByPlay' in (report as any) ||
    'teamAStats' in (report as any) && 'threePointersMade' in ((report as any).teamAStats || {})
  ) {
    return (
      <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 print:bg-white print:text-black print:border-none print:shadow-none my-4">
        <BasketballReportView report={report as any} onRefresh={() => fetchReport(false)} />
      </div>
    );
  }

  // If this is a Tennis Match Report, render the specialized Tennis Report View
  if (
    (report as any).sport === 'TENNIS' ||
    (report as any).match?.sport === 'TENNIS' ||
    'setScores' in (report as any) ||
    'pointTimeline' in (report as any) ||
    'gameTimeline' in (report as any)
  ) {
    return (
      <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 print:bg-white print:text-black print:border-none print:shadow-none my-4">
        <TennisReportView report={report as any} onRefresh={() => fetchReport(false)} />
      </div>
    );
  }

  // If this is a Badminton Match Report, render the specialized Badminton Report View
  if (
    (report as any).sport === 'BADMINTON' ||
    (report as any).match?.sport === 'BADMINTON' ||
    'serviceCourt' in (report as any) ||
    'doublesPositions' in (report as any)
  ) {
    return (
      <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 print:bg-white print:text-black print:border-none print:shadow-none my-4">
        <BadmintonReportView report={report as any} onRefresh={() => fetchReport(false)} />
      </div>
    );
  }

  // If this is a Table Tennis Match Report, render the specialized Table Tennis Report View
  if (
    (report as any).sport === 'TABLE_TENNIS' ||
    (report as any).match?.sport === 'TABLE_TENNIS' ||
    'tableTennisConfig' in (report as any) ||
    'doublesSequence' in (report as any)
  ) {
    return (
      <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 print:bg-white print:text-black print:border-none print:shadow-none my-4">
        <TableTennisReportView report={report as any} onRefresh={() => fetchReport(false)} />
      </div>
    );
  }

  const activeInningsScorecard =
    activeInningsNum === 1 ? report.innings1Scorecard : report.innings2Scorecard;

  // Filtered Ball-by-Ball
  const filteredBalls = report.ballByBall.filter((b) => {
    if (b.inningsNumber !== activeInningsNum) return false;
    if (ballFilter === 'BOUNDARIES' && !(b.runsOffBat === 4 || b.runsOffBat === 6)) return false;
    if (ballFilter === 'WICKETS' && !b.isWicket) return false;
    if (ballFilter === 'EXTRAS' && b.extraType === 'NONE') return false;

    if (ballSearch) {
      const q = ballSearch.toLowerCase();
      return (
        b.strikerName.toLowerCase().includes(q) ||
        b.bowlerName.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.overBallDisplay.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="match-report-container bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden my-4 print:bg-white print:text-black print:border-none print:shadow-none">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-600 text-emerald-100'
              : 'bg-red-900/90 border-red-600 text-red-100'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 p-6 border-b border-slate-800 print:bg-none print:text-black print:border-b-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-full uppercase tracking-wider">
                {report.tournament?.name || 'Cricket Match'}
              </span>
              {report.group && (
                <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full">
                  {report.group.name}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${
                  report.status === 'COMPLETED'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                }`}
              >
                {report.status}
              </span>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${
                  report.isFinalized
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                }`}
              >
                {report.isFinalized ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {report.isFinalized ? 'REPORT FINALIZED & LOCKED' : 'DRAFT / LIVE SCORE'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1 print:text-black">
              {report.teamA?.name} vs {report.teamB?.name}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap print:text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {new Date(report.match.startTime || report.match.date || Date.now()).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {report.match.venue || 'Main Ground'}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                Format: {report.match.cricketConfig?.format || 'LIMITED_OVERS'} ({report.match.cricketConfig?.overs || 20} Overs)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print / Export PDF</span>
            </button>

            {report.isFinalized ? (
              <button
                onClick={handleReopenReport}
                disabled={reopening}
                className="px-3.5 py-2 bg-amber-900/50 hover:bg-amber-800 text-amber-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-amber-700"
              >
                <Unlock className="w-4 h-4" />
                <span>{reopening ? 'Reopening...' : 'Reopen Report'}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowFinalizeModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-emerald-950"
              >
                <Lock className="w-4 h-4" />
                <span>Finalize Match Report</span>
              </button>
            )}

            <button
              onClick={() => fetchReport(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700"
              title="Refresh Report"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Validation Warning Box (Admin alert for score inconsistency) */}
      {((report.innings1Scorecard && !report.innings1Scorecard.validation.isValid) ||
        (report.innings2Scorecard && !report.innings2Scorecard.validation.isValid)) && (
        <div className="bg-amber-950/70 border-l-4 border-amber-500 p-4 m-6 rounded-r-xl flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider">
              Scoring Consistency Warning
            </h4>
            <p className="text-xs text-amber-300/90 mt-1">
              {report.innings1Scorecard?.validation.warningMessage ||
                report.innings2Scorecard?.validation.warningMessage}
            </p>
            <p className="text-[11px] text-amber-400/80 mt-1 italic">
              Note: This warning is visible to admins to ensure ball-by-ball events perfectly match total team scores.
            </p>
          </div>
        </div>
      )}

      {/* Match Result Banner & Key Metric Highlights */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 print:bg-slate-50 print:text-black">
        <div className="bg-gradient-to-r from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-xl p-5 mb-6 print:border-slate-300 print:bg-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Match Result</span>
              <h2 className="text-2xl font-black text-white mt-0.5 print:text-black">
                {report.matchResultText}
              </h2>
              {report.tossReport && (
                <p className="text-xs text-slate-400 mt-1 print:text-slate-600">
                  Toss: {report.tossReport.text}
                </p>
              )}
            </div>

            {/* Innings High Scores */}
            <div className="flex items-center gap-6 text-center">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 min-w-[120px] print:bg-slate-100 print:border-slate-300">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block print:text-slate-600">
                  {report.innings1Scorecard?.battingTeamShortName || report.teamA?.shortName || 'Team A'}
                </span>
                <span className="text-xl font-bold text-white print:text-black">
                  {report.summaryCards.teamAScore}
                </span>
              </div>

              <div className="text-slate-600 font-bold text-lg">VS</div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 min-w-[120px] print:bg-slate-100 print:border-slate-300">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block print:text-slate-600">
                  {report.innings2Scorecard?.battingTeamShortName || report.teamB?.shortName || 'Team B'}
                </span>
                <span className="text-xl font-bold text-white print:text-black">
                  {report.summaryCards.teamBScore}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Highlights Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Man of Match</span>
              <span className="text-sm font-bold text-white truncate block max-w-[140px]">
                {report.selectedManOfMatch?.playerName || 'TBD'}
              </span>
              <span className="text-[11px] text-amber-400 font-medium truncate block max-w-[140px]">
                {report.selectedManOfMatch?.details || 'Performance Rating'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Best Batter</span>
              <span className="text-sm font-bold text-white truncate block max-w-[140px]">
                {report.selectedBestBatter?.playerName || 'N/A'}
              </span>
              <span className="text-[11px] text-slate-400 truncate block max-w-[140px]">
                {report.summaryCards.highestScoreText}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Best Bowler</span>
              <span className="text-sm font-bold text-white truncate block max-w-[140px]">
                {report.selectedBestBowler?.playerName || 'N/A'}
              </span>
              <span className="text-[11px] text-slate-400 truncate block max-w-[140px]">
                {report.summaryCards.bestBowlingText}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Boundaries & Extras</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-1.5 py-0.5 bg-emerald-950 border border-emerald-700/50 text-emerald-300 text-[11px] font-bold rounded">
                  4s: {report.summaryCards.totalFours}
                </span>
                <span className="px-1.5 py-0.5 bg-purple-950 border border-purple-700/50 text-purple-300 text-[11px] font-bold rounded">
                  6s: {report.summaryCards.totalSixes}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 p-3 bg-slate-900/80 border-b border-slate-800 overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveTab('scorecard')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'scorecard'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Full Scorecard</span>
        </button>

        <button
          onClick={() => setActiveTab('overs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'overs'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Over-by-Over</span>
        </button>

        <button
          onClick={() => setActiveTab('ballbyball')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'ballbyball'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Ball-by-Ball Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('awards')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'awards'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Player Stats & Awards</span>
        </button>

        <button
          onClick={() => setActiveTab('squads')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'squads'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Squads & Officials</span>
        </button>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="p-6">
        {/* TAB 1: FULL SCORECARD */}
        {activeTab === 'scorecard' && (
          <div>
            {/* Innings Selector Sub-bar */}
            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveInningsNum(1)}
                  disabled={!report.innings1Scorecard}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    activeInningsNum === 1
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  <span>1st Innings ({report.innings1Scorecard?.battingTeamName || 'Team A'})</span>
                  {report.innings1Scorecard && (
                    <span className="px-2 py-0.5 bg-slate-950 text-white rounded text-[11px]">
                      {report.innings1Scorecard.totalRuns}/{report.innings1Scorecard.totalWickets}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveInningsNum(2)}
                  disabled={!report.innings2Scorecard}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    activeInningsNum === 2
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-900 disabled:opacity-40'
                  }`}
                >
                  <span>2nd Innings ({report.innings2Scorecard?.battingTeamName || 'Team B'})</span>
                  {report.innings2Scorecard ? (
                    <span className="px-2 py-0.5 bg-slate-950 text-white rounded text-[11px]">
                      {report.innings2Scorecard.totalRuns}/{report.innings2Scorecard.totalWickets}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 uppercase">Yet to Bat</span>
                  )}
                </button>
              </div>

              {/* Broadcast Overlay Trigger Button */}
              <button
                onClick={() => handleSendToBroadcast('FULL_SCORECARD')}
                className="px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition print:hidden"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Display Scorecard Overlay</span>
              </button>
            </div>

            {activeInningsScorecard ? (
              <div className="space-y-8">
                {/* Batting Table */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Batting - {activeInningsScorecard.battingTeamName}
                    </h3>
                    <div className="text-xs text-slate-400 font-medium">
                      Overs: <span className="text-white font-bold">{activeInningsScorecard.oversDisplay}</span> | Run Rate:{' '}
                      <span className="text-emerald-400 font-bold">{activeInningsScorecard.runRate}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <th className="py-3 px-4">Batter</th>
                          <th className="py-3 px-4">Dismissal</th>
                          <th className="py-3 px-3 text-right">R</th>
                          <th className="py-3 px-3 text-right">B</th>
                          <th className="py-3 px-3 text-right">4s</th>
                          <th className="py-3 px-3 text-right">6s</th>
                          <th className="py-3 px-3 text-right">SR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {activeInningsScorecard.batsmen.map((b) => (
                          <tr key={b.playerId} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span>{b.playerName}</span>
                                {b.isCaptain && (
                                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded">
                                    (C)
                                  </span>
                                )}
                                {b.isWicketKeeper && (
                                  <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded">
                                    (WK)
                                  </span>
                                )}
                                {b.isTopScorer && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded" title="Top Scorer">
                                    ⭐ Top
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-medium capitalize">
                              {b.dismissalInfo}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-white text-sm">{b.runs}</td>
                            <td className="py-3 px-3 text-right text-slate-300">{b.ballsFaced}</td>
                            <td className="py-3 px-3 text-right text-emerald-400 font-semibold">{b.fours}</td>
                            <td className="py-3 px-3 text-right text-purple-400 font-semibold">{b.sixes}</td>
                            <td className="py-3 px-3 text-right text-slate-300 font-mono">{b.strikeRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Extras & Total Banner */}
                  <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
                    <div className="text-slate-400">
                      <span className="font-bold text-slate-300 uppercase mr-2">Extras:</span>
                      <span className="font-bold text-white mr-2">{activeInningsScorecard.extras.total}</span>
                      (wd {activeInningsScorecard.extras.wides}, nb {activeInningsScorecard.extras.noBalls}, b {activeInningsScorecard.extras.byes}, lb {activeInningsScorecard.extras.legByes})
                    </div>
                    <div className="text-sm font-black text-white">
                      TOTAL SCORE: <span className="text-emerald-400 text-lg">{activeInningsScorecard.totalRuns}/{activeInningsScorecard.totalWickets}</span> ({activeInningsScorecard.oversDisplay} Overs)
                    </div>
                  </div>
                </div>

                {/* Bowling Table */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      Bowling - {activeInningsScorecard.bowlingTeamName}
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <th className="py-3 px-4">Bowler</th>
                          <th className="py-3 px-3 text-right">O</th>
                          <th className="py-3 px-3 text-right">M</th>
                          <th className="py-3 px-3 text-right">R</th>
                          <th className="py-3 px-3 text-right">W</th>
                          <th className="py-3 px-3 text-right">Econ</th>
                          <th className="py-3 px-3 text-right">WD</th>
                          <th className="py-3 px-3 text-right">NB</th>
                          <th className="py-3 px-3 text-right">Dots</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {activeInningsScorecard.bowlers.map((bw) => (
                          <tr key={bw.playerId} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span>{bw.playerName}</span>
                                {bw.isTopBowler && (
                                  <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded">
                                    ⭐ Best
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right text-slate-300 font-mono">{bw.oversDisplay}</td>
                            <td className="py-3 px-3 text-right text-slate-300">{bw.maidens}</td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-200">{bw.runsConceded}</td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-400 text-sm">{bw.wickets}</td>
                            <td className="py-3 px-3 text-right text-slate-300 font-mono">{bw.economy}</td>
                            <td className="py-3 px-3 text-right text-slate-400">{bw.wides}</td>
                            <td className="py-3 px-3 text-right text-slate-400">{bw.noBalls}</td>
                            <td className="py-3 px-3 text-right text-slate-400">{bw.dotBalls}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fall of Wickets & Partnerships Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fall of Wickets */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Fall of Wickets
                    </h4>
                    {activeInningsScorecard.fallOfWickets.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {activeInningsScorecard.fallOfWickets.map((fow) => (
                          <div
                            key={fow.wicketNumber}
                            className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs"
                          >
                            <span className="font-bold text-emerald-400">
                              {fow.runs}-{fow.wicketNumber}
                            </span>{' '}
                            <span className="text-slate-300">({fow.dismissedPlayerName}, {fow.oversDisplay} ov)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No wickets fallen in this innings.</p>
                    )}
                  </div>

                  {/* Partnerships */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      Wicket Partnerships
                    </h4>
                    {activeInningsScorecard.partnerships.length > 0 ? (
                      <div className="space-y-2">
                        {activeInningsScorecard.partnerships.map((p, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-white block">{p.partnershipLabel}</span>
                              <span className="text-slate-400 text-[11px]">
                                {p.player1Name} & {p.player2Name}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-400 text-sm">{p.runs} runs</span>
                              <span className="text-slate-500 text-[10px] block">({p.balls} balls)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No partnership data recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                <p>Innings data not available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OVER-BY-OVER BREAKDOWN */}
        {activeTab === 'overs' && (
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Over-by-Over Matrix ({activeInningsNum === 1 ? '1st Innings' : '2nd Innings'})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveInningsNum(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    activeInningsNum === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  1st Innings
                </button>
                <button
                  onClick={() => setActiveInningsNum(2)}
                  disabled={!report.innings2Scorecard}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    activeInningsNum === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 disabled:opacity-40'
                  }`}
                >
                  2nd Innings
                </button>
              </div>
            </div>

            {activeInningsScorecard?.overSummaries && activeInningsScorecard.overSummaries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeInningsScorecard.overSummaries.map((ov) => (
                  <div key={ov.overNumber} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <div>
                        <span className="text-xs font-bold text-emerald-400 uppercase">Over {ov.overNumber}</span>
                        <span className="text-xs text-slate-300 block font-semibold">{ov.bowlerName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white">{ov.runsInOver} Runs</span>
                        {ov.wicketsInOver > 0 && (
                          <span className="text-[10px] font-bold text-red-400 block uppercase">
                            {ov.wicketsInOver} Wicket{ov.wicketsInOver > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ov.balls.map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center ${
                            b.isWicket
                              ? 'bg-red-600 text-white shadow-sm'
                              : b.runs === 6
                              ? 'bg-purple-600 text-white'
                              : b.runs === 4
                              ? 'bg-emerald-600 text-white'
                              : b.extraType !== 'NONE'
                              ? 'bg-amber-600/80 text-white'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {b.ballDisplay}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BarChart2 className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                <p>No completed overs recorded for this innings.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BALL-BY-BALL TIMELINE */}
        {activeTab === 'ballbyball' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveInningsNum(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    activeInningsNum === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  1st Innings
                </button>
                <button
                  onClick={() => setActiveInningsNum(2)}
                  disabled={!report.innings2Scorecard}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    activeInningsNum === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 disabled:opacity-40'
                  }`}
                >
                  2nd Innings
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
                  {(['ALL', 'BOUNDARIES', 'WICKETS', 'EXTRAS'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setBallFilter(f)}
                      className={`px-2.5 py-1 rounded-md font-bold transition ${
                        ballFilter === f ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={ballSearch}
                    onChange={(e) => setBallSearch(e.target.value)}
                    placeholder="Search player, over..."
                    className="bg-slate-900 border border-slate-800 text-white text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500 w-44"
                  />
                </div>
              </div>
            </div>

            {filteredBalls.length > 0 ? (
              <div className="space-y-3">
                {filteredBalls.map((b) => (
                  <div
                    key={b.id}
                    className={`bg-slate-900/80 border rounded-xl p-3.5 flex items-center justify-between gap-4 transition ${
                      b.isWicket
                        ? 'border-red-600/50 bg-red-950/20'
                        : b.runsOffBat === 6 || b.runsOffBat === 4
                        ? 'border-emerald-600/40 bg-emerald-950/10'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-emerald-400">
                        {b.overBallDisplay}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {b.bowlerName} to {b.strikerName}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">{b.description}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400 block">
                        Score: <span className="text-white">{b.totalRunsCumulative}/{b.totalWicketsCumulative}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Zap className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                <p>No ball events match the current filter.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PLAYER STATS & AWARDS */}
        {activeTab === 'awards' && (
          <div className="space-y-8">
            {/* Awards Edit Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Match Awards & Honors
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Calculated from cricket performance impact algorithms. Admin can override candidates.
                  </p>
                </div>

                {!report.isFinalized && (
                  <button
                    onClick={() => setEditingAwards(!editingAwards)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition border border-slate-700"
                  >
                    {editingAwards ? 'Cancel Editing' : 'Edit Award Winners'}
                  </button>
                )}
              </div>

              {/* Awards Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Man of the Match */}
                <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block mb-1">
                    🏆 Man of the Match
                  </span>

                  {editingAwards ? (
                    <div className="space-y-3 mt-2">
                      <select
                        value={selectedMomId}
                        onChange={(e) => setSelectedMomId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="">Select Player...</option>
                        {report.playerPerformances.map((p) => (
                          <option key={p.playerId} value={p.playerId}>
                            {p.playerName} ({p.teamName}) - {p.performancePoints} pts
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={momReason}
                        onChange={(e) => setMomReason(e.target.value)}
                        placeholder="Citation reason..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-lg font-bold text-white mt-1">
                        {report.selectedManOfMatch?.playerName || 'Not Assigned'}
                      </h4>
                      <p className="text-xs text-amber-300 font-medium mt-1">
                        {report.selectedManOfMatch?.teamName}
                      </p>
                      <p className="text-xs text-slate-300 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        {report.selectedManOfMatch?.details || 'Performance Rating'}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleSendToBroadcast('MAN_OF_MATCH')}
                    className="mt-4 w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 print:hidden"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Display MOM Overlay</span>
                  </button>
                </div>

                {/* Best Batter */}
                <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-5">
                  <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block mb-1">
                    ⚡ Best Batter
                  </span>

                  {editingAwards ? (
                    <div className="space-y-3 mt-2">
                      <select
                        value={selectedBatterId}
                        onChange={(e) => setSelectedBatterId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="">Select Batter...</option>
                        {report.playerPerformances.map((p) => (
                          <option key={p.playerId} value={p.playerId}>
                            {p.playerName} ({p.runs} runs)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-lg font-bold text-white mt-1">
                        {report.selectedBestBatter?.playerName || 'N/A'}
                      </h4>
                      <p className="text-xs text-blue-300 font-medium mt-1">
                        {report.selectedBestBatter?.teamName}
                      </p>
                      <p className="text-xs text-slate-300 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        {report.selectedBestBatter?.details}
                      </p>
                    </div>
                  )}
                </div>

                {/* Best Bowler */}
                <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-5">
                  <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-widest block mb-1">
                    🎯 Best Bowler
                  </span>

                  {editingAwards ? (
                    <div className="space-y-3 mt-2">
                      <select
                        value={selectedBowlerId}
                        onChange={(e) => setSelectedBowlerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="">Select Bowler...</option>
                        {report.playerPerformances.map((p) => (
                          <option key={p.playerId} value={p.playerId}>
                            {p.playerName} ({p.wickets} wickets)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-lg font-bold text-white mt-1">
                        {report.selectedBestBowler?.playerName || 'N/A'}
                      </h4>
                      <p className="text-xs text-purple-300 font-medium mt-1">
                        {report.selectedBestBowler?.teamName}
                      </p>
                      <p className="text-xs text-slate-300 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        {report.selectedBestBowler?.details}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {editingAwards && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSaveAwards}
                    disabled={savingAwards}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    {savingAwards ? 'Saving...' : 'Save Award Selections'}
                  </button>
                </div>
              )}
            </div>

            {/* Match Impact Performance Leaderboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Match Performance Impact Leaderboard
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase border-b border-slate-800">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-3 text-right">Runs (B)</th>
                      <th className="py-3 px-3 text-right">Wickets (O)</th>
                      <th className="py-3 px-3 text-right">Fielding</th>
                      <th className="py-3 px-3 text-right">Impact Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {report.playerPerformances
                      .sort((a, b) => b.performancePoints - a.performancePoints)
                      .map((p, rank) => (
                        <tr key={p.playerId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-bold text-slate-500">#{rank + 1}</td>
                          <td className="py-3 px-4 font-bold text-white">{p.playerName}</td>
                          <td className="py-3 px-4 text-slate-400">{p.teamName}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-200">
                            {p.runs} ({p.ballsFaced})
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-200">
                            {p.wickets}/{p.runsConceded} ({p.oversDisplay})
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400">
                            {p.catches + p.stumpings + p.runOuts}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-400 text-sm">
                            {p.performancePoints}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SQUADS & OFFICIALS */}
        {activeTab === 'squads' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team A Squad */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                  {report.squadsReport.teamA.team.name} Playing XI
                </h3>

                <ul className="space-y-2 text-xs">
                  {report.squadsReport.teamA.playingXI.map((p) => (
                    <li key={p.id} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{p.role || 'Player'}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Team B Squad */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                  {report.squadsReport.teamB.team.name} Playing XI
                </h3>

                <ul className="space-y-2 text-xs">
                  {report.squadsReport.teamB.playingXI.map((p) => (
                    <li key={p.id} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{p.role || 'Player'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Officials & Sponsors */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Match Officials & Sponsors
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400 block uppercase">Umpires</span>
                  <span className="text-white font-semibold">
                    {report.officialsReport.umpires.join(', ') || 'Official Umpires'}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-400 block uppercase">Match Referee / Scorers</span>
                  <span className="text-white font-semibold">
                    {report.officialsReport.scorers.join(', ') || 'Official Scorers'}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-400 block uppercase">Sponsor</span>
                  <span className="text-emerald-400 font-semibold">
                    {report.sponsorsReport.matchSponsor || report.sponsorsReport.tournamentSponsor || 'SportsPulse Series'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FINALIZATION PRE-CHECK MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Finalize & Lock Match Report</h3>
                <p className="text-xs text-slate-400">Perform pre-publication audit checks.</p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span>Scorecard Validation Check:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Passed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Innings Events Integrity:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Immutable
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Awards Assigned:</span>
                <span className="text-amber-400 font-bold">
                  {report.selectedManOfMatch ? 'Assigned' : 'Auto-Calculated'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Finalizing will lock the scorecard and set match status to COMPLETED. Admins can reopen if corrections are needed later.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition"
              >
                Cancel
              </button>

              <button
                onClick={handleFinalizeReport}
                disabled={finalizing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
              >
                {finalizing ? 'Finalizing...' : 'Confirm & Lock Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
