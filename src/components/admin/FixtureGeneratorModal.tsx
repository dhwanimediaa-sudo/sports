import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Group, SportType, FixturePreviewResponse, FixtureConflictWarning } from '../../types';
import { api } from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Layers,
  Settings2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Eye,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface FixtureGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  sport: SportType;
  groups: Group[];
  onSuccess: (matchesCreated: number) => void;
}

export const FixtureGeneratorModal: React.FC<FixtureGeneratorModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  sport,
  groups,
  onSuccess,
}) => {
  const [activeView, setActiveView] = useState<'CONFIG' | 'PREVIEW'>('CONFIG');

  // Generation parameters
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [type, setType] = useState<'SINGLE_ROUND_ROBIN' | 'DOUBLE_ROUND_ROBIN'>('SINGLE_ROUND_ROBIN');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [matchIntervalMinutes, setMatchIntervalMinutes] = useState(120);
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(105);
  const [daysBetweenRounds, setDaysBetweenRounds] = useState(1);
  const [venuesText, setVenuesText] = useState('Main Stadium, Ground 2');
  const [groundsText, setGroundsText] = useState('Pitch 1, Pitch 2');
  const [venueAllocationStrategy, setVenueAllocationStrategy] = useState<
    'ROUND_ROBIN_ROTATION' | 'CONCURRENT_VENUES' | 'SINGLE_VENUE'
  >('ROUND_ROBIN_ROTATION');
  const [minRestHours, setMinRestHours] = useState(4);
  const [clearExistingDraft, setClearExistingDraft] = useState(true);

  // Sport specific settings
  const [cricketOvers, setCricketOvers] = useState(20);
  const [volleyballSets, setVolleyballSets] = useState(3);
  const [footballMinutes, setFootballMinutes] = useState(90);
  const [kabaddiRounds, setKabaddiRounds] = useState(20);

  // State
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<FixturePreviewResponse | null>(null);

  const getPayload = () => {
    const venues = venuesText
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const grounds = groundsText
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    const customMatchConfig: any = {};
    if (sport === 'CRICKET') customMatchConfig.totalOvers = Number(cricketOvers);
    if (sport === 'VOLLEYBALL' || sport === 'TENNIS' || sport === 'BADMINTON' || sport === 'TABLE_TENNIS') {
      customMatchConfig.totalSets = Number(volleyballSets);
    }
    if (sport === 'FOOTBALL' || sport === 'HOCKEY') {
      customMatchConfig.halfDurationMinutes = Math.floor(Number(footballMinutes) / 2);
    }
    if (sport === 'KABADDI') {
      customMatchConfig.halfDurationMinutes = Number(kabaddiRounds);
    }

    return {
      tournamentId,
      groupId: selectedGroupId === 'ALL' ? undefined : selectedGroupId,
      type,
      startDate,
      startTime,
      matchIntervalMinutes: Number(matchIntervalMinutes),
      matchDurationMinutes: Number(matchDurationMinutes),
      daysBetweenRounds: Number(daysBetweenRounds),
      venues: venues.length > 0 ? venues : undefined,
      grounds: grounds.length > 0 ? grounds : undefined,
      venueAllocationStrategy,
      minRestHours: Number(minRestHours),
      customMatchConfig,
      clearExistingDraftFixtures: clearExistingDraft,
    };
  };

  const handlePreview = async () => {
    setError(null);
    try {
      setPreviewLoading(true);
      const payload = getPayload();
      const res = await api.previewTournamentFixtures(tournamentId, payload);
      setPreviewData(res);
      setActiveView('PREVIEW');
    } catch (err: any) {
      setError(err.message || 'Failed to generate preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommitGenerate = async () => {
    setError(null);
    try {
      setLoading(true);
      const payload = getPayload();
      const res = await api.generateTournamentFixtures(tournamentId, payload);
      onSuccess(res.createdMatches?.length || 0);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate fixtures.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="AUTOMATIC FIXTURE GENERATOR & SCHEDULER"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('CONFIG')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeView === 'CONFIG'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>1. Scheduling Setup</span>
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeView === 'PREVIEW'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2. Preview & Validation</span>
              {previewData && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-950/40 text-[10px] rounded-full">
                  {previewData.fixtures.length} matches
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Existing live & completed matches protected</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* VIEW 1: CONFIGURATION */}
        {activeView === 'CONFIG' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Deterministic Circle Method schedule engine balances home/away pairings, handles BYE rounds for odd-numbered pools, and validates rest intervals.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {/* Target Group */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Target Groups
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Groups ({groups.length} Groups)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code || 'Group'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fixture Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Round Robin Format
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="SINGLE_ROUND_ROBIN">Single Round Robin (1 Match per pair)</option>
                  <option value="DOUBLE_ROUND_ROBIN">Double Round Robin (Home & Away)</option>
                </select>
              </div>

              {/* Start Date */}
              <Input
                label="Tournament Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                icon={<Calendar className="w-4 h-4" />}
                required
              />

              {/* Daily Start Time */}
              <Input
                label="Daily Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                icon={<Clock className="w-4 h-4" />}
                required
              />

              {/* Match Slot Interval */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Slot Interval (Mins)
                </label>
                <select
                  value={matchIntervalMinutes}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMatchIntervalMinutes(v);
                    setMatchDurationMinutes(Math.max(30, v - 15));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (1h)</option>
                  <option value={90}>90 Minutes (1.5h)</option>
                  <option value={120}>120 Minutes (2h)</option>
                  <option value={180}>180 Minutes (3h)</option>
                  <option value={240}>240 Minutes (4h)</option>
                </select>
              </div>

              {/* Spacing Between Rounds */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Spacing Between Rounds
                </label>
                <select
                  value={daysBetweenRounds}
                  onChange={(e) => setDaysBetweenRounds(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value={0}>Same Day (All rounds in 1 day)</option>
                  <option value={1}>1 Day (Daily consecutive rounds)</option>
                  <option value={2}>2 Days between rounds</option>
                  <option value={3}>3 Days between rounds</option>
                  <option value={7}>7 Days (Weekly weekend rounds)</option>
                </select>
              </div>
            </div>

            {/* Venue & Pitch Allocation Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="sm:col-span-2">
                <Input
                  label="Venues / Stadiums (comma separated)"
                  value={venuesText}
                  onChange={(e) => setVenuesText(e.target.value)}
                  placeholder="e.g. Wankhede Stadium, DY Patil Stadium"
                  icon={<MapPin className="w-4 h-4" />}
                />
              </div>

              <div>
                <Input
                  label="Grounds / Pitches (comma separated)"
                  value={groundsText}
                  onChange={(e) => setGroundsText(e.target.value)}
                  placeholder="e.g. Pitch 1, Pitch 2"
                  icon={<MapPin className="w-4 h-4" />}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Venue Allocation Mode
                </label>
                <select
                  value={venueAllocationStrategy}
                  onChange={(e) => setVenueAllocationStrategy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ROUND_ROBIN_ROTATION">Sequential Rotation</option>
                  <option value="CONCURRENT_VENUES">Concurrent Pitches (Parallel Matches)</option>
                  <option value="SINGLE_VENUE">Single Venue Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Min Team Rest (Hours)
                </label>
                <select
                  value={minRestHours}
                  onChange={(e) => setMinRestHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value={2}>2 Hours</option>
                  <option value={4}>4 Hours (Standard)</option>
                  <option value={6}>6 Hours</option>
                  <option value={12}>12 Hours (Half-day)</option>
                  <option value={24}>24 Hours (Next Day)</option>
                </select>
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="clearDraft"
                    checked={clearExistingDraft}
                    onChange={(e) => setClearExistingDraft(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500"
                  />
                  <label htmlFor="clearDraft" className="text-xs text-slate-300 cursor-pointer">
                    Replace unstarted draft fixtures
                  </label>
                </div>
              </div>
            </div>

            {/* Sport Specific Quick Settings */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sport Match Parameters ({sport})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {sport === 'CRICKET' && (
                  <Input
                    label="Overs Per Innings"
                    type="number"
                    value={cricketOvers}
                    onChange={(e) => setCricketOvers(Number(e.target.value))}
                  />
                )}
                {(sport === 'VOLLEYBALL' || sport === 'TENNIS' || sport === 'BADMINTON' || sport === 'TABLE_TENNIS') && (
                  <Input
                    label="Sets To Win"
                    type="number"
                    value={volleyballSets}
                    onChange={(e) => setVolleyballSets(Number(e.target.value))}
                  />
                )}
                {(sport === 'FOOTBALL' || sport === 'HOCKEY') && (
                  <Input
                    label="Match Duration (Minutes)"
                    type="number"
                    value={footballMinutes}
                    onChange={(e) => setFootballMinutes(Number(e.target.value))}
                  />
                )}
                {sport === 'KABADDI' && (
                  <Input
                    label="Half Duration (Minutes)"
                    type="number"
                    value={kabaddiRounds}
                    onChange={(e) => setKabaddiRounds(Number(e.target.value))}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="emerald"
                size="sm"
                type="button"
                onClick={handlePreview}
                loading={previewLoading}
                icon={<Eye className="w-4 h-4" />}
              >
                Preview Schedule & Conflicts
              </Button>
            </div>
          </div>
        )}

        {/* VIEW 2: LIVE PREVIEW & CONFLICT AUDIT */}
        {activeView === 'PREVIEW' && previewData && (
          <div className="space-y-4">
            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Total Matches
                </span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                  {previewData.summary.totalMatches}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Total Rounds
                </span>
                <span className="text-sm font-extrabold text-slate-200 font-mono">
                  {previewData.summary.totalRounds}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Schedule Dates
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {previewData.summary.startDate} → {previewData.summary.estimatedEndDate}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Venues Utilized
                </span>
                <span className="text-sm font-extrabold text-slate-200 font-mono">
                  {previewData.summary.totalVenues}
                </span>
              </div>
            </div>

            {/* Conflict Warnings (if any) */}
            {previewData.conflicts.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {previewData.conflicts.length} Schedule Notice(s) Detected
                  </span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {previewData.conflicts.map((c, i) => (
                    <div
                      key={i}
                      className="text-[11px] text-amber-300/90 flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-amber-500/20"
                    >
                      <Badge variant={c.severity === 'ERROR' ? 'danger' : 'warning'}>
                        {c.type}
                      </Badge>
                      <span className="flex-1">{c.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BYE Rounds (if any) */}
            {previewData.byes.length > 0 && (
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>BYE Allocations ({previewData.byes.length} rounds)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {previewData.byes.map((b, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-blue-500/30 text-[11px] text-blue-300"
                    >
                      <strong>{b.roundName}:</strong> {b.teamName} (BYE)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fixtures List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Generated Fixtures Preview ({previewData.fixtures.length} matches)
              </h3>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {previewData.fixtures.map((f) => (
                  <div
                    key={f.tempId}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono font-bold text-emerald-400 text-[11px]">
                        {f.matchNumber}
                      </span>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span>{f.homeTeamName}</span>
                          <span className="text-slate-500 text-[10px]">vs</span>
                          <span>{f.awayTeamName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {f.roundName} {f.groupName ? `• ${f.groupName}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{f.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{f.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {f.venue} {f.ground ? `(${f.ground})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setActiveView('CONFIG')}
                disabled={loading}
              >
                Back to Settings
              </Button>
              <Button
                variant="emerald"
                size="sm"
                type="button"
                onClick={handleCommitGenerate}
                loading={loading}
                icon={<Sparkles className="w-4 h-4" />}
              >
                COMMIT & GENERATE {previewData.fixtures.length} FIXTURES
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
