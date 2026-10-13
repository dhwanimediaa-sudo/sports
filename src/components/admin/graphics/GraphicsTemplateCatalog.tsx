import React, { useState, useEffect } from 'react';
import { SportType, Match } from '../../../types';
import { api } from '../../../services/api';
import {
  Sparkles,
  Tv,
  Check,
  ExternalLink,
  Copy,
  Eye,
  Sliders,
  Film,
  Zap,
  Tag,
  Trophy,
  Filter,
  Play,
  Square,
  Layers,
  Radio,
  X,
} from 'lucide-react';

export type TemplateCategory =
  | 'MATCH'
  | 'SCOREBOARD'
  | 'PLAYER'
  | 'TEAM'
  | 'EVENT'
  | 'RESULT'
  | 'SPONSOR'
  | 'LOWER THIRD';

export interface GraphicTemplateItem {
  id: string;
  name: string;
  sport: SportType;
  category: TemplateCategory;
  description: string;
  isSystem: boolean;
  isEditable: boolean;
  previewBg: string;
  badgeColor: string;
  tags: string[];
}

const TEMPLATE_DATABASE: GraphicTemplateItem[] = [
  // --- CRICKET ---
  {
    id: 'cricket-scoreboard-modern',
    name: 'Cricket Scoreboard (Pro Lower Bug)',
    sport: 'CRICKET',
    category: 'SCOREBOARD',
    description: 'Displays current batting team, total score, wickets, overs, striker/non-striker runs, and bowler figures.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-blue-900/80 to-slate-950',
    badgeColor: 'text-blue-400 border-blue-500/30',
    tags: ['Live Score', 'Overs', 'Batters', 'Bowler'],
  },
  {
    id: 'cricket-team-vs-team',
    name: 'Team vs Team Match Title Bug',
    sport: 'CRICKET',
    category: 'MATCH',
    description: 'Header overlay featuring Team A logo vs Team B logo, tournament name, and series round status.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-emerald-950 to-slate-950',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    tags: ['Versus', 'Team Logos', 'Tournament'],
  },
  {
    id: 'cricket-batter-card',
    name: 'Batter Profile & Tournament Stats',
    sport: 'CRICKET',
    category: 'PLAYER',
    description: 'Side-wing card showing incoming batter photo, strike rate, boundaries, and tournament average.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-amber-950/70 to-slate-950',
    badgeColor: 'text-amber-400 border-amber-500/30',
    tags: ['Batter', 'Player Bio', 'Strike Rate'],
  },
  {
    id: 'cricket-bowler-card',
    name: 'Bowler Spell Summary Card',
    sport: 'CRICKET',
    category: 'PLAYER',
    description: 'Lower card showcasing bowler spell figures: Overs, Maidens, Runs conceded, Wickets, and Economy.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-purple-950/70 to-slate-950',
    badgeColor: 'text-purple-400 border-purple-500/30',
    tags: ['Bowler', 'Economy', 'Bowling Spell'],
  },
  {
    id: 'cricket-event-four',
    name: 'FOUR Boundary Pop-up Flash',
    sport: 'CRICKET',
    category: 'EVENT',
    description: 'Dynamic celebratory splash animated on a 4-run shot with batter name and updated score.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-emerald-900 to-teal-950',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    tags: ['Boundary', '4 Runs', 'Flash Graphic'],
  },
  {
    id: 'cricket-event-six',
    name: 'SIX Maximum Pop-up Splash',
    sport: 'CRICKET',
    category: 'EVENT',
    description: 'High-energy celebration banner highlighting a 6-run hit with projectile distance badge.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-indigo-900 to-slate-950',
    badgeColor: 'text-indigo-400 border-indigo-500/30',
    tags: ['Maximum', '6 Runs', 'Celebration'],
  },
  {
    id: 'cricket-event-wicket',
    name: 'WICKET Fall & Dismissal Card',
    sport: 'CRICKET',
    category: 'EVENT',
    description: 'Red dramatic dismissal banner displaying bowler credit, catcher name, and updated wickets.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-rose-950 to-slate-950',
    badgeColor: 'text-rose-400 border-rose-500/30',
    tags: ['Out', 'Dismissal', 'Fielder Catch'],
  },
  {
    id: 'cricket-milestone-fifty',
    name: 'FIFTY Half-Century Milestone',
    sport: 'CRICKET',
    category: 'EVENT',
    description: 'Golden animated achievement banner for batter reaching 50 runs, with balls faced and boundaries.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-amber-900 to-yellow-950',
    badgeColor: 'text-yellow-400 border-yellow-500/30',
    tags: ['50 Runs', 'Half-Century', 'Milestone'],
  },
  {
    id: 'cricket-milestone-century',
    name: 'CENTURY 100 Runs Milestone',
    sport: 'CRICKET',
    category: 'EVENT',
    description: 'Prestigious celebratory banner for 100 runs with career milestones and crowd salute effect.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-yellow-900 to-amber-950',
    badgeColor: 'text-yellow-300 border-yellow-400/30',
    tags: ['100 Runs', 'Century', 'Elite'],
  },
  {
    id: 'cricket-partnership-card',
    name: 'Current Partnership Stat Board',
    sport: 'CRICKET',
    category: 'TEAM',
    description: 'Split bar showing total partnership runs, balls faced, and contribution from each batsman.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-sky-950 to-slate-950',
    badgeColor: 'text-sky-400 border-sky-500/30',
    tags: ['Partnership', 'Wicket Stand', 'Teamwork'],
  },
  {
    id: 'cricket-playing-xi',
    name: 'Playing XI Team Squad Board',
    sport: 'CRICKET',
    category: 'TEAM',
    description: 'Full screen or two-column graphic displaying the official line-up, captain, wicket-keeper, and bench.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-slate-900 to-blue-950',
    badgeColor: 'text-blue-300 border-blue-400/30',
    tags: ['Playing 11', 'Lineup', 'Captain'],
  },
  {
    id: 'cricket-match-result',
    name: 'Official Cricket Match Result Card',
    sport: 'CRICKET',
    category: 'RESULT',
    description: 'Full-screen or center lower third announcing winner, margin of victory, and player of the match.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-emerald-950 to-slate-950',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    tags: ['Match Winner', 'Player of Match', 'Final Score'],
  },
  {
    id: 'cricket-lower-third-ticker',
    name: 'Broadcast Lower Third News Ticker',
    sport: 'CRICKET',
    category: 'LOWER THIRD',
    description: 'Clean lower-third strap for tournament updates, series standings, upcoming fixtures, or commentator notes.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-slate-900 to-slate-950',
    badgeColor: 'text-slate-300 border-slate-700',
    tags: ['Lower Third', 'Ticker', 'Broadcast Strap'],
  },
  {
    id: 'cricket-sponsor-banner',
    name: 'Title & Boundary Sponsor Bug',
    sport: 'CRICKET',
    category: 'SPONSOR',
    description: 'Persistent corner or animated rotating bug for league sponsors, beverage partners, or brand logos.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-slate-900 to-indigo-950',
    badgeColor: 'text-indigo-400 border-indigo-500/30',
    tags: ['Sponsor', 'Brand Bug', 'Corner Logo'],
  },

  // --- KABADDI ---
  {
    id: 'kabaddi-scoreboard-main',
    name: 'Kabaddi Scoreboard (Live Mat Bug)',
    sport: 'KABADDI',
    category: 'SCOREBOARD',
    description: 'Displays current raid points, tackle points, bonus points, 30s raid clock countdown, and active mat count.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-orange-950 to-slate-950',
    badgeColor: 'text-orange-400 border-orange-500/30',
    tags: ['Raid Points', 'Tackle Points', 'Raid Clock'],
  },
  {
    id: 'kabaddi-event-raid',
    name: 'RAID Active Alert Banner',
    sport: 'KABADDI',
    category: 'EVENT',
    description: 'Animated alert indicating active raid with raider name, jersey number, and raid count.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-amber-950 to-slate-950',
    badgeColor: 'text-amber-400 border-amber-500/30',
    tags: ['Raid Alert', 'Raider', 'In Play'],
  },
  {
    id: 'kabaddi-event-super-raid',
    name: 'SUPER RAID Explosive Celebration',
    sport: 'KABADDI',
    category: 'EVENT',
    description: 'High-voltage badge celebrating 3+ touch/bonus points in a single raid.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-red-900 to-orange-950',
    badgeColor: 'text-red-400 border-red-500/30',
    tags: ['Super Raid', '3+ Points', 'Electrifying'],
  },
  {
    id: 'kabaddi-event-tackle',
    name: 'TACKLE Defense Point Bug',
    sport: 'KABADDI',
    category: 'EVENT',
    description: 'Strap highlighting successful tackle by corner/cover defenders with point added.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-blue-950 to-slate-950',
    badgeColor: 'text-blue-400 border-blue-500/30',
    tags: ['Tackle', 'Defense', 'Mat Hold'],
  },
  {
    id: 'kabaddi-event-super-tackle',
    name: 'SUPER TACKLE (2 Points) Splash',
    sport: 'KABADDI',
    category: 'EVENT',
    description: 'Special celebration banner when 3 or fewer defenders successfully execute a tackle for 2 points.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-purple-950 to-slate-950',
    badgeColor: 'text-purple-400 border-purple-500/30',
    tags: ['Super Tackle', '2 Defense Points', 'Clutch'],
  },
  {
    id: 'kabaddi-event-all-out',
    name: 'ALL OUT (Lona Awarded) Banner',
    sport: 'KABADDI',
    category: 'EVENT',
    description: 'Dramatic full-width broadcast graphic declaring All Out and adding 2 bonus points to opposition.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-rose-950 to-red-950',
    badgeColor: 'text-rose-400 border-rose-500/30',
    tags: ['All Out', 'Lona', 'Full Court Reset'],
  },
  {
    id: 'kabaddi-player-card',
    name: 'Kabaddi Raider / Defender Card',
    sport: 'KABADDI',
    category: 'PLAYER',
    description: 'Player profile with successful raid percentage, super 10s, high 5s, and tackle success rate.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-amber-950 to-slate-950',
    badgeColor: 'text-amber-400 border-amber-500/30',
    tags: ['Super 10', 'High 5', 'Player Stats'],
  },
  {
    id: 'kabaddi-team-squad',
    name: 'Starting 7 & Subs Roster Board',
    sport: 'KABADDI',
    category: 'TEAM',
    description: 'Starting seven mat positions (Corners, Covers, Center Raider) and bench substitutes.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-slate-900 to-orange-950',
    badgeColor: 'text-orange-300 border-orange-400/30',
    tags: ['Starting 7', 'Lineup', 'Mat Formation'],
  },
  {
    id: 'kabaddi-match-result',
    name: 'Kabaddi Final Match Result Card',
    sport: 'KABADDI',
    category: 'RESULT',
    description: 'Final score breakdown by half, raid vs tackle point split, and top performer of the match.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-emerald-950 to-slate-950',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    tags: ['Final Score', 'Point Split', 'Winner'],
  },
  {
    id: 'kabaddi-sponsor-banner',
    name: 'Mat & Title Sponsor Overlay',
    sport: 'KABADDI',
    category: 'SPONSOR',
    description: 'Kabaddi league mat brand placement and title sponsor bug for live stream.',
    isSystem: true,
    isEditable: true,
    previewBg: 'from-slate-900 to-slate-950',
    badgeColor: 'text-slate-300 border-slate-700',
    tags: ['Sponsor', 'Mat Logo', 'Broadcast Bug'],
  },

  // --- VOLLEYBALL ---
  {
    id: 'volleyball-scoreboard-live',
    name: 'Volleyball Sets & Point Bug',
    sport: 'VOLLEYBALL',
    category: 'SCOREBOARD',
    description: 'Tracks current set score, sets won (best of 3/5), serving team indicator, and timeout counter.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-cyan-950 to-slate-950',
    badgeColor: 'text-cyan-400 border-cyan-500/30',
    tags: ['Set Score', 'Serving Indicator', 'Timeouts'],
  },
  {
    id: 'volleyball-event-ace',
    name: 'SERVICE ACE Celebration',
    sport: 'VOLLEYBALL',
    category: 'EVENT',
    description: 'Fast pop-up graphic celebrating an untouched service ace with server name.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-cyan-900 to-slate-950',
    badgeColor: 'text-cyan-400 border-cyan-500/30',
    tags: ['Ace', 'Service Point', 'Flash'],
  },
  {
    id: 'volleyball-event-block',
    name: 'MONSTER BLOCK Impact Banner',
    sport: 'VOLLEYBALL',
    category: 'EVENT',
    description: 'Energetic net block graphic featuring middle blocker name.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-blue-950 to-slate-950',
    badgeColor: 'text-blue-400 border-blue-500/30',
    tags: ['Block', 'Net Defense', 'Point'],
  },

  // --- FOOTBALL ---
  {
    id: 'football-scoreboard-live',
    name: 'Football Match Score & Match Clock',
    sport: 'FOOTBALL',
    category: 'SCOREBOARD',
    description: 'Header score bug showing Team A vs Team B goals, active match clock, and extra time counter.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-emerald-950 to-slate-950',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    tags: ['Goals', 'Match Clock', 'Extra Time'],
  },
  {
    id: 'football-event-goal',
    name: 'GOAL Spectacular Animation',
    sport: 'FOOTBALL',
    category: 'EVENT',
    description: 'Dynamic celebratory overlay with goalscorer name, assist provider, and minute of goal.',
    isSystem: true,
    isEditable: false,
    previewBg: 'from-emerald-900 to-teal-950',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    tags: ['Goal', 'Goalscorer', 'Match Minute'],
  },
];

