import React, { useState } from 'react';
import {
  SportType,
  OnAirGraphicItem,
  StudioGraphic,
  GraphicScene,
  OnAirPlaylist,
} from '../../types';
import {
  X,
  Search,
  Tv,
  Layers,
  ListOrdered,
  Sparkles,
  Zap,
  Award,
  Activity,
  User,
  Play,
  Eye,
  Clock,
  Check,
} from 'lucide-react';

interface InsertGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport: SportType;
  customGraphics: StudioGraphic[];
  scenes: GraphicScene[];
  playlists: OnAirPlaylist[];
  onCueToPreview: (item: Partial<OnAirGraphicItem>) => void;
  onTakeLive: (item: Partial<OnAirGraphicItem>) => void;
}

type CategoryType =
  | 'MATCH_STATUS'
  | 'LIVE_DATA'
  | 'EVENTS'
  | 'MILESTONES'
  | 'SCENES'
  | 'PLAYLISTS'
  | 'CUSTOM';

interface InserterItem {
  id: string;
  name: string;
  category: CategoryType;
  description: string;
  defaultDuration: number;
  badge?: string;
  payloadType: string;
}

export const InsertGraphicModal: React.FC<InsertGraphicModalProps> = ({
  isOpen,
  onClose,
  sport,
  customGraphics,
  scenes,
  playlists,
  onCueToPreview,
  onTakeLive,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('MATCH_STATUS');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationSec, setDurationSec] = useState<number>(4);

  if (!isOpen) return null;

  // Build catalog items based on sport
  const getCatalogItems = (): InserterItem[] => {
    if (sport === 'CRICKET') {
      return [
        // MATCH / STATUS
        { id: 'cricket_live_score', name: 'LIVE SCORE', category: 'MATCH_STATUS', description: 'Primary broadcast scorebug with team scores, overs and run rate', defaultDuration: 0, badge: 'Scorebug', payloadType: 'SCOREBUG' },
        { id: 'cricket_team_score', name: 'TEAM SCORE SUMMARY', category: 'MATCH_STATUS', description: 'Detailed team card with wickets and current run rate', defaultDuration: 5, badge: 'Team', payloadType: 'TEAM_SCORE' },
        { id: 'cricket_overs_summary', name: 'OVERS & RUN RATE', category: 'MATCH_STATUS', description: 'Current over progress, projected totals, and required run rate', defaultDuration: 5, badge: 'Over', payloadType: 'OVERS_RR' },
        { id: 'cricket_target_chase', name: 'TARGET & CHASE FORMULA', category: 'MATCH_STATUS', description: 'Target required, runs needed, remaining balls, and required run rate', defaultDuration: 6, badge: 'Chase', payloadType: 'TARGET' },
        { id: 'cricket_innings_break', name: 'INNINGS BREAK SUMMARY', category: 'MATCH_STATUS', description: 'Comprehensive scorecard summary between innings', defaultDuration: 10, badge: 'Break', payloadType: 'INNINGS_BREAK' },
        { id: 'cricket_match_result', name: 'MATCH RESULT', category: 'MATCH_STATUS', description: 'Final winner presentation card with margin of victory', defaultDuration: 12, badge: 'Result', payloadType: 'RESULT' },

        // LIVE DATA
        { id: 'cricket_striker_card', name: 'STRIKER LOWER THIRD', category: 'LIVE_DATA', description: 'On-strike batsman profile, runs, balls, strike rate, boundaries', defaultDuration: 6, badge: 'Batter', payloadType: 'BATTER' },
        { id: 'cricket_nonstriker_card', name: 'NON-STRIKER STATS', category: 'LIVE_DATA', description: 'Non-striker profile, runs, balls faced, and strike rate', defaultDuration: 5, badge: 'Batter', payloadType: 'NON_STRIKER' },
        { id: 'cricket_bowler_card', name: 'CURRENT BOWLER PROFILE', category: 'LIVE_DATA', description: 'Current bowler figures, overs, maidens, runs conceded, wickets, economy', defaultDuration: 6, badge: 'Bowler', payloadType: 'BOWLER' },
        { id: 'cricket_bowler_figures', name: 'BOWLER SPELL FIGURES', category: 'LIVE_DATA', description: 'Compact lower third showing spell summary (e.g. 3.4-0-18-2)', defaultDuration: 4, badge: 'Bowler', payloadType: 'BOWLER_FIGURES' },
        { id: 'cricket_current_ball', name: 'CURRENT BALL TRAJECTORY', category: 'LIVE_DATA', description: 'Real-time graphic display of the delivery outcome and speed', defaultDuration: 3, badge: 'Ball', payloadType: 'CURRENT_BALL' },
        { id: 'cricket_recent_balls', name: 'RECENT BALLS (LAST 10)', category: 'LIVE_DATA', description: 'Visual strip showing outcome tags of recent deliveries in over', defaultDuration: 5, badge: 'Over', payloadType: 'RECENT_BALLS' },
        { id: 'cricket_partnership', name: 'CURRENT PARTNERSHIP', category: 'LIVE_DATA', description: 'Cumulative partnership runs, balls faced, and contribution percentage', defaultDuration: 6, badge: 'Partnership', payloadType: 'PARTNERSHIP' },

        // EVENTS
        { id: 'cricket_four', name: 'FOUR (4)', category: 'EVENTS', description: 'High-energy 4 runs boundary animation with batter spotlight', defaultDuration: 3.5, badge: 'Boundary', payloadType: 'FOUR' },
        { id: 'cricket_six', name: 'SIX (6)', category: 'EVENTS', description: 'Explosive maximum celebration with neon particle dynamics', defaultDuration: 4, badge: 'Boundary', payloadType: 'SIX' },
        { id: 'cricket_wicket', name: 'WICKET DISMISSAL', category: 'EVENTS', description: 'Dramatic dismissal celebration with how-out method & fielder tags', defaultDuration: 5, badge: 'Wicket', payloadType: 'WICKET' },
        { id: 'cricket_dot', name: 'DOT BALL', category: 'EVENTS', description: 'Discipline dot ball indicator', defaultDuration: 2, badge: 'Ball', payloadType: 'DOT' },
        { id: 'cricket_wide', name: 'WIDE BALL', category: 'EVENTS', description: 'Extra run awarded for delivery outside tramline', defaultDuration: 2.5, badge: 'Extra', payloadType: 'WIDE' },
        { id: 'cricket_noball', name: 'NO BALL', category: 'EVENTS', description: 'Illegal delivery warning signaling next free hit', defaultDuration: 3, badge: 'Extra', payloadType: 'NO_BALL' },
        { id: 'cricket_freehit', name: 'FREE HIT ON-AIR CALL', category: 'EVENTS', description: 'Flashing Free Hit banner highlighting safe shot delivery', defaultDuration: 3.5, badge: 'Special', payloadType: 'FREE_HIT' },

        // MILESTONES
        { id: 'cricket_fifty', name: 'FIFTY (50 RUNS)', category: 'MILESTONES', description: 'Prestigious half-century accolade card with ball count and boundaries', defaultDuration: 6, badge: '50 Runs', payloadType: 'FIFTY' },
        { id: 'cricket_century', name: 'CENTURY (100 RUNS)', category: 'MILESTONES', description: 'Epic century achievement graphic with highlight montage framing', defaultDuration: 8, badge: '100 Runs', payloadType: 'CENTURY' },
        { id: 'cricket_hat_trick', name: 'HAT TRICK', category: 'MILESTONES', description: 'Three wickets in consecutive balls legendary graphic celebration', defaultDuration: 8, badge: 'Legendary', payloadType: 'HAT_TRICK' },
        { id: 'cricket_maiden', name: 'MAIDEN OVER', category: 'MILESTONES', description: 'Six consecutive dot balls scoreless over badge', defaultDuration: 4, badge: 'Bowling', payloadType: 'MAIDEN' },
        { id: 'cricket_pom', name: 'PLAYER OF THE MATCH', category: 'MILESTONES', description: 'Post-game best performer awards spotlight graphic', defaultDuration: 10, badge: 'Award', payloadType: 'PLAYER_OF_MATCH' },
      ];
    }

    // Generic fallback for other sports
    return [
      { id: 'sport_scoreboard', name: 'LIVE SCOREBUG', category: 'MATCH_STATUS', description: 'Primary broadcast match scorebug', defaultDuration: 0, badge: 'Scorebug', payloadType: 'SCOREBUG' },
      { id: 'sport_team_summary', name: 'MATCH STATS SUMMARY', category: 'MATCH_STATUS', description: 'Comparison of possession, shots, and fouls', defaultDuration: 6, badge: 'Stats', payloadType: 'STATS' },
      { id: 'sport_point', name: 'SCORE / GOAL / POINT', category: 'EVENTS', description: 'Point scored banner animation', defaultDuration: 4, badge: 'Score', payloadType: 'GOAL' },
      { id: 'sport_foul', name: 'FOUL / DISCIPLINE CARD', category: 'EVENTS', description: 'Discipline infraction callout', defaultDuration: 4, badge: 'Foul', payloadType: 'FOUL' },
      { id: 'sport_milestone', name: 'MATCH MILESTONE', category: 'MILESTONES', description: 'Player milestone achievement card', defaultDuration: 6, badge: 'Milestone', payloadType: 'MILESTONE' },
      { id: 'sport_result', name: 'FINAL MATCH RESULT', category: 'MATCH_STATUS', description: 'Final score result presentation', defaultDuration: 10, badge: 'Result', payloadType: 'RESULT' },
    ];
  };

  const catalogItems = getCatalogItems();

  // Filter items
  const filteredCatalog = catalogItems.filter((item) => {
    if (item.category !== selectedCategory) return false;
    if (!searchQuery) return true;
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCue = (item: InserterItem) => {
    onCueToPreview({
      graphicName: item.name,
      eventName: item.name,
      sourceType: item.category === 'MATCH_STATUS' ? 'SCOREBOARD' : 'EVENT',
      durationSeconds: durationSec > 0 ? durationSec : item.defaultDuration || 4,
      priority: 50,
      autoClear: durationSec > 0,
    });
    onClose();
  };

  const handleTake = (item: InserterItem) => {
    onTakeLive({
      graphicName: item.name,
      eventName: item.name,
      sourceType: item.category === 'MATCH_STATUS' ? 'SCOREBOARD' : 'EVENT',
      durationSeconds: durationSec > 0 ? durationSec : item.defaultDuration || 4,
      priority: 50,
      autoClear: durationSec > 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                INSERT GRAPHIC ON AIR
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {sport}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Select any dynamic broadcast graphic, live data layer, scene, or rundown item to cue or cut live.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duration & Search Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/50 border-b border-slate-800">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search graphics, events, scenes, or players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick duration presets */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">ON-AIR DURATION:</span>
            {[2, 4, 6, 10, 0].map((sec) => (
              <button
                key={sec}
                onClick={() => setDurationSec(sec)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                  durationSec === sec
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {sec === 0 ? 'HOLD' : `${sec}s`}
              </button>
            ))}
          </div>
        </div>

        {/* 7 Categories Tabs Bar */}
        <div className="flex items-center gap-1 px-6 py-2 bg-slate-950 border-b border-slate-800/80 overflow-x-auto">
          {[
            { id: 'MATCH_STATUS', label: '1. MATCH / STATUS', icon: <Tv className="w-3.5 h-3.5" /> },
            { id: 'LIVE_DATA', label: '2. LIVE DATA', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'EVENTS', label: '3. EVENTS', icon: <Zap className="w-3.5 h-3.5" /> },
            { id: 'MILESTONES', label: '4. MILESTONES', icon: <Award className="w-3.5 h-3.5" /> },
            { id: 'SCENES', label: `5. SCENES (${scenes.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'PLAYLISTS', label: `6. PLAYLISTS (${playlists.length})`, icon: <ListOrdered className="w-3.5 h-3.5" /> },
            { id: 'CUSTOM', label: `7. CUSTOM GRAPHICS (${customGraphics.length})`, icon: <Sparkles className="w-3.5 h-3.5" /> },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as CategoryType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* If Scenes Category */}
          {selectedCategory === 'SCENES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenes.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-slate-500 text-xs">
                  No Graphic Scenes created yet. Go to Graphic Scenes Manager tab to compose a multi-layer scene.
                </div>
              ) : (
                scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{scene.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          {scene.layers?.length || 0} Layers
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {scene.description || 'Custom multi-layer broadcast composition'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onCueToPreview({
                            sceneId: scene.id,
                            sceneName: scene.name,
                            sourceType: 'SCENE',
                            durationSeconds: scene.durationSeconds || 6,
                          });
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => {
                          onTakeLive({
                            sceneId: scene.id,
                            sceneName: scene.name,
                            sourceType: 'SCENE',
                            durationSeconds: scene.durationSeconds || 6,
                          });
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 transition shadow-md cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Take Live</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* If Playlists Category */}
          {selectedCategory === 'PLAYLISTS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {playlists.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-slate-500 text-xs">
                  No Playlists created yet. Go to Playlist / Rundown tab to assemble an automated rundown.
                </div>
              ) : (
                playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{pl.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          {pl.items?.length || 0} Items
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {pl.description || 'Automated rundown playlist sequence'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onTakeLive({
                            playlistId: pl.id,
                            sourceType: 'PLAYLIST',
                            graphicName: `Playlist: ${pl.name}`,
                            durationSeconds: 5,
                          });
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1 transition shadow-md cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Playlist</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* If Custom Studio Graphics Category */}
          {selectedCategory === 'CUSTOM' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customGraphics.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-slate-500 text-xs">
                  No Custom Graphics found in Graphics Studio. Design custom lower-thirds or cards in Graphics Studio.
                </div>
              ) : (
                customGraphics.map((graphic) => (
                  <div
                    key={graphic.id}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{graphic.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {graphic.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {graphic.elements?.length || 0} elements • 1920×1080
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onCueToPreview({
                            graphicId: graphic.id,
                            graphic,
                            graphicName: graphic.name,
                            sourceType: 'CUSTOM',
                            durationSeconds: durationSec > 0 ? durationSec : 5,
                          });
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => {
                          onTakeLive({
                            graphicId: graphic.id,
                            graphic,
                            graphicName: graphic.name,
                            sourceType: 'CUSTOM',
                            durationSeconds: durationSec > 0 ? durationSec : 5,
                          });
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 transition shadow-md cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Take Live</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Standard Catalog Items (MATCH_STATUS, LIVE_DATA, EVENTS, MILESTONES) */}
          {(selectedCategory === 'MATCH_STATUS' ||
            selectedCategory === 'LIVE_DATA' ||
            selectedCategory === 'EVENTS' ||
            selectedCategory === 'MILESTONES') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCatalog.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-slate-500 text-xs">
                  No items match your search.
                </div>
              ) : (
                filteredCatalog.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-md transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white tracking-wide truncate">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCue(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                        title="Cue item to Preview monitor"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => handleTake(item)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 transition shadow-md cursor-pointer"
                        title="Cut item directly to Program"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Take Live</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
