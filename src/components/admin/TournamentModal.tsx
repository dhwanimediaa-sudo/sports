import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ImageUpload } from '../ui/ImageUpload';
import {
  Tournament,
  TournamentStatus,
  SportType,
  CompetitionFormat,
  TournamentFormatConfig,
} from '../../types';
import { SPORTS_LIST } from '../../constants/sports';
import { api } from '../../services/api';
import {
  Trophy,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building,
  DollarSign,
  Layers,
  Settings2,
  ChevronDown,
  ChevronUp,
  Users,
  Swords,
} from 'lucide-react';

export interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament?: Tournament | null;
  defaultSport?: SportType;
  allowedSports?: SportType[];
  onSuccess: (savedTournament: Tournament, isEdit: boolean) => void;
  onOpenTournament?: (tournamentId: string) => void;
  onAddTeams?: (tournamentId: string) => void;
  onCreateGroup?: (tournamentId: string) => void;
  onCreateMatch?: (tournamentId: string) => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  defaultSport,
  allowedSports,
  onSuccess,
  onOpenTournament,
  onAddTeams,
  onCreateGroup,
  onCreateMatch,
}) => {
  const isEdit = Boolean(tournament?.id);

  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType>(defaultSport || 'CRICKET');
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TournamentStatus>('UPCOMING');
  const [createdTournamentData, setCreatedTournamentData] = useState<Tournament | null>(null);

  // Competition Format State
  const [competitionFormat, setCompetitionFormat] = useState<CompetitionFormat>('GROUP_KNOCKOUT');
  const [numberOfGroups, setNumberOfGroups] = useState(2);
  const [teamsPerGroupMin, setTeamsPerGroupMin] = useState(2);
  const [teamsPerGroupMax, setTeamsPerGroupMax] = useState(8);
  const [groupStageRounds, setGroupStageRounds] = useState<'SINGLE' | 'DOUBLE' | 'CUSTOM'>('SINGLE');
  const [teamsAdvancingPerGroup, setTeamsAdvancingPerGroup] = useState(2);
  const [knockoutStageFormat, setKnockoutStageFormat] = useState<'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL'>('SEMI_FINALS');
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState(true);

  // Cricket Default Overs Configuration
  const STANDARD_CRICKET_OVERS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50];
  const [cricketOversChoice, setCricketOversChoice] = useState<string>('20');
  const [customCricketOvers, setCustomCricketOvers] = useState<number | string>(20);

  const [showAdvancedFormat, setShowAdvancedFormat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tournament) {
      setName(tournament.name || '');
      setSport(tournament.sport || 'CRICKET');
      setSeason(tournament.season || new Date().getFullYear().toString());
      setVenue(tournament.venue || tournament.location || '');
      setLocation(tournament.location || tournament.venue || '');
      setOrganizer(tournament.organizer || '');
      setSponsor(tournament.sponsor || '');
      setStartDate(tournament.startDate || '');
      setEndDate(tournament.endDate || '');
      setLogoUrl(tournament.logoUrl || '');
      setDescription(tournament.description || '');
      setStatus(tournament.status || 'UPCOMING');
      setCompetitionFormat(tournament.competitionFormat || 'GROUP_KNOCKOUT');

      const initialOvers = tournament.cricketDefaultOvers || tournament.formatConfig?.defaultMatchConfig?.overs || 20;
      if (STANDARD_CRICKET_OVERS.includes(Number(initialOvers))) {
        setCricketOversChoice(String(initialOvers));
        setCustomCricketOvers(initialOvers);
      } else {
        setCricketOversChoice('CUSTOM');
        setCustomCricketOvers(initialOvers);
      }

      if (tournament.formatConfig) {
        setNumberOfGroups(tournament.formatConfig.numberOfGroups || 2);
        setTeamsPerGroupMin(tournament.formatConfig.teamsPerGroupMin || 2);
        setTeamsPerGroupMax(tournament.formatConfig.teamsPerGroupMax || 8);
        setGroupStageRounds(tournament.formatConfig.groupStageRounds || 'SINGLE');
        setTeamsAdvancingPerGroup(tournament.formatConfig.teamsAdvancingPerGroup || 2);
        setKnockoutStageFormat(tournament.formatConfig.knockoutStageFormat || 'SEMI_FINALS');
        setHasThirdPlaceMatch(tournament.formatConfig.hasThirdPlaceMatch !== undefined ? tournament.formatConfig.hasThirdPlaceMatch : true);
      }
    } else {
      setName('');
      setSport(defaultSport || (allowedSports && allowedSports[0]) || 'CRICKET');
      setSeason(new Date().getFullYear().toString());
      setVenue('');
      setLocation('');
      setOrganizer('');
      setSponsor('');
      setStartDate('');
      setEndDate('');
      setLogoUrl('');
      setDescription('');
      setStatus('UPCOMING');
      setCompetitionFormat('GROUP_KNOCKOUT');
      setNumberOfGroups(2);
      setTeamsPerGroupMin(2);
      setTeamsPerGroupMax(8);
      setGroupStageRounds('SINGLE');
      setTeamsAdvancingPerGroup(2);
      setKnockoutStageFormat('SEMI_FINALS');
      setHasThirdPlaceMatch(true);
      setCricketOversChoice('20');
      setCustomCricketOvers(20);
    }
    setCreatedTournamentData(null);
    setError(null);
  }, [tournament, isOpen]);

  const handleRequestClose = () => {
    if (createdTournamentData) {
      onClose();
      return;
    }
    const isDirty = isEdit
      ? name !== (tournament?.name || '') ||
        (venue || location) !== (tournament?.venue || tournament?.location || '') ||
        description !== (tournament?.description || '')
      : Boolean(name.trim() || venue.trim() || organizer.trim() || description.trim());

    if (isDirty) {
      if (window.confirm('You have unsaved changes in this tournament form. Discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tournament Name is required.');
      return;
    }

    let finalCricketDefaultOvers = 20;
    if (sport === 'CRICKET') {
      if (cricketOversChoice === 'CUSTOM') {
        const parsed = parseInt(String(customCricketOvers), 10);
        if (isNaN(parsed) || parsed <= 0) {
          setError('Please enter a valid positive number of custom overs (greater than 0).');
          return;
        }
        finalCricketDefaultOvers = parsed;
      } else {
        finalCricketDefaultOvers = parseInt(cricketOversChoice, 10) || 20;
      }
    }

    try {
      setLoading(true);
      const formatConfig: TournamentFormatConfig = {
        format: competitionFormat,
        numberOfGroups: competitionFormat === 'SINGLE_LEAGUE' ? 1 : Number(numberOfGroups),
        teamsPerGroupMin: Number(teamsPerGroupMin),
        teamsPerGroupMax: Number(teamsPerGroupMax),
        groupStageRounds,
        teamsAdvancingPerGroup: Number(teamsAdvancingPerGroup),
        knockoutStageFormat,
        hasThirdPlaceMatch,
        defaultMatchConfig: sport === 'CRICKET' ? { overs: finalCricketDefaultOvers } : {},
      };

      const payload: Partial<Tournament> = {
        name: name.trim(),
        sport,
        season: season.trim(),
        venue: venue.trim(),
        location: (location || venue).trim(),
        organizer: organizer.trim(),
        sponsor: sponsor.trim(),
        startDate,
        endDate,
        logoUrl,
        description: description.trim(),
        status,
        competitionFormat,
        formatConfig,
        cricketDefaultOvers: sport === 'CRICKET' ? finalCricketDefaultOvers : undefined,
        cricketMatchFormat: sport === 'CRICKET' ? (finalCricketDefaultOvers === 20 ? 'T20' : finalCricketDefaultOvers === 10 ? 'T10' : finalCricketDefaultOvers === 5 ? 'T5' : finalCricketDefaultOvers === 50 ? 'T50' : `${finalCricketDefaultOvers} Overs`) : undefined,
      };

      if (isEdit && tournament) {
        const res = await api.updateTournament(tournament.id, payload);
        onSuccess(res.tournament, true);
        onClose();
      } else {
        const res = await api.createTournament(payload);
        onSuccess(res.tournament, false);
        setCreatedTournamentData(res.tournament);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save tournament.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleRequestClose}
      title={createdTournamentData ? 'TOURNAMENT CREATED' : isEdit ? 'EDIT TOURNAMENT' : 'CREATE TOURNAMENT'}
      maxWidth={createdTournamentData ? 'max-w-2xl' : 'max-w-3xl'}
    >
      {createdTournamentData ? (
        <div className="text-center py-6 px-2 space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Tournament Created
            </span>
            <h2 className="text-2xl font-black text-white mt-2">
              {createdTournamentData.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Sport: <strong className="text-emerald-400">{createdTournamentData.sport}</strong> • Format: {createdTournamentData.competitionFormat?.replace('_', ' ') || 'League'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => {
                const tourId = createdTournamentData.id;
                setCreatedTournamentData(null);
                onClose();
                if (onOpenTournament) onOpenTournament(tourId);
              }}
              className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex flex-col items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer group"
            >
              <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>OPEN TOURNAMENT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const tourId = createdTournamentData.id;
                setCreatedTournamentData(null);
                onClose();
                if (onAddTeams) onAddTeams(tourId);
              }}
              className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex flex-col items-center justify-center gap-2 shadow cursor-pointer group"
            >
              <Users className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span>ADD TEAMS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const tourId = createdTournamentData.id;
                setCreatedTournamentData(null);
                onClose();
                if (onCreateGroup) onCreateGroup(tourId);
              }}
              className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex flex-col items-center justify-center gap-2 shadow cursor-pointer group"
            >
              <Layers className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>CREATE GROUP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const tourId = createdTournamentData.id;
                setCreatedTournamentData(null);
                onClose();
                if (onCreateMatch) onCreateMatch(tourId);
              }}
              className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex flex-col items-center justify-center gap-2 shadow cursor-pointer group"
            >
              <Swords className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>CREATE MATCH</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setCreatedTournamentData(null);
                onClose();
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition"
            >
              Done & Return
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tournament Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Champions Trophy 2026"
            icon={<Trophy className="w-4 h-4" />}
            required
          />

          {/* Sport Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Sport *
            </label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value as SportType)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {SPORTS_LIST.filter((s) => !allowedSports || allowedSports.includes(s.id as SportType)).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Season / Year"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="e.g. 2026 or 2025-26"
            icon={<Calendar className="w-4 h-4" />}
          />

          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TournamentStatus)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="DRAFT">DRAFT (Initial Setup)</option>
              <option value="UPCOMING">UPCOMING (Fixtures Ready)</option>
              <option value="LIVE">LIVE (Matches In Progress)</option>
              <option value="COMPLETED">COMPLETED (Finished)</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Venue, Organizer, Sponsor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Venue / Stadium"
            value={venue}
            onChange={(e) => {
              setVenue(e.target.value);
              if (!location) setLocation(e.target.value);
            }}
            placeholder="e.g. Central Sports Complex"
            icon={<MapPin className="w-4 h-4" />}
          />

          <Input
            label="Organizer"
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            placeholder="e.g. National Sports Board"
            icon={<Building className="w-4 h-4" />}
          />

          <Input
            label="Tournament Sponsor"
            value={sponsor}
            onChange={(e) => setSponsor(e.target.value)}
            placeholder="e.g. Title Sponsor Brand"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </div>

        {/* Schedule & Logo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="sm:col-span-1">
            <ImageUpload
              label="Tournament Logo"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="Select logo image"
            />
          </div>
        </div>

        {/* Cricket Match Format & Default Overs Section (Shown when Sport is Cricket) */}
        {sport === 'CRICKET' && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🏏</span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  CRICKET MATCH FORMAT
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Default: <strong className="text-emerald-300 font-semibold">{cricketOversChoice === 'CUSTOM' ? `${customCricketOvers || 20} Overs` : `${cricketOversChoice} Overs`}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Default Overs
                </label>
                <select
                  value={cricketOversChoice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricketOversChoice(val);
                    if (val !== 'CUSTOM') {
                      setCustomCricketOvers(Number(val));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="1">1 Over (Super Over / Exhibition)</option>
                  <option value="2">2 Overs</option>
                  <option value="3">3 Overs</option>
                  <option value="4">4 Overs</option>
                  <option value="5">5 Overs (T5)</option>
                  <option value="6">6 Overs</option>
                  <option value="7">7 Overs</option>
                  <option value="8">8 Overs (T8)</option>
                  <option value="10">10 Overs (T10)</option>
                  <option value="12">12 Overs</option>
                  <option value="15">15 Overs</option>
                  <option value="20">20 Overs (T20)</option>
                  <option value="25">25 Overs</option>
                  <option value="30">30 Overs</option>
                  <option value="40">40 Overs</option>
                  <option value="50">50 Overs (ODI / T50)</option>
                  <option value="CUSTOM">Custom Overs</option>
                </select>
              </div>

              {cricketOversChoice === 'CUSTOM' ? (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Custom Overs (Manual Entry) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customCricketOvers}
                    onChange={(e) => setCustomCricketOvers(e.target.value)}
                    placeholder="Enter overs e.g. 16"
                    className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                    required
                  />
                </div>
              ) : (
                <div className="flex items-center text-xs text-slate-400 bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-800/60">
                  <span>New Cricket matches in this tournament will default to <strong>{cricketOversChoice} overs</strong>. Individual matches can override this independently.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competition Format Selector */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                COMPETITION FORMAT & STRUCTURE
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedFormat(!showAdvancedFormat)}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{showAdvancedFormat ? 'Hide Format Rules' : 'Configure Format Rules'}</span>
              {showAdvancedFormat ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Format Type
              </label>
              <select
                value={competitionFormat}
                onChange={(e) => {
                  const val = e.target.value as CompetitionFormat;
                  setCompetitionFormat(val);
                  if (val === 'SINGLE_LEAGUE' || val === 'SINGLE_ROUND_ROBIN' || val === 'DOUBLE_ROUND_ROBIN' || val === 'PAGE_PLAYOFF') {
                    setNumberOfGroups(1);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="GROUP_STAGE_KNOCKOUT">Group Stage + Knockout Bracket (Standard)</option>
                <option value="SINGLE_LEAGUE">Single League (Single Table)</option>
                <option value="MULTI_GROUP_LEAGUE">Multi-Group League (Multiple Group Tables)</option>
                <option value="PAGE_PLAYOFF">Page Playoff System (Top 4 Qualifier/Eliminator)</option>
                <option value="SINGLE_ROUND_ROBIN">Single Round Robin</option>
                <option value="DOUBLE_ROUND_ROBIN">Double Round Robin (Home & Away)</option>
                <option value="SINGLE_ELIMINATION">Single Elimination Knockout</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination Bracket</option>
                <option value="GROUP_KNOCKOUT">Group Knockout (Legacy)</option>
                <option value="CUSTOM">Custom Format</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Number of Groups
              </label>
              <select
                value={numberOfGroups}
                disabled={competitionFormat === 'SINGLE_LEAGUE' || competitionFormat === 'ROUND_ROBIN'}
                onChange={(e) => setNumberOfGroups(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value={1}>1 Group / Table</option>
                <option value={2}>2 Groups (Group A, Group B)</option>
                <option value={3}>3 Groups (A, B, C)</option>
                <option value={4}>4 Groups (A, B, C, D)</option>
                <option value={6}>6 Groups</option>
                <option value={8}>8 Groups</option>
              </select>
            </div>
          </div>

          {/* Advanced Format Rules */}
          {showAdvancedFormat && (
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Group Rounds
                </label>
                <select
                  value={groupStageRounds}
                  onChange={(e) => setGroupStageRounds(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="SINGLE">Single Round Robin (1 match each)</option>
                  <option value="DOUBLE">Double Round Robin (Home & Away)</option>
                  <option value="CUSTOM">Custom Rounds</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Qualify Per Group
                </label>
                <select
                  value={teamsAdvancingPerGroup}
                  onChange={(e) => setTeamsAdvancingPerGroup(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>Top 1 (Group Winner)</option>
                  <option value={2}>Top 2 (Winner & Runner-up)</option>
                  <option value={3}>Top 3</option>
                  <option value={4}>Top 4</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Knockout Stage
                </label>
                <select
                  value={knockoutStageFormat}
                  onChange={(e) => setKnockoutStageFormat(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="FINAL">Final Match (2 Teams)</option>
                  <option value="SEMI_FINALS">Semi Finals + Final (4 Teams)</option>
                  <option value="QUARTER_FINALS">Quarter Finals + SF + Final (8 Teams)</option>
                  <option value="ROUND_OF_16">Round of 16 (16 Teams)</option>
                  <option value="ROUND_OF_32">Round of 32 (32 Teams)</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hasThirdPlace"
                  checked={hasThirdPlaceMatch}
                  onChange={(e) => setHasThirdPlaceMatch(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500"
                />
                <label htmlFor="hasThirdPlace" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Include 3rd Place Bronze Playoff match in Knockout Stage
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Tournament Description & Information
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Official rules, guidelines, eligibility criteria, prize pool details..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={handleRequestClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="emerald"
            size="sm"
            type="submit"
            loading={loading}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isEdit ? 'SAVE CHANGES' : 'CREATE TOURNAMENT'}
          </Button>
        </div>
      </form>
      )}
    </Dialog>
  );
};
