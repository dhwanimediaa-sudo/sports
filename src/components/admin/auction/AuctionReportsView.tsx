/**
 * SportsPulse - Auction Comprehensive Reports Dashboard
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Globe,
  CheckCircle,
  XCircle,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Auction, AuctionReportsSummary, AuctionTeam, AuctionPlayer } from '../../../types';
import { Button } from '../../ui/Button';
import { formatAuctionAmount } from '../../../utils/auctionFormatters';

interface AuctionReportsViewProps {
  auction: Auction;
  reports?: AuctionReportsSummary | null;
  teams: AuctionTeam[];
  players: AuctionPlayer[];
  loading?: boolean;
}

export const AuctionReportsView: React.FC<AuctionReportsViewProps> = ({
  auction,
  reports,
  teams,
  players,
  loading = false,
}) => {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<'SUMMARY' | 'TEAMS' | 'SOLD' | 'UNSOLD' | 'CATEGORIES'>('SUMMARY');

  const soldPlayers = players.filter((p) => p.status === 'SOLD');
  const unsoldPlayers = players.filter((p) => p.status === 'UNSOLD');
  const retainedPlayers = players.filter((p) => p.status === 'RETAINED');

  const totalPurseAllocated = teams.reduce((acc, t) => acc + (t.startingPurse || 0), 0);
  const totalPurseSpent = teams.reduce((acc, t) => acc + (t.totalSpent || 0), 0);
  const totalPurseRemaining = teams.reduce((acc, t) => acc + (t.currentPurse || 0), 0);

  // Highest buy
  const highestBuy = [...soldPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))[0];

  const handleExportCsv = () => {
    const rows = [
      ['Player Name', 'Role', 'Country', 'Category', 'Base Price', 'Status', 'Sold/Retained Team', 'Final Price'],
      ...players.map((p) => {
        const team = p.soldToTeamId
          ? teams.find((t) => t.id === p.soldToTeamId)?.name
          : p.retainedByTeamId
          ? teams.find((t) => t.id === p.retainedByTeamId)?.name
          : '-';
        const price = p.status === 'SOLD' ? p.soldPrice : p.status === 'RETAINED' ? p.retentionPrice : p.basePrice;
        return [p.name, p.role, p.country, p.category, p.basePrice, p.status, team || '-', price || 0];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${auction.name.replace(/\s+/g, '_')}_Auction_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Auction Reports & Analytics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Spending breakdowns, squad compositions, category analytics, and exportable ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
            Print Report
          </Button>
          <Button variant="primary" onClick={handleExportCsv} icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* High-Impact Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Total Pool Expenditure</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatAuctionAmount(totalPurseSpent, auction.currency)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {Math.round((totalPurseSpent / (totalPurseAllocated || 1)) * 100)}% of total allocated purse
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Players Acquired</span>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {soldPlayers.length + retainedPlayers.length}{' '}
            <span className="text-sm font-normal text-slate-400">/ {players.length}</span>
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            {soldPlayers.length} in auction + {retainedPlayers.length} retained
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Highest Buy of Auction</span>
          <div className="text-lg font-bold text-slate-100 truncate">
            {highestBuy ? highestBuy.name : '—'}
          </div>
          <span className="text-sm font-black text-amber-400 font-mono">
            {highestBuy ? formatAuctionAmount(highestBuy.soldPrice || 0, auction.currency) : '—'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Unsold Pool</span>
          <div className="text-2xl font-black text-rose-400 font-mono">{unsoldPlayers.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Eligible for accelerated re-auction</span>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 rounded-xl px-4 pt-2">
        {[
          { id: 'SUMMARY', label: 'Overview' },
          { id: 'TEAMS', label: `Franchise Squads (${teams.length})` },
          { id: 'SOLD', label: `Sold Ledger (${soldPlayers.length})` },
          { id: 'UNSOLD', label: `Unsold Pool (${unsoldPlayers.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setReportTab(t.id as any)}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              reportTab === t.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: TEAMS SQUAD BREAKDOWN */}
      {reportTab === 'TEAMS' && (
        <div className="space-y-4">
          {teams.map((team) => {
            const teamSquad = players.filter(
              (p) =>
                (p.status === 'SOLD' && p.soldToTeamId === team.id) ||
                (p.status === 'RETAINED' && p.retainedByTeamId === team.id)
            );
            const isExpanded = expandedTeamId === team.id;

            return (
              <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div
                  onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm font-mono border"
                      style={{
                        backgroundColor: `${team.color}20`,
                        borderColor: `${team.color}60`,
                        color: team.color,
                      }}
                    >
                      {team.shortCode}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{team.name}</h4>
                      <p className="text-xs text-slate-400">
                        {teamSquad.length} Players acquired • {team.overseasCount} Overseas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Remaining Purse</span>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        {formatAuctionAmount(team.currentPurse, auction.currency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Spent</span>
                      <span className="text-sm font-black font-mono text-amber-400">
                        {formatAuctionAmount(team.totalSpent, auction.currency)}
                      </span>
                    </div>

                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800/80 p-4 bg-slate-950/60">
                    {teamSquad.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">No players acquired yet.</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-500 uppercase text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="py-2">Player</th>
                            <th className="py-2">Role</th>
                            <th className="py-2">Category</th>
                            <th className="py-2">Type</th>
                            <th className="py-2 text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {teamSquad.map((player) => (
                            <tr key={player.id}>
                              <td className="py-2 font-medium text-slate-200">
                                {player.name} {player.isOverseas && <span className="text-rose-400 font-bold">(OS)</span>}
                              </td>
                              <td className="py-2 text-slate-400">{player.role}</td>
                              <td className="py-2 text-slate-400">{player.category}</td>
                              <td className="py-2">
                                {player.status === 'RETAINED' ? (
                                  <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[9px] font-bold">
                                    RETAINED
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-bold">
                                    AUCTIONED
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-right font-mono font-bold text-emerald-400">
                                {formatAuctionAmount(
                                  player.status === 'RETAINED' ? player.retentionPrice : player.soldPrice,
                                  auction.currency
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: SOLD LEDGER */}
      {reportTab === 'SOLD' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Buyer Franchise</th>
                <th className="py-3 px-4">Base Price</th>
                <th className="py-3 px-4">Sold Price</th>
                <th className="py-3 px-4 text-right">Growth Multiplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {soldPlayers.map((p, idx) => {
                const team = teams.find((t) => t.id === p.soldToTeamId);
                const multiplier = p.soldPrice && p.basePrice ? (p.soldPrice / p.basePrice).toFixed(1) : '1.0';

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.country}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{p.role}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team?.color || '#10b981' }} />
                        <span className="font-bold text-slate-200">{team?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {formatAuctionAmount(p.basePrice, auction.currency)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      {formatAuctionAmount(p.soldPrice, auction.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-amber-400 font-bold">
                      {multiplier}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: UNSOLD POOL */}
      {reportTab === 'UNSOLD' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Base Price</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {unsoldPlayers.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-100">{p.name}</td>
                  <td className="py-3 px-4 text-slate-300">{p.role}</td>
                  <td className="py-3 px-4 text-slate-300">{p.category}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {formatAuctionAmount(p.basePrice, auction.currency)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold">
                      UNSOLD
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: SUMMARY / OVERVIEW */}
      {reportTab === 'SUMMARY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 5 Most Expensive Buys */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Top 5 Most Expensive Players
            </h4>

            <div className="space-y-2">
              {[...soldPlayers]
                .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
                .slice(0, 5)
                .map((p, idx) => {
                  const team = teams.find((t) => t.id === p.soldToTeamId);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-amber-400 w-5">#{idx + 1}</span>
                        <div>
                          <div className="font-bold text-slate-100 text-xs">{p.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {team?.shortCode} • {p.role}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-emerald-400 text-sm">
                        {formatAuctionAmount(p.soldPrice, auction.currency)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Franchise Purse Remaining Ladder */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Franchise Purse Balance Ladder
            </h4>

            <div className="space-y-2">
              {[...teams]
                .sort((a, b) => b.currentPurse - a.currentPurse)
                .map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color || '#10b981' }} />
                      <span className="font-bold text-slate-200 text-xs">{team.name}</span>
                    </div>
                    <div className="font-mono font-bold text-slate-100 text-sm">
                      {formatAuctionAmount(team.currentPurse, auction.currency)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
