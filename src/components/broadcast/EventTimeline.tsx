import React from 'react';
import { SportType } from '../../types';
import {
  Clock,
  Sparkles,
  Zap,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Film,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  scoreContext?: string;
  hasTriggeredGraphic?: boolean;
  graphicName?: string;
  targetId?: string;
}

interface EventTimelineProps {
  sport: SportType;
  scoringState?: any;
  matchEvents?: TimelineEvent[];
  onTriggerEvent?: (targetId: string, previewOnly?: boolean) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  sport,
  scoringState,
  matchEvents = [],
  onTriggerEvent,
}) => {
  // Extract real match timeline events from cricket innings balls or match history
  const getComputedEvents = (): TimelineEvent[] => {
    if (matchEvents.length > 0) return matchEvents;

    const list: TimelineEvent[] = [];

    if (sport === 'CRICKET' && scoringState) {
      const currentInnings = scoringState.currentInnings;
      const balls = currentInnings?.balls || [];
      // Take last 15 balls in reverse chronological order
      const recent = [...balls].slice(-15).reverse();

      recent.forEach((b: any, idx: number) => {
        let title = `${b.runsScored} RUNS`;
        if (b.isWicket) title = `WICKET (${b.wicketType || 'Out'})`;
        else if (b.runsScored === 4) title = 'BOUNDARY FOUR (4)';
        else if (b.runsScored === 6) title = 'MAXIMUM SIX (6)';
        else if (b.runsScored === 0 && !b.isExtra) title = 'DOT BALL';
        else if (b.isExtra) title = `EXTRA: ${b.extraType || 'Extra'} (+${b.runsScored})`;

        let targetId = 'cricket_dot';
        if (b.isWicket) targetId = 'cricket_wicket';
        else if (b.runsScored === 4) targetId = 'cricket_4';
        else if (b.runsScored === 6) targetId = 'cricket_6';
        else if (b.extraType === 'WIDE') targetId = 'cricket_wide';
        else if (b.extraType === 'NO_BALL') targetId = 'cricket_noball';

        list.push({
          id: b.id || `ball_${idx}`,
          timestamp: b.timestamp ? new Date(b.timestamp).toLocaleTimeString() : `Over ${b.overNumber}.${b.ballNumber}`,
          title,
          detail: `Bowler: ${b.bowlerId || 'Current'} • Batter: ${b.batsmanId || 'Striker'}`,
          scoreContext: `${currentInnings?.score || 0}/${currentInnings?.wickets || 0} (${currentInnings?.overs || 0}.${currentInnings?.ballsInCurrentOver || 0})`,
          hasTriggeredGraphic: b.isWicket || b.runsScored >= 4,
          graphicName: b.isWicket ? 'Wicket Dismissal' : b.runsScored === 6 ? 'Six Celebration' : b.runsScored === 4 ? 'Four Boundary' : undefined,
          targetId,
        });
      });
    }

    if (list.length === 0) {
      // Default live feed sample
      list.push({
        id: 'ev_live',
        timestamp: 'Live Now',
        title: 'Match Underway',
        detail: 'Real-time match data layer connected to scoring engine',
        scoreContext: 'Live In-Progress',
        hasTriggeredGraphic: true,
        graphicName: 'Live Scorebug',
        targetId: 'cricket_live_score',
      });
    }

    return list;
  };

  const computedEvents = getComputedEvents();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-black tracking-wider uppercase text-white">
            LIVE MATCH EVENT TIMELINE ({sport})
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Showing recent live events & graphic trigger status
        </span>
      </div>

      {/* Timeline Stream */}
      <div className="flex-1 overflow-y-auto max-h-[340px] space-y-2 pr-1 font-mono">
        {computedEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between gap-3 hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Timeline marker */}
              <div className="flex flex-col items-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[9px] text-slate-500 mt-0.5">{evt.timestamp}</span>
              </div>

              {/* Event detail */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white truncate">{evt.title}</span>
                  {evt.scoreContext && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {evt.scoreContext}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{evt.detail}</div>
              </div>
            </div>

            {/* Graphic status & Trigger actions */}
            <div className="flex items-center gap-2 shrink-0">
              {evt.hasTriggeredGraphic ? (
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{evt.graphicName || 'Triggered'}</span>
                </span>
              ) : (
                <span className="hidden sm:inline-block text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                  No Trigger
                </span>
              )}

              {onTriggerEvent && evt.targetId && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onTriggerEvent(evt.targetId!, true)}
                    className="p-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 transition cursor-pointer"
                    title="Cue corresponding graphic to Preview"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onTriggerEvent(evt.targetId!, false)}
                    className="p-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-cyan-400 transition cursor-pointer"
                    title="Re-fire graphic onto Air"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
