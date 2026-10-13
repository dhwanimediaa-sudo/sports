/**
 * SportsPulse - Director Presentation Console Modal
 * 
 * Real-time control desk for broadcasting live presentation cards, awards,
 * records, and championship ceremonies to OBS/vMix and stadium screens.
 */

import React, { useState, useEffect } from 'react';
import {
  Tournament,
  TournamentAwardItem,
  TournamentRecordDetail,
  TournamentHallOfFameData,
  TournamentPresentationEvent,
} from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Tv,
  Trophy,
  Crown,
  Medal,
  Award,
  Flame,
  Sparkles,
  Copy,
  Check,
  Play,
  RotateCcw,
  Sliders,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';

interface TournamentPresentationConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
}

export const TournamentPresentationConsoleModal: React.FC<TournamentPresentationConsoleModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
}) => {
  const [data, setData] = useState<{
    tournament: Tournament;
    hallOfFame: TournamentHallOfFameData;
    awards: TournamentAwardItem[];
    records: TournamentRecordDetail[];
    championship: any;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [selectedAwardId, setSelectedAwardId] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  // Card Appearance Customization
  const [template, setTemplate] = useState<'CHAMPIONSHIP_GOLD' | 'MODERN_NEON' | 'EMERALD_LUXURY' | 'DARK_MINIMAL'>('CHAMPIONSHIP_GOLD');
  const [animation, setAnimation] = useState<'CHAMPIONSHIP_REVEAL' | 'GLOW' | 'FADE' | 'SLIDE'>('CHAMPIONSHIP_REVEAL');
  const [position, setPosition] = useState<'CENTER' | 'LOWER_THIRD' | 'CORNER'>('CENTER');
  const [sponsorName, setSponsorName] = useState<string>('');
  const [sponsorTagline, setSponsorTagline] = useState<string>('Official Tournament Partner');

  // Active Presentation State
  const [activeEvent, setActiveEvent] = useState<TournamentPresentationEvent | null>(null);
  const [copiedBroadcastUrl, setCopiedBroadcastUrl] = useState(false);
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  const fetchPresentationPayload = async () => {
    try {
      setLoading(true);
      const res = await api.getTournamentPresentationData(tournamentId);
      setData(res as any);
      if (res.tournament.sponsor) {
        setSponsorName(res.tournament.sponsor);
      }
      if (res.awards && res.awards.length > 0) {
        setSelectedAwardId(res.awards[0].id);
      }
      if (res.records && res.records.length > 0) {
        setSelectedRecordId(res.records[0].id);
      }
    } catch (err) {
      console.error('Failed to load presentation payload:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPresentationPayload();
    }
  }, [isOpen, tournamentId]);

  if (!isOpen) return null;

  const broadcastUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/broadcast/tournament/${tournamentId}`
    : `/broadcast/tournament/${tournamentId}`;

  const publicLiveUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tournament-live/${tournamentId}`
    : `/tournament-live/${tournamentId}`;

  const handleTriggerAction = async (type: TournamentPresentationEvent['type'], customPayload?: any) => {
    try {
      setTriggerStatus(`Triggering ${type}...`);
      const cardConfig: any = {
        template,
        animation,
        position,
        sponsor: {
          name: sponsorName || data?.tournament?.sponsor || 'SportsPulse Live',
          tagline: sponsorTagline,
        },
      };

      const res = await api.triggerTournamentPresentation(tournamentId, {
        type,
        data: customPayload,
        cardConfig,
      });

      setActiveEvent(res.event);
      setTriggerStatus(`Broadcast Card Live: ${type}`);
      setTimeout(() => setTriggerStatus(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger broadcast presentation');
      setTriggerStatus(null);
    }
  };

  const handleClearOverlay = async () => {
    try {
      await api.triggerTournamentPresentation(tournamentId, {
        type: 'CLEAR',
        data: {},
      });
      setActiveEvent(null);
      setTriggerStatus('Broadcast Overlay Cleared');
      setTimeout(() => setTriggerStatus(null), 2500);
    } catch (err) {
      alert('Failed to clear overlay');
    }
  };

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(broadcastUrl);
    setCopiedBroadcastUrl(true);
    setTimeout(() => setCopiedBroadcastUrl(false), 2000);
  };

  const handleCopyPublic = () => {
    navigator.clipboard.writeText(publicLiveUrl);
    setCopiedPublicUrl(true);
    setTimeout(() => setCopiedPublicUrl(false), 2000);
  };

  const selectedAwardObj = data?.awards?.find((a) => a.id === selectedAwardId);
  const selectedRecordObj = data?.records?.find((r) => r.id === selectedRecordId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">
                  Live Broadcast Presentation Director Console
                </h3>
                <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-bold">
                  1920x1080 OBS / vMix
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Trigger synchronized presentation overlays for Champions, MVP, Awards, and Records in real time via Server-Sent Events.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1.5"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Quick Output URL Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">OBS / vMix Browser Source</span>
                <span className="text-slate-400 font-mono truncate block text-[11px]">{broadcastUrl}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyBroadcast}
                icon={copiedBroadcastUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedBroadcastUrl ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-amber-400 uppercase block">Public Spectator Presentation</span>
                <span className="text-slate-400 font-mono truncate block text-[11px]">{publicLiveUrl}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyPublic}
                icon={copiedPublicUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedPublicUrl ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Director Deck Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Core Podium Actions */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" /> Championship Podium
              </span>

              <div className="space-y-2">
                <Button
                  variant="amber"
                  size="sm"
                  className="w-full justify-start text-xs font-bold"
                  onClick={() => handleTriggerAction('CHAMPION')}
                  icon={<Trophy className="w-3.5 h-3.5 text-slate-950" />}
                >
                  Trigger 🏆 Champions Card
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-bold"
                  onClick={() => handleTriggerAction('RUNNER_UP')}
                  icon={<Medal className="w-3.5 h-3.5 text-slate-400" />}
                >
                  Trigger 🥈 Runner-Up Card
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-bold"
                  onClick={() => handleTriggerAction('THIRD_PLACE')}
                  icon={<Medal className="w-3.5 h-3.5 text-amber-700" />}
                >
                  Trigger 🥉 3rd Place Card
                </Button>

                <Button
                  variant="emerald"
                  size="sm"
                  className="w-full justify-start text-xs font-bold"
                  onClick={() => handleTriggerAction('MVP')}
                  icon={<Crown className="w-3.5 h-3.5" />}
                >
                  Trigger 👑 Tournament MVP
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-bold"
                  onClick={() => handleTriggerAction('HALL_OF_FAME')}
                  icon={<Layers className="w-3.5 h-3.5 text-blue-400" />}
                >
                  Trigger 🏛️ Hall of Fame Carousel
                </Button>
              </div>
            </div>

            {/* Column 2: Individual Awards & Records Trigger */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" /> Category Awards & Records
              </span>

              {/* Award Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Select Award Card</label>
                <select
                  value={selectedAwardId}
                  onChange={(e) => setSelectedAwardId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {(data?.awards || []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.awardIcon || '🏆'} {a.title} ({a.recipientName || 'TBD'})
                    </option>
                  ))}
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-1"
                  disabled={!selectedAwardObj}
                  onClick={() =>
                    handleTriggerAction('AWARD', {
                      awardTitle: selectedAwardObj?.title,
                      awardKey: selectedAwardObj?.awardKey,
                      playerName: selectedAwardObj?.recipientName,
                      teamName: selectedAwardObj?.recipientTeamName,
                      photo: selectedAwardObj?.recipientPhoto,
                      citation: selectedAwardObj?.citation,
                      statSummary: selectedAwardObj?.recommendedStatSummary,
                      awardIcon: selectedAwardObj?.awardIcon || '🏆',
                    })
                  }
                  icon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
                >
                  Broadcast Selected Award
                </Button>
              </div>

              {/* Record Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-[10px] uppercase font-bold text-slate-400">Select Record Card</label>
                <select
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  {(data?.records || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.icon || '🌟'} {r.title} ({r.recordValue})
                    </option>
                  ))}
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-1"
                  disabled={!selectedRecordObj}
                  onClick={() =>
                    handleTriggerAction('RECORD', {
                      title: selectedRecordObj?.title,
                      recordTitle: selectedRecordObj?.title,
                      recordValue: selectedRecordObj?.recordValue,
                      playerName: selectedRecordObj?.holderName,
                      teamName: selectedRecordObj?.holderTeamName,
                      photo: selectedRecordObj?.holderPhotoUrl,
                      icon: selectedRecordObj?.icon || '🌟',
                      venue: selectedRecordObj?.venue,
                      date: selectedRecordObj?.date,
                      matchTitle: selectedRecordObj?.matchTitle,
                      supportingStats: selectedRecordObj?.supportingStats,
                    })
                  }
                  icon={<Play className="w-3.5 h-3.5 text-amber-400" />}
                >
                  Broadcast Selected Record
                </Button>
              </div>
            </div>

            {/* Column 3: Visual Theme & Overlay Controls */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-400" /> Card Appearance & Sponsor
              </span>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Visual Theme</label>
                  <select
                    value={template}
                    onChange={(e: any) => setTemplate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="CHAMPIONSHIP_GOLD">Championship Gold</option>
                    <option value="EMERALD_LUXURY">Emerald Luxury</option>
                    <option value="MODERN_NEON">Modern High-Contrast Neon</option>
                    <option value="DARK_MINIMAL">Dark Minimal Matte</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Animation</label>
                  <select
                    value={animation}
                    onChange={(e: any) => setAnimation(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="CHAMPIONSHIP_REVEAL">Championship Reveal</option>
                    <option value="GLOW">Pulse Glow</option>
                    <option value="SLIDE">Slide Up</option>
                    <option value="FADE">Smooth Fade</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sponsor Banner</label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="e.g. RedBull / Nike"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={handleClearOverlay}
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Clear Overlay Card
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time 16:9 Card Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-emerald-400" /> Active Broadcast Output Preview (1920x1080)
              </span>
              {triggerStatus && (
                <span className="text-xs font-bold text-emerald-400 animate-pulse">{triggerStatus}</span>
              )}
            </div>

            <div className="aspect-video w-full max-w-2xl mx-auto rounded-2xl bg-slate-950 border-2 border-slate-800 p-6 flex items-center justify-center relative overflow-hidden shadow-2xl">
              {activeEvent && activeEvent.type !== 'CLEAR' ? (
                <div
                  className={`w-full max-w-md p-6 rounded-2xl border text-center space-y-3 shadow-2xl transition-all ${
                    template === 'CHAMPIONSHIP_GOLD'
                      ? 'bg-gradient-to-b from-amber-950/90 via-slate-900/95 to-slate-950 border-amber-500/60'
                      : template === 'EMERALD_LUXURY'
                      ? 'bg-gradient-to-b from-emerald-950/90 via-slate-900/95 to-slate-950 border-emerald-500/60'
                      : 'bg-slate-900/95 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">
                      {activeEvent.data?.awardIcon || activeEvent.data?.icon || '🏆'}
                    </span>
                    <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest">
                      {activeEvent.title}
                    </h4>
                  </div>

                  <div className="space-y-1">
                    <div className="text-lg font-black text-slate-100">
                      {activeEvent.data?.playerName || activeEvent.data?.teamName || activeEvent.data?.recordValue || 'Title'}
                    </div>
                    {activeEvent.data?.teamName && activeEvent.data?.playerName && (
                      <div className="text-xs text-slate-400">{activeEvent.data.teamName}</div>
                    )}
                    {activeEvent.data?.citation && (
                      <p className="text-xs text-slate-300 italic">"{activeEvent.data.citation}"</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                    {sponsorName ? `Presented by ${sponsorName}` : data?.tournament?.name}
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-600 space-y-1">
                  <Tv className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs font-semibold">Overlay Clear / Standby</p>
                  <span className="text-[10px]">Click any trigger button above to display graphic</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Open URL in OBS as Browser Source (Width: 1920, Height: 1080)
          </span>

          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Console
          </Button>
        </div>
      </div>
    </div>
  );
};
