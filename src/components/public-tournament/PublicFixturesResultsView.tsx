import React, { useState, useMemo } from 'react';
import { Match, MatchStatus } from '../../types';
import { PublicLiveMatchCard } from './PublicLiveMatchCard';
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  Trophy,
  CheckCircle2,
  ChevronRight,
  Radio,
  Search,
} from 'lucide-react';

interface PublicFixturesResultsViewProps {
  matches: Match[];
  onOpenMatch: (matchId: string) => void;
  onOpenTeam?: (teamId: string) => void;
}

export const PublicFixturesResultsView: React.FC<PublicFixturesResultsViewProps> = ({
  matches = [],
  onOpenMatch,
  onOpenTeam,
}) => {
  const [activeFilter, setActiveFilter] = useState<'TODAY' | 'UPCOMING' | 'COMPLETED' | 'ALL'>('ALL');
  const [selectedRound, setSelectedRound] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const safeMatches = matches || [];

  // Extract distinct rounds
  const rounds = useMemo(() => {
    const set = new Set<string>();
    safeMatches.forEach((m) => {
      if (m && m.round) set.add(m.round);
    });
    return Array.from(set.values());
  }, [safeMatches]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return safeMatches.filter((m) => {
      if (!m) return false;
      // Tab filter
      const isLive = m.status === 'LIVE';
      const isCompleted = m.status === 'COMPLETED';
      const isToday = m.date === todayStr || isLive;

      if (activeFilter === 'TODAY' && !isToday) return false;
      if (activeFilter === 'UPCOMING' && (isCompleted || isLive)) return false;
      if (activeFilter === 'COMPLETED' && !isCompleted) return false;

      // Round filter
      if (selectedRound !== 'ALL' && m.round !== selectedRound) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const teamAName = m.teamA?.name?.toLowerCase() || '';
        const teamBName = m.teamB?.name?.toLowerCase() || '';
        const venue = m.venue?.toLowerCase() || '';
        if (!teamAName.includes(q) && !teamBName.includes(q) && !venue.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [safeMatches, activeFilter, selectedRound, searchQuery, todayStr]);

  // Group by Date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    filteredMatches.forEach((m) => {
      const d = m.date || 'Unscheduled';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(m);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredMatches]);

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Fixtures' },
            { id: 'TODAY', label: 'Today’s Games' },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'COMPLETED', label: 'Results' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Round Dropdown */}
        <div className="flex items-center gap-2">
          {rounds.length > 1 && (
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Rounds</option>
              {rounds.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search team, venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Fixtures List */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-6">
          {groupedByDate.map(([date, dateMatches]) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  {date === todayStr ? 'Today • ' : ''}
                  {date}
                </h3>
                <div className="flex-1 h-px bg-slate-800/80" />
                <span className="text-[11px] text-slate-500 font-medium">
                  {dateMatches.length} {dateMatches.length === 1 ? 'Match' : 'Matches'}
                </span>
              </div>

              {/* Match Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dateMatches.map((match) => (
                  <PublicLiveMatchCard
                    key={match.id}
                    match={match}
                    onOpenMatch={onOpenMatch}
                    onOpenTeam={onOpenTeam}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">No matches found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No matches matching the selected filter criteria are currently scheduled.
          </p>
        </div>
      )}
    </div>
  );
};