const CATEGORIES: { id: 'ALL' | TemplateCategory; label: string }[] = [
  { id: 'ALL', label: 'All Templates' },
  { id: 'SCOREBOARD', label: 'Scoreboard' },
  { id: 'MATCH', label: 'Match' },
  { id: 'PLAYER', label: 'Player' },
  { id: 'TEAM', label: 'Team' },
  { id: 'EVENT', label: 'Event' },
  { id: 'RESULT', label: 'Result' },
  { id: 'SPONSOR', label: 'Sponsor' },
  { id: 'LOWER THIRD', label: 'Lower Third' },
];

export interface GraphicsTemplateCatalogProps {
  activeSport?: SportType;
  selectedMatchId?: string | null;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAdvancedStudio?: () => void;
}

export const GraphicsTemplateCatalog: React.FC<GraphicsTemplateCatalogProps> = ({
  activeSport = 'CRICKET',
  selectedMatchId,
  onToast,
  onOpenAdvancedStudio,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | TemplateCategory>('ALL');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState<string>(selectedMatchId || '');
  const [onAirGraphicId, setOnAirGraphicId] = useState<string | null>(null);
  const [previewGraphicId, setPreviewGraphicId] = useState<string | null>(null);
  const [previewModalTemplate, setPreviewModalTemplate] = useState<GraphicTemplateItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (selectedMatchId) {
      setCurrentMatchId(selectedMatchId);
    }
  }, [selectedMatchId]);

  // Load matches for the active sport
  useEffect(() => {
    api.getMatches()
      .then((res) => {
        const sportMatches = (res.matches || []).filter(
          (m) => activeSport === 'CUSTOM' ? true : m.sport?.toUpperCase() === activeSport?.toUpperCase()
        );
        setMatches(sportMatches);
        if (!currentMatchId && sportMatches.length > 0) {
          setCurrentMatchId(sportMatches[0].id);
        }
      })
      .catch(() => {});
  }, [activeSport]);

  // Sync onAir state for the active match
  useEffect(() => {
    if (!currentMatchId) return;
    api.getOnAirState(currentMatchId)
      .then((res) => {
        if (res?.state) {
          setOnAirGraphicId(res.state.currentOnAir?.targetId || res.state.currentOnAir?.id || null);
          setPreviewGraphicId(res.state.previewGraphic?.targetId || res.state.previewGraphic?.id || null);
        }
      })
      .catch(() => {});
  }, [currentMatchId]);

  // Broadcast URL
  const broadcastUrl = currentMatchId
    ? `${window.location.origin}/broadcast/match/${currentMatchId}`
    : `${window.location.origin}/broadcast/match/{matchId}`;

  const filteredTemplates = TEMPLATE_DATABASE.filter((t) => {
    // If sport is specified, match sport or universal
    const matchSport = activeSport === 'CUSTOM' ? true : t.sport === activeSport;
    const matchCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchSport && matchCat;
  });

  const handleCopyBroadcastUrl = () => {
    navigator.clipboard.writeText(broadcastUrl);
    setCopiedUrl(true);
    onToast('Broadcast output URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const handleCue = async (template: GraphicTemplateItem) => {
    if (!currentMatchId) {
      onToast('Please select an active match first.', 'error');
      return;
    }
    setActionLoading(`cue-${template.id}`);
    try {
      await api.cueGraphic(currentMatchId, {
        targetId: template.id,
        graphicName: template.name,
        durationSeconds: 0,
        isHeld: true,
        sourceType: 'MANUAL',
        triggerSource: 'MANUAL',
      });
      setPreviewGraphicId(template.id);
      onToast(`Cued "${template.name}" to Preview.`, 'info');
    } catch (err: any) {
      onToast(err?.message || 'Failed to cue graphic.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTakeLive = async (template: GraphicTemplateItem) => {
    if (!currentMatchId) {
      onToast('Please select an active match first.', 'error');
      return;
    }
    setActionLoading(`play-${template.id}`);
    try {
      await api.playGraphic(currentMatchId, {
        targetId: template.id,
        graphicName: template.name,
        durationSeconds: 0,
        isHeld: true,
        sourceType: 'MANUAL',
        triggerSource: 'MANUAL',
      });
      setOnAirGraphicId(template.id);
      onToast(`"${template.name}" is now LIVE on air!`, 'success');
    } catch (err: any) {
      onToast(err?.message || 'Failed to take graphic live.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (template: GraphicTemplateItem) => {
    if (!currentMatchId) return;
    setActionLoading(`stop-${template.id}`);
    try {
      await api.stopGraphic(currentMatchId, template.id);
      setOnAirGraphicId(null);
      onToast(`"${template.name}" taken down from air.`, 'info');
    } catch (err: any) {
      onToast(err?.message || 'Failed to stop graphic.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Broadcast Output Callout */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-5 rounded-2xl border border-emerald-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Tv className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Live Broadcast Output URL
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  OBS / vMix 1080p
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Add this transparent Browser Source into OBS Studio, vMix, or Wirecast.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code className="text-[11px] font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-emerald-400 select-all max-w-xl truncate">
              {broadcastUrl}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyBroadcastUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow"
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copiedUrl ? 'Copied' : 'Copy URL'}
          </button>

          {selectedMatchId && (
            <a
              href={`/broadcast/match/${selectedMatchId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Open Output
            </a>
          )}
        </div>
      </div>

      {/* Target Match Selector Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">Target Match for Graphics:</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:max-w-md">
          {matches.length > 0 ? (
            <select
              value={currentMatchId}
              onChange={(e) => setCurrentMatchId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.status})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-slate-500 italic">No scheduled {activeSport} matches found.</span>
          )}
        </div>
      </div>

      {/* Sport Graphic Bar & Categories */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Film className="w-4 h-4 text-emerald-400" />
            <span>{activeSport} Overlay & Graphics Library</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pre-designed broadcast templates configured for {activeSport}. Cue to Preview or Take Live to output directly to broadcast.
          </p>
        </div>

        {onOpenAdvancedStudio && (
          <button
            onClick={onOpenAdvancedStudio}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Advanced Canvas Studio</span>
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tpl) => {
          const isOnAir = onAirGraphicId === tpl.id;
          const isCued = previewGraphicId === tpl.id;
          const isBusy = actionLoading?.includes(tpl.id);

          return (
            <div
              key={tpl.id}
              className={`bg-slate-950 border rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group ${
                isOnAir
                  ? 'border-red-500/80 shadow-red-950/30'
                  : isCued
                  ? 'border-cyan-500/80 shadow-cyan-950/30'
                  : 'border-slate-800/90 hover:border-slate-700'
              }`}
            >
              {/* Visual Preview Header */}
              <div className={`p-4 bg-gradient-to-br ${tpl.previewBg} border-b border-slate-800/80 relative min-h-[110px] flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-slate-950/60 backdrop-blur-sm ${tpl.badgeColor}`}>
                      {tpl.category}
                    </span>
                    {isOnAir && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-600 text-white animate-pulse">
                        ON AIR
                      </span>
                    )}
                    {isCued && !isOnAir && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-600 text-white">
                        CUED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
                    {tpl.sport}
                  </span>
                </div>

                <div className="mt-2">
                  <div className="text-white font-bold text-sm tracking-tight drop-shadow-md">
                    {tpl.name}
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {tpl.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                  <button
                    onClick={() => setPreviewModalTemplate(tpl)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
                    title="Preview template"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {isOnAir ? (
                      <button
                        onClick={() => handleStop(tpl)}
                        disabled={Boolean(isBusy)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow shadow-red-950/40 flex items-center gap-1 cursor-pointer"
                        title="Take down from live air"
                      >
                        <Square className="w-3 h-3" />
                        <span>TAKE DOWN</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCue(tpl)}
                          disabled={Boolean(isBusy)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                          title="Cue to Preview"
                        >
                          <Layers className="w-3 h-3 text-cyan-400" />
                          <span>CUE</span>
                        </button>

                        <button
                          onClick={() => handleTakeLive(tpl)}
                          disabled={Boolean(isBusy)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow shadow-emerald-950/40 flex items-center gap-1 cursor-pointer"
                          title="Take Live to program output"
                        >
                          <Zap className="w-3 h-3" />
                          <span>TAKE LIVE</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="p-12 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/60">
          <Film className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">No templates found for category "{selectedCategory}" in {activeSport}.</p>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className="mt-3 text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
          >
            Show All Templates
          </button>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md border ${previewModalTemplate.badgeColor}`}>
                  {previewModalTemplate.category}
                </span>
                <h3 className="text-base font-bold text-white">{previewModalTemplate.name}</h3>
              </div>
              <button
                onClick={() => setPreviewModalTemplate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-8 rounded-xl bg-gradient-to-br ${previewModalTemplate.previewBg} border border-slate-800 flex flex-col items-center justify-center min-h-[200px] text-center space-y-3`}>
              <Trophy className="w-10 h-10 text-emerald-400/80 animate-pulse" />
              <div className="text-white font-black text-xl tracking-tight">
                {previewModalTemplate.name}
              </div>
              <p className="text-xs text-slate-300 max-w-md">
                {previewModalTemplate.description}
              </p>
              <div className="text-[11px] font-mono text-emerald-400 bg-slate-950/70 px-3 py-1 rounded-full border border-emerald-500/30">
                1920×1080 Transparent Overlay • {previewModalTemplate.sport}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Target: {matches.find((m) => m.id === currentMatchId)?.name || currentMatchId || 'No match selected'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleCue(previewModalTemplate);
                    setPreviewModalTemplate(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 cursor-pointer"
                >
                  Cue to Preview
                </button>
                <button
                  onClick={() => {
                    handleTakeLive(previewModalTemplate);
                    setPreviewModalTemplate(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  Take Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
