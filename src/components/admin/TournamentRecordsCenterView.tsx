/**
 * SportsPulse - Official Tournament Records Center View
 * 
 * Features:
 * - Dynamically aggregated records from match scorecards & event logs
 * - High-contrast sports record cards with holder photo, venue, and score context
 * - Sponsor branding support
 * - Instant broadcast trigger to send record overlay to OBS/vMix live stream
 */

import React, { useState, useEffect } from 'react';
import {
  Tournament,
  TournamentRecordDetail,
  TournamentPresentationEvent,
} from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Trophy,
  Flame,
  Tv,
  Calendar,
  MapPin,
  Sparkles,
  Shield,
  Zap,
  Filter,
  Check,
  Search,
} from 'lucide-react';

interface TournamentRecordsCenterViewProps {
  tournament: Tournament;
  onOpenPresentationConsole?: () => void;
}

export const TournamentRecordsCenterView: React.FC<TournamentRecordsCenterViewProps> = ({
  tournament,
  onOpenPresentationConsole,
}) => {
  const [records, setRecords] = useState<TournamentRecordDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [broadcastTriggeredId, setBroadcastTriggeredId] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await (api as any).getTournamentRecords?.(tournament.id);
      if (res?.records) {
        setRecords(res.records);
      } else {
        // Fallback fetch presentation-data
        const pRes = await api.getTournamentPresentationData(tournament.id);
        if (pRes?.records) setRecords(pRes.records);
      }
    } catch (err) {
      console.error('Failed to load tournament records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [tournament.id]);

  const handleBroadcastRecord = async (record: TournamentRecordDetail) => {
    try {
      await api.triggerTournamentPresentation(tournament.id, {
        type: 'RECORD',
        data: {
          title: record.title,
          recordTitle: record.title,
          recordValue: record.recordValue,
          playerName: record.holderName,
          teamName: record.holderTeamName,
          photo: record.holderPhotoUrl,
          icon: record.icon || '🌟',
          venue: record.venue,
          date: record.date,
          matchTitle: record.matchTitle,
          supportingStats: record.supportingStats,
          tournamentName: tournament.name,
        },
      });
      setBroadcastTriggeredId(record.id);
      setTimeout(() => setBroadcastTriggeredId(null), 3000);
    } catch (err) {
      alert('Failed to trigger record broadcast overlay');
    }
  };

  const filteredRecords = records.filter((r) => {
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'TEAM' && !r.categoryKey?.includes('TEAM') && !r.categoryKey?.includes('MATCH')) return false;
      if (categoryFilter === 'INDIVIDUAL' && r.categoryKey?.includes('TEAM')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.holderName.toLowerCase().includes(q) ||
        (r.holderTeamName && r.holderTeamName.toLowerCase().includes(q)) ||
        (r.recordValue && String(r.recordValue).toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Records Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <h2 className="text-base font-black text-slate-100 uppercase tracking-wider">
              Official Tournament Records Center
            </h2>
            <Badge variant="warning" className="font-bold">
              VERIFIED SCORECARD BENCHMARKS
            </Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Peak performance milestones, all-time highest scoring matches, fastest spells, and exceptional tournament records dynamically audited from official match scorecards.
          </p>
        </div>

        {onOpenPresentationConsole && (
          <Button
            variant="amber"
            size="sm"
            onClick={onOpenPresentationConsole}
            icon={<Tv className="w-3.5 h-3.5" />}
          >
            Presentation Console
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1">
          {['ALL', 'INDIVIDUAL', 'TEAM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'All Records' : cat === 'INDIVIDUAL' ? 'Individual Feats' : 'Team Milestones'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records or holders..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Records Cards Grid */}
      {loading && records.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Scanning completed match scorecards for record benchmarks...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Records Recorded Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Records are calculated automatically from completed matches and scorecards. As games finish, new record benchmarks will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((rec) => {
            const isTriggered = broadcastTriggeredId === rec.id;

            return (
              <div
                key={rec.id}
                className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/90 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rec.icon || '🌟'}</span>
                      <h3 className="text-xs font-black text-slate-100">{rec.title}</h3>
                    </div>
                    {rec.subtitle && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                        {rec.subtitle}
                      </span>
                    )}
                  </div>

                  {/* Big Record Value */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">
                      Tournament Benchmark
                    </span>
                    <div className="text-xl font-black text-slate-100 font-mono tracking-tight">
                      {rec.recordValue}
                    </div>
                  </div>
                </div>

                {/* Record Holder Info */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center gap-3">
                  {rec.holderPhotoUrl ? (
                    <img
                      src={rec.holderPhotoUrl}
                      alt={rec.holderName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 text-xs shrink-0">
                      {rec.holderName.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Record Holder</span>
                    <h4 className="text-xs font-bold text-slate-200 truncate">{rec.holderName}</h4>
                    {rec.holderTeamName && (
                      <span className="text-[11px] text-slate-400 truncate block">{rec.holderTeamName}</span>
                    )}
                  </div>
                </div>

                {/* Match Context & Supporting Stats */}
                <div className="space-y-2 text-xs">
                  {rec.matchTitle && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{rec.matchTitle}</span>
                    </div>
                  )}

                  {rec.venue && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{rec.venue}</span>
                    </div>
                  )}

                  {rec.supportingStats && Object.keys(rec.supportingStats).length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5 text-[11px]">
                      {Object.entries(rec.supportingStats).map(([k, v]) => (
                        <div key={k} className="p-1.5 rounded bg-slate-950 border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 uppercase block font-semibold">{k}</span>
                          <span className="text-slate-300 font-bold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Broadcast Trigger Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {tournament.sponsor ? `Presented by ${tournament.sponsor}` : 'Verified Event Metric'}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleBroadcastRecord(rec)}
                    icon={isTriggered ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Tv className="w-3.5 h-3.5 text-amber-400" />}
                  >
                    {isTriggered ? 'Sent to Live' : 'Broadcast Record'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
