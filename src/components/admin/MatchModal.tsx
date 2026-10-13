import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ImageUpload } from '../ui/ImageUpload';
import {
  Match,
  MatchStatus,
  MatchRound,
  Tournament,
  Group,
  Team,
  Player,
  SportType,
  CricketMatchConfig,
  VolleyballMatchConfig,
  KabaddiMatchConfig,
  HockeyMatchConfig,
  FootballMatchConfig,
  BasketballMatchConfig,
  TennisMatchConfig,
  BadmintonMatchConfig,
  TableTennisMatchConfig,
  MatchOfficials,
  MatchSponsors,
  PlayingSquad,
  MatchToss,
  User,
} from '../../types';
import { api } from '../../services/api';
import {
  Trophy,
  Shield,
  Calendar,
  Clock,
  MapPin,
  Users,
  Settings,
  Award,
  Coins,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Radio,
  Tv,
} from 'lucide-react';

export interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (match: Match, isEdit?: boolean) => void;
  initialMatch?: Match | null;
  defaultTournamentId?: string;
  defaultGroupId?: string;
  defaultSport?: SportType;
  allowedSports?: SportType[];
}

const ROUND_OPTIONS: MatchRound[] = [
  'Group Stage',
  'League',
  'Qualifier',
  'Eliminator',
  'Semi Final',
  'Final',
  'Third Place',
  'Friendly',
  'Custom',
];

const OVER_PRESETS = [5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];

