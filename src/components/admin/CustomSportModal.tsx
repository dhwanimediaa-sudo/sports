import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  CustomSport,
  CustomScoringEventDef,
  CustomStatisticDef,
  CustomAwardDef,
} from '../../types';
import {
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  BarChart2,
  Flame,
  Shield,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export interface CustomSportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sport: CustomSport) => void;
  initialSport?: CustomSport | null;
}

const SPORT_CATEGORIES: CustomSport['sportCategory'][] = ['TEAM', 'INDIVIDUAL', 'DOUBLES', 'COMBAT', 'TARGET', 'RACQUET'];
const MATCH_TYPES: CustomSport['matchType'][] = ['QUARTERS', 'HALVES', 'SETS', 'ROUNDS', 'FRAMES', 'INNINGS', 'PERIODS', 'CONTINUOUS', 'POINTS_ONLY'];
const SCORING_SYSTEMS: CustomSport['scoringSystem'][] = ['POINTS', 'GOALS', 'RUNS', 'SETS_AND_GAMES', 'CUSTOM'];
const GRAPHIC_TYPES: CustomScoringEventDef['graphicType'][] = ['BANNER', 'CENTER_POPUP', 'LOWER_THIRD', 'FULLSCREEN_ALERT', 'SUBTLE'];
const COLOR_OPTIONS = ['emerald', 'amber', 'cyan', 'purple', 'rose', 'blue', 'indigo', 'orange', 'teal'];

