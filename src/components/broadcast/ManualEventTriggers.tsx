import React from 'react';
import { SportType } from '../../types';
import {
  Flame,
  Zap,
  ShieldAlert,
  Award,
  CircleDot,
  Radio,
  Trophy,
  Activity,
  Eye,
  Play,
  Sparkles,
  AlertCircle,
  Pause,
} from 'lucide-react';

interface ManualEventTriggersProps {
  sport: SportType;
  onTriggerEvent: (targetId: string, previewOnly?: boolean) => void;
  disabled?: boolean;
}

interface EventButtonDef {
  id: string;
  label: string;
  badge?: string;
  colorClass: string;
  hoverClass: string;
  borderClass: string;
  icon?: string;
  category: string;
}

export const ManualEventTriggers: React.FC<ManualEventTriggersProps> = ({
  sport,
  onTriggerEvent,
  disabled = false,
}) => {
  // Sport-specific trigger button definitions
  const getEventDefs = (): EventButtonDef[] => {
    switch (sport) {
      case 'CRICKET':
        return [
          { id: 'cricket_dot', label: 'DOT BALL', badge: '•', colorClass: 'bg-slate-800 text-slate-300', hoverClass: 'hover:bg-slate-700', borderClass: 'border-slate-700', category: 'Balls' },
          { id: 'cricket_4', label: 'FOUR (4)', badge: '4', colorClass: 'bg-blue-900/80 text-blue-200', hoverClass: 'hover:bg-blue-800', borderClass: 'border-blue-700', category: 'Boundaries' },
          { id: 'cricket_6', label: 'SIX (6)', badge: '6', colorClass: 'bg-purple-900/80 text-purple-200', hoverClass: 'hover:bg-purple-800', borderClass: 'border-purple-600', category: 'Boundaries' },
          { id: 'cricket_wicket', label: 'WICKET', badge: 'W', colorClass: 'bg-red-900/90 text-red-200', hoverClass: 'hover:bg-red-800', borderClass: 'border-red-600', category: 'Dismissals' },
          { id: 'cricket_wide', label: 'WIDE', badge: 'WD', colorClass: 'bg-amber-950/80 text-amber-200', hoverClass: 'hover:bg-amber-900', borderClass: 'border-amber-700', category: 'Extras' },
          { id: 'cricket_noball', label: 'NO BALL', badge: 'NB', colorClass: 'bg-rose-950/80 text-rose-200', hoverClass: 'hover:bg-rose-900', borderClass: 'border-rose-700', category: 'Extras' },
          { id: 'cricket_freehit', label: 'FREE HIT', badge: 'FH', colorClass: 'bg-emerald-950/80 text-emerald-200', hoverClass: 'hover:bg-emerald-900', borderClass: 'border-emerald-700', category: 'Extras' },
          { id: 'cricket_fifty', label: 'FIFTY (50)', badge: '50', colorClass: 'bg-amber-900/80 text-amber-100', hoverClass: 'hover:bg-amber-800', borderClass: 'border-amber-600', category: 'Milestones' },
          { id: 'cricket_century', label: 'CENTURY (100)', badge: '100', colorClass: 'bg-yellow-900/90 text-yellow-100', hoverClass: 'hover:bg-yellow-800', borderClass: 'border-yellow-500', category: 'Milestones' },
          { id: 'cricket_hat_trick', label: 'HAT TRICK', badge: '🎩', colorClass: 'bg-fuchsia-950/90 text-fuchsia-200', hoverClass: 'hover:bg-fuchsia-900', borderClass: 'border-fuchsia-600', category: 'Milestones' },
          { id: 'cricket_maiden', label: 'MAIDEN OVER', badge: 'M', colorClass: 'bg-teal-950/80 text-teal-200', hoverClass: 'hover:bg-teal-900', borderClass: 'border-teal-700', category: 'Over' },
          { id: 'cricket_innings_break', label: 'INNINGS BREAK', badge: '☕', colorClass: 'bg-indigo-950/80 text-indigo-200', hoverClass: 'hover:bg-indigo-900', borderClass: 'border-indigo-700', category: 'Match' },
          { id: 'cricket_match_result', label: 'MATCH RESULT', badge: '🏆', colorClass: 'bg-emerald-900/90 text-emerald-100', hoverClass: 'hover:bg-emerald-800', borderClass: 'border-emerald-500', category: 'Match' },
          { id: 'cricket_player_of_match', label: 'PLAYER OF MATCH', badge: '⭐', colorClass: 'bg-amber-900/90 text-amber-200', hoverClass: 'hover:bg-amber-800', borderClass: 'border-amber-600', category: 'Match' },
        ];

      case 'FOOTBALL':
        return [
          { id: 'football_goal', label: 'GOAL!', badge: '⚽', colorClass: 'bg-emerald-900/90 text-emerald-100', hoverClass: 'hover:bg-emerald-800', borderClass: 'border-emerald-500', category: 'Scoring' },
          { id: 'football_yellow_card', label: 'YELLOW CARD', badge: '🟨', colorClass: 'bg-yellow-950/90 text-yellow-200', hoverClass: 'hover:bg-yellow-900', borderClass: 'border-yellow-600', category: 'Discipline' },
          { id: 'football_red_card', label: 'RED CARD', badge: '🟥', colorClass: 'bg-red-950/90 text-red-200', hoverClass: 'hover:bg-red-900', borderClass: 'border-red-600', category: 'Discipline' },
          { id: 'football_penalty', label: 'PENALTY KICK', badge: 'PK', colorClass: 'bg-indigo-950/90 text-indigo-200', hoverClass: 'hover:bg-indigo-900', borderClass: 'border-indigo-700', category: 'Set Piece' },
          { id: 'football_corner', label: 'CORNER KICK', badge: '🚩', colorClass: 'bg-blue-950/90 text-blue-200', hoverClass: 'hover:bg-blue-900', borderClass: 'border-blue-700', category: 'Set Piece' },
          { id: 'football_var', label: 'VAR CHECK', badge: '📺', colorClass: 'bg-purple-950/90 text-purple-200', hoverClass: 'hover:bg-purple-900', borderClass: 'border-purple-700', category: 'Review' },
          { id: 'football_halftime', label: 'HALF TIME', badge: 'HT', colorClass: 'bg-slate-850 text-slate-300', hoverClass: 'hover:bg-slate-750', borderClass: 'border-slate-700', category: 'Match' },
          { id: 'football_fulltime', label: 'FULL TIME / RESULT', badge: 'FT', colorClass: 'bg-emerald-950/90 text-emerald-200', hoverClass: 'hover:bg-emerald-900', borderClass: 'border-emerald-600', category: 'Match' },
        ];

      case 'KABADDI':
        return [
          { id: 'kabaddi_touch_point', label: 'TOUCH POINT', badge: '+1', colorClass: 'bg-blue-900/80 text-blue-200', hoverClass: 'hover:bg-blue-800', borderClass: 'border-blue-600', category: 'Raid' },
          { id: 'kabaddi_bonus_point', label: 'BONUS POINT', badge: 'B', colorClass: 'bg-emerald-900/80 text-emerald-200', hoverClass: 'hover:bg-emerald-800', borderClass: 'border-emerald-600', category: 'Raid' },
          { id: 'kabaddi_super_raid', label: 'SUPER RAID', badge: '🔥', colorClass: 'bg-amber-900/90 text-amber-100', hoverClass: 'hover:bg-amber-800', borderClass: 'border-amber-500', category: 'Raid' },
          { id: 'kabaddi_super_tackle', label: 'SUPER TACKLE', badge: '🛡️', colorClass: 'bg-purple-900/90 text-purple-100', hoverClass: 'hover:bg-purple-800', borderClass: 'border-purple-500', category: 'Defense' },
          { id: 'kabaddi_all_out', label: 'ALL OUT (+2)', badge: '⚡', colorClass: 'bg-red-900/90 text-red-100', hoverClass: 'hover:bg-red-800', borderClass: 'border-red-600', category: 'Special' },
          { id: 'kabaddi_do_or_die', label: 'DO OR DIE RAID', badge: '💀', colorClass: 'bg-rose-950/90 text-rose-200', hoverClass: 'hover:bg-rose-900', borderClass: 'border-rose-600', category: 'Raid' },
          { id: 'kabaddi_halftime', label: 'HALF TIME BREAK', badge: 'HT', colorClass: 'bg-slate-850 text-slate-300', hoverClass: 'hover:bg-slate-750', borderClass: 'border-slate-700', category: 'Match' },
          { id: 'kabaddi_result', label: 'MATCH RESULT', badge: '🏆', colorClass: 'bg-emerald-950 text-emerald-200', hoverClass: 'hover:bg-emerald-900', borderClass: 'border-emerald-600', category: 'Match' },
        ];

      case 'BASKETBALL':
        return [
          { id: 'bball_2pt', label: '2-POINTER', badge: '2P', colorClass: 'bg-blue-900/80 text-blue-200', hoverClass: 'hover:bg-blue-800', borderClass: 'border-blue-600', category: 'Points' },
          { id: 'bball_3pt', label: '3-POINTER', badge: '3P', colorClass: 'bg-emerald-900/80 text-emerald-200', hoverClass: 'hover:bg-emerald-800', borderClass: 'border-emerald-600', category: 'Points' },
          { id: 'bball_dunk', label: 'SLAM DUNK', badge: '🔨', colorClass: 'bg-amber-900/90 text-amber-100', hoverClass: 'hover:bg-amber-800', borderClass: 'border-amber-500', category: 'Highlights' },
          { id: 'bball_foul', label: 'PERSONAL FOUL', badge: 'PF', colorClass: 'bg-rose-950/80 text-rose-200', hoverClass: 'hover:bg-rose-900', borderClass: 'border-rose-700', category: 'Foul' },
          { id: 'bball_timeout', label: 'TIMEOUT', badge: '⏱', colorClass: 'bg-slate-800 text-slate-300', hoverClass: 'hover:bg-slate-700', borderClass: 'border-slate-700', category: 'Break' },
          { id: 'bball_buzzer', label: 'BUZZER BEATER', badge: '🚨', colorClass: 'bg-red-950/90 text-red-100', hoverClass: 'hover:bg-red-900', borderClass: 'border-red-600', category: 'Highlights' },
          { id: 'bball_result', label: 'FINAL SCORE', badge: '🏆', colorClass: 'bg-emerald-950 text-emerald-200', hoverClass: 'hover:bg-emerald-900', borderClass: 'border-emerald-600', category: 'Match' },
        ];

      case 'VOLLEYBALL':
        return [
          { id: 'vball_ace', label: 'SERVICE ACE', badge: 'ACE', colorClass: 'bg-amber-900/80 text-amber-200', hoverClass: 'hover:bg-amber-800', borderClass: 'border-amber-600', category: 'Serve' },
          { id: 'vball_spike', label: 'SPIKE KILL', badge: '💥', colorClass: 'bg-blue-900/80 text-blue-200', hoverClass: 'hover:bg-blue-800', borderClass: 'border-blue-600', category: 'Attack' },
          { id: 'vball_block', label: 'MONSTER BLOCK', badge: '🧱', colorClass: 'bg-purple-900/80 text-purple-200', hoverClass: 'hover:bg-purple-800', borderClass: 'border-purple-600', category: 'Defense' },
          { id: 'vball_set_point', label: 'SET POINT', badge: 'SP', colorClass: 'bg-red-900/80 text-red-200', hoverClass: 'hover:bg-red-800', borderClass: 'border-red-600', category: 'Critical' },
          { id: 'vball_match_point', label: 'MATCH POINT', badge: 'MP', colorClass: 'bg-red-950/90 text-red-100', hoverClass: 'hover:bg-red-900', borderClass: 'border-red-500', category: 'Critical' },
          { id: 'vball_timeout', label: 'TIMEOUT', badge: '⏱', colorClass: 'bg-slate-800 text-slate-300', hoverClass: 'hover:bg-slate-700', borderClass: 'border-slate-700', category: 'Break' },
        ];

      case 'TENNIS':
      case 'BADMINTON':
      case 'TABLE_TENNIS':
      case 'PICKLEBALL':
      case 'SQUASH':
        return [
          { id: 'racket_ace', label: 'ACE', badge: 'ACE', colorClass: 'bg-amber-900/80 text-amber-200', hoverClass: 'hover:bg-amber-800', borderClass: 'border-amber-600', category: 'Point' },
          { id: 'racket_winner', label: 'WINNER', badge: '⚡', colorClass: 'bg-blue-900/80 text-blue-200', hoverClass: 'hover:bg-blue-800', borderClass: 'border-blue-600', category: 'Point' },
          { id: 'racket_break_point', label: 'BREAK POINT', badge: 'BP', colorClass: 'bg-rose-900/80 text-rose-200', hoverClass: 'hover:bg-rose-800', borderClass: 'border-rose-600', category: 'Critical' },
          { id: 'racket_set_point', label: 'SET POINT', badge: 'SP', colorClass: 'bg-purple-900/80 text-purple-200', hoverClass: 'hover:bg-purple-800', borderClass: 'border-purple-600', category: 'Critical' },
          { id: 'racket_match_point', label: 'MATCH POINT', badge: 'MP', colorClass: 'bg-red-900/90 text-red-100', hoverClass: 'hover:bg-red-800', borderClass: 'border-red-500', category: 'Critical' },
          { id: 'racket_deuce', label: 'DEUCE', badge: '40-40', colorClass: 'bg-slate-800 text-slate-300', hoverClass: 'hover:bg-slate-700', borderClass: 'border-slate-700', category: 'Status' },
        ];

      default:
        // Custom / Field Hockey / Handball
        return [
          { id: 'gen_point', label: 'POINT / SCORE', badge: '+1', colorClass: 'bg-emerald-900/80 text-emerald-200', hoverClass: 'hover:bg-emerald-800', borderClass: 'border-emerald-600', category: 'Score' },
          { id: 'gen_foul', label: 'FOUL / CARD', badge: '⚠️', colorClass: 'bg-amber-900/80 text-amber-200', hoverClass: 'hover:bg-amber-800', borderClass: 'border-amber-600', category: 'Penalty' },
          { id: 'gen_timeout', label: 'TIMEOUT', badge: '⏱', colorClass: 'bg-slate-800 text-slate-300', hoverClass: 'hover:bg-slate-700', borderClass: 'border-slate-700', category: 'Break' },
          { id: 'gen_break', label: 'PERIOD / HALF BREAK', badge: 'PAUSE', colorClass: 'bg-indigo-950 text-indigo-200', hoverClass: 'hover:bg-indigo-900', borderClass: 'border-indigo-700', category: 'Match' },
          { id: 'gen_result', label: 'FINAL RESULT', badge: '🏆', colorClass: 'bg-emerald-950 text-emerald-100', hoverClass: 'hover:bg-emerald-900', borderClass: 'border-emerald-500', category: 'Match' },
        ];
    }
  };

  const eventDefs = getEventDefs();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200">
            MANUAL EVENT TRIGGERS ({sport})
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Click to Fire • <Eye className="w-2.5 h-2.5 inline mx-0.5 text-emerald-400" /> Preview
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-2 gap-1.5 max-h-[290px] overflow-y-auto pr-1">
        {eventDefs.map((evt) => (
          <div
            key={evt.id}
            className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-black transition shadow-sm ${evt.colorClass} ${evt.borderClass} ${evt.hoverClass}`}
          >
            {/* Primary trigger button (Takes Live) */}
            <button
              onClick={() => onTriggerEvent(evt.id, false)}
              disabled={disabled}
              className="flex-1 flex items-center gap-1.5 text-left cursor-pointer truncate disabled:opacity-40"
              title={`Trigger ${evt.label} (Takes Live or Queues per Assignment)`}
            >
              {evt.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10 font-mono shrink-0">
                  {evt.badge}
                </span>
              )}
              <span className="truncate tracking-wide">{evt.label}</span>
            </button>

            {/* Preview only button (Loads to Preview Bus without taking live) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTriggerEvent(evt.id, true);
              }}
              disabled={disabled}
              className="ml-1 p-1 rounded bg-black/30 hover:bg-emerald-600 hover:text-white text-slate-300 transition opacity-80 hover:opacity-100 cursor-pointer shrink-0"
              title={`Load ${evt.label} to PREVIEW bus only`}
            >
              <Eye className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