export const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMatch = null,
  defaultTournamentId = '',
  defaultGroupId = '',
  defaultSport,
  allowedSports,
}) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'sport_rules' | 'squads' | 'officials_sponsors'>('basics');

  // Master options
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>([]);

  // Loading states
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [tournamentId, setTournamentId] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [sport, setSport] = useState<SportType>('CRICKET');
  const [name, setName] = useState<string>('');
  const [matchNumber, setMatchNumber] = useState<string>('');
  const [round, setRound] = useState<MatchRound | string>('Group Stage');
  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [venue, setVenue] = useState<string>('');
  const [ground, setGround] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<MatchStatus>('DRAFT');
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [scorerUserId, setScorerUserId] = useState<string>('');
  const [broadcastOperatorUserId, setBroadcastOperatorUserId] = useState<string>('');

  // Cricket Config
  const [cricketConfig, setCricketConfig] = useState<CricketMatchConfig>({
    matchType: 'T20',
    overs: 20,
    powerplaySettings: 'Overs 1-6 Mandatory Powerplay',
    ballType: 'Leather White 156g',
    pitchType: 'Turf Pitch',
    boundaryInfo: '65 Meter Boundary',
  });
  const [confirmOversChange, setConfirmOversChange] = useState(false);

  // Toss Config
  const [toss, setToss] = useState<MatchToss>({
    winnerTeamId: '',
    decision: 'BAT',
  });

  // Volleyball Config
  const [volleyballConfig, setVolleyballConfig] = useState<VolleyballMatchConfig>({
    format: 'Best of 3',
    pointsPerSet: 25,
    decidingSetPoints: 15,
  });

  // Kabaddi Config
  const [kabaddiConfig, setKabaddiConfig] = useState<KabaddiMatchConfig>({
    firstHalfDuration: 20,
    secondHalfDuration: 20,
    halfDuration: 20,
    raidRules: '30 sec raid duration, Do-or-Die raid on 3rd empty raid',
    timeouts: '2 Timeouts per half per team',
    substitutesCount: 5,
  });

  // Hockey Config
  const [hockeyConfig, setHockeyConfig] = useState<HockeyMatchConfig>({
    periods: 4,
    periodDuration: 15,
    breakDuration: '2 mins between Q1-Q2 & Q3-Q4, 10 mins half-time',
  });

  // Football Config
  const [footballConfig, setFootballConfig] = useState<FootballMatchConfig>({
    halfDuration: 45,
    extraTimeEnabled: false,
    penaltyShootoutEnabled: true,
  });

  // Basketball Config
  const [basketballConfig, setBasketballConfig] = useState<BasketballMatchConfig>({
    quarters: 4,
    quarterDuration: 10,
    halfTimeDuration: 15,
    overtimeDuration: 5,
    shotClockDuration: 24,
    shotClockOffensiveRebound: 14,
    playerFoulLimit: 5,
    teamFoulBonusLimit: 5,
    timeoutsPerTeam: 5,
  });

  // Tennis Config
  const [tennisConfig, setTennisConfig] = useState<TennisMatchConfig>({
    matchFormat: 'BEST_OF_3',
    matchType: 'SINGLES',
    scoringType: 'ADVANTAGE',
    finalSetTiebreak: 'STANDARD_7_PT',
    gamesToWinSet: 6,
    tiebreakAtGames: 6,
    tiebreakPoints: 7,
    finalSetTiebreakPoints: 7,
    surface: 'HARD',
    courtName: 'Center Court',
    courtNumber: '1',
  });

  // Badminton Config
  const [badmintonConfig, setBadmintonConfig] = useState<BadmintonMatchConfig>({
    format: 'BEST_OF_3',
    matchFormat: 'BEST_OF_3',
    matchType: 'SINGLES',
    pointsPerGame: 21,
    pointDifference: 2,
    maxPoints: 30,
    capPoints: 30,
    intervalPoints: 11,
    courtName: 'Court 1',
    courtNumber: '1',
  });

  // Table Tennis Config
  const [tableTennisConfig, setTableTennisConfig] = useState<TableTennisMatchConfig>({
    format: 'BEST_OF_3',
    matchType: 'SINGLES',
    pointsPerGame: 11,
    pointDifference: 2,
    serviceRotation: 2,
    deuceServiceRotation: 1,
    decidingGamePoints: 11,
    decidingGameEndChangePoint: 5,
    tableNumber: 'Table 1',
    venue: 'Arena Table 1',
    maxTimeoutsPerSide: 1,
    timeoutDurationSeconds: 60,
  });

  // Officials
  const [officials, setOfficials] = useState<MatchOfficials>({
    referee: '',
    umpire: '',
    scorer: '',
    assistant: '',
    commentator: '',
    official1: '',
    official2: '',
  });

  // Sponsors
  const [sponsors, setSponsors] = useState<MatchSponsors>({
    sponsorName: '',
    sponsorLogoUrl: '',
    matchLogoUrl: '',
    tournamentLogoUrl: '',
  });

  // Playing Squads
  const [teamASquad, setTeamASquad] = useState<PlayingSquad>({
    playingIds: [],
    substituteIds: [],
    captainId: '',
    viceCaptainId: '',
    wicketKeeperId: '',
    goalkeeperId: '',
    liberoId: '',
  });

  const [teamBSquad, setTeamBSquad] = useState<PlayingSquad>({
    playingIds: [],
    substituteIds: [],
    captainId: '',
    viceCaptainId: '',
    wicketKeeperId: '',
    goalkeeperId: '',
    liberoId: '',
  });

  // Load initial data on modal open
  useEffect(() => {
    if (!isOpen) return;

    const loadMasterData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const [tournamentsRes, groupsRes, teamsRes, usersRes] = await Promise.all([
          api.getTournaments(),
          api.getGroups(),
          api.getTeams(),
          api.getUsers().catch(() => ({ users: [] })),
        ]);

        setTournaments(tournamentsRes.tournaments || []);
        setGroups(groupsRes.groups || []);
        setTeams(teamsRes.teams || []);
        setPlatformUsers(usersRes.users || []);

        if (initialMatch) {
          // Edit existing
          setTournamentId(initialMatch.tournamentId);
          setGroupId(initialMatch.groupId);
          setSport(initialMatch.sport);
          setName(initialMatch.name || '');
          setMatchNumber(initialMatch.matchNumber || '');
          setRound(initialMatch.round || 'Group Stage');
          setTeamAId(initialMatch.teamAId);
          setTeamBId(initialMatch.teamBId);
          setDate(initialMatch.date || '');
          setTime(initialMatch.time || '');
          setVenue(initialMatch.venue || '');
          setGround(initialMatch.ground || '');
          setDescription(initialMatch.description || '');
          setStatus(initialMatch.status || 'DRAFT');
          setScorerUserId(initialMatch.scorerUserId || (initialMatch.scorerUserIds && initialMatch.scorerUserIds[0]) || '');
          setBroadcastOperatorUserId(initialMatch.broadcastOperatorUserId || (initialMatch.broadcasterUserIds && initialMatch.broadcasterUserIds[0]) || '');

          if (initialMatch.cricketConfig) setCricketConfig(initialMatch.cricketConfig);
          if (initialMatch.toss) setToss(initialMatch.toss);
          if (initialMatch.volleyballConfig) setVolleyballConfig(initialMatch.volleyballConfig);
          if (initialMatch.kabaddiConfig) setKabaddiConfig(initialMatch.kabaddiConfig);
          if (initialMatch.hockeyConfig) setHockeyConfig(initialMatch.hockeyConfig);
          if (initialMatch.footballConfig) setFootballConfig(initialMatch.footballConfig);
          if (initialMatch.basketballConfig) setBasketballConfig(initialMatch.basketballConfig);
          if (initialMatch.tennisConfig) setTennisConfig(initialMatch.tennisConfig);
          if (initialMatch.badmintonConfig) setBadmintonConfig(initialMatch.badmintonConfig);
          if (initialMatch.tableTennisConfig) setTableTennisConfig(initialMatch.tableTennisConfig);
          if (initialMatch.officials) setOfficials(initialMatch.officials);
          if (initialMatch.sponsors) setSponsors(initialMatch.sponsors);

          if (initialMatch.teamASquad) setTeamASquad(initialMatch.teamASquad);
          if (initialMatch.teamBSquad) setTeamBSquad(initialMatch.teamBSquad);
        } else {
          // Create new match default setup
          const filteredTours = (tournamentsRes.tournaments || []).filter((t: Tournament) => {
            if (defaultSport && t.sport !== defaultSport) return false;
            if (allowedSports && !allowedSports.includes(t.sport)) return false;
            return true;
          });
          const selTourId = defaultTournamentId || (filteredTours[0]?.id ?? tournamentsRes.tournaments[0]?.id ?? '');
          setTournamentId(selTourId);

          const selTour = tournamentsRes.tournaments.find((t: Tournament) => t.id === selTourId);
          const tourSport = selTour?.sport || defaultSport || (allowedSports && allowedSports[0]) || 'CRICKET';
          setSport(tourSport);

          const tourGroups = groupsRes.groups.filter((g) => g.tournamentId === selTourId);
          const selGrpId = defaultGroupId || (tourGroups[0]?.id ?? '');
          setGroupId(selGrpId);

          const groupTeams = teamsRes.teams.filter((t) => t.tournamentId === selTourId);
          if (groupTeams.length >= 2) {
            setTeamAId(groupTeams[0].id);
            setTeamBId(groupTeams[1].id);
          } else if (groupTeams.length === 1) {
            setTeamAId(groupTeams[0].id);
            setTeamBId('');
          } else {
            setTeamAId('');
            setTeamBId('');
          }

          const today = new Date().toISOString().split('T')[0];
          setDate(today);
          setTime('15:00');
          setVenue(selTour?.location || 'Main Stadium');
          setGround('Ground 1');
          setStatus('DRAFT');
          setRound('Group Stage');

          const tourDefOvers = selTour?.cricketDefaultOvers || selTour?.formatConfig?.defaultMatchConfig?.overs || 20;
          setCricketConfig((prev) => ({
            ...prev,
            overs: tourDefOvers,
            matchType: tourDefOvers === 20 ? 'T20' : tourDefOvers === 10 ? 'T10' : tourDefOvers === 5 ? 'T5' : tourDefOvers === 50 ? 'T50' : 'Custom Overs',
          }));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load tournament or team data.');
      } finally {
        setLoadingData(false);
      }
    };

    loadMasterData();
  }, [isOpen, initialMatch, defaultTournamentId, defaultGroupId]);

  // When Tournament selection changes, filter available groups & update sport
  const handleTournamentChange = (tId: string) => {
    setTournamentId(tId);
    const selectedTour = tournaments.find((t) => t.id === tId);
    if (selectedTour) {
      setSport(selectedTour.sport);
      if (selectedTour.location) setVenue(selectedTour.location);
      if (!initialMatch && selectedTour.sport === 'CRICKET') {
        const tourDefOvers = selectedTour.cricketDefaultOvers || selectedTour.formatConfig?.defaultMatchConfig?.overs || 20;
        setCricketConfig((prev) => ({
          ...prev,
          overs: tourDefOvers,
          matchType: tourDefOvers === 20 ? 'T20' : tourDefOvers === 10 ? 'T10' : tourDefOvers === 5 ? 'T5' : tourDefOvers === 50 ? 'T50' : 'Custom Overs',
        }));
      }
    }

    const availableGroups = groups.filter((g) => g.tournamentId === tId);
    if (availableGroups.length > 0) {
      setGroupId(availableGroups[0].id);
    } else {
      setGroupId('');
    }

    const tourTeams = teams.filter((t) => t.tournamentId === tId);
    if (tourTeams.length >= 2) {
      setTeamAId(tourTeams[0].id);
      setTeamBId(tourTeams[1].id);
    } else if (tourTeams.length === 1) {
      setTeamAId(tourTeams[0].id);
      setTeamBId('');
    } else {
      setTeamAId('');
      setTeamBId('');
    }
  };

  // Load team players whenever Team A or Team B changes
  useEffect(() => {
    if (!teamAId) {
      setTeamAPlayers([]);
      return;
    }

    api
      .getPlayers({ teamId: teamAId })
      .then((res) => setTeamAPlayers(res.players || []))
      .catch(() => setTeamAPlayers([]));
  }, [teamAId]);

  useEffect(() => {
    if (!teamBId) {
      setTeamBPlayers([]);
      return;
    }

    api
      .getPlayers({ teamId: teamBId })
      .then((res) => setTeamBPlayers(res.players || []))
      .catch(() => setTeamBPlayers([]));
  }, [teamBId]);

  // Available groups for currently selected tournament
  const filteredGroups = groups.filter((g) => g.tournamentId === tournamentId);

  // Available teams for currently selected tournament/group
  const filteredTeams = teams.filter((t) => {
    if (t.tournamentId !== tournamentId) return false;
    if (groupId && t.groupId) return t.groupId === groupId;
    return true;
  });

  const selectedTeamA = teams.find((t) => t.id === teamAId);
  const selectedTeamB = teams.find((t) => t.id === teamBId);

  // Auto generate match name if blank
  useEffect(() => {
    if (!initialMatch && selectedTeamA && selectedTeamB) {
      const numPrefix = matchNumber ? `#${matchNumber} ` : '';
      setName(`${numPrefix}${selectedTeamA.name} vs ${selectedTeamB.name}`);
    }
  }, [teamAId, teamBId, matchNumber]);

  // Squad selection helpers
  const togglePlayerSquadA = (playerId: string) => {
    setTeamASquad((prev) => {
      const isPlaying = prev.playingIds.includes(playerId);
      const isSub = prev.substituteIds.includes(playerId);

      if (isPlaying) {
        // Move from playing to substitute
        return {
          ...prev,
          playingIds: prev.playingIds.filter((id) => id !== playerId),
          substituteIds: [...prev.substituteIds, playerId],
        };
      } else if (isSub) {
        // Move from substitute to unselected
        return {
          ...prev,
          substituteIds: prev.substituteIds.filter((id) => id !== playerId),
        };
      } else {
        // Add to playing
        return {
          ...prev,
          playingIds: [...prev.playingIds, playerId],
        };
      }
    });
  };

  const togglePlayerSquadB = (playerId: string) => {
    setTeamBSquad((prev) => {
      const isPlaying = prev.playingIds.includes(playerId);
      const isSub = prev.substituteIds.includes(playerId);

      if (isPlaying) {
        return {
          ...prev,
          playingIds: prev.playingIds.filter((id) => id !== playerId),
          substituteIds: [...prev.substituteIds, playerId],
        };
      } else if (isSub) {
        return {
          ...prev,
          substituteIds: prev.substituteIds.filter((id) => id !== playerId),
        };
      } else {
        return {
          ...prev,
          playingIds: [...prev.playingIds, playerId],
        };
      }
    });
  };

  const selectAllPlayersAsPlaying = (side: 'A' | 'B') => {
    if (side === 'A') {
      const allIds = teamAPlayers.map((p) => p.id);
      setTeamASquad((prev) => ({ ...prev, playingIds: allIds, substituteIds: [] }));
    } else {
      const allIds = teamBPlayers.map((p) => p.id);
      setTeamBSquad((prev) => ({ ...prev, playingIds: allIds, substituteIds: [] }));
    }
  };

  // Request Close with Dirty Checking
  const handleRequestClose = () => {
    const isDirty = initialMatch
      ? name !== (initialMatch.name || '') ||
        venue !== (initialMatch.venue || '') ||
        teamAId !== (initialMatch.teamAId || '') ||
        teamBId !== (initialMatch.teamBId || '')
      : Boolean(name.trim() || venue.trim() || teamAId || teamBId);

    if (isDirty) {
      if (window.confirm('You have unsaved changes in this match form. Discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Submit Handler
  const handleSubmit = async (targetStatus?: MatchStatus) => {
    setError(null);

    // Basic Validations
    if (!tournamentId) {
      setError('Please select a Tournament.');
      setActiveTab('basics');
      return;
    }
    if (!groupId) {
      setError('Please select a Group.');
      setActiveTab('basics');
      return;
    }
    if (!teamAId || !teamBId) {
      setError('Please select both Team A and Team B.');
      setActiveTab('basics');
      return;
    }
    if (teamAId === teamBId) {
      setError('Team A and Team B cannot be the same team.');
      setActiveTab('basics');
      return;
    }
    if (!date || !time) {
      setError('Match date and time are required.');
      setActiveTab('basics');
      return;
    }
    if (!venue) {
      setError('Venue is required.');
      setActiveTab('basics');
      return;
    }

    const finalStatus = targetStatus || status;

    // Validate Cricket Overs
    if (sport === 'CRICKET') {
      if (!cricketConfig.overs || cricketConfig.overs <= 0 || isNaN(cricketConfig.overs)) {
        setError('Cricket match overs must be a valid positive number greater than 0.');
        setActiveTab('sport_rules');
        return;
      }

      if (initialMatch?.id && (initialMatch.status === 'LIVE' || initialMatch.status === 'COMPLETED')) {
        const prevOvers = initialMatch.cricketConfig?.overs || initialMatch.effectiveMatchOvers || initialMatch.matchOvers;
        if (prevOvers && prevOvers !== cricketConfig.overs && !confirmOversChange) {
          setError('Scoring has already started or the match is completed. Changing match overs may affect existing scoring data. Please confirm the safety notice in the Cricket Rules tab.');
          setActiveTab('sport_rules');
          return;
        }
      }
    }

    // Strict validation if user clicks "SAVE & READY"
    if (finalStatus === 'READY') {
      if (sport === 'CRICKET' && (!cricketConfig.overs || cricketConfig.overs <= 0)) {
        setError('Cricket overs configuration must be specified for READY state.');
        setActiveTab('sport_rules');
        return;
      }
    }

    setSaving(true);

    const selTour = tournaments.find((t) => t.id === tournamentId);
    const tourDefOvers = selTour?.cricketDefaultOvers || selTour?.formatConfig?.defaultMatchConfig?.overs || 20;
    const isOverride = cricketConfig.overs !== tourDefOvers;

    const payload: Partial<Match> = {
      tournamentId,
      groupId,
      sport,
      name: name.trim() || `${selectedTeamA?.name || 'Team A'} vs ${selectedTeamB?.name || 'Team B'}`,
      matchNumber,
      round,
      teamAId,
      teamBId,
      date,
      time,
      venue,
      ground,
      description,
      status: finalStatus,
      matchOvers: sport === 'CRICKET' ? cricketConfig.overs : undefined,
      effectiveMatchOvers: sport === 'CRICKET' ? cricketConfig.overs : undefined,
      cricketConfig:
        sport === 'CRICKET'
          ? {
              ...cricketConfig,
              matchOvers: cricketConfig.overs,
              oversOverride: isOverride ? cricketConfig.overs : undefined,
              isOversOverridden: isOverride,
            }
          : undefined,
      toss: sport === 'CRICKET' ? toss : undefined,
      volleyballConfig: sport === 'VOLLEYBALL' ? volleyballConfig : undefined,
      kabaddiConfig: sport === 'KABADDI' ? kabaddiConfig : undefined,
      hockeyConfig: sport === 'HOCKEY' ? hockeyConfig : undefined,
      footballConfig: sport === 'FOOTBALL' ? footballConfig : undefined,
      basketballConfig: sport === 'BASKETBALL' ? basketballConfig : undefined,
      tennisConfig: sport === 'TENNIS' ? tennisConfig : undefined,
      badmintonConfig: sport === 'BADMINTON' ? badmintonConfig : undefined,
      tableTennisConfig: sport === 'TABLE_TENNIS' ? tableTennisConfig : undefined,
      officials,
      sponsors,
      teamASquad,
      teamBSquad,
      scorerUserId: scorerUserId || undefined,
      broadcastOperatorUserId: broadcastOperatorUserId || undefined,
      scorerUserIds: scorerUserId ? [scorerUserId] : [],
      broadcasterUserIds: broadcastOperatorUserId ? [broadcastOperatorUserId] : [],
    };

    try {
      let result;
      if (initialMatch?.id) {
        result = await api.updateMatch(initialMatch.id, payload);
      } else {
        result = await api.createMatch(payload);
      }
      onSuccess(result.match);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save match setup.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleRequestClose}
      title={initialMatch ? `Edit Match: ${initialMatch.name}` : 'Create New Match'}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'basics'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            1. Match & Teams
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sport_rules')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'sport_rules'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            2. {sport} Rules & Toss
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('squads')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'squads'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            3. Playing Squads
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('officials_sponsors')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'officials_sponsors'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            4. Officials & Branding
          </button>
        </div>

        {loadingData ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-medium">Loading tournaments, groups & teams...</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-5">
            {/* TAB 1: BASICS */}
            {activeTab === 'basics' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Tournament <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={tournamentId}
                      onChange={(e) => handleTournamentChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      <option value="">Select Tournament</option>
                      {tournaments
                        .filter((t) => {
                          if (defaultSport && t.sport !== defaultSport) return false;
                          if (allowedSports && !allowedSports.includes(t.sport)) return false;
                          return true;
                        })
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.sport})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Group / Bracket <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      <option value="">Select Group</option>
                      {filteredGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} {g.code ? `(${g.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Sport Discipline</label>
                    <input
                      type="text"
                      value={sport}
                      disabled
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider"
                    />
                  </div>
                </div>

                {/* Team Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team A */}
                  <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4" /> Team A (Home / Side 1)
                      </span>
                      {selectedTeamA && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          {teamAPlayers.length} Roster Players
                        </span>
                      )}
                    </div>

                    <select
                      value={teamAId}
                      onChange={(e) => setTeamAId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      <option value="">Select Team A</option>
                      {filteredTeams.map((t) => (
                        <option key={t.id} value={t.id} disabled={t.id === teamBId}>
                          {t.name} {t.code ? `[${t.code}]` : ''} {t.id === teamBId ? '(Selected as Team B)' : ''}
                        </option>
                      ))}
                    </select>

                    {selectedTeamA && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                        {selectedTeamA.logoUrl ? (
                          <img
                            src={selectedTeamA.logoUrl}
                            alt={selectedTeamA.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-950 p-0.5 border border-slate-800"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-slate-950 text-sm"
                            style={{ backgroundColor: selectedTeamA.teamColor || '#10b981' }}
                          >
                            {selectedTeamA.shortName || selectedTeamA.name.slice(0, 3).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-200">{selectedTeamA.name}</p>
                          <p className="text-[11px] text-slate-400">
                            Code: {selectedTeamA.code || 'N/A'} • Manager: {selectedTeamA.manager || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team B */}
                  <div className="p-4 rounded-xl bg-sky-950/10 border border-sky-500/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-sky-500/10 pb-2">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4" /> Team B (Away / Side 2)
                      </span>
                      {selectedTeamB && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                          {teamBPlayers.length} Roster Players
                        </span>
                      )}
                    </div>

                    <select
                      value={teamBId}
                      onChange={(e) => setTeamBId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    >
                      <option value="">Select Team B</option>
                      {filteredTeams.map((t) => (
                        <option key={t.id} value={t.id} disabled={t.id === teamAId}>
                          {t.name} {t.code ? `[${t.code}]` : ''} {t.id === teamAId ? '(Selected as Team A)' : ''}
                        </option>
                      ))}
                    </select>

                    {selectedTeamB && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                        {selectedTeamB.logoUrl ? (
                          <img
                            src={selectedTeamB.logoUrl}
                            alt={selectedTeamB.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-950 p-0.5 border border-slate-800"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-slate-950 text-sm"
                            style={{ backgroundColor: selectedTeamB.teamColor || '#38bdf8' }}
                          >
                            {selectedTeamB.shortName || selectedTeamB.name.slice(0, 3).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-200">{selectedTeamB.name}</p>
                          <p className="text-[11px] text-slate-400">
                            Code: {selectedTeamB.code || 'N/A'} • Manager: {selectedTeamB.manager || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Information Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  <Input
                    label="Match Title / Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kerala Warriors vs Calicut Kings"
                  />

                  <Input
                    label="Match Number"
                    value={matchNumber}
                    onChange={(e) => setMatchNumber(e.target.value)}
                    placeholder="e.g. M1 or Match 05"
                  />

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Match Round</label>
                    <select
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      {ROUND_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Date *"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />

                  <Input
                    label="Scheduled Time *"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Match Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as MatchStatus)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-emerald-400"
                    >
                      <option value="DRAFT">DRAFT (In Progress)</option>
                      <option value="SCHEDULED">SCHEDULED (Upcoming)</option>
                      <option value="READY">READY (Configured & Squads Set)</option>
                      <option value="LIVE">LIVE (Reserved for Live Scoring)</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <Input
                    label="Stadium / Venue *"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Greenfield International Stadium"
                  />

                  <Input
                    label="Pitch / Ground Name"
                    value={ground}
                    onChange={(e) => setGround(e.target.value)}
                    placeholder="e.g. Main Turf Pitch #1"
                  />

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Description</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional match notes, rules or broadcast comments..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                    />
                  </div>

                  {/* Match Staff Assignment: Scorer & Broadcast Operator */}
                  <div className="md:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> Assigned Match Staff & Operators
                      </span>
                      <span className="text-[10px] text-slate-400">Assigned users can score or broadcast this match</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                          <Radio className="w-3.5 h-3.5 text-emerald-400" /> Select Match Scorer (Platform User)
                        </label>
                        <select
                          value={scorerUserId}
                          onChange={(e) => setScorerUserId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        >
                          <option value="">-- No Specific Scorer Assigned (Open to Tournament Managers) --</option>
                          {platformUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                          <Tv className="w-3.5 h-3.5 text-amber-400" /> Select Broadcast Operator (Platform User)
                        </label>
                        <select
                          value={broadcastOperatorUserId}
                          onChange={(e) => setBroadcastOperatorUserId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        >
                          <option value="">-- No Specific Operator Assigned (Open to Tournament Managers) --</option>
                          {platformUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SPORT SPECIFIC RULES & TOSS */}
            {activeTab === 'sport_rules' && (
              <div className="space-y-4">
                {/* CRICKET RULES */}
                {sport === 'CRICKET' && (() => {
                  const selTour = tournaments.find((t) => t.id === tournamentId);
                  const tournamentDefOvers = selTour?.cricketDefaultOvers || selTour?.formatConfig?.defaultMatchConfig?.overs || 20;
                  const currentMatchOvers = cricketConfig.overs || tournamentDefOvers;
                  const isOverridden = currentMatchOvers !== tournamentDefOvers;
                  const isLiveOrCompleted = Boolean(initialMatch && (initialMatch.status === 'LIVE' || initialMatch.status === 'COMPLETED'));
                  const initialOversValue = initialMatch?.cricketConfig?.overs || initialMatch?.effectiveMatchOvers || initialMatch?.matchOvers || tournamentDefOvers;
                  const hasOversChangedInLiveMatch = isLiveOrCompleted && currentMatchOvers !== initialOversValue;

                  return (
                    <div className="space-y-4">
                      {/* CRICKET MATCH CONFIGURATION & OVERS RESOLUTION */}
                      <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🏏</span>
                            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                              CRICKET MATCH CONFIGURATION
                            </h4>
                          </div>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {isOverridden ? '⚡ Match Override Active' : '📋 Using Tournament Default'}
                          </span>
                        </div>

                        {/* 3-Column Resolution Banner */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Tournament Default
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-black text-slate-200">{tournamentDefOvers}</span>
                              <span className="text-xs text-slate-400 font-medium">Overs</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {selTour?.name || 'Current Tournament'}
                            </p>
                          </div>

                          <div className={`p-3 rounded-xl border space-y-1 ${isOverridden ? 'bg-amber-950/20 border-amber-500/40' : 'bg-slate-950/80 border-slate-800/80'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Match Override
                              </span>
                              {isOverridden && (
                                <button
                                  type="button"
                                  onClick={() => setCricketConfig((prev) => ({ ...prev, overs: tournamentDefOvers }))}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                                >
                                  Reset to Default
                                </button>
                              )}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-lg font-black ${isOverridden ? 'text-amber-400' : 'text-slate-400'}`}>
                                {isOverridden ? `${currentMatchOvers} Overs` : 'None (Inherited)'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {isOverridden ? 'Independent match configuration' : 'Same as tournament default'}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/40 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                              Effective Match
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-black text-emerald-300">{currentMatchOvers}</span>
                              <span className="text-xs text-emerald-400/80 font-bold">Overs</span>
                            </div>
                            <p className="text-[10px] text-emerald-400/70">
                              Scoring engine will execute {currentMatchOvers} overs
                            </p>
                          </div>
                        </div>

                        {/* Live Match Safety Notice */}
                        {hasOversChangedInLiveMatch && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-2">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="font-bold text-rose-300">
                                  Live / Finalized Match Warning
                                </p>
                                <p className="text-[11px] text-rose-300/80">
                                  Scoring has already started or this match is completed (originally configured for {initialOversValue} overs). Changing match overs to {currentMatchOvers} overs may affect existing scoring calculations, required run rate, and over breakdowns.
                                </p>
                              </div>
                            </div>
                            <label className="flex items-center gap-2 pt-1 font-semibold text-rose-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={confirmOversChange}
                                onChange={(e) => setConfirmOversChange(e.target.checked)}
                                className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-rose-500/50 focus:ring-rose-500"
                              />
                              <span>I understand and explicitly confirm updating the overs for this match</span>
                            </label>
                          </div>
                        )}

                        {/* Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Format Type</label>
                            <select
                              value={cricketConfig.matchType}
                              onChange={(e) => {
                                const type = e.target.value;
                                let defOvers = cricketConfig.overs;
                                if (type === 'T10') defOvers = 10;
                                if (type === 'T20') defOvers = 20;
                                if (type === 'T30') defOvers = 30;
                                if (type === 'T50') defOvers = 50;
                                setCricketConfig((prev) => ({ ...prev, matchType: type, overs: defOvers }));
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            >
                              <option value="T10">T10 (10 Overs)</option>
                              <option value="T20">T20 (20 Overs)</option>
                              <option value="T30">T30 (30 Overs)</option>
                              <option value="T50">T50 / ODI (50 Overs)</option>
                              <option value="Custom Overs">Custom Overs</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Match Overs <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={cricketConfig.overs}
                              onChange={(e) =>
                                setCricketConfig((prev) => ({ ...prev, overs: Math.max(1, parseInt(e.target.value) || 1) }))
                              }
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-emerald-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Quick Overs Presets</label>
                            <div className="flex items-center flex-wrap gap-1">
                              {OVER_PRESETS.map((ov) => (
                                <button
                                  key={ov}
                                  type="button"
                                  onClick={() => setCricketConfig((prev) => ({ ...prev, overs: ov }))}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                    cricketConfig.overs === ov
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {ov} Ov
                                </button>
                              ))}
                            </div>
                          </div>

                          <Input
                            label="Powerplay Rules"
                            value={cricketConfig.powerplaySettings || ''}
                            onChange={(e) => setCricketConfig((prev) => ({ ...prev, powerplaySettings: e.target.value }))}
                            placeholder="e.g. Overs 1-6 Mandatory"
                          />

                          <Input
                            label="Ball Type"
                            value={cricketConfig.ballType || ''}
                            onChange={(e) => setCricketConfig((prev) => ({ ...prev, ballType: e.target.value }))}
                            placeholder="e.g. White Leather, Red Kookaburra, Heavy Tennis"
                          />

                          <Input
                            label="Pitch Specification"
                            value={cricketConfig.pitchType || ''}
                            onChange={(e) => setCricketConfig((prev) => ({ ...prev, pitchType: e.target.value }))}
                            placeholder="e.g. Turf, Matting, Synthetic"
                          />

                          <Input
                            label="Boundary Distance"
                            value={cricketConfig.boundaryInfo || ''}
                            onChange={(e) => setCricketConfig((prev) => ({ ...prev, boundaryInfo: e.target.value }))}
                            placeholder="e.g. 68 Meters"
                          />
                        </div>
                      </div>

                      {/* CRICKET TOSS SETUP */}
                      <div className="p-4 rounded-xl bg-amber-950/10 border border-amber-500/20 space-y-3">
                        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
                          <Coins className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                            Coin Toss Information
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Toss Winner</label>
                            <select
                              value={toss.winnerTeamId || ''}
                              onChange={(e) => setToss((prev) => ({ ...prev, winnerTeamId: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                            >
                              <option value="">Toss Not Done Yet</option>
                              {selectedTeamA && <option value={selectedTeamA.id}>{selectedTeamA.name} (Team A)</option>}
                              {selectedTeamB && <option value={selectedTeamB.id}>{selectedTeamB.name} (Team B)</option>}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Decision</label>
                            <select
                              value={toss.decision || 'BAT'}
                              onChange={(e) => setToss((prev) => ({ ...prev, decision: e.target.value as 'BAT' | 'BOWL' }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-bold"
                            >
                              <option value="BAT">Elected to BAT first</option>
                              <option value="BOWL">Elected to BOWL / FIELD first</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* VOLLEYBALL RULES */}
                {sport === 'VOLLEYBALL' && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Volleyball Match Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Match Format</label>
                        <select
                          value={volleyballConfig.format}
                          onChange={(e) => setVolleyballConfig((prev) => ({ ...prev, format: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none"
                        >
                          <option value="Best of 3">Best of 3 Sets</option>
                          <option value="Best of 5">Best of 5 Sets</option>
                          <option value="Custom">Custom Sets</option>
                        </select>
                      </div>

                      <Input
                        label="Points per Standard Set"
                        value={volleyballConfig.pointsPerSet}
                        onChange={(e) => setVolleyballConfig((prev) => ({ ...prev, pointsPerSet: e.target.value }))}
                        placeholder="25"
                      />

                      <Input
                        label="Deciding Tie-breaker Set Points"
                        value={volleyballConfig.decidingSetPoints}
                        onChange={(e) => setVolleyballConfig((prev) => ({ ...prev, decidingSetPoints: e.target.value }))}
                        placeholder="15"
                      />
                    </div>
                  </div>
                )}

                {/* KABADDI RULES */}
                {sport === 'KABADDI' && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Kabaddi Match Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="Half Duration (Minutes)"
                        value={kabaddiConfig.halfDuration}
                        onChange={(e) => setKabaddiConfig((prev) => ({ ...prev, halfDuration: e.target.value }))}
                        placeholder="20"
                      />

                      <Input
                        label="Raid & Do-or-Die Rules"
                        value={kabaddiConfig.raidRules || ''}
                        onChange={(e) => setKabaddiConfig((prev) => ({ ...prev, raidRules: e.target.value }))}
                        placeholder="30 sec raid, Do-or-Die on 3rd empty raid"
                      />

                      <Input
                        label="Timeouts Allowed"
                        value={kabaddiConfig.timeouts || ''}
                        onChange={(e) => setKabaddiConfig((prev) => ({ ...prev, timeouts: e.target.value }))}
                        placeholder="2 per half"
                      />
                    </div>
                  </div>
                )}

                {/* HOCKEY RULES */}
                {sport === 'HOCKEY' && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Hockey Match Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="Number of Quarters / Periods"
                        value={hockeyConfig.periods}
                        onChange={(e) => setHockeyConfig((prev) => ({ ...prev, periods: e.target.value }))}
                        placeholder="4"
                      />

                      <Input
                        label="Quarter Duration (Mins)"
                        value={hockeyConfig.periodDuration}
                        onChange={(e) => setHockeyConfig((prev) => ({ ...prev, periodDuration: e.target.value }))}
                        placeholder="15"
                      />

                      <Input
                        label="Break Durations"
                        value={hockeyConfig.breakDuration || ''}
                        onChange={(e) => setHockeyConfig((prev) => ({ ...prev, breakDuration: e.target.value }))}
                        placeholder="2 mins quarter break, 10 mins halftime"
                      />
                    </div>
                  </div>
                )}

                {/* FOOTBALL RULES */}
                {sport === 'FOOTBALL' && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Football / Soccer Match Configuration</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        IFAB & Tournament Standard
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="Half Duration (Minutes)"
                        value={footballConfig.halfDuration}
                        onChange={(e) => setFootballConfig((prev) => ({ ...prev, halfDuration: e.target.value }))}
                        placeholder="45 (or 40 / 30 / 20)"
                      />

                      <Input
                        label="Max Substitutions"
                        value={footballConfig.maxSubstitutions || '5'}
                        onChange={(e) => setFootballConfig((prev) => ({ ...prev, maxSubstitutions: e.target.value }))}
                        placeholder="5"
                      />

                      <Input
                        label="Half-Time Break (Minutes)"
                        value={footballConfig.halfTimeDuration || '15'}
                        onChange={(e) => setFootballConfig((prev) => ({ ...prev, halfTimeDuration: e.target.value }))}
                        placeholder="15"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Team A Formation
                        </label>
                        <select
                          value={footballConfig.formationA || '4-3-3'}
                          onChange={(e) => setFootballConfig((prev) => ({ ...prev, formationA: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="4-3-3">4-3-3 (Attacking Wingers)</option>
                          <option value="4-4-2">4-4-2 (Classic Flat)</option>
                          <option value="4-2-3-1">4-2-3-1 (Double Pivot & Cam)</option>
                          <option value="3-5-2">3-5-2 (Wingbacks & 2 Strikers)</option>
                          <option value="3-4-3">3-4-3 (High Pressing)</option>
                          <option value="5-3-2">5-3-2 (Defensive Counter)</option>
                          <option value="4-1-4-1">4-1-4-1 (Holding Midfielder)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Team B Formation
                        </label>
                        <select
                          value={footballConfig.formationB || '4-4-2'}
                          onChange={(e) => setFootballConfig((prev) => ({ ...prev, formationB: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="4-4-2">4-4-2 (Classic Flat)</option>
                          <option value="4-3-3">4-3-3 (Attacking Wingers)</option>
                          <option value="4-2-3-1">4-2-3-1 (Double Pivot & Cam)</option>
                          <option value="3-5-2">3-5-2 (Wingbacks & 2 Strikers)</option>
                          <option value="3-4-3">3-4-3 (High Pressing)</option>
                          <option value="5-3-2">5-3-2 (Defensive Counter)</option>
                          <option value="4-1-4-1">4-1-4-1 (Holding Midfielder)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800/40">
                        <input
                          type="checkbox"
                          id="extraTime"
                          checked={footballConfig.extraTimeEnabled}
                          onChange={(e) => setFootballConfig((prev) => ({ ...prev, extraTimeEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800"
                        />
                        <div>
                          <label htmlFor="extraTime" className="text-xs text-slate-200 font-medium cursor-pointer block">
                            Extra Time Allowed (2 x 15 mins)
                          </label>
                          <span className="text-[10px] text-slate-400">If match is tied at full time in knockout matches</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800/40">
                        <input
                          type="checkbox"
                          id="penalties"
                          checked={footballConfig.penaltyShootoutEnabled}
                          onChange={(e) => setFootballConfig((prev) => ({ ...prev, penaltyShootoutEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800"
                        />
                        <div>
                          <label htmlFor="penalties" className="text-xs text-slate-200 font-medium cursor-pointer block">
                            Penalty Shootout Enabled
                          </label>
                          <span className="text-[10px] text-slate-400">Best of 5 penalty kicks + sudden death</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* BASKETBALL RULES */}
                {sport === 'BASKETBALL' && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Basketball Match Configuration</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                        FIBA & League Standard
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Quarter Length</label>
                        <select
                          value={basketballConfig.quarterDuration}
                          onChange={(e) => setBasketballConfig((prev) => ({ ...prev, quarterDuration: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value={10}>10 Minutes (FIBA / Olympic Standard)</option>
                          <option value={12}>12 Minutes (NBA Standard)</option>
                          <option value={8}>8 Minutes (High School / Youth)</option>
                          <option value={6}>6 Minutes (Short Format / 3x3)</option>
                        </select>
                      </div>

                      <Input
                        label="Shot Clock (Seconds)"
                        type="number"
                        value={basketballConfig.shotClockDuration}
                        onChange={(e) => setBasketballConfig((prev) => ({ ...prev, shotClockDuration: Number(e.target.value) }))}
                        placeholder="24"
                      />

                      <Input
                        label="Offensive Rebound Reset (Sec)"
                        type="number"
                        value={basketballConfig.shotClockOffensiveRebound}
                        onChange={(e) => setBasketballConfig((prev) => ({ ...prev, shotClockOffensiveRebound: Number(e.target.value) }))}
                        placeholder="14"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <Input
                        label="Personal Foul Limit per Player"
                        type="number"
                        value={basketballConfig.playerFoulLimit}
                        onChange={(e) => setBasketballConfig((prev) => ({ ...prev, playerFoulLimit: Number(e.target.value) }))}
                        placeholder="5"
                      />

                      <Input
                        label="Quarter Team Foul Bonus Threshold"
                        type="number"
                        value={basketballConfig.teamFoulBonusLimit}
                        onChange={(e) => setBasketballConfig((prev) => ({ ...prev, teamFoulBonusLimit: Number(e.target.value) }))}
                        placeholder="5"
                      />

                      <Input
                        label="Timeouts per Team"
                        type="number"
                        value={basketballConfig.timeoutsPerTeam}
                        onChange={(e) => setBasketballConfig((prev) => ({ ...prev, timeoutsPerTeam: Number(e.target.value) }))}
                        placeholder="5"
                      />
                    </div>
                  </div>
                )}

                {/* TENNIS RULES */}
                {sport === 'TENNIS' && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Tennis Match Configuration</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        ITF / ATP / WTA Standard
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Match Format</label>
                        <select
                          value={tennisConfig.matchFormat}
                          onChange={(e) => {
                            const fmt = e.target.value as any;
                            let games = 6;
                            let tbGames = 6;
                            if (fmt === 'FAST4') {
                              games = 4;
                              tbGames = 3;
                            } else if (fmt === 'PRO_SET_8') {
                              games = 8;
                              tbGames = 8;
                            } else if (fmt === 'PRO_SET_10') {
                              games = 10;
                              tbGames = 10;
                            }
                            setTennisConfig((prev) => ({
                              ...prev,
                              matchFormat: fmt,
                              gamesToWinSet: games,
                              tiebreakAtGames: tbGames,
                            }));
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="BEST_OF_3">Best of 3 Sets (Standard Tour)</option>
                          <option value="BEST_OF_5">Best of 5 Sets (Grand Slam Men)</option>
                          <option value="PRO_SET_8">8-Game Pro Set (Single Set)</option>
                          <option value="PRO_SET_10">10-Game Pro Set (Single Set)</option>
                          <option value="FAST4">Fast4 Tennis (Short 4-game sets)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Discipline / Type</label>
                        <select
                          value={tennisConfig.matchType}
                          onChange={(e) => setTennisConfig((prev) => ({ ...prev, matchType: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="SINGLES">Singles (1 vs 1)</option>
                          <option value="DOUBLES">Doubles (2 vs 2)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Game Scoring Style</label>
                        <select
                          value={tennisConfig.scoringType}
                          onChange={(e) => setTennisConfig((prev) => ({ ...prev, scoringType: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="ADVANTAGE">Standard Advantage (Deuce - Ad - Game)</option>
                          <option value="NO_AD">No-Ad / Sudden Death (Deciding Point at Deuce)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Deciding Set Rule</label>
                        <select
                          value={String(tennisConfig.finalSetTiebreak || 'STANDARD_7_PT')}
                          onChange={(e) => setTennisConfig((prev) => ({ ...prev, finalSetTiebreak: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="STANDARD_7_PT">Standard 7-Point Tie-break (First to 7 by 2)</option>
                          <option value="SUPER_10_PT">10-Point Match Tie-break (First to 10 by 2)</option>
                          <option value="MATCH_TIEBREAK_10">Match Tie-break in lieu of 3rd Set</option>
                          <option value="ADVANTAGE_NO_TIEBREAK">Advantage Set (Win by 2 full games)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Court Surface</label>
                        <select
                          value={tennisConfig.surface || 'HARD'}
                          onChange={(e) => setTennisConfig((prev) => ({ ...prev, surface: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="HARD">Hard Court (Plexicushion / DecoTurf)</option>
                          <option value="CLAY">Red Clay / Har-Tru</option>
                          <option value="GRASS">Natural Grass (Wimbledon style)</option>
                          <option value="SYNTHETIC">Synthetic Grass / Turf</option>
                          <option value="CARPET">Indoor Carpet</option>
                        </select>
                      </div>

                      <Input
                        label="Court Name & Number"
                        value={tennisConfig.courtName || 'Center Court'}
                        onChange={(e) => setTennisConfig((prev) => ({ ...prev, courtName: e.target.value }))}
                        placeholder="Center Court, Court 1..."
                      />
                    </div>
                  </div>
                )}

                {/* BADMINTON RULES */}
                {sport === 'BADMINTON' && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Badminton Match Configuration</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        BWF Standard (Rally Point 21 / Cap 30)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Match Format</label>
                        <select
                          value={badmintonConfig.matchFormat}
                          onChange={(e) => setBadmintonConfig((prev) => ({ ...prev, matchFormat: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="BEST_OF_3">Best of 3 Games (BWF Standard)</option>
                          <option value="BEST_OF_1">Single Game (1 Game Match)</option>
                          <option value="BEST_OF_5">Best of 5 Games (Extended Format)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Discipline / Type</label>
                        <select
                          value={badmintonConfig.matchType}
                          onChange={(e) => setBadmintonConfig((prev) => ({ ...prev, matchType: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="SINGLES">Singles (1 vs 1)</option>
                          <option value="DOUBLES">Doubles (2 vs 2)</option>
                          <option value="MIXED_DOUBLES">Mixed Doubles (2 vs 2)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Points per Game</label>
                        <select
                          value={badmintonConfig.pointsPerGame}
                          onChange={(e) => setBadmintonConfig((prev) => ({ ...prev, pointsPerGame: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value={21}>21 Points (Standard BWF)</option>
                          <option value={15}>15 Points (Shortened)</option>
                          <option value={11}>11 Points (Quick 11s)</option>
                          <option value={30}>30 Points (Single Game 30)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <Input
                        label="Maximum Golden Point Cap"
                        type="number"
                        value={badmintonConfig.capPoints}
                        onChange={(e) => setBadmintonConfig((prev) => ({ ...prev, capPoints: Number(e.target.value) }))}
                        placeholder="30"
                      />

                      <Input
                        label="Interval Point (Mid-game break)"
                        type="number"
                        value={badmintonConfig.intervalPoints}
                        onChange={(e) => setBadmintonConfig((prev) => ({ ...prev, intervalPoints: Number(e.target.value) }))}
                        placeholder="11"
                      />

                      <Input
                        label="Court Name & Number"
                        value={badmintonConfig.courtName || 'Court 1'}
                        onChange={(e) => setBadmintonConfig((prev) => ({ ...prev, courtName: e.target.value }))}
                        placeholder="Court 1, Hall A..."
                      />
                    </div>
                  </div>
                )}

                {/* TABLE TENNIS RULES */}
                {sport === 'TABLE_TENNIS' && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Table Tennis Match Configuration</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        ITTF Official Standard (11 Points / 2-Pt Rotation / Deuce 1-Pt)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Match Format</label>
                        <select
                          value={tableTennisConfig.format}
                          onChange={(e) => setTableTennisConfig((prev) => ({ ...prev, format: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="BEST_OF_3">Best of 3 Games (Quick Match)</option>
                          <option value="BEST_OF_5">Best of 5 Games (Standard Tour)</option>
                          <option value="BEST_OF_7">Best of 7 Games (Championship / Olympics)</option>
                          <option value="BEST_OF_1">Single Game (1 Game Match)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Discipline / Type</label>
                        <select
                          value={tableTennisConfig.matchType}
                          onChange={(e) => setTableTennisConfig((prev) => ({ ...prev, matchType: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="SINGLES">Singles (1 vs 1)</option>
                          <option value="DOUBLES">Doubles (2 vs 2)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Points per Game</label>
                        <select
                          value={tableTennisConfig.pointsPerGame}
                          onChange={(e) => setTableTennisConfig((prev) => ({ ...prev, pointsPerGame: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value={11}>11 Points (ITTF Standard)</option>
                          <option value={21}>21 Points (Classic 21s)</option>
                          <option value={15}>15 Points (Shortened)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <Input
                        label="Service Rotation (Points per Server)"
                        type="number"
                        value={tableTennisConfig.serviceRotation}
                        onChange={(e) => setTableTennisConfig((prev) => ({ ...prev, serviceRotation: Number(e.target.value) }))}
                        placeholder="2"
                      />

                      <Input
                        label="Table Name & Number"
                        value={tableTennisConfig.tableNumber || 'Table 1'}
                        onChange={(e) => setTableTennisConfig((prev) => ({ ...prev, tableNumber: e.target.value }))}
                        placeholder="Table 1, Center Table..."
                      />

                      <Input
                        label="Deciding Game End Change (At Points)"
                        type="number"
                        value={tableTennisConfig.decidingGameEndChangePoint || 5}
                        onChange={(e) => setTableTennisConfig((prev) => ({ ...prev, decidingGameEndChangePoint: Number(e.target.value) }))}
                        placeholder="5"
                      />
                    </div>
                  </div>
                )}

                {/* OTHER SPORTS */}
                {!['CRICKET', 'VOLLEYBALL', 'KABADDI', 'HOCKEY', 'FOOTBALL', 'BASKETBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'].includes(sport) && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{sport} Configuration</h4>
                    <p className="text-xs text-slate-400">Standard match regulations applied for {sport}. You can specify custom rules notes in the description field.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PLAYING SQUADS */}
            {activeTab === 'squads' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    Select players from saved team rosters. Click a player to cycle: <strong className="text-emerald-400">Playing</strong> → <strong className="text-amber-400">Substitute</strong> → <strong className="text-slate-500">Unselected</strong>.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team A Roster Selection */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-emerald-400">
                        {selectedTeamA?.name || 'Team A'} Squad ({teamASquad.playingIds.length} Playing / {teamASquad.substituteIds.length} Subs)
                      </span>
                      <button
                        type="button"
                        onClick={() => selectAllPlayersAsPlaying('A')}
                        className="text-[10px] text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        Select All
                      </button>
                    </div>

                    {teamAPlayers.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No players registered in {selectedTeamA?.name || 'Team A'} roster yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                        {teamAPlayers.map((player) => {
                          const isPlaying = teamASquad.playingIds.includes(player.id);
                          const isSub = teamASquad.substituteIds.includes(player.id);

                          return (
                            <div
                              key={player.id}
                              onClick={() => togglePlayerSquadA(player.id)}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                                isPlaying
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                                  : isSub
                                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  #{player.jerseyNumber || '-'}
                                </span>
                                <span className="font-semibold">{player.name}</span>
                                {player.role && <span className="text-[10px] text-slate-400">({player.role})</span>}
                              </div>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded">
                                {isPlaying ? '✓ PLAYING' : isSub ? 'BENCH' : '+ SELECT'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Team B Roster Selection */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-sky-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-sky-400">
                        {selectedTeamB?.name || 'Team B'} Squad ({teamBSquad.playingIds.length} Playing / {teamBSquad.substituteIds.length} Subs)
                      </span>
                      <button
                        type="button"
                        onClick={() => selectAllPlayersAsPlaying('B')}
                        className="text-[10px] text-sky-400 hover:underline font-semibold cursor-pointer"
                      >
                        Select All
                      </button>
                    </div>

                    {teamBPlayers.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No players registered in {selectedTeamB?.name || 'Team B'} roster yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                        {teamBPlayers.map((player) => {
                          const isPlaying = teamBSquad.playingIds.includes(player.id);
                          const isSub = teamBSquad.substituteIds.includes(player.id);

                          return (
                            <div
                              key={player.id}
                              onClick={() => togglePlayerSquadB(player.id)}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                                isPlaying
                                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                                  : isSub
                                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  #{player.jerseyNumber || '-'}
                                </span>
                                <span className="font-semibold">{player.name}</span>
                                {player.role && <span className="text-[10px] text-slate-400">({player.role})</span>}
                              </div>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded">
                                {isPlaying ? '✓ PLAYING' : isSub ? 'BENCH' : '+ SELECT'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: OFFICIALS & SPONSORS */}
            {activeTab === 'officials_sponsors' && (
              <div className="space-y-4">
                {/* MATCH OFFICIALS */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" /> Match Officials
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Input
                      label="Main Referee / Umpire 1"
                      value={officials.referee || ''}
                      onChange={(e) => setOfficials((prev) => ({ ...prev, referee: e.target.value }))}
                      placeholder="e.g. Aleem Dar"
                    />

                    <Input
                      label="Second Umpire / Referee 2"
                      value={officials.umpire || ''}
                      onChange={(e) => setOfficials((prev) => ({ ...prev, umpire: e.target.value }))}
                      placeholder="e.g. Kumar Dharmasena"
                    />

                    <Input
                      label="Official Scorer"
                      value={officials.scorer || ''}
                      onChange={(e) => setOfficials((prev) => ({ ...prev, scorer: e.target.value }))}
                      placeholder="e.g. Rajesh Kumar"
                    />

                    <Input
                      label="Third / TV Umpire / Assistant"
                      value={officials.assistant || ''}
                      onChange={(e) => setOfficials((prev) => ({ ...prev, assistant: e.target.value }))}
                      placeholder="e.g. Richard Kettleborough"
                    />

                    <Input
                      label="Lead Commentator"
                      value={officials.commentator || ''}
                      onChange={(e) => setOfficials((prev) => ({ ...prev, commentator: e.target.value }))}
                      placeholder="e.g. Harsha Bhogle"
                    />

                    <Input
                      label="Match Commissioner"
                      value={officials.official1 || ''}
                      onChange={(e) => setOfficials((prev) => ({ ...prev, official1: e.target.value }))}
                      placeholder="e.g. Javagal Srinath"
                    />
                  </div>
                </div>

                {/* MATCH SPONSORS & BRANDING */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Match Sponsor & Broadcast Logos
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Match Sponsor Name"
                      value={sponsors.sponsorName || ''}
                      onChange={(e) => setSponsors((prev) => ({ ...prev, sponsorName: e.target.value }))}
                      placeholder="e.g. Dream11 / Red Bull / Tata"
                    />

                    <ImageUpload
                      label="Sponsor Logo URL"
                      value={sponsors.sponsorLogoUrl || ''}
                      onChange={(url) => setSponsors((prev) => ({ ...prev, sponsorLogoUrl: url }))}
                      placeholder="Upload or paste sponsor logo URL"
                    />

                    <ImageUpload
                      label="Match Logo URL"
                      value={sponsors.matchLogoUrl || ''}
                      onChange={(url) => setSponsors((prev) => ({ ...prev, matchLogoUrl: url }))}
                      placeholder="Upload or paste match logo URL"
                    />

                    <ImageUpload
                      label="Tournament Logo URL"
                      value={sponsors.tournamentLogoUrl || ''}
                      onChange={(url) => setSponsors((prev) => ({ ...prev, tournamentLogoUrl: url }))}
                      placeholder="Upload or paste tournament logo URL"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <Button variant="secondary" size="sm" onClick={handleRequestClose} disabled={saving}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit('DRAFT')}
              loading={saving}
              disabled={loadingData}
            >
              Save Draft
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit('READY')}
              loading={saving}
              disabled={loadingData}
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-950" />}
            >
              Save & Mark Ready
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
