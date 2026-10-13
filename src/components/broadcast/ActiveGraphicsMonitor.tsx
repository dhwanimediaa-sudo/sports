import React, { useState } from 'react';
import { OnAirState, OnAirGraphicItem, OnAirHistoryItem } from '../../types';
import {
  Activity,
  Play,
  RotateCcw,
  SkipForward,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
  AlertCircle,
  Shield,
  Layers,
} from 'lucide-react';

interface ActiveGraphicsMonitorProps {
  onAirState: OnAirState | null;
  onPreview: (item: Partial<OnAirGraphicItem>) => void;
  onTakeLive: (item?: Partial<OnAirGraphicItem>) => void;
  onHold?: () => void;
  onReplay: () => void;
  onSkipQueued: (index: number) => void;
  onClearOnAir: () => void;
  onCancelQueued?: (index: number) => void;
}

type TabFilter = 'ALL' | 'ON_AIR' | 'QUEUED' | 'COMPLETED' | 'CANCELLED';

export const ActiveGraphicsMonitor: React.FC<ActiveGraphicsMonitorProps> = ({
  onAirState,
  onPreview,
  onTakeLive,
  onHold,
  onReplay,
  onSkipQueued,
  onClearOnAir,
  onCancelQueued,
}) => {
  const [activeFilter, setActiveFilter] = useState<TabFilter>('ALL');

  const current = onAirState?.currentGraphic || onAirState?.currentOnAir;
  const queue = onAirState?.queue || [];
  const history = onAirState?.history || [];

  // Assemble unified list of items with standardized status
  interface MonitoredItem {
    id: string;
    graphicName: string;
    eventName: string;
    sourceType: string;
    priority: number;
    priorityLevel: string;
    targetBus: 'PROGRAM' | 'PREVIEW' | 'QUEUE' | 'HISTORY';
    conflictPolicy: string;
    startedTime?: string;
    durationSeconds: number;
    remainingSeconds?: number;
    isHeld?: boolean;
    status: 'ON_AIR' | 'QUEUED' | 'COMPLETED' | 'CANCELLED';
    rawItem?: any;
    queueIndex?: number;
  }

  const items: MonitoredItem[] = [];

  if (current) {
    items.push({
      id: current.id,
      graphicName: current.graphicName || current.eventName || 'Current Broadcast Graphic',
      eventName: current.eventName || current.targetId || 'Live Graphic',
      sourceType: current.sourceType || 'MANUAL',
      priority: current.priority ?? 50,
      priorityLevel: current.priorityLevel || (current.priority && current.priority >= 90 ? 'CRITICAL' : current.priority && current.priority >= 70 ? 'HIGH' : current.priority && current.priority >= 40 ? 'NORMAL' : 'LOW'),
      targetBus: 'PROGRAM',
      conflictPolicy: current.conflictAction || 'INTERRUPT',
      startedTime: current.startedAt ? new Date(current.startedAt).toLocaleTimeString() : 'Now',
      durationSeconds: current.durationSeconds || 4,
      remainingSeconds: current.remainingSeconds ?? current.durationSeconds,
      isHeld: Boolean(current.isHeld),
      status: 'ON_AIR',
      rawItem: current,
    });
  }

  queue.forEach((qItem, idx) => {
    items.push({
      id: qItem.id,
      graphicName: qItem.graphicName || qItem.eventName || `Queued Graphic #${idx + 1}`,
      eventName: qItem.eventName || qItem.targetId || 'Queued Event',
      sourceType: qItem.sourceType || 'QUEUE',
      priority: qItem.priority ?? 50,
      priorityLevel: qItem.priorityLevel || (qItem.priority && qItem.priority >= 90 ? 'CRITICAL' : qItem.priority && qItem.priority >= 70 ? 'HIGH' : qItem.priority && qItem.priority >= 40 ? 'NORMAL' : 'LOW'),
      targetBus: 'QUEUE',
      conflictPolicy: qItem.conflictAction || 'QUEUE_BEHIND',
      startedTime: 'In Queue',
      durationSeconds: qItem.durationSeconds || 4,
      remainingSeconds: qItem.durationSeconds || 4,
      status: 'QUEUED',
      rawItem: qItem,
      queueIndex: idx,
    });
  });

  history.forEach((hItem) => {
    items.push({
      id: hItem.id,
      graphicName: hItem.graphicName || hItem.eventName || 'Broadcast Event',
      eventName: hItem.eventName || 'Event',
      sourceType: hItem.sourceType || 'HISTORY',
      priority: hItem.priority ?? 50,
      priorityLevel: hItem.priorityLevel || 'NORMAL',
      targetBus: 'HISTORY',
      conflictPolicy: 'COMPLETED',
      startedTime: hItem.startedAt ? new Date(hItem.startedAt).toLocaleTimeString() : hItem.triggeredAt ? new Date(hItem.triggeredAt).toLocaleTimeString() : 'Past',
      durationSeconds: hItem.durationSeconds || 4,
      remainingSeconds: 0,
      status: hItem.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
      rawItem: hItem,
    });
  });

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'ALL') return true;
    return item.status === activeFilter;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      {/* Header & Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-black tracking-wider uppercase text-white">
            ACTIVE GRAPHICS MONITOR & TELEMETRY
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {items.length} total entries
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 text-xs">
          {[
            { id: 'ALL', label: `ALL (${items.length})` },
            { id: 'ON_AIR', label: `ON AIR (${current ? 1 : 0})` },
            { id: 'QUEUED', label: `QUEUED (${queue.length})` },
            { id: 'COMPLETED', label: `COMPLETED (${history.filter((h) => h.status === 'COMPLETED').length})` },
            { id: 'CANCELLED', label: `CANCELLED (${history.filter((h) => h.status === 'CANCELLED').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as TabFilter)}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Monitor Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[340px]">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            No graphics match the selected filter.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                <th className="py-2 px-3">STATUS</th>
                <th className="py-2 px-3">TARGET BUS</th>
                <th className="py-2 px-3">GRAPHIC / EVENT</th>
                <th className="py-2 px-3">SOURCE</th>
                <th className="py-2 px-3">PRIORITY</th>
                <th className="py-2 px-3">CONFLICT POLICY</th>
                <th className="py-2 px-3">STARTED</th>
                <th className="py-2 px-3">REMAINING</th>
                <th className="py-2 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-800/40 transition ${
                    item.status === 'ON_AIR' ? 'bg-red-950/20' : ''
                  }`}
                >
                  {/* Status Badge */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {item.status === 'ON_AIR' && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-700 font-bold text-[10px] animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                        {item.isHeld ? 'ON AIR (HELD)' : 'ON AIR'}
                      </span>
                    )}
                    {item.status === 'QUEUED' && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700 font-bold text-[10px]">
                        <Clock className="w-2.5 h-2.5" />
                        QUEUED
                      </span>
                    )}
                    {item.status === 'COMPLETED' && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        COMPLETED
                      </span>
                    )}
                    {item.status === 'CANCELLED' && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[10px]">
                        <XCircle className="w-2.5 h-2.5" />
                        CANCELLED
                      </span>
                    )}
                  </td>

                  {/* Target Bus */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider ${
                      item.targetBus === 'PROGRAM'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : item.targetBus === 'QUEUE'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {item.targetBus === 'PROGRAM' ? 'PGM' : item.targetBus}
                    </span>
                  </td>

                  {/* Graphic & Event Name */}
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-white text-xs">{item.graphicName}</div>
                    <div className="text-[10px] text-slate-400">{item.eventName}</div>
                  </td>

                  {/* Source */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.sourceType}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        item.priorityLevel === 'CRITICAL'
                          ? 'bg-red-950 text-red-300 border border-red-700'
                          : item.priorityLevel === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : item.priorityLevel === 'NORMAL'
                          ? 'bg-blue-950 text-blue-300 border border-blue-700'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.priorityLevel}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">P{item.priority}</span>
                    </div>
                  </td>

                  {/* Conflict Policy */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {item.conflictPolicy}
                    </span>
                  </td>

                  {/* Started Time */}
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                    {item.startedTime}
                  </td>

                  {/* Remaining Duration */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                    {item.status === 'ON_AIR' ? (
                      item.isHeld ? (
                        <span className="text-cyan-400">HOLD</span>
                      ) : (
                        <span className="text-red-400">{item.remainingSeconds}s</span>
                      )
                    ) : item.status === 'QUEUED' ? (
                      <span className="text-amber-400">{item.durationSeconds}s</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Preview action (available for any item) */}
                      <button
                        onClick={() =>
                          onPreview({
                            graphicName: item.graphicName,
                            eventName: item.eventName,
                            sourceType: item.sourceType as any,
                            durationSeconds: item.durationSeconds,
                            graphicId: item.rawItem?.graphicId,
                            sceneId: item.rawItem?.sceneId,
                          })
                        }
                        className="p-1.5 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 transition cursor-pointer"
                        title="Cue item to Preview Bus (PST)"
                      >
                        <Eye className="w-3 h-3" />
                      </button>

                      {/* Hold / Resume action (if ON AIR) */}
                      {item.status === 'ON_AIR' && onHold && (
                        <button
                          onClick={onHold}
                          className={`p-1.5 rounded transition cursor-pointer ${
                            item.isHeld
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-800 hover:bg-cyan-700 text-cyan-400'
                          }`}
                          title={item.isHeld ? 'Release Hold' : 'Freeze on-air (Hold)'}
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                      )}

                      {/* Replay action (if ON AIR or COMPLETED) */}
                      {(item.status === 'ON_AIR' || item.status === 'COMPLETED') && (
                        <button
                          onClick={onReplay}
                          className="p-1.5 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-cyan-400 transition cursor-pointer"
                          title="Replay graphic with refreshed live scoring telemetry"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}

                      {/* Take Live action (if QUEUED or COMPLETED) */}
                      {item.status !== 'ON_AIR' && (
                        <button
                          onClick={() =>
                            onTakeLive({
                              graphicName: item.graphicName,
                              eventName: item.eventName,
                              sourceType: item.sourceType as any,
                              durationSeconds: item.durationSeconds,
                              graphicId: item.rawItem?.graphicId,
                              sceneId: item.rawItem?.sceneId,
                            })
                          }
                          className="p-1.5 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 transition cursor-pointer"
                          title="Take live now to Program (PGM)"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      )}

                      {/* Skip action (if QUEUED) */}
                      {item.status === 'QUEUED' && typeof item.queueIndex === 'number' && (
                        <button
                          onClick={() => onSkipQueued(item.queueIndex!)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-purple-600 hover:text-white text-purple-400 transition cursor-pointer"
                          title="Skip queued item"
                        >
                          <SkipForward className="w-3 h-3" />
                        </button>
                      )}

                      {/* Cancel Queued action */}
                      {item.status === 'QUEUED' && typeof item.queueIndex === 'number' && (
                        <button
                          onClick={() => (onCancelQueued ? onCancelQueued(item.queueIndex!) : onSkipQueued(item.queueIndex!))}
                          className="p-1.5 rounded bg-slate-800 hover:bg-red-700 hover:text-white text-red-400 transition cursor-pointer"
                          title="Cancel and remove from queue"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      )}

                      {/* Clear action (if ON AIR) */}
                      {item.status === 'ON_AIR' && (
                        <button
                          onClick={onClearOnAir}
                          className="p-1.5 rounded bg-slate-800 hover:bg-red-700 hover:text-white text-red-400 transition cursor-pointer"
                          title="Cut graphic off Program bus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
