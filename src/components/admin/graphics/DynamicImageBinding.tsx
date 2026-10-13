import React, { useState } from 'react';
import { GraphicElement, SportType } from '../../../types';
import { Image as ImageIcon, Sparkles, Link, Upload, RefreshCw, ShieldAlert, Check, Eye } from 'lucide-react';
import {
  DYNAMIC_FIELDS,
  DEFAULT_FALLBACK_IMAGES,
} from '../../../constants/studioGraphicsConstants';

interface DynamicImageBindingProps {
  element: GraphicElement;
  sport: SportType;
  resolvedImageUrl?: string;
  contextVariables?: Record<string, string>;
  onChange: (updates: Partial<GraphicElement>) => void;
}

export const DynamicImageBinding: React.FC<DynamicImageBindingProps> = ({
  element,
  sport,
  resolvedImageUrl,
  contextVariables,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'dynamic' | 'custom' | 'fallback'>('dynamic');
  const [testFallbackMode, setTestFallbackMode] = useState(false);

  // Available image dynamic variables
  const imageVariables = DYNAMIC_FIELDS.filter(
    (f) =>
      f.key.includes('LOGO') ||
      f.key.includes('PHOTO') ||
      f.key.includes('IMAGE') ||
      f.key.includes('FLAG') ||
      f.key.includes('TROPHY')
  );

  const currentDynamicKey = element.dynamicFieldKey || (element.imageUrl?.startsWith('{{') ? element.imageUrl : '');

  return (
    <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200">
      {/* Header with mode tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <ImageIcon className="w-4 h-4 text-cyan-400" />
          <span>Image Source & Binding</span>
        </div>
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('dynamic')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              activeTab === 'dynamic'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Dynamic
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              activeTab === 'custom'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1">
              <Link className="w-3 h-3" />
              Custom URL
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fallback')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              activeTab === 'fallback'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Fallback
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Binding Mode */}
      {activeTab === 'dynamic' && (
        <div className="space-y-2.5">
          <div className="text-[11px] text-slate-400">
            Automatically resolve image from active match, player headshot, team crest or tournament logo:
          </div>

          <div className="grid grid-cols-2 gap-2">
            {imageVariables.map((iv) => {
              const isSelected = currentDynamicKey === iv.key;
              const liveValue = contextVariables?.[iv.key] || iv.sampleValue;

              return (
                <button
                  key={iv.key}
                  type="button"
                  onClick={() => {
                    onChange({
                      dynamicFieldKey: iv.key,
                      imageUrl: iv.key,
                    });
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <img
                    src={liveValue}
                    alt={iv.label}
                    className="w-7 h-7 rounded-md object-cover border border-slate-700 shrink-0 bg-slate-900"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[11px] truncate flex items-center justify-between">
                      <span>{iv.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                    </div>
                    <div className="font-mono text-[10px] text-cyan-400/90 truncate">{iv.key}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom URL Mode */}
      {activeTab === 'custom' && (
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-slate-300">
            Static Image URL / Media Asset
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={element.imageUrl?.startsWith('{{') ? '' : element.imageUrl || ''}
              placeholder="https://example.com/logo.png"
              onChange={(e) => {
                onChange({
                  imageUrl: e.target.value,
                  dynamicFieldKey: undefined,
                });
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <p className="text-[10px] text-slate-500">
            Provide a direct public HTTPS URL. For dynamic match data, use the Dynamic tab.
          </p>
        </div>
      )}

      {/* Fallback Strategy Mode */}
      {activeTab === 'fallback' && (
        <div className="space-y-2.5">
          <label className="block text-[11px] font-semibold text-slate-300">
            Fallback Placeholder Strategy
          </label>
          <div className="text-[10px] text-slate-400">
            When a player photo or team logo is missing in live match data, the engine uses this safe fallback.
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg">
              <img
                src={DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER}
                alt="Player Fallback"
                className="w-6 h-6 rounded-full object-cover border border-slate-700"
                referrerPolicy="no-referrer"
              />
              <span className="text-[11px] text-slate-300">Default Avatar</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg">
              <img
                src={DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER}
                alt="Team Fallback"
                className="w-6 h-6 rounded-full object-cover border border-slate-700"
                referrerPolicy="no-referrer"
              />
              <span className="text-[11px] text-slate-300">Team Shield</span>
            </div>
          </div>
        </div>
      )}

      {/* Preview & Current Value Bar */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <img
              src={resolvedImageUrl || element.imageUrl || DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER}
              alt="Resolved Preview"
              className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-slate-950"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
              }}
            />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-400">Resolved Source</div>
            <div className="text-[11px] text-cyan-300 font-mono truncate max-w-[200px]">
              {element.dynamicFieldKey || (element.imageUrl?.startsWith('{{') ? element.imageUrl : 'Static URL')}
            </div>
          </div>
        </div>

        {/* Fit mode selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Fit:</span>
          <select
            value={element.imageFit || 'cover'}
            onChange={(e) => onChange({ imageFit: e.target.value as any })}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
            <option value="none">Original</option>
          </select>
        </div>
      </div>
    </div>
  );
};