export const CustomSportModal: React.FC<CustomSportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSport = null,
}) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'scoring_rules' | 'statistics' | 'awards' | 'regulations'>('basics');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basics
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [icon, setIcon] = useState('⚙️');
  const [description, setDescription] = useState('');
  const [sportCategory, setSportCategory] = useState<CustomSport['sportCategory']>('TEAM');
  const [isIndoor, setIsIndoor] = useState<CustomSport['isIndoor']>('BOTH');
  const [matchType, setMatchType] = useState<CustomSport['matchType']>('PERIODS');
  const [totalPeriods, setTotalPeriods] = useState<number>(2);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState<number>(15);
  const [isClockCountdown, setIsClockCountdown] = useState<boolean>(true);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(5);
  const [scoringSystem, setScoringSystem] = useState<CustomSport['scoringSystem']>('POINTS');
  const [targetScore, setTargetScore] = useState<number>(0);
  const [winningMargin, setWinningMargin] = useState<number>(1);
  const [maxScoreCap, setMaxScoreCap] = useState<number | undefined>(undefined);
  const [defaultPlayersPerTeam, setDefaultPlayersPerTeam] = useState<number>(5);

  // Lists
  const [scoringEvents, setScoringEvents] = useState<CustomScoringEventDef[]>([]);
  const [customStatistics, setCustomStatistics] = useState<CustomStatisticDef[]>([]);
  const [customAwards, setCustomAwards] = useState<CustomAwardDef[]>([]);
  const [officialsList, setOfficialsList] = useState<string[]>(['Referee', 'Umpire', 'Scorekeeper']);
  const [playerRoles, setPlayerRoles] = useState<string[]>(['Player', 'Captain', 'Substitute']);

  // Regulations
  const [maxTimeoutsPerPeriod, setMaxTimeoutsPerPeriod] = useState(1);
  const [maxTimeoutsPerMatch, setMaxTimeoutsPerMatch] = useState(2);
  const [timeoutDurationSeconds, setTimeoutDurationSeconds] = useState(60);

  const [maxSubstitutionsPerMatch, setMaxSubstitutionsPerMatch] = useState(10);
  const [rollingSubstitutions, setRollingSubstitutions] = useState(true);

  const [extraTimeEnabled, setExtraTimeEnabled] = useState(false);
  const [extraTimeDuration, setExtraTimeDuration] = useState(5);
  const [goldenGoal, setGoldenGoal] = useState(false);

  const [shootoutEnabled, setShootoutEnabled] = useState(false);
  const [shootoutRounds, setShootoutRounds] = useState(5);

  useEffect(() => {
    if (initialSport) {
      setName(initialSport.name || '');
      setShortCode(initialSport.shortCode || '');
      setIcon(initialSport.icon || '⚙️');
      setDescription(initialSport.description || '');
      setSportCategory(initialSport.sportCategory || 'TEAM');
      setIsIndoor(initialSport.isIndoor || 'BOTH');
      setMatchType(initialSport.matchType || 'PERIODS');
      setTotalPeriods(initialSport.totalPeriods || 2);
      setPeriodDurationMinutes(initialSport.periodDurationMinutes || 0);
      setIsClockCountdown(Boolean(initialSport.isClockCountdown));
      setBreakDurationMinutes(initialSport.breakDurationMinutes || 5);
      setScoringSystem(initialSport.scoringSystem || 'POINTS');
      setTargetScore(initialSport.targetScore || 0);
      setWinningMargin(initialSport.winningMargin || 1);
      setMaxScoreCap(initialSport.maxScoreCap);
      setDefaultPlayersPerTeam(initialSport.defaultPlayersPerTeam || 5);

      setScoringEvents(initialSport.scoringEvents || []);
      setCustomStatistics(initialSport.customStatistics || []);
      setCustomAwards(initialSport.customAwards || []);
      setOfficialsList(initialSport.officialsList || ['Referee', 'Scorekeeper']);
      setPlayerRoles(initialSport.playerRoles || ['Player', 'Captain']);

      if (initialSport.timeoutRules) {
        setMaxTimeoutsPerPeriod(initialSport.timeoutRules.maxTimeoutsPerPeriod ?? 1);
        setMaxTimeoutsPerMatch(initialSport.timeoutRules.maxTimeoutsPerMatch ?? 2);
        setTimeoutDurationSeconds(initialSport.timeoutRules.timeoutDurationSeconds ?? 60);
      }

      if (initialSport.substitutionRules) {
        setMaxSubstitutionsPerMatch(initialSport.substitutionRules.maxSubstitutionsPerMatch ?? 10);
        setRollingSubstitutions(Boolean(initialSport.substitutionRules.rollingSubstitutions));
      }

      if (initialSport.extraTimeRules) {
        setExtraTimeEnabled(Boolean(initialSport.extraTimeRules.enabled));
        setExtraTimeDuration(initialSport.extraTimeRules.durationMinutes ?? 5);
        setGoldenGoal(Boolean(initialSport.extraTimeRules.goldenGoal));
      }

      if (initialSport.shootoutRules) {
        setShootoutEnabled(Boolean(initialSport.shootoutRules.enabled));
        setShootoutRounds(initialSport.shootoutRules.initialRounds ?? 5);
      }
    } else {
      // Default new sport
      setName('');
      setShortCode('');
      setIcon('⚡');
      setDescription('');
      setSportCategory('TEAM');
      setIsIndoor('BOTH');
      setMatchType('PERIODS');
      setTotalPeriods(2);
      setPeriodDurationMinutes(15);
      setIsClockCountdown(true);
      setBreakDurationMinutes(5);
      setScoringSystem('POINTS');
      setTargetScore(0);
      setWinningMargin(1);
      setDefaultPlayersPerTeam(5);

      setScoringEvents([
        {
          id: `ev-${Date.now()}-1`,
          name: 'Standard Point (+1)',
          shortName: '+1 PT',
          points: 1,
          icon: '🎯',
          graphicType: 'BANNER',
          playerAttribution: 'REQUIRED',
          teamAttribution: 'REQUIRED',
          trackStatistics: true,
          triggerBroadcast: true,
          undoAllowed: true,
          color: 'emerald',
          isDefault: true,
        },
        {
          id: `ev-${Date.now()}-2`,
          name: 'Big Play / Major Goal (+2)',
          shortName: '+2 PTS',
          points: 2,
          icon: '🔥',
          graphicType: 'CENTER_POPUP',
          playerAttribution: 'REQUIRED',
          teamAttribution: 'REQUIRED',
          trackStatistics: true,
          triggerBroadcast: true,
          undoAllowed: true,
          color: 'purple',
        },
        {
          id: `ev-${Date.now()}-3`,
          name: 'Foul / Penalty (0)',
          shortName: 'FOUL',
          points: 0,
          icon: '⚠️',
          graphicType: 'LOWER_THIRD',
          playerAttribution: 'REQUIRED',
          teamAttribution: 'REQUIRED',
          trackStatistics: true,
          triggerBroadcast: true,
          undoAllowed: true,
          color: 'rose',
        },
      ]);

      setCustomStatistics([
        {
          id: 'stat-points',
          name: 'Total Points',
          shortCode: 'PTS',
          dataType: 'NUMBER',
          isPositive: true,
          visibleInConsole: true,
          visibleInBroadcast: true,
          visibleInReport: true,
        },
      ]);

      setCustomAwards([
        {
          id: 'award-mvp',
          name: 'Player of the Match',
          shortCode: 'POTM',
          icon: '🏆',
          description: 'Most outstanding player of the match',
          criteriaStatId: 'stat-points',
          isAutoCalculated: true,
        },
      ]);
    }
  }, [initialSport, isOpen]);

  // Scoring Event Operations
  const handleAddEvent = () => {
    const newId = `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setScoringEvents([
      ...scoringEvents,
      {
        id: newId,
        name: 'New Event (+1)',
        shortName: '+1',
        points: 1,
        icon: '🎯',
        graphicType: 'BANNER',
        playerAttribution: 'REQUIRED',
        teamAttribution: 'REQUIRED',
        trackStatistics: true,
        triggerBroadcast: true,
        undoAllowed: true,
        color: 'emerald',
      },
    ]);
  };

  const handleUpdateEvent = (index: number, updates: Partial<CustomScoringEventDef>) => {
    const next = [...scoringEvents];
    next[index] = { ...next[index], ...updates };
    setScoringEvents(next);
  };

  const handleDeleteEvent = (index: number) => {
    setScoringEvents(scoringEvents.filter((_, i) => i !== index));
  };

  // Statistic Operations
  const handleAddStat = () => {
    const newId = `stat-${Date.now()}`;
    setCustomStatistics([
      ...customStatistics,
      {
        id: newId,
        name: 'Custom Stat',
        shortCode: 'STAT',
        dataType: 'NUMBER',
        isPositive: true,
        visibleInConsole: true,
        visibleInBroadcast: true,
        visibleInReport: true,
      },
    ]);
  };

  const handleUpdateStat = (index: number, updates: Partial<CustomStatisticDef>) => {
    const next = [...customStatistics];
    next[index] = { ...next[index], ...updates };
    setCustomStatistics(next);
  };

  const handleDeleteStat = (index: number) => {
    setCustomStatistics(customStatistics.filter((_, i) => i !== index));
  };

  // Award Operations
  const handleAddAward = () => {
    const newId = `award-${Date.now()}`;
    setCustomAwards([
      ...customAwards,
      {
        id: newId,
        name: 'Special Award',
        shortCode: 'AWD',
        icon: '🎖️',
        description: 'Award description',
        isAutoCalculated: true,
      },
    ]);
  };

  const handleUpdateAward = (index: number, updates: Partial<CustomAwardDef>) => {
    const next = [...customAwards];
    next[index] = { ...next[index], ...updates };
    setCustomAwards(next);
  };

  const handleDeleteAward = (index: number) => {
    setCustomAwards(customAwards.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a valid sport name.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<CustomSport> = {
      name: name.trim(),
      shortCode: (shortCode || name.substring(0, 3)).trim().toUpperCase(),
      icon: icon.trim() || '⚙️',
      description: description.trim(),
      sportCategory,
      isIndoor,
      matchType,
      totalPeriods: Number(totalPeriods) || 1,
      periodDurationMinutes: Number(periodDurationMinutes) || 0,
      isClockCountdown,
      breakDurationMinutes: Number(breakDurationMinutes) || 0,
      scoringSystem,
      targetScore: Number(targetScore) || 0,
      winningMargin: Number(winningMargin) || 1,
      maxScoreCap: maxScoreCap ? Number(maxScoreCap) : undefined,
      defaultPlayersPerTeam: Number(defaultPlayersPerTeam) || 5,
      scoringEvents,
      customStatistics,
      customAwards,
      officialsList,
      playerRoles,
      timeoutRules: {
        maxTimeoutsPerPeriod,
        maxTimeoutsPerMatch,
        timeoutDurationSeconds,
      },
      substitutionRules: {
        maxSubstitutionsPerMatch,
        maxSubstitutionsPerPeriod: maxSubstitutionsPerMatch,
        rollingSubstitutions,
      },
      extraTimeRules: {
        enabled: extraTimeEnabled,
        durationMinutes: extraTimeDuration,
        periodsCount: 2,
        goldenGoal,
      },
      shootoutRules: {
        enabled: shootoutEnabled,
        initialRounds: shootoutRounds,
        suddenDeath: true,
      },
    };

    try {
      let saved: CustomSport;
      if (initialSport?.id) {
        const res = await fetch(`/api/custom-sports/${initialSport.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('sportspulse_token')}` },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to update custom sport.');
        saved = json.customSport;
      } else {
        const res = await fetch('/api/custom-sports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('sportspulse_token')}` },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to create custom sport.');
        saved = json.customSport;
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving custom sport.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialSport ? `Edit Sport Engine: ${initialSport.name}` : 'Configure New Custom Sport Engine'}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('basics')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'basics' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" /> Basics & Timing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scoring_rules')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'scoring_rules' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" /> Scoring Rule Builder ({scoringEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'statistics' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" /> Player Stats ({customStatistics.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('awards')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'awards' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" /> Awards ({customAwards.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('regulations')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'regulations' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" /> Regulations & Roles
          </button>
        </div>

        {/* Tab 1: Basics & Timing */}
        {activeTab === 'basics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Sport Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Pickleball Pro, Team Handball, Water Polo"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Short Code (3-4 Chars)
                </label>
                <Input
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                  placeholder="e.g., PB, HB, WP"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Sport Emoji / Icon
                </label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g., 🏓, 🤾, 🤽, 🏉"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={sportCategory}
                  onChange={(e) => setSportCategory(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {SPORT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Indoor / Outdoor
                </label>
                <select
                  value={isIndoor}
                  onChange={(e) => setIsIndoor(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="INDOOR">Indoor</option>
                  <option value="OUTDOOR">Outdoor</option>
                  <option value="BOTH">Both / Flexible</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Description / Rule Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                placeholder="Brief summary of match rules, points systems, and dynamics..."
              />
            </div>

            <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Match Structure & Timing</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Match Structure Type</label>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {MATCH_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Total Periods</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={totalPeriods}
                    onChange={(e) => setTotalPeriods(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Period Duration (Minutes)</label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={periodDurationMinutes}
                    onChange={(e) => setPeriodDurationMinutes(Number(e.target.value))}
                    placeholder="0 for untimed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Break Duration (Min)</label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={breakDurationMinutes}
                    onChange={(e) => setBreakDurationMinutes(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Scoring Metric</label>
                  <select
                    value={scoringSystem}
                    onChange={(e) => setScoringSystem(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {SCORING_SYSTEMS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Target Score to Win (0 if untimed/points)</label>
                  <Input
                    type="number"
                    min={0}
                    value={targetScore}
                    onChange={(e) => setTargetScore(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Winning Margin (e.g. 2 for deuce)</label>
                  <Input
                    type="number"
                    min={1}
                    value={winningMargin}
                    onChange={(e) => setWinningMargin(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Scoring Rule Builder */}
        {activeTab === 'scoring_rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Scoring Events & Point Values</h4>
                <p className="text-xs text-zinc-400">
                  Define action buttons that appear on the Live Scoring Console and trigger TV broadcast overlays.
                </p>
              </div>
              <Button type="button" onClick={handleAddEvent} className="gap-2 text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Add Scoring Event
              </Button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {scoringEvents.map((event, idx) => (
                <div
                  key={event.id || idx}
                  className="p-3 bg-zinc-900 border border-white/10 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-3 hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={event.icon || '🎯'}
                      onChange={(e) => handleUpdateEvent(idx, { icon: e.target.value })}
                      className="w-10 h-10 text-center text-lg bg-zinc-800 border border-white/10 rounded-lg text-white"
                      title="Emoji Icon"
                    />
                    <select
                      value={event.color || 'emerald'}
                      onChange={(e) => handleUpdateEvent(idx, { color: e.target.value })}
                      className="bg-zinc-800 text-xs border border-white/10 rounded-lg px-2 py-2 text-white"
                    >
                      {COLOR_OPTIONS.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
                    <Input
                      value={event.name}
                      onChange={(e) => handleUpdateEvent(idx, { name: e.target.value })}
                      placeholder="Event Name (e.g., Goal, Ace, Try)"
                      className="text-xs"
                    />
                    <Input
                      value={event.shortName}
                      onChange={(e) => handleUpdateEvent(idx, { shortName: e.target.value })}
                      placeholder="Button Label (e.g., +1 PT)"
                      className="text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 shrink-0">Pts:</span>
                      <Input
                        type="number"
                        value={event.points}
                        onChange={(e) => handleUpdateEvent(idx, { points: Number(e.target.value) })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={event.graphicType || 'BANNER'}
                      onChange={(e) => handleUpdateEvent(idx, { graphicType: e.target.value as any })}
                      className="bg-zinc-800 text-xs border border-white/10 rounded-lg px-2 py-2 text-zinc-300"
                      title="Broadcast Overlay Style"
                    >
                      {GRAPHIC_TYPES.map((gt) => (
                        <option key={gt} value={gt}>
                          {gt}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(idx)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Statistics */}
        {activeTab === 'statistics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Configurable Player Statistics</h4>
                <p className="text-xs text-zinc-400">
                  Track individual metrics automatically tallied across scoring events or entered during live matches.
                </p>
              </div>
              <Button type="button" onClick={handleAddStat} className="gap-2 text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Add Statistic
              </Button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {customStatistics.map((stat, idx) => (
                <div
                  key={stat.id || idx}
                  className="p-3 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <Input
                      value={stat.name}
                      onChange={(e) => handleUpdateStat(idx, { name: e.target.value })}
                      placeholder="Stat Name (e.g., Aces, Saves, Blocks)"
                      className="text-xs"
                    />
                    <Input
                      value={stat.shortCode}
                      onChange={(e) => handleUpdateStat(idx, { shortCode: e.target.value.toUpperCase() })}
                      placeholder="Code (e.g., ACE, SV)"
                      className="text-xs"
                      maxLength={6}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-zinc-400 flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stat.isPositive}
                          onChange={(e) => handleUpdateStat(idx, { isPositive: e.target.checked })}
                          className="rounded border-white/10 bg-zinc-800 text-amber-500"
                        />
                        Positive Metric
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteStat(idx)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Awards */}
        {activeTab === 'awards' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Configurable Awards Engine</h4>
                <p className="text-xs text-zinc-400">
                  Awards calculated from match statistics with manual admin citation overrides on the Match Report.
                </p>
              </div>
              <Button type="button" onClick={handleAddAward} className="gap-2 text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Add Award
              </Button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {customAwards.map((award, idx) => (
                <div
                  key={award.id || idx}
                  className="p-3 bg-zinc-900 border border-white/10 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-3"
                >
                  <input
                    type="text"
                    value={award.icon || '🏆'}
                    onChange={(e) => handleUpdateAward(idx, { icon: e.target.value })}
                    className="w-10 h-10 text-center text-lg bg-zinc-800 border border-white/10 rounded-lg text-white"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full">
                    <Input
                      value={award.name}
                      onChange={(e) => handleUpdateAward(idx, { name: e.target.value })}
                      placeholder="Award Title (e.g. Player of the Match)"
                      className="text-xs"
                    />
                    <Input
                      value={award.description}
                      onChange={(e) => handleUpdateAward(idx, { description: e.target.value })}
                      placeholder="Criteria / Citation summary"
                      className="text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAward(idx)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Regulations & Roles */}
        {activeTab === 'regulations' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Timeout Rules</h5>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Timeouts Per Period</label>
                  <Input
                    type="number"
                    min={0}
                    value={maxTimeoutsPerPeriod}
                    onChange={(e) => setMaxTimeoutsPerPeriod(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Timeout Duration (Seconds)</label>
                  <Input
                    type="number"
                    min={0}
                    value={timeoutDurationSeconds}
                    onChange={(e) => setTimeoutDurationSeconds(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Substitution Rules</h5>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Max Substitutions Per Match</label>
                  <Input
                    type="number"
                    min={0}
                    value={maxSubstitutionsPerMatch}
                    onChange={(e) => setMaxSubstitutionsPerMatch(Number(e.target.value))}
                  />
                </div>
                <div className="pt-2">
                  <label className="text-xs text-zinc-300 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rollingSubstitutions}
                      onChange={(e) => setRollingSubstitutions(e.target.checked)}
                      className="rounded border-white/10 bg-zinc-800 text-amber-500"
                    />
                    Enable Rolling / Flying Substitutions
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl space-y-3">
              <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Officials & Player Roles</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Officials (Comma-separated)</label>
                  <Input
                    value={officialsList.join(', ')}
                    onChange={(e) =>
                      setOfficialsList(
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="Head Referee, Line Judge, Scorekeeper"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Player Roles (Comma-separated)</label>
                  <Input
                    value={playerRoles.join(', ')}
                    onChange={(e) =>
                      setPlayerRoles(
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="Forward, Defender, Goalkeeper, Captain"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold">
            {saving ? 'Saving...' : initialSport ? 'Update Sport Engine' : 'Create Sport Engine'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
