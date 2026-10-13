import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Tv, Radio, Monitor, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface BroadcastOutputUrlBoxProps {
  matchId: string;
  sport?: string;
  matchTitle?: string;
  className?: string;
}

export const BroadcastOutputUrlBox: React.FC<BroadcastOutputUrlBoxProps> = ({
  matchId,
  sport,
  matchTitle,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const broadcastUrl = `${origin}/broadcast/match/${matchId}`;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(broadcastUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = broadcastUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy broadcast URL:', err);
    }
  };

  return (
    <div
      id="sports-pulse-broadcast-output-url-box"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>SINGLE BROADCAST OUTPUT URL</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/60">
                LIVE
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              One URL for OBS Studio, vMix, Wirecast, or direct LED wall output
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 transition cursor-pointer px-2 py-1 rounded bg-slate-800/60 border border-slate-700/60"
        >
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Setup Guide</span>
          {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* URL Input and Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            id="broadcast-output-url-input"
            type="text"
            readOnly
            value={broadcastUrl}
            onFocus={(e) => e.target.select()}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2.5 font-mono text-xs text-cyan-300 select-all focus:outline-none focus:border-cyan-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-copy-broadcast-url"
            onClick={handleCopy}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-bold text-xs transition cursor-pointer shadow-md min-h-[44px] ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-900/50'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/50 active:scale-98'
            }`}
            title="Copy Broadcast Output URL"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'COPIED!' : 'COPY URL'}</span>
          </button>

          <a
            id="btn-open-broadcast-canvas-popout"
            href={broadcastUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition cursor-pointer min-h-[44px]"
            title="Open broadcast canvas in clean pop-out window"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden md:inline">OPEN</span>
          </a>
        </div>
      </div>

      {/* Collapsible OBS / vMix Setup Guide */}
      {showGuide && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span>Streaming Software Quick Setup:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <div className="font-bold text-purple-400 mb-1 flex items-center gap-1">
                <span>● OBS Studio</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Under Sources, click <strong className="text-white">+</strong> and select <strong className="text-white">Browser</strong>.</li>
                <li>Paste the copied URL into the URL field.</li>
                <li>Set Width: <strong className="text-cyan-300">1920</strong>, Height: <strong className="text-cyan-300">1080</strong>.</li>
                <li>Check <strong className="text-white">"Shutdown source when not active"</strong>.</li>
                <li>Background is 100% transparent automatically.</li>
              </ol>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <div className="font-bold text-blue-400 mb-1 flex items-center gap-1">
                <span>● vMix / Wirecast</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Click <strong className="text-white">Add Input</strong> and choose <strong className="text-white">Web Browser</strong>.</li>
                <li>Paste the copied URL.</li>
                <li>Set Resolution to <strong className="text-cyan-300">1920 x 1080</strong>.</li>
                <li>Enable as an Overlay channel (Overlay 1 or 2).</li>
                <li>Alpha channel transparency renders automatically.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
