import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Match,
  CricketMatchScoringState,
  VolleyballMatchScoringState,
  BasketballMatchScoringState,
  BroadcastConfig,
  BroadcastTemplateStyle,
  ContainerShape,
  BroadcastFontStyle,
  BroadcastPosition,
  BroadcastActiveEventPayload,
  OnAirGraphicItem,
} from '../../types';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { StudioGraphicElementRenderer } from '../admin/graphics/StudioGraphicElementRenderer';
import { resolveBroadcastDataContext } from '../../utils/broadcastDataResolver';
import {
  Trophy,
  Flame,
  Award,
  Zap,
  Target,
  Sparkles,
  UserCheck,
  ShieldAlert,
  Shield,
  Activity,
  AlertTriangle,
} from 'lucide-react';

interface BroadcastCanvasProps {
  matchId?: string;
  previewMode?: boolean;
  previewConfigOverride?: BroadcastConfig;
  previewScoringStateOverride?: any;
  previewOnAirItemOverride?: OnAirGraphicItem | null;
  previewMatchOverride?: Match | null;
  previewActiveEventOverride?: BroadcastActiveEventPayload | null;
}

const formatRate = (val: any, decimals = 2, fallback = '0.00'): string => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  return isNaN(num) ? fallback : num.toFixed(decimals);
};

export const BroadcastCanvas: React.FC<BroadcastCanvasProps> = ({
  matchId: propMatchId,
  previewMode = false,
  previewConfigOverride,
  previewScoringStateOverride,
  previewOnAirItemOverride,
  previewMatchOverride,
  previewActiveEventOverride,
}) => {
  // Extract matchId from URL if not explicitly provided as prop
  const matchId =
    propMatchId ||
    (typeof window !== 'undefined'
      ? window.location.pathname.split('/broadcast/match/')[1]?.split('?')[0]?.split('/')[0]
      : '');

  const [match, setMatch] = useState<Match | null>(previewMatchOverride || null);
  const [scoringState, setScoringState] = useState<any>(
    previewScoringStateOverride || null
  );
  const [config, setConfig] = useState<BroadcastConfig | null>(
    previewConfigOverride || null
  );
  const [serverDataContext, setServerDataContext] = useState<any>(null);

  // Realtime Active Pop-up Event state
  const [activeEvent, setActiveEvent] = useState<BroadcastActiveEventPayload | null>(
    previewActiveEventOverride !== undefined ? previewActiveEventOverride : null
  );
  const [onAirItem, setOnAirItem] = useState<OnAirGraphicItem | null>(
    previewOnAirItemOverride !== undefined ? previewOnAirItemOverride : null
  );
  const [activeGraphics, setActiveGraphics] = useState<OnAirGraphicItem[]>([]);
  const eventTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedBallIdRef = useRef<string | null>(null);
  const lastProcessedRallyIdRef = useRef<string | null>(null);
  const lastProcessedRaidIdRef = useRef<string | null>(null);
  const lastProcessedHockeyEventIdRef = useRef<string | null>(null);
  const lastProcessedFootballEventIdRef = useRef<string | null>(null);
  const lastProcessedTennisPointIdRef = useRef<string | null>(null);
  const lastProcessedBadmintonRallyIdRef = useRef<string | null>(null);
  const lastProcessedTableTennisRallyIdRef = useRef<string | null>(null);
  const lastProcessedBasketballEventIdRef = useRef<string | null>(null);

  // Connection & Diagnostics state
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'>('CONNECTED');
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState<number>(1);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Diagnostic HUD enabled only via URL query ?diag=1 or ?debug=1
  const showDiagnostics =
    !previewMode &&
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('diag') === '1' ||
      new URLSearchParams(window.location.search).get('debug') === '1');

  // Ensure 100% transparent background for OBS / vMix browser source overlay
  useEffect(() => {
    if (!previewMode && typeof document !== 'undefined') {
      const originalHtmlBg = document.documentElement.style.background;
      const originalBodyBg = document.body.style.background;
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      return () => {
        document.documentElement.style.background = originalHtmlBg;
        document.body.style.background = originalBodyBg;
      };
    }
  }, [previewMode]);

  // True 1920x1080 stage scale calculation to prevent distortion across all viewports
  useEffect(() => {
    const updateScale = () => {
      if (previewMode && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const s = Math.min(rect.width / 1920, rect.height / 1080);
          setStageScale(s > 0 ? s : 1);
          return;
        }
      }
      const w = (typeof window !== 'undefined' && window.innerWidth) || 1920;
      const h = (typeof window !== 'undefined' && window.innerHeight) || 1080;
      const s = Math.min(w / 1920, h / 1080);
      setStageScale(s > 0 ? s : 1);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [previewMode]);

  // Track sync elapsed seconds for diagnostic monitoring
  useEffect(() => {
    if (!showDiagnostics) return;
    const ticker = setInterval(() => {
      setSyncSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSyncTime) / 1000)));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastSyncTime, showDiagnostics]);

  // Memoize unified client & server dynamic broadcast variables
  const activeDataContext = useMemo(
    () => resolveBroadcastDataContext(match, scoringState, serverDataContext),
    [match, scoringState, serverDataContext]
  );

  // Match switch safety: Reset state when matchId changes
  useEffect(() => {
    setMatch(null);
    setScoringState(null);
    setOnAirItem(null);
    setActiveGraphics([]);
    setActiveEvent(null);
    lastProcessedBallIdRef.current = null;
    lastProcessedRallyIdRef.current = null;
    lastProcessedRaidIdRef.current = null;
    lastProcessedHockeyEventIdRef.current = null;
    lastProcessedFootballEventIdRef.current = null;
    lastProcessedTennisPointIdRef.current = null;
    lastProcessedBadmintonRallyIdRef.current = null;
    lastProcessedTableTennisRallyIdRef.current = null;
    lastProcessedBasketballEventIdRef.current = null;
  }, [matchId]);

  // Fetch initial state and manage SSE stream with exponential backoff reconnect
  useEffect(() => {
    if (previewMode) {
      if (previewConfigOverride) setConfig(previewConfigOverride);
      if (previewScoringStateOverride) setScoringState(previewScoringStateOverride);
      if (previewMatchOverride) setMatch(previewMatchOverride);
      if (previewActiveEventOverride !== undefined) setActiveEvent(previewActiveEventOverride);
      if (previewOnAirItemOverride !== undefined) setOnAirItem(previewOnAirItemOverride);
      return;
    }

    if (!matchId) return;

    let isMounted = true;

    const fetchState = async () => {
      try {
        const res = await api.getBroadcastState(matchId);
        if (isMounted) {
          setMatch(res.match);
          setScoringState(res.scoringState);
          setConfig(res.broadcastConfig);
          setLastSyncTime(Date.now());
          setConnectionStatus('CONNECTED');
          if ((res as any).dataContext) {
            setServerDataContext((res as any).dataContext);
          }
          if ((res as any).onAirState?.activeGraphics) {
            setActiveGraphics((res as any).onAirState.activeGraphics);
          }
          const nextOnAir = (res as any).assignedOnAirGraphic !== undefined
            ? (res as any).assignedOnAirGraphic
            : (res as any).onAirState?.currentOnAir;
          if (nextOnAir !== undefined) {
            setOnAirItem((prev) => {
              if (!nextOnAir) return null;
              if (prev && prev.id === nextOnAir.id) {
                return { ...prev, ...nextOnAir, graphic: nextOnAir.graphic || prev.graphic, layers: nextOnAir.layers || prev.layers };
              }
              return nextOnAir;
            });
          }
        }
      } catch (err) {
        console.error('Failed to load broadcast canvas state:', err);
      }
    };

    fetchState();

    // Setup resilient SSE stream connection
    const connectSSE = () => {
      if (!isMounted) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const sseUrl = `/api/matches/${matchId}/scoring/stream`;
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!isMounted) return;
        setConnectionStatus('CONNECTED');
        reconnectAttemptsRef.current = 0;
        setLastSyncTime(Date.now());
        fetchState();
      };

      eventSource.onerror = () => {
        if (!isMounted) return;
        setConnectionStatus('RECONNECTING');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Exponential backoff reconnect: 1s, 1.5s, 2.25s ... capped at 15s
        const backoffMs = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 15000);
        reconnectAttemptsRef.current += 1;

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted) {
            connectSSE();
          }
        }, backoffMs);
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (!isMounted) return;

          setConnectionStatus('CONNECTED');
          setLastSyncTime(Date.now());
          reconnectAttemptsRef.current = 0;

          if (data.broadcastConfig) {
            setConfig(data.broadcastConfig);
          }
          if (data.match) {
            setMatch(data.match);
          }
          if (data.dataContext) {
            setServerDataContext(data.dataContext);
          }

          if (data.onAirState?.activeGraphics !== undefined) {
            setActiveGraphics(data.onAirState.activeGraphics);
          }

          // Live On-Air Program bus synchronization (preserve animation stability on score updates)
          const incomingOnAir = data.assignedOnAirGraphic !== undefined
            ? data.assignedOnAirGraphic
            : data.onAirState !== undefined
            ? data.onAirState.currentOnAir
            : undefined;

          if (incomingOnAir !== undefined) {
            setOnAirItem((prev) => {
              if (!incomingOnAir) return null;
              if (prev && prev.id === incomingOnAir.id) {
                return { ...prev, ...incomingOnAir, graphic: incomingOnAir.graphic || prev.graphic, layers: incomingOnAir.layers || prev.layers };
              }
              return incomingOnAir;
            });
          }

          // Check if there is an explicit manual trigger event
          if (data.manualTriggerEvent && data.manualTriggerEvent.type !== 'NONE') {
            triggerEventOverlay({
              type: data.manualTriggerEvent.type,
              durationSeconds: data.manualTriggerEvent.durationSeconds || 3,
              data: data.manualTriggerEvent.data,
              timestamp: data.manualTriggerEvent.timestamp || new Date().toISOString(),
            });
          }

          // Update calculated scoring state
          if (data.currentInnings || data.events || data.setsList || data.allRallies || data.raids || data.teamAScore !== undefined) {
            setScoringState(data);

            // Detect automatic Table Tennis event overlay triggers
            if ((data.sport === 'TABLE_TENNIS' || (data.currentGame !== undefined && data.serviceCountInRotation !== undefined)) && (data.events || []).length > 0) {
              const lastRally = data.events[data.events.length - 1];
              if (lastRally && lastRally.id !== lastProcessedTableTennisRallyIdRef.current) {
                lastProcessedTableTennisRallyIdRef.current = lastRally.id;
                processAutomaticTableTennisEvent(lastRally, data);
              }
            }

            // Detect automatic Football event overlay triggers
            if (data.sport === 'FOOTBALL' && data.events && data.events.length > 0) {
              const lastEvt = data.events[data.events.length - 1];
              if (lastEvt && lastEvt.id !== lastProcessedFootballEventIdRef.current) {
                lastProcessedFootballEventIdRef.current = lastEvt.id;
                processAutomaticFootballEvent(lastEvt, data);
              }
            }

            // Detect automatic Tennis event overlay triggers
            if ((data.sport === 'TENNIS' || data.pointHistory || data.sets) && (data.events || data.pointHistory || []).length > 0) {
              const eventsList = data.events || data.pointHistory || [];
              const lastPt = eventsList[eventsList.length - 1];
              if (lastPt && lastPt.id !== lastProcessedTennisPointIdRef.current) {
                lastProcessedTennisPointIdRef.current = lastPt.id;
                processAutomaticTennisEvent(lastPt, data);
              }
            }

            // Detect automatic Hockey event overlay triggers
            if (data.sport === 'HOCKEY' && data.events && data.events.length > 0) {
              const lastEvt = data.events[data.events.length - 1];
              if (lastEvt && lastEvt.id !== lastProcessedHockeyEventIdRef.current) {
                lastProcessedHockeyEventIdRef.current = lastEvt.id;
                processAutomaticHockeyEvent(lastEvt, data);
              }
            }

            // Detect automatic Badminton event overlay triggers
            if ((data.sport === 'BADMINTON' || (data.currentGame !== undefined && data.serviceCourt !== undefined)) && (data.events || []).length > 0) {
              const lastRally = data.events[data.events.length - 1];
              if (lastRally && lastRally.id !== lastProcessedBadmintonRallyIdRef.current) {
                lastProcessedBadmintonRallyIdRef.current = lastRally.id;
                processAutomaticBadmintonEvent(lastRally, data);
              }
            }

            // Detect automatic Cricket ball event overlay triggers (strictly isolated to Cricket)
            if ((data.sport === 'CRICKET' || (!data.sport && data.currentInnings)) && data.events && data.events.length > 0) {
              const lastBall = data.events[data.events.length - 1];
              if (lastBall && lastBall.id !== lastProcessedBallIdRef.current) {
                lastProcessedBallIdRef.current = lastBall.id;
                processAutomaticCricketEvent(lastBall, data);
              }
            }

            // Detect automatic Volleyball rally event overlay triggers
            if ((data.sport === 'VOLLEYBALL' || data.allRallies) && data.allRallies && data.allRallies.length > 0) {
              const lastRally = data.allRallies[0];
              if (lastRally && lastRally.id !== lastProcessedRallyIdRef.current) {
                lastProcessedRallyIdRef.current = lastRally.id;
                processAutomaticVolleyballEvent(lastRally, data);
              }
            }

            // Detect automatic Kabaddi raid event overlay triggers
            if ((data.sport === 'KABADDI' || data.raids) && data.raids && data.raids.length > 0) {
              const lastRaid = data.raids[data.raids.length - 1];
              if (lastRaid && lastRaid.id !== lastProcessedRaidIdRef.current) {
                lastProcessedRaidIdRef.current = lastRaid.id;
                processAutomaticKabaddiEvent(lastRaid, data);
              }
            }

            // Detect automatic Basketball event overlay triggers
            if (data.sport === 'BASKETBALL' && data.events && data.events.length > 0) {
              const lastEvt = data.events[data.events.length - 1];
              if (lastEvt && lastEvt.id !== lastProcessedBasketballEventIdRef.current) {
                lastProcessedBasketballEventIdRef.current = lastEvt.id;
                processAutomaticBasketballEvent(lastEvt, data);
              }
            }
          }
        } catch (err) {
          // Parse error
        }
      };
    };

    connectSSE();

    // 30-second fallback reconciliation polling
    const heartbeatInterval = setInterval(() => {
      if (isMounted) {
        fetchState();
      }
    }, 30000);

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventTimeoutRef.current) {
        clearTimeout(eventTimeoutRef.current);
        eventTimeoutRef.current = null;
      }
      clearInterval(heartbeatInterval);
    };
  }, [matchId, previewMode, previewConfigOverride, previewScoringStateOverride]);

  // Update overrides if in preview mode
  useEffect(() => {
    if (previewMode) {
      if (previewConfigOverride) setConfig(previewConfigOverride);
      if (previewScoringStateOverride) setScoringState(previewScoringStateOverride);
      if (previewOnAirItemOverride !== undefined) setOnAirItem(previewOnAirItemOverride);
    }
  }, [previewMode, previewConfigOverride, previewScoringStateOverride, previewOnAirItemOverride]);

  // Handle event popup durations
  const triggerEventOverlay = (evt: BroadcastActiveEventPayload) => {
    if (eventTimeoutRef.current) clearTimeout(eventTimeoutRef.current);

    setActiveEvent(evt);

    const durationMs = (evt.durationSeconds || 3) * 1000;
    eventTimeoutRef.current = setTimeout(() => {
      setActiveEvent(null);
    }, durationMs);
  };

  // Detect automatic Volleyball events
  const processAutomaticVolleyballEvent = (
    lastRally: any,
    state: VolleyballMatchScoringState
  ) => {
    if (!config) return;

    if (lastRally.pointType === 'SERVICE_ACE') {
      triggerEventOverlay({
        type: 'SERVICE_ACE',
        durationSeconds: 3,
        data: {
          playerName: lastRally.player?.name || 'SERVER',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastRally.pointType === 'ATTACK_POINT') {
      triggerEventOverlay({
        type: 'SPIKE_KILL',
        durationSeconds: 3,
        data: {
          playerName: lastRally.player?.name || 'ATTACKER',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastRally.pointType === 'BLOCK_POINT') {
      triggerEventOverlay({
        type: 'BLOCK_KILL',
        durationSeconds: 3,
        data: {
          playerName: lastRally.player?.name || 'BLOCKER',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (state.isMatchPoint) {
      triggerEventOverlay({
        type: 'MATCH_POINT',
        durationSeconds: 3,
        data: {
          text: 'MATCH POINT',
        },
        timestamp: new Date().toISOString(),
      });
    } else if (state.isSetPoint) {
      triggerEventOverlay({
        type: 'SET_POINT',
        durationSeconds: 3,
        data: {
          text: `SET POINT (SET ${state.currentSetNumber})`,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Detect automatic Kabaddi events (SUPER_RAID, SUPER_TACKLE, ALL_OUT, DO_OR_DIE)
  const processAutomaticKabaddiEvent = (
    lastRaid: any,
    state: any
  ) => {
    if (!config) return;

    if (lastRaid.isSuperRaid) {
      const raider = state.playerStats?.find((p: any) => p.playerId === lastRaid.raiderPlayerId);
      triggerEventOverlay({
        type: 'SUPER_RAID',
        durationSeconds: 4,
        data: {
          raiderName: raider?.playerName || 'RAIDER',
          points: (lastRaid.touchPoints || 0) + (lastRaid.bonusPoints || 0),
          teamName: lastRaid.raidingTeamId === state.match?.teamAId ? state.match?.teamA?.name : state.match?.teamB?.name,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastRaid.isSuperTackle) {
      triggerEventOverlay({
        type: 'SUPER_TACKLE',
        durationSeconds: 4,
        data: {
          points: 2,
          teamName: lastRaid.defendingTeamId === state.match?.teamAId ? state.match?.teamA?.name : state.match?.teamB?.name,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastRaid.outcome === 'ALL_OUT' || lastRaid.isAllOut) {
      triggerEventOverlay({
        type: 'ALL_OUT',
        durationSeconds: 4,
        data: {
          teamName: lastRaid.allOutTeamId === state.match?.teamAId ? state.match?.teamA?.name : state.match?.teamB?.name,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastRaid.isDoOrDie && ((lastRaid.touchPoints || 0) + (lastRaid.bonusPoints || 0) > 0)) {
      const raider = state.playerStats?.find((p: any) => p.playerId === lastRaid.raiderPlayerId);
      triggerEventOverlay({
        type: 'DO_OR_DIE_SUCCESS',
        durationSeconds: 3.5,
        data: {
          raiderName: raider?.playerName || 'RAIDER',
          points: (lastRaid.touchPoints || 0) + (lastRaid.bonusPoints || 0),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  // Detect automatic Tennis events (ACE, DOUBLE_FAULT, BREAK_POINT, SET_WON, MATCH_WON)
  const processAutomaticTennisEvent = (
    lastPt: any,
    state: any
  ) => {
    if (!config) return;

    if (lastPt.isAce || lastPt.pointType === 'ACE') {
      triggerEventOverlay({
        type: 'TENNIS_ACE',
        durationSeconds: 3.5,
        data: {
          serverName: lastPt.serverPlayerName || lastPt.playerName || 'Server',
          speedMph: lastPt.serveSpeedMph,
          setNumber: lastPt.setNumber,
          gameNumber: lastPt.gameNumber,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastPt.isBreakPointConverted) {
      triggerEventOverlay({
        type: 'BREAK_POINT_CONVERTED',
        durationSeconds: 4,
        data: {
          winnerTeamName: lastPt.pointWinnerTeamName || (lastPt.pointWinner === 'TEAM_A' ? state.teamAName : state.teamBName),
          setNumber: lastPt.setNumber,
          gameNumber: lastPt.gameNumber,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastPt.setWon) {
      triggerEventOverlay({
        type: 'TENNIS_SET_SUMMARY',
        durationSeconds: 6,
        data: {
          setNumber: lastPt.setNumber,
          winnerTeamName: lastPt.pointWinnerTeamName || (lastPt.pointWinner === 'TEAM_A' ? state.teamAName : state.teamBName),
          scoreDisplay: state.finalSetScoreDisplay || `Set ${lastPt.setNumber}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  // Detect automatic Football events (GOAL, CARDS, SUBSTITUTIONS, PENALTY, SHOOTOUT)
  const processAutomaticFootballEvent = (
    lastEvt: any,
    state: any
  ) => {
    if (!config) return;

    if (lastEvt.eventType === 'GOAL') {
      triggerEventOverlay({
        type: 'GOAL',
        durationSeconds: 5.5,
        data: {
          scorerName: lastEvt.playerName || 'GOAL',
          assistName: lastEvt.assistPlayerName,
          goalType: lastEvt.goalType || 'OPEN_PLAY',
          teamName: lastEvt.teamName,
          scoreA: lastEvt.scoreA_after,
          scoreB: lastEvt.scoreB_after,
          periodName: lastEvt.periodName,
          matchTimeDisplay: lastEvt.matchTimeDisplay,
          sport: 'FOOTBALL',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'CARD') {
      const cardType = lastEvt.cardType === 'YELLOW' ? 'YELLOW_CARD' : lastEvt.cardType === 'SECOND_YELLOW' ? 'RED_CARD' : 'RED_CARD';
      triggerEventOverlay({
        type: cardType,
        durationSeconds: 4.5,
        data: {
          teamName: lastEvt.teamName,
          playerName: lastEvt.playerName,
          cardType: lastEvt.cardType,
          reason: lastEvt.cardReason || 'Foul / Misconduct',
          matchTimeDisplay: lastEvt.matchTimeDisplay,
          sport: 'FOOTBALL',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'SUBSTITUTION') {
      triggerEventOverlay({
        type: 'SUBSTITUTION',
        durationSeconds: 4.5,
        data: {
          teamName: lastEvt.teamName,
          playerOutName: lastEvt.playerOutName,
          playerInName: lastEvt.playerInName,
          matchTimeDisplay: lastEvt.matchTimeDisplay,
          sport: 'FOOTBALL',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'PENALTY_KICK') {
      triggerEventOverlay({
        type: 'PENALTY_KICK',
        durationSeconds: 4,
        data: {
          teamName: lastEvt.teamName,
          playerName: lastEvt.playerName,
          outcome: lastEvt.penaltyOutcome || 'AWARDED',
          matchTimeDisplay: lastEvt.matchTimeDisplay,
          sport: 'FOOTBALL',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'SHOOTOUT_KICK') {
      triggerEventOverlay({
        type: 'SHOOTOUT_ATTEMPT',
        durationSeconds: 4,
        data: {
          teamName: lastEvt.teamName,
          playerName: lastEvt.playerName,
          outcome: lastEvt.penaltyOutcome || 'SCORED',
          round: lastEvt.shootoutRound,
          scoreA: state.shootoutScoreA,
          scoreB: state.shootoutScoreB,
          sport: 'FOOTBALL',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  // Detect automatic Field Hockey events (GOAL, PENALTY_CORNER, PENALTY_STROKE, CARDS, SHOOTOUT)
  const processAutomaticHockeyEvent = (
    lastEvt: any,
    state: any
  ) => {
    if (!config) return;

    if (lastEvt.eventType === 'GOAL') {
      triggerEventOverlay({
        type: 'GOAL',
        durationSeconds: 5,
        data: {
          scorerName: lastEvt.playerName || 'GOAL',
          assistName: lastEvt.assistPlayerName,
          goalType: lastEvt.goalType || 'FIELD_GOAL',
          teamName: lastEvt.teamName,
          scoreA: lastEvt.scoreA_after,
          scoreB: lastEvt.scoreB_after,
          periodName: lastEvt.periodName,
          matchTimeDisplay: lastEvt.matchTimeDisplay,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'PENALTY_CORNER') {
      triggerEventOverlay({
        type: 'PENALTY_CORNER',
        durationSeconds: 3.5,
        data: {
          teamName: lastEvt.teamName,
          outcome: lastEvt.penaltyCornerOutcome,
          periodName: lastEvt.periodName,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'PENALTY_STROKE') {
      triggerEventOverlay({
        type: 'PENALTY_STROKE',
        durationSeconds: 4,
        data: {
          teamName: lastEvt.teamName,
          playerName: lastEvt.playerName,
          outcome: lastEvt.penaltyStrokeOutcome,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'CARD') {
      const cardType = lastEvt.cardType === 'GREEN' ? 'GREEN_CARD' : lastEvt.cardType === 'YELLOW' ? 'YELLOW_CARD' : 'RED_CARD';
      triggerEventOverlay({
        type: cardType,
        durationSeconds: 4,
        data: {
          teamName: lastEvt.teamName,
          playerName: lastEvt.playerName,
          cardType: lastEvt.cardType,
          durationMinutes: lastEvt.cardDurationMinutes,
          reason: lastEvt.cardReason,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'SHOOTOUT_ATTEMPT') {
      triggerEventOverlay({
        type: 'SHOOTOUT_ATTEMPT',
        durationSeconds: 3.5,
        data: {
          teamName: lastEvt.teamName,
          playerName: lastEvt.playerName,
          outcome: lastEvt.shootoutAttemptOutcome,
          round: lastEvt.shootoutRound,
          scoreA: state.shootoutScoreA,
          scoreB: state.shootoutScoreB,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  // Detect automatic Badminton events (ACE, SMASH, DROP, NET KILL, CLEAR, DRIVE, DEUCE, INTERVAL, GOLDEN POINT, GAME WON, MATCH WON)
  const processAutomaticBadmintonEvent = (
    lastRally: any,
    state: any
  ) => {
    if (!config) return;

    // 1. Check Match Won
    if (lastRally.matchWon || state.isCompleted) {
      triggerEventOverlay({
        type: 'MATCH_WON',
        durationSeconds: config.eventDurations?.matchResult || 7,
        data: {
          winnerName: lastRally.matchWinnerPlayerName || state.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName) || 'CHAMPION',
          scoreDisplay: state.matchResultText || `Game 1: ${state.gameScores?.[0]?.scoreA ?? 0}-${state.gameScores?.[0]?.scoreB ?? 0} | Game 2: ${state.gameScores?.[1]?.scoreA ?? 0}-${state.gameScores?.[1]?.scoreB ?? 0}`,
          sport: 'BADMINTON',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 2. Check Game Won
    if (lastRally.gameWon) {
      triggerEventOverlay({
        type: 'GAME_WON',
        durationSeconds: 5,
        data: {
          gameNumber: lastRally.gameNumber || state.currentGame || 1,
          winnerName: lastRally.gameWinnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName) || 'Winner',
          scoreA: lastRally.scoreAfter?.scoreA ?? state.currentScoreA,
          scoreB: lastRally.scoreAfter?.scoreB ?? state.currentScoreB,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 3. Check 29-29 Sudden Death Golden Point
    if (state.currentScoreA === 29 && state.currentScoreB === 29) {
      triggerEventOverlay({
        type: 'GOLDEN_POINT',
        durationSeconds: 4,
        data: {
          gameNumber: state.currentGame || 1,
          message: '29-29 GOLDEN POINT • NEXT RALLY WINS GAME!',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 4. Check 20-20 Deuce
    if (state.currentScoreA === 20 && state.currentScoreB === 20) {
      triggerEventOverlay({
        type: 'DEUCE_20_20',
        durationSeconds: 3.5,
        data: {
          gameNumber: state.currentGame || 1,
          message: '20-20 DEUCE • 2 CLEAR POINTS REQUIRED (CAP 30)',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 5. Check 11-point Mid-game Interval
    if (
      (state.currentScoreA === 11 || state.currentScoreB === 11) &&
      (state.currentScoreA <= 11 && state.currentScoreB <= 11) &&
      lastRally.rallyInGame <= 22
    ) {
      triggerEventOverlay({
        type: 'INTERVAL',
        durationSeconds: 4,
        data: {
          gameNumber: state.currentGame || 1,
          leaderName: state.currentScoreA === 11 ? state.teamAName : state.teamBName,
          scoreA: state.currentScoreA,
          scoreB: state.currentScoreB,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 6. Check Match Point
    if (state.isMatchPointA || state.isMatchPointB) {
      triggerEventOverlay({
        type: 'MATCH_POINT',
        durationSeconds: 3.5,
        data: {
          playerName: state.isMatchPointA ? state.teamAName : state.teamBName,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 7. Check Game Point
    if (state.isGamePointA || state.isGamePointB) {
      triggerEventOverlay({
        type: 'GAME_POINT',
        durationSeconds: 3,
        data: {
          playerName: state.isGamePointA ? state.teamAName : state.teamBName,
          gameNumber: state.currentGame || 1,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 8. Specific Shot/Rally Winner Overlays
    const evtType = lastRally.eventType;
    if (evtType === 'ACE' || evtType === 'BADMINTON_ACE') {
      triggerEventOverlay({
        type: 'BADMINTON_ACE',
        durationSeconds: 3,
        data: {
          serverName: lastRally.serverPlayerName || lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'SMASH_WINNER' || evtType === 'SMASH') {
      triggerEventOverlay({
        type: 'SMASH_WINNER',
        durationSeconds: 3,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
          shotDetail: lastRally.shotDetail,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'DROP_SHOT_WINNER' || evtType === 'DROP_SHOT') {
      triggerEventOverlay({
        type: 'DROP_SHOT_WINNER',
        durationSeconds: 3,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'NET_KILL' || evtType === 'NET_WINNER') {
      triggerEventOverlay({
        type: 'NET_KILL',
        durationSeconds: 3,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'CLEAR_WINNER' || evtType === 'CLEAR') {
      triggerEventOverlay({
        type: 'CLEAR_WINNER',
        durationSeconds: 2.5,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'DRIVE_WINNER' || evtType === 'DRIVE') {
      triggerEventOverlay({
        type: 'DRIVE_WINNER',
        durationSeconds: 2.5,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'SERVICE_FAULT' || evtType === 'SERVICE_ERROR') {
      triggerEventOverlay({
        type: 'SERVICE_FAULT',
        durationSeconds: 2.5,
        data: {
          serverName: lastRally.serverPlayerName || 'Server',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'UNFORCED_ERROR') {
      triggerEventOverlay({
        type: 'UNFORCED_ERROR',
        durationSeconds: 2.5,
        data: {
          playerName: lastRally.receiverPlayerName || 'Player',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  // Detect automatic Table Tennis events (ACE, SMASH, FOREHAND, BACKHAND, LOOP, CHOP, NET, EDGE, FAULT, ERROR, DEUCE, GAME WON, MATCH WON, TIMEOUT, END CHANGE)
  const processAutomaticTableTennisEvent = (
    lastRally: any,
    state: any
  ) => {
    if (!config) return;

    // 1. Check Match Won
    if (lastRally.isMatchWinningPoint || lastRally.matchWon || state.isCompleted || state.isMatchOver) {
      triggerEventOverlay({
        type: 'MATCH_WON',
        durationSeconds: config.eventDurations?.matchResult || 7,
        data: {
          winnerName: lastRally.matchWinnerPlayerName || state.winnerPlayerName || state.winnerTeamName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName) || 'CHAMPION',
          scoreDisplay: state.matchResultText || `Final: ${state.gamesWonA || 0}-${state.gamesWonB || 0}`,
          sport: 'TABLE_TENNIS',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 2. Check Game Won
    if (lastRally.isGameWinningPoint || lastRally.gameWon) {
      triggerEventOverlay({
        type: 'GAME_WON',
        durationSeconds: 5,
        data: {
          gameNumber: lastRally.gameNumber || state.currentGame || 1,
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName) || 'Winner',
          scoreA: lastRally.scoreAfter?.scoreA ?? state.currentScoreA,
          scoreB: lastRally.scoreAfter?.scoreB ?? state.currentScoreB,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 3. Check Deciding Game
    if (state.isDecidingGame && state.currentScoreA === 0 && state.currentScoreB === 0 && (lastRally.pointNumber <= 1 || !lastRally.pointNumber)) {
      triggerEventOverlay({
        type: 'DECIDING_GAME',
        durationSeconds: 4,
        data: {
          gameNumber: state.currentGame || 1,
          message: 'DECIDING FINAL GAME • CHAMPIONSHIP DECIDER',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 4. Check Deuce (10-10 or subsequent deuce points)
    if (
      (state.currentScoreA >= 10 && state.currentScoreB >= 10 && state.currentScoreA === state.currentScoreB) ||
      state.isDeuce
    ) {
      triggerEventOverlay({
        type: 'TT_DEUCE',
        durationSeconds: 3.5,
        data: {
          scoreA: state.currentScoreA,
          scoreB: state.currentScoreB,
          message: `DEUCE (${state.currentScoreA}-${state.currentScoreB}) • 1-SERVE ROTATION • WIN BY 2`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 5. Check End Change / Change of ends
    if (lastRally.isEndChange || state.isEndChange) {
      triggerEventOverlay({
        type: 'END_CHANGE',
        durationSeconds: 3.5,
        data: {
          gameNumber: state.currentGame || 1,
          scoreA: state.currentScoreA,
          scoreB: state.currentScoreB,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 6. Check Tactical Timeout
    if (state.isTimeoutActive || lastRally.eventType === 'TIMEOUT') {
      triggerEventOverlay({
        type: 'TIMEOUT',
        durationSeconds: 5,
        data: {
          teamName: lastRally.teamName || (lastRally.side === 'TEAM_A' ? state.teamAName : state.teamBName) || 'Timeout',
          durationSeconds: state.timeoutRemainingSeconds || 60,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 7. Check Match Point
    if (state.isMatchPointA || state.isMatchPointB || state.isMatchPoint) {
      triggerEventOverlay({
        type: 'MATCH_POINT',
        durationSeconds: 3.5,
        data: {
          playerName: state.isMatchPointA ? state.teamAName : state.teamBName,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 8. Check Game Point
    if (state.isGamePointA || state.isGamePointB || state.isGamePoint) {
      triggerEventOverlay({
        type: 'GAME_POINT',
        durationSeconds: 3,
        data: {
          playerName: state.isGamePointA ? state.teamAName : state.teamBName,
          gameNumber: state.currentGame || 1,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 9. Specific Shot/Rally Winner Overlays
    const evtType = lastRally.eventType || lastRally.pointType;
    if (evtType === 'ACE' || evtType === 'TABLE_TENNIS_ACE' || evtType === 'SERVICE_ACE') {
      triggerEventOverlay({
        type: 'TABLE_TENNIS_ACE',
        durationSeconds: 3,
        data: {
          serverName: lastRally.serverPlayerName || lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'SMASH_WINNER' || evtType === 'SMASH') {
      triggerEventOverlay({
        type: 'SMASH_WINNER',
        durationSeconds: 3,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
          shotDetail: 'Overhead Power Smash',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'FOREHAND_WINNER' || evtType === 'FOREHAND') {
      triggerEventOverlay({
        type: 'FOREHAND_WINNER',
        durationSeconds: 2.5,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'BACKHAND_WINNER' || evtType === 'BACKHAND') {
      triggerEventOverlay({
        type: 'BACKHAND_WINNER',
        durationSeconds: 2.5,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'LOOP_WINNER' || evtType === 'LOOP' || evtType === 'TOPSPIN_LOOP') {
      triggerEventOverlay({
        type: 'LOOP_WINNER',
        durationSeconds: 2.5,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'CHOP_WINNER' || evtType === 'CHOP' || evtType === 'BACKSPIN_CHOP') {
      triggerEventOverlay({
        type: 'CHOP_WINNER',
        durationSeconds: 2.5,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'NET_POINT' || evtType === 'NET' || evtType === 'NET_WINNER') {
      triggerEventOverlay({
        type: 'NET_POINT',
        durationSeconds: 2.5,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'EDGE_POINT' || evtType === 'EDGE' || evtType === 'EDGE_WINNER') {
      triggerEventOverlay({
        type: 'EDGE_POINT',
        durationSeconds: 2.5,
        data: {
          winnerName: lastRally.winnerPlayerName || (lastRally.winnerSide === 'TEAM_A' ? state.teamAName : state.teamBName),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'SERVICE_FAULT' || evtType === 'SERVICE_ERROR') {
      triggerEventOverlay({
        type: 'SERVICE_FAULT',
        durationSeconds: 2.5,
        data: {
          serverName: lastRally.serverPlayerName || 'Server',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'FORCED_ERROR') {
      triggerEventOverlay({
        type: 'FORCED_ERROR',
        durationSeconds: 2.5,
        data: {
          playerName: lastRally.receiverPlayerName || 'Player',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (evtType === 'UNFORCED_ERROR') {
      triggerEventOverlay({
        type: 'UNFORCED_ERROR',
        durationSeconds: 2.5,
        data: {
          playerName: lastRally.receiverPlayerName || 'Player',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  // Detect automatic Cricket events (FOUR, SIX, WICKET, 50, 100, NO_BALL, WIDE, FREE_HIT, HAT_TRICK, OVER COMPLETE, INNINGS BREAK, MATCH RESULT)
  const processAutomaticCricketEvent = (
    lastBall: any,
    state: CricketMatchScoringState
  ) => {
    if (!config) return;

    // 1. Check Match Result / Conclusion
    if (state.isMatchOver || state.matchResultText) {
      triggerEventOverlay({
        type: 'MATCH_RESULT',
        durationSeconds: config.eventDurations?.matchResult || 7,
        data: {
          resultText: state.matchResultText || `${state.winnerTeamName || 'Team'} won the match`,
          winningTeam: state.winnerTeamName || '',
          potmName: state.manOfTheMatchPlayerName || '',
          sport: 'CRICKET',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 2. Check Innings Break
    if (state.isInningsBreak || state.isInningsComplete) {
      triggerEventOverlay({
        type: 'INNINGS_BREAK',
        durationSeconds: 6,
        data: {
          inningsNumber: state.currentInningsNumber || 1,
          teamName: state.currentInnings?.battingTeamName || 'Batting Team',
          totalScore: `${state.currentInnings?.totalRuns || 0}/${state.currentInnings?.totalWickets || 0}`,
          overs: state.currentInnings?.oversDisplay || '0.0',
          target: state.targetRuns || (state.currentInnings?.totalRuns ? state.currentInnings.totalRuns + 1 : 0),
          rrr: formatRate(state.requiredRunRate, 2, '0.00'),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 3. Check Wicket
    if (lastBall.isWicket && config.enableWicket) {
      const dismissed = state.batsmenStats?.find((b: any) => b.playerId === lastBall.dismissedPlayerId);
      const bowler = state.bowlerStats?.find((b: any) => b.playerId === lastBall.bowlerId);
      triggerEventOverlay({
        type: 'WICKET',
        durationSeconds: config.eventDurations?.wicket || 4.5,
        data: {
          dismissedName: dismissed?.playerName || 'BATSMAN',
          runs: dismissed?.runs || 0,
          balls: dismissed?.ballsFaced || 0,
          wicketType: lastBall.wicketType || 'OUT',
          bowlerName: bowler?.playerName || (bowler as any)?.bowlerName || 'BOWLER',
          assistPlayer: lastBall.assistPlayerName || '',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 4. Check Six
    if (lastBall.isSix && config.enableSix) {
      triggerEventOverlay({
        type: 'SIX',
        durationSeconds: config.eventDurations?.six || 3.5,
        data: {
          strikerName: state.batsmenStats?.find((b: any) => b.playerId === lastBall.strikerId)?.playerName || 'BATSMAN',
          runs: 6,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 5. Check Four
    if (lastBall.isFour && config.enableFour) {
      triggerEventOverlay({
        type: 'FOUR',
        durationSeconds: config.eventDurations?.four || 3,
        data: {
          strikerName: state.batsmenStats?.find((b: any) => b.playerId === lastBall.strikerId)?.playerName || 'BATSMAN',
          runs: 4,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 6. Check Free Hit
    if (lastBall.isFreeHit || lastBall.isNoBall) {
      triggerEventOverlay({
        type: lastBall.isNoBall ? 'NO_BALL' : 'FREE_HIT',
        durationSeconds: 3,
        data: {
          strikerName: state.batsmenStats?.find((b: any) => b.playerId === lastBall.strikerId)?.playerName || 'BATSMAN',
          message: lastBall.isNoBall ? 'NO BALL • FREE HIT AWARDED' : 'FREE HIT DELIVERY',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 7. Check Wide
    if (lastBall.isWide) {
      triggerEventOverlay({
        type: 'WIDE',
        durationSeconds: 2.5,
        data: {
          bowlerName: state.bowlerStats?.find((b: any) => b.playerId === lastBall.bowlerId)?.playerName || (state.bowlerStats?.find((b: any) => b.playerId === lastBall.bowlerId) as any)?.bowlerName || 'Bowler',
          runs: lastBall.extraRuns || 1,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 8. Check striker milestones (50 or 100)
    const strikerStat = state.batsmenStats?.find((b: any) => b.playerId === lastBall.strikerId);
    if (strikerStat) {
      if (strikerStat.runs >= 100 && strikerStat.runs - lastBall.totalRuns < 100 && config.enableCentury) {
        triggerEventOverlay({
          type: 'CENTURY',
          durationSeconds: config.eventDurations?.century || 5.5,
          data: {
            playerName: strikerStat.playerName,
            runs: strikerStat.runs,
            balls: strikerStat.ballsFaced,
            fours: strikerStat.fours,
            sixes: strikerStat.sixes,
            strikeRate: formatRate(strikerStat.strikeRate, 1, '0.0'),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (strikerStat.runs >= 50 && strikerStat.runs < 100 && strikerStat.runs - lastBall.totalRuns < 50 && config.enableFifty) {
        triggerEventOverlay({
          type: 'FIFTY',
          durationSeconds: config.eventDurations?.fifty || 4.5,
          data: {
            playerName: strikerStat.playerName,
            runs: strikerStat.runs,
            balls: strikerStat.ballsFaced,
            fours: strikerStat.fours,
            sixes: strikerStat.sixes,
            strikeRate: formatRate(strikerStat.strikeRate, 1, '0.0'),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // 9. Over completion
    if (state.isOverComplete && config.enableOver) {
      const overNum = lastBall.overNumber + 1;
      const bowlerStat = state.bowlerStats?.find((b: any) => b.playerId === lastBall.bowlerId);
      const totalRunsOver = state.currentOverEvents?.reduce((a, b) => a + b.totalRuns, 0) || 0;
      triggerEventOverlay({
        type: 'OVER_COMPLETE',
        durationSeconds: config.eventDurations?.over || 4,
        data: {
          overNumber: overNum,
          bowlerName: bowlerStat?.playerName || (bowlerStat as any)?.bowlerName || 'BOWLER',
          totalRunsInOver: totalRunsOver,
          bowlerFigures: bowlerStat ? `${bowlerStat.oversDisplay || (bowlerStat as any).overs || '0.0'}-${bowlerStat.maidens ?? 0}-${bowlerStat.runsConceded ?? 0}-${bowlerStat.wickets ?? 0}` : '',
          recentBalls: (state.currentOverEvents || []).map(b => b.isWicket ? 'W' : b.isSix ? '6' : b.isFour ? '4' : b.isNoBall ? 'NB' : b.isWide ? 'WD' : b.totalRuns === 0 ? '•' : String(b.totalRuns)).join(' '),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 10. Check Dot Ball
    if (lastBall.totalRuns === 0 && !lastBall.isWide && !lastBall.isNoBall && !lastBall.isWicket && (config as any).enableDotBall) {
      const strikerStat = state.batsmenStats?.find((b: any) => b.playerId === lastBall.strikerId);
      const bowlerStat = state.bowlerStats?.find((b: any) => b.playerId === lastBall.bowlerId);
      triggerEventOverlay({
        type: 'DOT_BALL',
        durationSeconds: 2.0,
        data: {
          strikerName: strikerStat?.playerName || 'BATSMAN',
          bowlerName: bowlerStat?.playerName || (bowlerStat as any)?.bowlerName || 'BOWLER',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  // Detect automatic Basketball events (2PT, 3PT, FOUL, QUARTER_END, MATCH_RESULT)
  const processAutomaticBasketballEvent = (
    lastEvt: any,
    state: BasketballMatchScoringState
  ) => {
    if (!config) return;

    if (state.isMatchComplete) {
      triggerEventOverlay({
        type: 'MATCH_RESULT',
        durationSeconds: config.eventDurations?.matchResult || 7,
        data: {
          resultText: `${state.winnerTeamName || 'Team'} Wins!`,
          winningTeam: state.winnerTeamName || '',
          scoreText: `${state.teamAScore} - ${state.teamBScore}`,
          sport: 'BASKETBALL',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'POINTS_3' || lastEvt.pointsScored === 3) {
      triggerEventOverlay({
        type: 'BASKETBALL_3PT',
        durationSeconds: 3.5,
        data: {
          playerName: lastEvt.playerName || 'Player',
          teamName: lastEvt.teamName || 'Team',
          points: 3,
          scoreA: state.teamAScore,
          scoreB: state.teamBScore,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'POINTS_2' || lastEvt.pointsScored === 2) {
      triggerEventOverlay({
        type: 'BASKETBALL_2PT',
        durationSeconds: 2.5,
        data: {
          playerName: lastEvt.playerName || 'Player',
          teamName: lastEvt.teamName || 'Team',
          points: 2,
          scoreA: state.teamAScore,
          scoreB: state.teamBScore,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (lastEvt.eventType === 'FOUL') {
      triggerEventOverlay({
        type: 'BASKETBALL_FOUL',
        durationSeconds: 3.0,
        data: {
          playerName: lastEvt.playerName || 'Player',
          teamName: lastEvt.teamName || 'Team',
          foulType: lastEvt.foulType || 'Personal Foul',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  if (!config) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-transparent text-emerald-400 font-mono text-sm">
        <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-lg border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>INITIALIZING BROADCAST ENGINE CANVAS...</span>
        </div>
      </div>
    );
  }

  // Helper styles based on template & shape configuration
  const getShapeClasses = (shape: ContainerShape) => {
    switch (shape) {
      case 'ROUNDED':
        return 'rounded-xl';
      case 'PILL':
        return 'rounded-full';
      case 'CAPSULE':
        return 'rounded-2xl';
      case 'ANGULAR':
        return 'rounded-none transform -skew-x-6';
      case 'GLASS':
        return 'rounded-2xl backdrop-blur-md bg-white/10 border border-white/20';
      case 'RECTANGLE':
      default:
        return 'rounded-none';
    }
  };

  const getFontFamily = (fontStyle: BroadcastFontStyle) => {
    switch (fontStyle) {
      case 'BOLD':
        return 'font-black tracking-tight uppercase';
      case 'CONDENSED':
        return 'font-semibold tracking-tighter uppercase font-sans';
      case 'SPORTS':
        return 'font-extrabold uppercase tracking-wide font-mono';
      case 'PREMIUM':
        return 'font-semibold tracking-widest uppercase';
      case 'MINIMAL':
        return 'font-medium tracking-normal';
      case 'MODERN':
      default:
        return 'font-bold tracking-tight';
    }
  };

  const getPositionClasses = (position: BroadcastPosition) => {
    switch (position) {
      case 'TOP':
        return 'top-6 left-1/2 -translate-x-1/2';
      case 'TOP_LEFT':
        return 'top-6 left-6';
      case 'TOP_RIGHT':
        return 'top-6 right-6';
      case 'BOTTOM_LEFT':
        return 'bottom-6 left-6';
      case 'BOTTOM_RIGHT':
        return 'bottom-6 right-6';
      case 'CENTER':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'CUSTOM':
        return '';
      case 'BOTTOM':
      default:
        return 'bottom-6 left-1/2 -translate-x-1/2';
    }
  };

  // Helper values extracted from calculated state
  const currentInnings = scoringState?.currentInnings;
  const battingTeamName = currentInnings?.battingTeamName || match?.teamA?.shortName || match?.teamA?.name || 'TEAM A';
  const bowlingTeamName = currentInnings?.bowlingTeamName || match?.teamB?.shortName || match?.teamB?.name || 'TEAM B';

  const totalRuns = currentInnings?.totalRuns || 0;
  const wickets = currentInnings?.totalWickets || 0;
  const oversDisplay = currentInnings?.oversDisplay || '0.0';
  const crr = formatRate(scoringState?.currentRunRate ?? scoringState?.runRate, 2, '0.00');

  const strikerStat =
    scoringState?.batsmenStats?.find?.(
      (b: any) => b.playerId === currentInnings?.currentStrikerId
    ) || scoringState?.strikerStat || null;
  const nonStrikerStat =
    scoringState?.batsmenStats?.find?.(
      (b: any) => b.playerId === currentInnings?.currentNonStrikerId
    ) || scoringState?.nonStrikerStat || null;
  const currentBowlerStat =
    scoringState?.bowlerStats?.find?.(
      (b: any) => b.playerId === currentInnings?.currentBowlerId
    ) || scoringState?.bowlerStat || null;

  const styleCfg = config.styleConfig || {
    primaryColor: '#0f172a',
    secondaryColor: '#1e293b',
    accentColor: '#10b981',
    textColor: '#ffffff',
    bgOpacity: 0.9,
    showBorder: true,
    showGlow: true,
    position: 'BOTTOM',
    shape: 'ROUNDED',
    fontStyle: 'MODERN',
    animation: 'SLIDE_UP',
  };
  const visibility = config.elementVisibility || ({} as any);
  const selectedTpl = config.selectedTemplates?.scoreboard || 'MODERN_SPORTS';

  const customStyle: React.CSSProperties = {
    backgroundColor: styleCfg.primaryColor,
    color: styleCfg.textColor,
    opacity: styleCfg.bgOpacity,
    borderColor: styleCfg.showBorder ? styleCfg.accentColor : 'transparent',
    boxShadow: styleCfg.showGlow ? `0 0 20px ${styleCfg.accentColor}40` : 'none',
  };

  // Custom positioning override
  if (styleCfg.position === 'CUSTOM') {
    customStyle.position = 'absolute';
    customStyle.left = `${styleCfg.customX || 50}px`;
    customStyle.top = `${styleCfg.customY || 900}px`;
  }

  return (
    <div
      ref={containerRef}
      id="sports-pulse-broadcast-viewport"
      className={`w-full h-full overflow-hidden bg-transparent select-none flex items-center justify-center pointer-events-none ${
        previewMode ? 'relative' : 'fixed inset-0'
      }`}
      style={{ background: 'transparent' }}
    >
      <div
        id="sports-pulse-1920x1080-stage"
        style={{
          width: '1920px',
          height: '1080px',
          minWidth: '1920px',
          minHeight: '1080px',
          maxWidth: '1920px',
          maxHeight: '1080px',
          transform: `scale(${stageScale})`,
          transformOrigin: 'center center',
          position: 'relative',
          background: 'transparent',
          overflow: 'hidden',
        }}
      >
      {/* 1. SPONSOR OVERLAY (If Enabled & Visible) */}
      <AnimatePresence>
        {config.sponsorVisible && config.sponsorConfig?.name && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-6 right-6 z-30 flex items-center gap-3 px-4 py-2 bg-slate-900/90 text-white border border-emerald-500/40 shadow-xl ${getShapeClasses(
              styleCfg.shape
            )}`}
          >
            {config.sponsorConfig.logoUrl ? (
              <img
                src={config.sponsorConfig.logoUrl}
                alt="Sponsor"
                className="h-6 w-auto object-contain"
              />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-400" />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                OFFICIAL SPONSOR
              </span>
              <span className="text-xs font-bold">{config.sponsorConfig.name}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. PLAYER LOWER THIRD (If Manually Triggered) */}
      <AnimatePresence>
        {(config.playerLowerThirdVisible || config.activeManualOverlay === 'PLAYER_LOWER_THIRD') && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="absolute bottom-28 left-8 z-40 flex items-center bg-slate-900/95 text-white border-l-4 border-emerald-500 shadow-2xl rounded-r-xl overflow-hidden"
          >
            <div className="bg-emerald-600 px-4 py-3 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div className="px-5 py-3">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                ON STRIKE BATSMAN
              </div>
              <div className="text-lg font-black tracking-tight">
                {strikerStat?.playerName || 'CURRENT BATSMAN'}
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-3 mt-0.5">
                <span>
                  SCORE: <strong className="text-white">{strikerStat?.runs || 0}</strong> ({strikerStat?.ballsFaced || 0}b)
                </span>
                <span>
                  4s: <strong className="text-emerald-400">{strikerStat?.fours || 0}</strong> | 6s:{' '}
                  <strong className="text-emerald-400">{strikerStat?.sixes || 0}</strong>
                </span>
                <span>
                  S/R: <strong className="text-white">{formatRate(strikerStat?.strikeRate, 1, '0.0')}</strong>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. EVENT POPUP OVERLAY QUEUE (FOUR, SIX, WICKET, FIFTY, CENTURY, OVER COMPLETE, MATCH RESULT) */}
      <AnimatePresence mode="wait">
        {activeEvent && (
          <motion.div
            key={activeEvent.type + activeEvent.timestamp}
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {/* GOAL OVERLAY (Football / Hockey) */}
            {activeEvent.type === 'GOAL' && (
              <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 text-white px-14 py-8 rounded-3xl border-4 border-emerald-300 shadow-[0_0_60px_rgba(16,185,129,0.8)] flex items-center gap-8 animate-bounce">
                <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-5xl">
                  {activeEvent.data?.sport === 'FOOTBALL' ? '⚽' : '🏑'}
                </div>
                <div>
                  <div className="text-6xl font-black italic tracking-tighter text-emerald-100">
                    GOAL!
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {activeEvent.data?.scorerName || activeEvent.data?.playerName} {activeEvent.data?.assistName ? `(Ast: ${activeEvent.data.assistName})` : ''}
                  </div>
                  <div className="text-sm font-bold text-emerald-200 uppercase tracking-widest mt-1">
                    {activeEvent.data?.teamName} • {activeEvent.data?.goalType?.replace('_', ' ')} • {activeEvent.data?.matchTimeDisplay || activeEvent.data?.periodName}
                  </div>
                </div>
              </div>
            )}

            {/* FOOTBALL SUBSTITUTION OVERLAY */}
            {activeEvent.type === 'SUBSTITUTION' && (
              <div className="bg-slate-950/95 text-white px-10 py-6 rounded-2xl border-2 border-emerald-500 shadow-2xl flex items-center gap-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-2xl font-black uppercase text-emerald-400">🔄 SUB</div>
                  <span className="text-[10px] font-bold text-slate-400">{activeEvent.data?.matchTimeDisplay || ''}</span>
                </div>
                <div className="h-12 w-px bg-slate-800" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-xs font-black">IN ▲</span>
                    <span className="text-lg font-black text-emerald-300">{activeEvent.data?.playerInName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-xs font-black">OUT ▼</span>
                    <span className="text-sm font-bold text-rose-300 line-through opacity-80">{activeEvent.data?.playerOutName}</span>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">{activeEvent.data?.teamName}</div>
                </div>
              </div>
            )}

            {/* FOOTBALL PENALTY KICK OVERLAY */}
            {activeEvent.type === 'PENALTY_KICK' && (
              <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white px-12 py-6 rounded-2xl border-4 border-rose-300 shadow-[0_0_50px_rgba(244,63,94,0.8)] flex items-center gap-6">
                <Zap className="w-16 h-16 text-rose-200" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-rose-100">PENALTY KICK</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {activeEvent.data?.teamName} • Taker: {activeEvent.data?.playerName || 'Shooter'}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-200 mt-1">
                    STATUS: {activeEvent.data?.outcome} • {activeEvent.data?.matchTimeDisplay || ''}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'PENALTY_CORNER' && (
              <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-slate-950 px-12 py-6 rounded-2xl border-4 border-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.8)] flex items-center gap-6">
                <Target className="w-16 h-16 text-slate-950" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight">PENALTY CORNER (PC)</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {activeEvent.data?.teamName}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'PENALTY_STROKE' && (
              <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white px-12 py-6 rounded-2xl border-4 border-rose-300 shadow-[0_0_50px_rgba(244,63,94,0.8)] flex items-center gap-6">
                <Zap className="w-16 h-16 text-rose-200" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-rose-100">PENALTY STROKE</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {activeEvent.data?.teamName} • Taker: {activeEvent.data?.playerName || 'Shooter'}
                  </div>
                </div>
              </div>
            )}

            {(activeEvent.type === 'GREEN_CARD' || activeEvent.type === 'YELLOW_CARD' || activeEvent.type === 'RED_CARD') && (
              <div
                className={`px-12 py-6 rounded-2xl border-4 shadow-2xl flex items-center gap-6 ${
                  activeEvent.type === 'GREEN_CARD'
                    ? 'bg-gradient-to-r from-emerald-800 to-teal-900 border-emerald-400 text-white'
                    : activeEvent.type === 'YELLOW_CARD'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 border-amber-200 text-slate-950'
                    : 'bg-gradient-to-r from-red-800 to-rose-950 border-red-400 text-white'
                }`}
              >
                <div
                  className={`w-12 h-16 rounded-md shadow-lg border-2 border-white flex items-center justify-center font-black ${
                    activeEvent.type === 'GREEN_CARD'
                      ? 'bg-emerald-500 text-white'
                      : activeEvent.type === 'YELLOW_CARD'
                      ? 'bg-yellow-400 text-slate-950'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {activeEvent.type === 'GREEN_CARD' ? 'G' : activeEvent.type === 'YELLOW_CARD' ? 'Y' : 'R'}
                </div>
                <div>
                  <div className="text-3xl font-black uppercase tracking-tight">
                    {activeEvent.type.replace('_', ' ')} ({activeEvent.data?.durationMinutes || (activeEvent.type === 'GREEN_CARD' ? 2 : activeEvent.type === 'YELLOW_CARD' ? 5 : 0)}m Suspension)
                  </div>
                  <div className="text-xl font-bold mt-0.5">
                    {activeEvent.data?.playerName} ({activeEvent.data?.teamName})
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'SHOOTOUT_ATTEMPT' && (
              <div className="bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-900 text-white px-12 py-6 rounded-2xl border-4 border-purple-300 shadow-[0_0_50px_rgba(168,85,247,0.8)] flex items-center gap-6">
                <Trophy className="w-16 h-16 text-purple-200" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-purple-100">
                    SHOOTOUT ATTEMPT (R{activeEvent.data?.round || 1})
                  </div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {activeEvent.data?.playerName} ({activeEvent.data?.teamName}) • Outcome: {activeEvent.data?.outcome}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'TENNIS_ACE' && (
              <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 text-slate-950 px-14 py-8 rounded-3xl border-4 border-emerald-200 shadow-[0_0_60px_rgba(16,185,129,0.9)] flex items-center gap-8 animate-pulse">
                <Zap className="w-20 h-20 text-white animate-bounce" />
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight text-white">ACE!</div>
                  <div className="text-2xl font-extrabold text-emerald-950 mt-1">
                    {activeEvent.data?.serverName || scoringState?.teamAName || 'Server'} {activeEvent.data?.speedMph ? `• ${activeEvent.data.speedMph} MPH` : ''}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'TENNIS_DOUBLE_FAULT' && (
              <div className="bg-gradient-to-r from-red-900 via-rose-800 to-red-950 text-white px-12 py-7 rounded-3xl border-4 border-rose-400 shadow-[0_0_50px_rgba(244,63,94,0.8)] flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/30 flex items-center justify-center font-black text-3xl text-rose-300">
                  2×
                </div>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-rose-200">DOUBLE FAULT</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {activeEvent.data?.serverName || (scoringState?.servingTeam === 'TEAM_A' ? scoringState?.teamAName : scoringState?.teamBName) || 'Server'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'TENNIS_WINNER' && (
              <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-700 text-white px-12 py-7 rounded-3xl border-4 border-cyan-300 shadow-[0_0_50px_rgba(6,182,212,0.8)] flex items-center gap-6">
                <Sparkles className="w-16 h-16 text-cyan-200 animate-bounce" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-cyan-100">CLEAN WINNER!</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {activeEvent.data?.winnerName || scoringState?.teamAName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'BREAK_POINT' && (
              <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-slate-950 px-12 py-6 rounded-2xl border-4 border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.9)] flex items-center gap-6 animate-pulse">
                <Zap className="w-16 h-16 text-slate-950" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight">BREAK POINT</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {activeEvent.data?.receiverName || 'Opportunity to break serve'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'BREAK_POINT_CONVERTED' && (
              <div className="bg-gradient-to-r from-rose-700 via-pink-600 to-rose-800 text-white px-14 py-8 rounded-3xl border-4 border-rose-300 shadow-[0_0_60px_rgba(244,63,94,0.9)] flex items-center gap-8">
                <Flame className="w-20 h-20 text-rose-200 animate-pulse" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight">BREAK POINT CONVERTED!</div>
                  <div className="text-2xl font-bold text-rose-100 mt-1">
                    {activeEvent.data?.winnerTeamName || scoringState?.teamAName} breaks serve in Game {activeEvent.data?.gameNumber || scoringState?.currentGameA || 1}!
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'DEUCE' && (
              <div className="bg-slate-950/95 text-white px-12 py-6 rounded-2xl border-2 border-amber-400 shadow-2xl flex items-center gap-6">
                <div className="text-5xl font-black text-amber-400 font-mono">40-40</div>
                <div className="h-10 w-px bg-slate-800" />
                <div>
                  <div className="text-3xl font-black uppercase tracking-tight text-white">DEUCE</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next point: Advantage</div>
                </div>
              </div>
            )}

            {activeEvent.type === 'ADVANTAGE' && (
              <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 text-white px-12 py-6 rounded-2xl border-2 border-emerald-400 shadow-2xl flex items-center gap-6">
                <div className="text-5xl font-black text-emerald-400 font-mono">AD</div>
                <div className="h-10 w-px bg-slate-800" />
                <div>
                  <div className="text-3xl font-black uppercase tracking-tight text-emerald-300">ADVANTAGE</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {activeEvent.data?.playerName || (scoringState?.servingTeam === 'TEAM_A' ? scoringState?.teamAName : scoringState?.teamBName) || 'Server'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'TIE_BREAK' && (
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 text-white px-14 py-8 rounded-3xl border-4 border-purple-400 shadow-[0_0_50px_rgba(168,85,247,0.8)] flex items-center gap-8">
                <div className="w-18 h-18 rounded-2xl bg-purple-500/30 border border-purple-400 flex items-center justify-center text-4xl font-black text-purple-300">
                  TB
                </div>
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-purple-200">TIE-BREAK</div>
                  <div className="text-xl font-bold text-slate-200 mt-1">
                    First to 7 Points (Must win by 2)
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'SET_POINT' && (
              <div className="bg-gradient-to-r from-orange-700 via-amber-600 to-orange-800 text-white px-12 py-6 rounded-2xl border-4 border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.9)] flex items-center gap-6 animate-pulse">
                <Zap className="w-16 h-16 text-amber-200" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-amber-100">SET POINT</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {activeEvent.data?.playerName || scoringState?.teamAName || 'Opportunity to win set'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'MATCH_POINT' && (
              <div className="bg-gradient-to-r from-rose-800 via-red-600 to-rose-900 text-white px-14 py-8 rounded-3xl border-4 border-rose-300 shadow-[0_0_60px_rgba(244,63,94,0.95)] flex items-center gap-8 animate-pulse">
                <Flame className="w-20 h-20 text-rose-200 animate-bounce" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-rose-100">MATCH POINT</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    Championship Point for {activeEvent.data?.playerName || scoringState?.teamAName || 'Leader'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'MATCH_WON' && (
              <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-slate-950 px-16 py-10 rounded-3xl border-4 border-amber-200 shadow-[0_0_80px_rgba(245,158,11,1)] flex items-center gap-8 animate-bounce">
                <Trophy className="w-24 h-24 text-slate-950" />
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight">MATCH WON!</div>
                  <div className="text-3xl font-black text-slate-950 mt-1">
                    Winner: {activeEvent.data?.winnerName || scoringState?.teamAName || 'Champion'}
                  </div>
                  <div className="text-base font-bold text-slate-900 uppercase mt-1">
                    {activeEvent.data?.scoreDisplay || 'Official Match Concluded'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'TENNIS_SET_SUMMARY' && (
              <div className="bg-slate-950/95 text-white px-12 py-8 rounded-3xl border-4 border-amber-400 shadow-2xl flex items-center gap-8">
                <Trophy className="w-18 h-18 text-amber-400" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-amber-400">
                    SET {activeEvent.data?.setNumber} COMPLETED
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    Won by {activeEvent.data?.winnerTeamName}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'TENNIS_MATCH_STATS' && (
              <div className="bg-slate-950/95 text-white px-10 py-6 rounded-3xl border-2 border-emerald-500 shadow-2xl min-w-[500px]">
                <div className="text-xs uppercase font-bold tracking-wider text-emerald-400 text-center mb-3">
                  🎾 Official Match Statistics
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800 font-bold">
                    <span className="text-emerald-400">{scoringState?.teamAName || 'Player A'}</span>
                    <span className="text-slate-400 uppercase">Match Stat</span>
                    <span className="text-cyan-400">{scoringState?.teamBName || 'Player B'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="font-mono text-emerald-400 font-bold">{scoringState?.teamAStats?.aces || 0}</span>
                    <span className="text-slate-400">Aces</span>
                    <span className="font-mono text-cyan-400 font-bold">{scoringState?.teamBStats?.aces || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="font-mono text-emerald-400 font-bold">{scoringState?.teamAStats?.doubleFaults || 0}</span>
                    <span className="text-slate-400">Double Faults</span>
                    <span className="font-mono text-cyan-400 font-bold">{scoringState?.teamBStats?.doubleFaults || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="font-mono text-emerald-400 font-bold">{scoringState?.teamAStats?.firstServePct || 0}%</span>
                    <span className="text-slate-400">1st Serve %</span>
                    <span className="font-mono text-cyan-400 font-bold">{scoringState?.teamBStats?.firstServePct || 0}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="font-mono text-emerald-400 font-bold">{scoringState?.teamAStats?.breakPointsWon || 0}/{scoringState?.teamAStats?.breakPointsTotal || 0}</span>
                    <span className="text-slate-400">Break Points Converted</span>
                    <span className="font-mono text-cyan-400 font-bold">{scoringState?.teamBStats?.breakPointsWon || 0}/{scoringState?.teamBStats?.breakPointsTotal || 0}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-mono text-emerald-400 font-bold">{scoringState?.teamAStats?.totalPointsWon || 0}</span>
                    <span className="text-slate-400">Total Points Won</span>
                    <span className="font-mono text-cyan-400 font-bold">{scoringState?.teamBStats?.totalPointsWon || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON ACE */}
            {activeEvent.type === 'BADMINTON_ACE' && (
              <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 text-slate-950 px-14 py-8 rounded-3xl border-4 border-emerald-200 shadow-[0_0_60px_rgba(16,185,129,0.9)] flex items-center gap-8 animate-pulse">
                <span className="text-6xl animate-bounce">🏸</span>
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight text-white drop-shadow">SERVICE ACE!</div>
                  <div className="text-2xl font-extrabold text-emerald-950 mt-1">
                    {activeEvent.data?.serverName || scoringState?.teamAName || 'Server'}
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON SMASH WINNER */}
            {activeEvent.type === 'SMASH_WINNER' && (
              <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white px-14 py-8 rounded-3xl border-4 border-rose-300 shadow-[0_0_60px_rgba(244,63,94,0.95)] flex items-center gap-8 animate-pulse">
                <span className="text-6xl animate-bounce">💥</span>
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight text-rose-100">SMASH WINNER!</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {activeEvent.data?.winnerName || scoringState?.teamAName || 'Player'}
                    {activeEvent.data?.shotDetail ? ` • ${activeEvent.data.shotDetail}` : ''}
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON DROP SHOT */}
            {activeEvent.type === 'DROP_SHOT_WINNER' && (
              <div className="bg-gradient-to-r from-sky-600 via-cyan-500 to-sky-700 text-slate-950 px-14 py-8 rounded-3xl border-4 border-sky-200 shadow-[0_0_60px_rgba(14,165,233,0.9)] flex items-center gap-8">
                <span className="text-6xl animate-bounce">🪶</span>
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-slate-950">DECEPTIVE DROP SHOT!</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {activeEvent.data?.winnerName || scoringState?.teamAName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON NET KILL */}
            {activeEvent.type === 'NET_KILL' && (
              <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-slate-950 px-14 py-8 rounded-3xl border-4 border-amber-300 shadow-[0_0_60px_rgba(245,158,11,0.95)] flex items-center gap-8 animate-pulse">
                <Zap className="w-20 h-20 text-slate-950 animate-bounce" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-slate-950">LIGHTNING NET KILL!</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {activeEvent.data?.winnerName || scoringState?.teamAName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON CLEAR WINNER */}
            {activeEvent.type === 'CLEAR_WINNER' && (
              <div className="bg-gradient-to-r from-indigo-700 via-purple-600 to-indigo-800 text-white px-12 py-7 rounded-3xl border-4 border-indigo-300 shadow-[0_0_50px_rgba(99,102,241,0.85)] flex items-center gap-6">
                <span className="text-5xl">🏸</span>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-indigo-100">BASELINE CLEAR WINNER</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {activeEvent.data?.winnerName || scoringState?.teamAName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON DRIVE WINNER */}
            {activeEvent.type === 'DRIVE_WINNER' && (
              <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 text-white px-12 py-7 rounded-3xl border-4 border-teal-300 shadow-[0_0_50px_rgba(20,184,166,0.85)] flex items-center gap-6">
                <Sparkles className="w-16 h-16 text-teal-200 animate-bounce" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-teal-100">FAST FLAT DRIVE WINNER</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {activeEvent.data?.winnerName || scoringState?.teamAName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON SERVICE FAULT */}
            {activeEvent.type === 'SERVICE_FAULT' && (
              <div className="bg-gradient-to-r from-red-950 via-rose-900 to-red-950 text-white px-12 py-7 rounded-3xl border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.8)] flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-red-600/40 flex items-center justify-center font-black text-3xl text-red-300">
                  ❌
                </div>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-red-200">SERVICE FAULT</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    Fault by {activeEvent.data?.serverName || 'Server'}
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON UNFORCED ERROR */}
            {activeEvent.type === 'UNFORCED_ERROR' && (
              <div className="bg-slate-950/95 text-white px-12 py-6 rounded-2xl border-2 border-amber-500 shadow-2xl flex items-center gap-6">
                <div className="text-4xl">⚠️</div>
                <div>
                  <div className="text-3xl font-black uppercase tracking-tight text-amber-300">UNFORCED ERROR</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">
                    {activeEvent.data?.playerName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON 11-POINT INTERVAL */}
            {activeEvent.type === 'INTERVAL' && (
              <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-slate-950 px-14 py-8 rounded-3xl border-4 border-amber-200 shadow-[0_0_60px_rgba(245,158,11,0.9)] flex items-center gap-8 animate-pulse">
                <span className="text-6xl animate-bounce">⏱️</span>
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-slate-950">
                    11-POINT INTERVAL (GAME {activeEvent.data?.gameNumber || 1})
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    Leader: {activeEvent.data?.leaderName} ({activeEvent.data?.scoreA ?? 11} - {activeEvent.data?.scoreB ?? 0})
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-950/80 mt-1">
                    60-SECOND OFFICIAL ON-COURT COACHING INTERVAL
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON 20-20 DEUCE */}
            {activeEvent.type === 'DEUCE_20_20' && (
              <div className="bg-gradient-to-r from-orange-700 via-amber-600 to-orange-800 text-white px-14 py-8 rounded-3xl border-4 border-orange-300 shadow-[0_0_60px_rgba(249,115,22,0.95)] flex items-center gap-8 animate-pulse">
                <Flame className="w-20 h-20 text-orange-200 animate-bounce" />
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight text-orange-100">20-20 DEUCE!</div>
                  <div className="text-xl font-bold text-white mt-1">
                    TWO CLEAR POINTS REQUIRED TO WIN (MAX 30 POINTS)
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON 29-29 GOLDEN POINT */}
            {activeEvent.type === 'GOLDEN_POINT' && (
              <div className="bg-gradient-to-r from-purple-900 via-fuchsia-800 to-purple-950 text-white px-16 py-9 rounded-3xl border-4 border-fuchsia-300 shadow-[0_0_80px_rgba(217,70,239,0.95)] flex items-center gap-8 animate-pulse">
                <span className="text-7xl animate-bounce">👑</span>
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight text-fuchsia-100">29-29 GOLDEN POINT!</div>
                  <div className="text-2xl font-black text-yellow-300 mt-1">
                    SUDDEN DEATH • NEXT RALLY WINS THE GAME!
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON GAME POINT */}
            {activeEvent.type === 'GAME_POINT' && (
              <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-slate-950 px-12 py-6 rounded-2xl border-4 border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.9)] flex items-center gap-6 animate-pulse">
                <Zap className="w-16 h-16 text-slate-950 animate-bounce" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight">GAME POINT</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {activeEvent.data?.playerName} (Game {activeEvent.data?.gameNumber || 1})
                  </div>
                </div>
              </div>
            )}

            {/* BADMINTON GAME WON */}
            {activeEvent.type === 'GAME_WON' && (
              <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white px-14 py-8 rounded-3xl border-4 border-emerald-300 shadow-[0_0_60px_rgba(16,185,129,0.9)] flex items-center gap-8">
                <Trophy className="w-20 h-20 text-emerald-200 animate-bounce" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-emerald-100">
                    GAME {activeEvent.data?.gameNumber || 1} WON!
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    Won by {activeEvent.data?.winnerName} ({activeEvent.data?.scoreA ?? 21} - {activeEvent.data?.scoreB ?? 19})
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'PLAYER_OF_MATCH' && (
              <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-slate-950 px-14 py-8 rounded-3xl border-4 border-amber-200 shadow-[0_0_60px_rgba(245,158,11,0.9)] flex items-center gap-8">
                <Trophy className="w-20 h-20 text-slate-950 animate-bounce" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight">PLAYER OF THE MATCH</div>
                  <div className="text-2xl font-black text-slate-950 mt-1">
                    {activeEvent.data?.playerName || activeEvent.data?.name}
                  </div>
                  <div className="text-sm font-bold text-slate-900 uppercase mt-0.5">
                    {activeEvent.data?.teamName} • {activeEvent.data?.details}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS SERVICE ACE */}
            {activeEvent.type === 'TABLE_TENNIS_ACE' && (
              <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-700 text-slate-950 px-14 py-8 rounded-3xl border-4 border-orange-200 shadow-[0_0_60px_rgba(249,115,22,0.9)] flex items-center gap-8 animate-pulse">
                <span className="text-6xl animate-bounce">🏓</span>
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight text-white drop-shadow">SERVICE ACE!</div>
                  <div className="text-2xl font-extrabold text-slate-950 mt-1">
                    {activeEvent.data?.serverName || 'Server'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS FOREHAND WINNER */}
            {activeEvent.type === 'FOREHAND_WINNER' && (
              <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 text-white px-12 py-7 rounded-3xl border-4 border-emerald-300 shadow-[0_0_50px_rgba(16,185,129,0.8)] flex items-center gap-6">
                <Zap className="w-16 h-16 text-emerald-200 animate-bounce" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-emerald-100">FOREHAND WINNER!</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {activeEvent.data?.winnerName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS BACKHAND WINNER */}
            {activeEvent.type === 'BACKHAND_WINNER' && (
              <div className="bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-700 text-white px-12 py-7 rounded-3xl border-4 border-cyan-300 shadow-[0_0_50px_rgba(6,182,212,0.8)] flex items-center gap-6">
                <Sparkles className="w-16 h-16 text-cyan-200 animate-bounce" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-cyan-100">BACKHAND WINNER!</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {activeEvent.data?.winnerName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS LOOP WINNER */}
            {activeEvent.type === 'LOOP_WINNER' && (
              <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-700 text-white px-12 py-7 rounded-3xl border-4 border-pink-300 shadow-[0_0_50px_rgba(236,72,153,0.8)] flex items-center gap-6">
                <span className="text-6xl">🌪️</span>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-pink-100">TOP-SPIN LOOP WINNER!</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {activeEvent.data?.winnerName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS CHOP WINNER */}
            {activeEvent.type === 'CHOP_WINNER' && (
              <div className="bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-950 text-white px-12 py-7 rounded-3xl border-4 border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.8)] flex items-center gap-6">
                <Shield className="w-16 h-16 text-blue-300 animate-pulse" />
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-blue-200">BACKSPIN CHOP WINNER!</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {activeEvent.data?.winnerName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS NET POINT */}
            {activeEvent.type === 'NET_POINT' && (
              <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-700 text-white px-12 py-7 rounded-3xl border-4 border-teal-300 shadow-[0_0_50px_rgba(20,184,166,0.8)] flex items-center gap-6">
                <span className="text-5xl animate-bounce">🕸️</span>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-teal-100">NET POINT • LUCKY ROLLER!</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {activeEvent.data?.winnerName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS EDGE POINT */}
            {activeEvent.type === 'EDGE_POINT' && (
              <div className="bg-gradient-to-r from-amber-700 via-orange-600 to-yellow-600 text-slate-950 px-12 py-7 rounded-3xl border-4 border-yellow-200 shadow-[0_0_50px_rgba(245,158,11,0.8)] flex items-center gap-6">
                <span className="text-5xl animate-bounce">📐</span>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-slate-950">EDGE BALL • TABLE CORNER NIP!</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {activeEvent.data?.winnerName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS SERVICE FAULT */}
            {activeEvent.type === 'SERVICE_FAULT' && (
              <div className="bg-gradient-to-r from-red-900 via-rose-800 to-red-950 text-white px-12 py-6 rounded-2xl border-2 border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.8)] flex items-center gap-6">
                <div className="text-4xl">❌</div>
                <div>
                  <div className="text-3xl font-black uppercase tracking-tight text-rose-200">SERVICE FAULT</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">
                    {activeEvent.data?.serverName || 'Server'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS FORCED ERROR */}
            {activeEvent.type === 'FORCED_ERROR' && (
              <div className="bg-slate-950/95 text-white px-12 py-6 rounded-2xl border-2 border-blue-500 shadow-2xl flex items-center gap-6">
                <div className="text-4xl">🛡️</div>
                <div>
                  <div className="text-3xl font-black uppercase tracking-tight text-blue-300">FORCED ERROR</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">
                    {activeEvent.data?.playerName || 'Player'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS 10-10 DEUCE */}
            {activeEvent.type === 'TT_DEUCE' && (
              <div className="bg-gradient-to-r from-orange-700 via-amber-600 to-orange-800 text-white px-14 py-8 rounded-3xl border-4 border-orange-300 shadow-[0_0_60px_rgba(249,115,22,0.95)] flex items-center gap-8 animate-pulse">
                <Flame className="w-20 h-20 text-orange-200 animate-bounce" />
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight text-orange-100">10-10 DEUCE!</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {activeEvent.data?.message || '1-SERVE ROTATION • WIN BY 2 POINTS'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS DECIDING GAME */}
            {activeEvent.type === 'DECIDING_GAME' && (
              <div className="bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-950 text-white px-16 py-9 rounded-3xl border-4 border-purple-300 shadow-[0_0_80px_rgba(168,85,247,0.95)] flex items-center gap-8 animate-pulse">
                <Trophy className="w-20 h-20 text-yellow-300 animate-bounce" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-purple-100">DECIDING FINAL GAME!</div>
                  <div className="text-2xl font-black text-yellow-300 mt-1">
                    {activeEvent.data?.message || 'CHAMPIONSHIP DECIDER'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS END CHANGE */}
            {activeEvent.type === 'END_CHANGE' && (
              <div className="bg-slate-950/95 text-white px-12 py-7 rounded-3xl border-4 border-cyan-400 shadow-2xl flex items-center gap-6 animate-pulse">
                <span className="text-6xl">🔄</span>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-cyan-300">CHANGE OF ENDS</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    Players Switch Sides of Table
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS / VOLLEYBALL TIMEOUT */}
            {activeEvent.type === 'TIMEOUT' && (
              <div className="bg-gradient-to-r from-red-800 via-rose-700 to-red-900 text-white px-12 py-7 rounded-3xl border-4 border-rose-300 shadow-[0_0_50px_rgba(244,63,94,0.8)] flex items-center gap-6 animate-pulse">
                <span className="text-6xl">⏱️</span>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-rose-100">TACTICAL TIMEOUT ({activeEvent.data?.durationSeconds || 60}s)</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    Called by {activeEvent.data?.teamName || 'Team'}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE TENNIS / BADMINTON / TENNIS MATCH POINT */}
            {activeEvent.type === 'MATCH_POINT' && (
              <div className="bg-gradient-to-r from-red-900 via-rose-800 to-red-950 text-white px-14 py-8 rounded-3xl border-4 border-rose-400 shadow-[0_0_60px_rgba(244,63,94,0.95)] flex items-center gap-8 animate-pulse">
                <Flame className="w-20 h-20 text-rose-300 animate-bounce" />
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight text-rose-100">MATCH POINT!</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {activeEvent.data?.playerName || 'Match Leader'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'FOUR' && (
              <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 text-white px-12 py-6 rounded-2xl border-2 border-cyan-400 shadow-[0_0_50px_rgba(56,189,248,0.6)] flex items-center gap-6 transform -skew-x-6">
                <Zap className="w-16 h-16 text-cyan-300 animate-bounce" />
                <div>
                  <div className="text-6xl font-black italic tracking-tighter text-cyan-200">
                    4 RUNS!
                  </div>
                  <div className="text-sm font-bold text-cyan-100 uppercase tracking-widest mt-1">
                    FANTASTIC BOUNDARY FOUR • {activeEvent.data?.strikerName || battingTeamName}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'SIX' && (
              <div className="bg-gradient-to-r from-purple-800 via-emerald-600 to-purple-800 text-white px-14 py-8 rounded-3xl border-4 border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.8)] flex items-center gap-8 animate-pulse">
                <Flame className="w-20 h-20 text-emerald-300" />
                <div>
                  <div className="text-7xl font-black italic tracking-tighter text-emerald-100">
                    MAXIMUM 6!
                  </div>
                  <div className="text-base font-extrabold text-emerald-200 uppercase tracking-widest mt-1">
                    HUGE SIX OUT OF THE PARK • {activeEvent.data?.strikerName || battingTeamName}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'WICKET' && (
              <div className="bg-gradient-to-r from-red-900 via-rose-800 to-red-950 text-white px-14 py-8 rounded-2xl border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.7)] flex items-center gap-8">
                <ShieldAlert className="w-20 h-20 text-red-400" />
                <div>
                  <div className="text-6xl font-black tracking-tight text-red-100">
                    WICKET!
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {activeEvent.data?.dismissedName} ({activeEvent.data?.runs || 0} runs)
                  </div>
                  <div className="text-xs font-bold text-red-300 uppercase tracking-wider mt-1">
                    DISMISSAL: {activeEvent.data?.wicketType} • B: {activeEvent.data?.bowlerName}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'FIFTY' && (
              <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-slate-950 px-12 py-6 rounded-2xl border-4 border-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.8)] flex items-center gap-6">
                <Award className="w-16 h-16 text-slate-950" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight">HALF CENTURY 50!</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {activeEvent.data?.playerName} • {activeEvent.data?.runs} ({activeEvent.data?.balls} BALLS)
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'CENTURY' && (
              <div className="bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-600 text-slate-950 px-16 py-8 rounded-3xl border-4 border-white shadow-[0_0_60px_rgba(252,211,77,0.9)] flex items-center gap-8">
                <Trophy className="w-20 h-20 text-slate-950 animate-bounce" />
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight">MAGNIFICENT 100!</div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {activeEvent.data?.playerName} • CENTURY ({activeEvent.data?.runs} RUNS IN {activeEvent.data?.balls}b)
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'OVER_COMPLETE' && (
              <div className="bg-slate-900/95 text-white px-10 py-5 rounded-2xl border-2 border-emerald-500 shadow-2xl flex items-center gap-6">
                <Target className="w-12 h-12 text-emerald-400" />
                <div>
                  <div className="text-3xl font-black uppercase tracking-tight text-emerald-400">
                    END OF OVER {activeEvent.data?.overNumber}
                  </div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">
                    {activeEvent.data?.totalRunsInOver} Runs scored • Bowler: {activeEvent.data?.bowlerName} {activeEvent.data?.bowlerFigures ? `(${activeEvent.data.bowlerFigures})` : ''}
                  </div>
                  {activeEvent.data?.recentBalls && (
                    <div className="text-xs font-mono text-emerald-300 font-bold mt-1 tracking-wider">
                      Ovr: {activeEvent.data.recentBalls}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(activeEvent.type === 'NO_BALL' || activeEvent.type === 'FREE_HIT') && (
              <div className="bg-gradient-to-r from-red-800 via-amber-600 to-red-800 text-white px-12 py-6 rounded-2xl border-4 border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.85)] flex items-center gap-6 animate-pulse">
                <Zap className="w-16 h-16 text-amber-200 animate-bounce" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-amber-100">
                    {activeEvent.type === 'NO_BALL' ? 'NO BALL!' : 'FREE HIT!'}
                  </div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {activeEvent.data?.message || 'FREE HIT AWARDED • NO DISMISSAL EXCEPT RUN OUT'}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'WIDE' && (
              <div className="bg-gradient-to-r from-cyan-800 via-sky-700 to-cyan-900 text-white px-10 py-5 rounded-2xl border-2 border-cyan-300 shadow-2xl flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/30 flex items-center justify-center font-black text-2xl text-cyan-200">
                  WD
                </div>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-cyan-100">WIDE BALL</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">
                    +{activeEvent.data?.runs || 1} Extra Run • Bowler: {activeEvent.data?.bowlerName}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'INNINGS_BREAK' && (
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-14 py-8 rounded-3xl border-4 border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.7)] flex items-center gap-8">
                <Trophy className="w-20 h-20 text-emerald-400" />
                <div>
                  <div className="text-5xl font-black uppercase tracking-tight text-emerald-300">
                    INNINGS {activeEvent.data?.inningsNumber || 1} CONCLUDED
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {activeEvent.data?.teamName}: {activeEvent.data?.totalScore} ({activeEvent.data?.overs} Ov)
                  </div>
                  {activeEvent.data?.target && (
                    <div className="text-sm font-bold text-emerald-200 uppercase tracking-widest mt-1">
                      TARGET: {activeEvent.data.target} RUNS • REQUIRED RUN RATE: {activeEvent.data.rrr}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeEvent.type === 'MATCH_RESULT' && (
              <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-slate-950 px-16 py-10 rounded-3xl border-4 border-white shadow-[0_0_80px_rgba(245,158,11,1)] flex items-center gap-8 animate-bounce">
                <Trophy className="w-24 h-24 text-slate-950" />
                <div>
                  <div className="text-6xl font-black uppercase tracking-tight">MATCH CONCLUDED</div>
                  <div className="text-3xl font-black text-slate-950 mt-1">
                    {activeEvent.data?.resultText || `${activeEvent.data?.winningTeam || 'Team'} Wins!`}
                  </div>
                  {activeEvent.data?.potmName && (
                    <div className="text-base font-extrabold text-slate-900 uppercase mt-1">
                      PLAYER OF THE MATCH: {activeEvent.data.potmName}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeEvent.type === 'DOT_BALL' && (
              <div className="bg-slate-900/95 text-white px-12 py-5 rounded-2xl border-2 border-slate-600 shadow-[0_0_40px_rgba(100,116,139,0.5)] flex items-center gap-6 animate-in zoom-in-95">
                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center font-black text-2xl text-slate-300">
                  •
                </div>
                <div>
                  <div className="text-3xl font-black uppercase tracking-wider text-slate-200">DOT BALL</div>
                  <div className="text-sm font-bold text-slate-400 mt-0.5">
                    {activeEvent.data?.bowlerName} to {activeEvent.data?.strikerName}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'BASKETBALL_3PT' && (
              <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-slate-950 px-14 py-7 rounded-3xl border-4 border-white shadow-[0_0_60px_rgba(245,158,11,0.9)] flex items-center gap-6 animate-bounce">
                <div className="text-6xl font-black">🎯 3-PTR!</div>
                <div>
                  <div className="text-4xl font-black uppercase tracking-tight text-white drop-shadow-md">
                    FROM DOWNTOWN!
                  </div>
                  <div className="text-lg font-black text-slate-950 mt-1">
                    {activeEvent.data?.playerName} ({activeEvent.data?.teamName})
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'BASKETBALL_2PT' && (
              <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-700 text-white px-12 py-6 rounded-2xl border-2 border-orange-300 shadow-[0_0_40px_rgba(234,88,12,0.8)] flex items-center gap-5 animate-pulse">
                <div className="text-5xl font-black">🏀 2-PTS</div>
                <div>
                  <div className="text-3xl font-black uppercase tracking-tight text-white">BUCKET!</div>
                  <div className="text-sm font-bold text-orange-100 mt-0.5">
                    {activeEvent.data?.playerName} • {activeEvent.data?.teamName}
                  </div>
                </div>
              </div>
            )}

            {activeEvent.type === 'BASKETBALL_FOUL' && (
              <div className="bg-slate-900/95 text-yellow-400 px-10 py-5 rounded-2xl border-2 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.5)] flex items-center gap-5 animate-in zoom-in-95">
                <AlertTriangle className="w-10 h-10 text-yellow-400" />
                <div>
                  <div className="text-3xl font-black uppercase tracking-wider text-white">FOUL CALLED</div>
                  <div className="text-sm font-bold text-yellow-300 mt-0.5">
                    {activeEvent.data?.playerName} ({activeEvent.data?.foulType || 'Personal Foul'})
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. PERSISTENT SCOREBOARD OVERLAY */}
      <AnimatePresence>
        {config.scoreboardVisible && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.4 }}
            className={`absolute z-20 shadow-2xl border ${getPositionClasses(
              styleCfg.position
            )} ${getShapeClasses(styleCfg.shape)} ${getFontFamily(styleCfg.fontStyle)}`}
            style={customStyle}
          >
            {/* RENDER SCOREBOARD TEMPLATE VARIATIONS */}
            {match?.sport === 'TABLE_TENNIS' || scoringState?.sport === 'TABLE_TENNIS' || (scoringState?.serviceCountInRotation !== undefined) ? (
              // TABLE TENNIS WTT / ITTF WORLD CHAMPIONSHIPS SCOREBUG
              <div className="flex flex-col bg-slate-950/95 text-white rounded-xl overflow-hidden border border-orange-500/40 shadow-2xl min-w-[440px]">
                {/* Header Info Bar */}
                <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-amber-950 px-4 py-1.5 flex items-center justify-between text-xs font-bold border-b border-orange-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🏓</span>
                    <span className="uppercase tracking-wider font-black text-orange-400">
                      {match?.tournament?.name || 'WTT CHAMPIONSHIPS'}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-orange-500/30">
                      {match?.metadata?.matchCategory || (match?.metadata?.isDoubles ? 'DOUBLES' : 'SINGLES')}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                      {`BEST OF ${scoringState?.maxGames || match?.metadata?.maxGames || 5}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-orange-400 font-bold border border-orange-500/30 text-[11px]">
                      GAME {scoringState?.currentGame || 1} / {scoringState?.maxGames || match?.metadata?.maxGames || 5}
                    </span>
                    {scoringState?.isDecidingGame && (
                      <span className="bg-purple-900/80 text-purple-200 border border-purple-400/50 px-1.5 py-0.5 rounded text-[10px] font-black uppercase animate-pulse">
                        DECIDER
                      </span>
                    )}
                    {scoringState?.isCompleted && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                        FINAL
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-header: Server, Rotation & Game/Match Point Indicator */}
                <div className="bg-slate-900/90 px-4 py-1 flex items-center justify-between text-[10px] border-b border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <span className="text-slate-400">SERVICE:</span>
                    <span className="font-bold text-orange-400 flex items-center gap-1">
                      <span>🏓</span>
                      <span>
                        {scoringState?.servingPlayerName || (scoringState?.servingTeam === 'TEAM_A' ? (match?.teamA?.name || 'Player 1') : (match?.teamB?.name || 'Player 2'))}
                      </span>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-300 font-mono">
                      {scoringState?.isDeuce
                        ? 'DEUCE (1-SERVE)'
                        : `SERVE ${(scoringState?.serviceCountInRotation ?? 0) + 1}/2`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {scoringState?.isMatchPointA || scoringState?.isMatchPointB || scoringState?.isMatchPoint ? (
                      <span className="bg-red-950 text-red-300 border border-red-500/60 px-2 py-0.5 rounded font-black tracking-wider text-[10px] animate-pulse">
                        MATCH POINT
                      </span>
                    ) : scoringState?.isGamePointA || scoringState?.isGamePointB || scoringState?.isGamePoint ? (
                      <span className="bg-amber-950 text-amber-300 border border-amber-500/60 px-2 py-0.5 rounded font-black tracking-wider text-[10px] animate-pulse">
                        GAME POINT
                      </span>
                    ) : scoringState?.isDeuce ? (
                      <span className="bg-orange-950 text-orange-300 border border-orange-500/50 px-2 py-0.5 rounded font-black tracking-wider text-[10px]">
                        DEUCE
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Team / Player A Row */}
                <div
                  className={`px-4 py-2 flex items-center justify-between transition-colors ${
                    scoringState?.servingTeam === 'TEAM_A' ? 'bg-slate-900/60' : 'bg-slate-950/40'
                  } border-b border-slate-800/60`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Serve Indicator */}
                    <div className="w-5 flex justify-center">
                      {scoringState?.servingTeam === 'TEAM_A' ? (
                        <span className="text-orange-400 text-sm animate-pulse" title="Serving">
                          🏓
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-800" />
                      )}
                    </div>
                    {/* Player / Team Names */}
                    <div className="truncate flex-1">
                      <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2 truncate">
                        <span>{match?.teamA?.name || 'Player 1'}</span>
                        {match?.metadata?.isDoubles && match?.metadata?.playerA2Name && (
                          <span className="text-xs text-slate-400 font-medium truncate">
                            / {match?.metadata?.playerA2Name}
                          </span>
                        )}
                      </div>
                      {scoringState?.receiverSide === 'TEAM_A' && (
                        <div className="text-[9px] text-slate-400 uppercase font-mono">
                          RECEIVING
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previous Games Scores + Games Won + Current Points */}
                  <div className="flex items-center gap-2">
                    {/* Game Scores History */}
                    {scoringState?.gameScores && scoringState.gameScores.length > 0 && (
                      <div className="flex items-center gap-1 font-mono text-xs text-slate-400">
                        {scoringState.gameScores.map((g: any, idx: number) => (
                          <span
                            key={idx}
                            className={`w-5 text-center ${
                              g.winner === 'TEAM_A' ? 'text-orange-400 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {g.scoreA}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Games Won Badge */}
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-sm text-slate-200">
                      {scoringState?.gamesWonA ?? 0}
                    </div>

                    {/* Current Game Score */}
                    <div
                      className={`w-12 h-10 rounded-lg flex items-center justify-center font-mono font-black text-2xl shadow-inner ${
                        scoringState?.isMatchPointA || scoringState?.isGamePointA
                          ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 border border-orange-300'
                          : scoringState?.servingTeam === 'TEAM_A'
                          ? 'bg-orange-950/80 text-orange-200 border border-orange-500/50'
                          : 'bg-slate-900 text-white border border-slate-800'
                      }`}
                    >
                      {scoringState?.currentScoreA ?? 0}
                    </div>
                  </div>
                </div>

                {/* Team / Player B Row */}
                <div
                  className={`px-4 py-2 flex items-center justify-between transition-colors ${
                    scoringState?.servingTeam === 'TEAM_B' ? 'bg-slate-900/60' : 'bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Serve Indicator */}
                    <div className="w-5 flex justify-center">
                      {scoringState?.servingTeam === 'TEAM_B' ? (
                        <span className="text-orange-400 text-sm animate-pulse" title="Serving">
                          🏓
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-800" />
                      )}
                    </div>
                    {/* Player / Team Names */}
                    <div className="truncate flex-1">
                      <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2 truncate">
                        <span>{match?.teamB?.name || 'Player 2'}</span>
                        {match?.metadata?.isDoubles && match?.metadata?.playerB2Name && (
                          <span className="text-xs text-slate-400 font-medium truncate">
                            / {match?.metadata?.playerB2Name}
                          </span>
                        )}
                      </div>
                      {scoringState?.receiverSide === 'TEAM_B' && (
                        <div className="text-[9px] text-slate-400 uppercase font-mono">
                          RECEIVING
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previous Games Scores + Games Won + Current Points */}
                  <div className="flex items-center gap-2">
                    {/* Game Scores History */}
                    {scoringState?.gameScores && scoringState.gameScores.length > 0 && (
                      <div className="flex items-center gap-1 font-mono text-xs text-slate-400">
                        {scoringState.gameScores.map((g: any, idx: number) => (
                          <span
                            key={idx}
                            className={`w-5 text-center ${
                              g.winner === 'TEAM_B' ? 'text-orange-400 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {g.scoreB}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Games Won Badge */}
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-sm text-slate-200">
                      {scoringState?.gamesWonB ?? 0}
                    </div>

                    {/* Current Game Score */}
                    <div
                      className={`w-12 h-10 rounded-lg flex items-center justify-center font-mono font-black text-2xl shadow-inner ${
                        scoringState?.isMatchPointB || scoringState?.isGamePointB
                          ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 border border-orange-300'
                          : scoringState?.servingTeam === 'TEAM_B'
                          ? 'bg-orange-950/80 text-orange-200 border border-orange-500/50'
                          : 'bg-slate-900 text-white border border-slate-800'
                      }`}
                    >
                      {scoringState?.currentScoreB ?? 0}
                    </div>
                  </div>
                </div>

                {/* Match Status / Winner strip */}
                {scoringState?.isCompleted && (
                  <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-black text-emerald-300 border-t border-emerald-500/40">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span>
                      {scoringState.matchResultText ||
                        `${(scoringState.gamesWonA || 0) > (scoringState.gamesWonB || 0) ? match?.teamA?.name : match?.teamB?.name} WON THE MATCH`}
                    </span>
                  </div>
                )}
              </div>
            ) : match?.sport === 'BADMINTON' || scoringState?.sport === 'BADMINTON' || (scoringState?.currentGame !== undefined && scoringState?.currentScoreA !== undefined && scoringState?.currentScoreB !== undefined && scoringState?.serviceCourt !== undefined) ? (
              // BADMINTON BWF WORLD TOUR OFFICIAL SCOREBUG
              <div className="flex flex-col bg-slate-950/95 text-white rounded-xl overflow-hidden border border-emerald-500/40 shadow-2xl min-w-[420px]">
                {/* Header Info */}
                <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 px-4 py-1.5 flex items-center justify-between text-xs font-bold border-b border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🏸</span>
                    <span className="uppercase tracking-wider font-extrabold text-emerald-300">
                      {match?.tournament?.name || 'BWF WORLD TOUR'}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                      {match?.metadata?.badmintonCategory || 'SINGLES'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-bold border border-emerald-500/30 text-[11px]">
                      GAME {scoringState?.currentGame || 1} / 3
                    </span>
                    {scoringState?.isCompleted && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                        FINAL
                      </span>
                    )}
                  </div>
                </div>

                {/* Service Court Parity Indicator Bar */}
                <div className="bg-slate-900/90 px-4 py-1 flex items-center justify-between text-[10px] border-b border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <span className="text-slate-400">SERVICE COURT:</span>
                    <span className="font-bold text-emerald-400">
                      {((scoringState?.servingTeam === 'TEAM_A' ? (scoringState?.currentScoreA ?? 0) : (scoringState?.currentScoreB ?? 0)) % 2 === 0)
                        ? 'RIGHT COURT (EVEN)'
                        : 'LEFT COURT (ODD)'}
                    </span>
                  </div>
                  {scoringState?.servingPlayerName && (
                    <div className="text-slate-400">
                      Server: <span className="text-white font-bold">{scoringState.servingPlayerName}</span>
                    </div>
                  )}
                </div>

                {/* Main Score Rows */}
                <div className="divide-y divide-slate-800/80">
                  {/* Team / Player A */}
                  <div className={`px-4 py-2.5 flex items-center justify-between gap-4 bg-slate-900/90 ${scoringState?.servingTeam === 'TEAM_A' ? 'bg-emerald-950/25' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      {scoringState?.servingTeam === 'TEAM_A' ? (
                        <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px] font-black text-emerald-300 animate-pulse">
                          <span>🏸</span>
                          <span>SERVE</span>
                        </div>
                      ) : (
                        <div className="w-12" />
                      )}
                      <div>
                        <div className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                          <span>{scoringState?.teamAName || match?.teamA?.shortName || match?.teamA?.name || 'PLAYER A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Previous game scores */}
                      {scoringState?.gameScores && scoringState.gameScores.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mr-1">
                          {scoringState.gameScores.map((g: any, idx: number) => (
                            <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[11px]">
                              G{g.gameNumber}: {g.scoreA}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Games Won Tally */}
                      <span className="px-2 py-0.5 rounded bg-slate-950 font-mono font-bold text-xs text-slate-300 border border-slate-800" title="Games Won">
                        {scoringState?.gamesWonA || 0}
                      </span>

                      {/* Live Rally Score */}
                      <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/60 font-mono font-black text-xl text-emerald-400 min-w-[42px] text-center shadow-inner">
                        {scoringState?.currentScoreA ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Team / Player B */}
                  <div className={`px-4 py-2.5 flex items-center justify-between gap-4 bg-slate-900/90 ${scoringState?.servingTeam === 'TEAM_B' ? 'bg-cyan-950/25' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      {scoringState?.servingTeam === 'TEAM_B' ? (
                        <div className="flex items-center gap-1 bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.5 rounded text-[10px] font-black text-cyan-300 animate-pulse">
                          <span>🏸</span>
                          <span>SERVE</span>
                        </div>
                      ) : (
                        <div className="w-12" />
                      )}
                      <div>
                        <div className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                          <span>{scoringState?.teamBName || match?.teamB?.shortName || match?.teamB?.name || 'PLAYER B'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Previous game scores */}
                      {scoringState?.gameScores && scoringState.gameScores.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mr-1">
                          {scoringState.gameScores.map((g: any, idx: number) => (
                            <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[11px]">
                              G{g.gameNumber}: {g.scoreB}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Games Won Tally */}
                      <span className="px-2 py-0.5 rounded bg-slate-950 font-mono font-bold text-xs text-slate-300 border border-slate-800" title="Games Won">
                        {scoringState?.gamesWonB || 0}
                      </span>

                      {/* Live Rally Score */}
                      <span className="px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/60 font-mono font-black text-xl text-cyan-400 min-w-[42px] text-center shadow-inner">
                        {scoringState?.currentScoreB ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub Bar for Context Alerts */}
                {(scoringState?.isMatchPointA || scoringState?.isMatchPointB || scoringState?.isGamePointA || scoringState?.isGamePointB || (scoringState?.currentScoreA === 29 && scoringState?.currentScoreB === 29) || (scoringState?.currentScoreA >= 20 && scoringState?.currentScoreB >= 20) || (scoringState?.currentScoreA === 11 || scoringState?.currentScoreB === 11)) && (
                  <div className="px-4 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                      {(scoringState?.isMatchPointA || scoringState?.isMatchPointB) ? (
                        <span className="text-amber-400 uppercase tracking-wider font-black animate-pulse flex items-center gap-1">
                          <span>🏆</span>
                          <span>MATCH POINT ({scoringState?.isMatchPointA ? scoringState?.teamAName : scoringState?.teamBName})</span>
                        </span>
                      ) : (scoringState?.isGamePointA || scoringState?.isGamePointB) ? (
                        <span className="text-amber-300 uppercase tracking-wider font-black flex items-center gap-1">
                          <span>⚡</span>
                          <span>GAME POINT ({scoringState?.isGamePointA ? scoringState?.teamAName : scoringState?.teamBName})</span>
                        </span>
                      ) : (scoringState?.currentScoreA === 29 && scoringState?.currentScoreB === 29) ? (
                        <span className="text-fuchsia-400 uppercase tracking-wider font-black animate-pulse flex items-center gap-1">
                          <span>👑</span>
                          <span>29-29 GOLDEN POINT • SUDDEN DEATH</span>
                        </span>
                      ) : (scoringState?.currentScoreA >= 20 && scoringState?.currentScoreB >= 20) ? (
                        <span className="text-orange-400 uppercase tracking-wider font-black flex items-center gap-1">
                          <span>🔥</span>
                          <span>DEUCE ({scoringState.currentScoreA}-{scoringState.currentScoreB}) • WIN BY 2</span>
                        </span>
                      ) : ((scoringState?.currentScoreA === 11 || scoringState?.currentScoreB === 11) && scoringState?.currentScoreA <= 11 && scoringState?.currentScoreB <= 11) ? (
                        <span className="text-yellow-300 uppercase tracking-wider font-black flex items-center gap-1">
                          <span>⏱️</span>
                          <span>11-POINT INTERVAL (60s COACHING)</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ) : match?.sport === 'TENNIS' || scoringState?.sport === 'TENNIS' || scoringState?.currentSetNumber !== undefined ? (
              // TENNIS OFFICIAL BROADCAST SCOREBUG
              <div className="flex flex-col bg-slate-950/95 text-white rounded-xl overflow-hidden border border-emerald-500/40 shadow-2xl min-w-[380px]">
                {/* Header info */}
                <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 px-4 py-1.5 flex items-center justify-between text-xs font-bold border-b border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎾</span>
                    <span className="uppercase tracking-wider font-extrabold text-emerald-300">
                      {match?.tournament?.name || 'TENNIS'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-bold border border-emerald-500/30 text-[11px]">
                      SET {scoringState?.currentSetNumber || 1}
                    </span>
                    {scoringState?.isTiebreak && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px] font-black uppercase animate-pulse">
                        TIEBREAK
                      </span>
                    )}
                    {scoringState?.isMatchComplete && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                        FINAL
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Player Scores Rows */}
                <div className="divide-y divide-slate-800/80">
                  {/* Player A */}
                  <div className={`px-4 py-2.5 flex items-center justify-between gap-4 bg-slate-900/90 ${scoringState?.servingTeam === 'TEAM_A' ? 'bg-emerald-950/20' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      {scoringState?.servingTeam === 'TEAM_A' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Serving" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-transparent" />
                      )}
                      <span className="text-sm font-black uppercase tracking-tight text-white">
                        {scoringState?.teamAName || match?.teamA?.shortName || match?.teamA?.name || 'PLAYER A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Sets won */}
                      <span className="px-2 py-0.5 rounded bg-slate-950 font-mono font-bold text-xs text-slate-400 border border-slate-800">
                        {scoringState?.setsWonA || 0}
                      </span>
                      {/* Current Set Games */}
                      <span className="font-mono font-black text-lg text-slate-200 w-6 text-center">
                        {scoringState?.currentGameA ?? 0}
                      </span>
                      {/* Current Points */}
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 font-mono font-black text-base text-emerald-400 min-w-[36px] text-center shadow-inner">
                        {scoringState?.currentPointA || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Player B */}
                  <div className={`px-4 py-2.5 flex items-center justify-between gap-4 bg-slate-900/90 ${scoringState?.servingTeam === 'TEAM_B' ? 'bg-cyan-950/20' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      {scoringState?.servingTeam === 'TEAM_B' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" title="Serving" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-transparent" />
                      )}
                      <span className="text-sm font-black uppercase tracking-tight text-white">
                        {scoringState?.teamBName || match?.teamB?.shortName || match?.teamB?.name || 'PLAYER B'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Sets won */}
                      <span className="px-2 py-0.5 rounded bg-slate-950 font-mono font-bold text-xs text-slate-400 border border-slate-800">
                        {scoringState?.setsWonB || 0}
                      </span>
                      {/* Current Set Games */}
                      <span className="font-mono font-black text-lg text-slate-200 w-6 text-center">
                        {scoringState?.currentGameB ?? 0}
                      </span>
                      {/* Current Points */}
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 font-mono font-black text-base text-cyan-400 min-w-[36px] text-center shadow-inner">
                        {scoringState?.currentPointB || '0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub Bar for Context Alerts */}
                {(scoringState?.isBreakPoint || scoringState?.isSetPoint || scoringState?.isMatchPoint || scoringState?.secondServeActive) && (
                  <div className="px-4 py-1 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                      {scoringState?.isMatchPoint && (
                        <span className="text-amber-400 uppercase tracking-wider font-black animate-pulse">
                          🏆 CHAMPIONSHIP / MATCH POINT
                        </span>
                      )}
                      {scoringState?.isSetPoint && !scoringState?.isMatchPoint && (
                        <span className="text-amber-400 uppercase tracking-wider font-black">
                          ⚡ SET POINT
                        </span>
                      )}
                      {scoringState?.isBreakPoint && !scoringState?.isSetPoint && !scoringState?.isMatchPoint && (
                        <span className="text-rose-400 uppercase tracking-wider font-black">
                          🔥 BREAK POINT
                        </span>
                      )}
                    </div>
                    {scoringState?.secondServeActive && (
                      <span className="text-amber-300 font-semibold uppercase">
                        2nd Serve
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : match?.sport === 'FOOTBALL' || scoringState?.sport === 'FOOTBALL' ? (
              // FOOTBALL / SOCCER SCOREBOARD BUG
              <div className="flex flex-col bg-slate-900/95 text-white rounded-xl overflow-hidden border border-emerald-500/40 shadow-2xl min-w-[360px]">
                {/* Header Match info */}
                <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 px-4 py-1.5 flex items-center justify-between text-xs font-bold border-b border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚽</span>
                    <span className="uppercase tracking-wider font-extrabold text-emerald-300">
                      {match?.tournament?.name || 'FOOTBALL'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-bold border border-emerald-500/30">
                      {scoringState?.halfName || scoringState?.currentHalf || '1ST HALF'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-black ${scoringState?.isClockRunning ? 'text-emerald-300 bg-emerald-950/60 animate-pulse' : 'text-slate-300 bg-slate-800/80'}`}>
                      {scoringState?.displayTime || scoringState?.formattedTime || '00:00'}
                    </span>
                    {scoringState?.stoppageTimeMinutes > 0 && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        +{scoringState.stoppageTimeMinutes}&apos;
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Line */}
                <div className="px-5 py-3 flex items-center justify-between gap-6 bg-slate-900">
                  {/* Team A */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center font-black text-xs text-emerald-300">
                      {(match?.teamA?.shortName || match?.teamA?.name || 'A').substring(0, 3)}
                    </div>
                    <span className="text-base font-black uppercase tracking-tight">
                      {match?.teamA?.shortName || match?.teamA?.name || 'TEAM A'}
                    </span>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-emerald-400">
                      {scoringState?.teamAScore ?? 0}
                    </span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span className="text-3xl font-black text-white">
                      {scoringState?.teamBScore ?? 0}
                    </span>
                  </div>

                  {/* Team B */}
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black uppercase tracking-tight">
                      {match?.teamB?.shortName || match?.teamB?.name || 'TEAM B'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-sky-600/30 border border-sky-500/40 flex items-center justify-center font-black text-xs text-sky-300">
                      {(match?.teamB?.shortName || match?.teamB?.name || 'B').substring(0, 3)}
                    </div>
                  </div>
                </div>

                {/* Sub Bar (Corners, Cards, Shootout status) */}
                <div className="px-4 py-1.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <div className="flex items-center gap-4">
                    <span>
                      CK: <strong className="text-emerald-400">{scoringState?.teamACorners || 0}</strong> - <strong className="text-sky-400">{scoringState?.teamBCorners || 0}</strong>
                    </span>
                    <span>
                      FOULS: <strong className="text-emerald-400">{scoringState?.teamAFouls || 0}</strong> - <strong className="text-sky-400">{scoringState?.teamBFouls || 0}</strong>
                    </span>
                    {scoringState?.isShootout && (
                      <span className="text-purple-400 font-bold">
                        SO: {scoringState?.shootoutScoreA || 0} - {scoringState?.shootoutScoreB || 0}
                      </span>
                    )}
                  </div>

                  {/* Card indicators */}
                  <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-3.5 bg-yellow-400 rounded-sm inline-block" />
                      <span>{scoringState?.teamAYellowCards || 0}</span>
                      <span className="w-2.5 h-3.5 bg-red-600 rounded-sm inline-block ml-1" />
                      <span>{scoringState?.teamARedCards || 0}</span>
                    </div>
                    <span className="text-slate-600">|</span>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-3.5 bg-yellow-400 rounded-sm inline-block" />
                      <span>{scoringState?.teamBYellowCards || 0}</span>
                      <span className="w-2.5 h-3.5 bg-red-600 rounded-sm inline-block ml-1" />
                      <span>{scoringState?.teamBRedCards || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : match?.sport === 'HOCKEY' || scoringState?.sport === 'HOCKEY' ? (
              // FIELD HOCKEY SCOREBOARD BUG
              <div className="flex flex-col bg-slate-900/95 text-white rounded-xl overflow-hidden border border-emerald-500/40 shadow-2xl min-w-[340px]">
                {/* Header Match info */}
                <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 px-4 py-1.5 flex items-center justify-between text-xs font-bold border-b border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🏑</span>
                    <span className="uppercase tracking-wider font-extrabold text-emerald-100">
                      {match?.tournament?.name || 'FIELD HOCKEY'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="bg-slate-950/70 px-2 py-0.5 rounded text-emerald-400 font-bold border border-emerald-500/30">
                      {scoringState?.currentPeriodName || 'Q1'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-black ${scoringState?.isClockRunning ? 'text-emerald-300 bg-emerald-950/60 animate-pulse' : 'text-slate-300 bg-slate-800/80'}`}>
                      {scoringState?.periodTimeRemainingDisplay || '15:00'}
                    </span>
                  </div>
                </div>

                {/* Score Line */}
                <div className="px-5 py-3 flex items-center justify-between gap-6 bg-slate-900">
                  {/* Team A */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center font-black text-xs text-emerald-300">
                      {(match?.teamA?.shortName || match?.teamA?.name || 'A').substring(0, 3)}
                    </div>
                    <span className="text-base font-black uppercase tracking-tight">
                      {match?.teamA?.shortName || match?.teamA?.name || 'TEAM A'}
                    </span>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-emerald-400">
                      {scoringState?.teamAScore ?? 0}
                    </span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span className="text-3xl font-black text-white">
                      {scoringState?.teamBScore ?? 0}
                    </span>
                  </div>

                  {/* Team B */}
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black uppercase tracking-tight">
                      {match?.teamB?.shortName || match?.teamB?.name || 'TEAM B'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center font-black text-xs text-blue-300">
                      {(match?.teamB?.shortName || match?.teamB?.name || 'B').substring(0, 3)}
                    </div>
                  </div>
                </div>

                {/* Sub Bar (Penalty corners, Sin-bin suspensions, Shootout status) */}
                <div className="px-4 py-1.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <div className="flex items-center gap-4">
                    <span>
                      PC: <strong className="text-emerald-400">{scoringState?.teamAPenaltyCorners || 0}</strong> - <strong className="text-blue-400">{scoringState?.teamBPenaltyCorners || 0}</strong>
                    </span>
                    {scoringState?.isShootout && (
                      <span className="text-purple-400 font-bold">
                        SO: {scoringState?.shootoutScoreA || 0} - {scoringState?.shootoutScoreB || 0}
                      </span>
                    )}
                  </div>

                  {/* Active Card Suspensions */}
                  {scoringState?.activeSuspensions && scoringState.activeSuspensions.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 uppercase text-[10px]">SIN BIN:</span>
                      {scoringState.activeSuspensions
                        .filter((s: any) => s.status === 'ACTIVE')
                        .map((s: any) => (
                          <span
                            key={s.id}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              s.cardType === 'GREEN'
                                ? 'bg-emerald-800 text-emerald-100'
                                : 'bg-yellow-600 text-slate-950'
                            }`}
                          >
                            {s.playerName?.split(' ')[0]} ({s.cardType[0]} {s.remainingSeconds ? `${Math.ceil(s.remainingSeconds / 60)}m` : ''})
                          </span>
                        ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[10px]">FULL STRENGTH</span>
                  )}
                </div>
              </div>
            ) : selectedTpl === 'MINIMAL' ? (
              // MINIMAL TEMPLATE
              <div className="flex items-center gap-6 px-6 py-3 text-sm">
                <div className="flex items-center gap-3 border-r border-slate-700/80 pr-6">
                  {visibility.teamName && (
                    <span className="font-extrabold tracking-wider text-base">{battingTeamName}</span>
                  )}
                  {visibility.score && (
                    <span className="text-2xl font-black text-emerald-400">
                      {totalRuns}/{wickets}
                    </span>
                  )}
                  {visibility.overs && (
                    <span className="text-xs text-slate-300 font-mono">({oversDisplay} OV)</span>
                  )}
                </div>

                {visibility.striker && strikerStat && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">*</span>
                    <span>{strikerStat.playerName}</span>
                    <span className="font-bold">{strikerStat.runs}</span>
                    <span className="text-xs text-slate-400">({strikerStat.ballsFaced})</span>
                  </div>
                )}

                {visibility.nonStriker && nonStrikerStat && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span>{nonStrikerStat.playerName}</span>
                    <span className="font-bold">{nonStrikerStat.runs}</span>
                  </div>
                )}

                {visibility.bowlerName && currentBowlerStat && (
                  <div className="border-l border-slate-700/80 pl-6 text-xs flex items-center gap-2 text-slate-300">
                    <span className="text-slate-400">BOWLER:</span>
                    <span className="font-bold text-white">{currentBowlerStat.bowlerName || currentBowlerStat.playerName || 'Bowler'}</span>
                    <span>
                      {currentBowlerStat.oversDisplay || currentBowlerStat.overs || '0.0'}-{currentBowlerStat.maidens ?? 0}-{currentBowlerStat.runsConceded ?? 0}-{currentBowlerStat.wickets ?? 0}
                    </span>
                  </div>
                )}
              </div>
            ) : selectedTpl === 'NEON' ? (
              // NEON FUTURISTIC TEMPLATE
              <div className="flex items-stretch bg-slate-950/90 text-white rounded-2xl overflow-hidden border-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                <div className="bg-cyan-600 px-6 py-3 flex flex-col justify-center items-center">
                  <span className="text-xs font-black uppercase text-cyan-100 tracking-widest">MATCH</span>
                  <span className="text-xl font-black text-white">{battingTeamName}</span>
                </div>
                <div className="px-8 py-3 flex items-center gap-8 bg-slate-900/90">
                  <div className="flex flex-col">
                    <span className="text-4xl font-black tracking-tighter text-cyan-400">
                      {totalRuns}<span className="text-emerald-400">/{wickets}</span>
                    </span>
                    <span className="text-xs font-mono text-cyan-200">{oversDisplay} OVERS • CRR {crr}</span>
                  </div>
                  <div className="h-10 w-px bg-cyan-500/40" />
                  <div className="flex flex-col text-xs space-y-1">
                    {strikerStat && (
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">►</span>
                        <span className="font-bold">{strikerStat.playerName}</span>
                        <span className="text-emerald-400 font-black">{strikerStat.runs}</span>
                        <span className="text-slate-400">({strikerStat.ballsFaced})</span>
                      </div>
                    )}
                    {currentBowlerStat && (
                      <div className="text-slate-300">
                        B: <span className="text-white font-bold">{currentBowlerStat.bowlerName || currentBowlerStat.playerName || 'Bowler'}</span> ({currentBowlerStat.wickets ?? 0}/{currentBowlerStat.runsConceded ?? 0})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : selectedTpl === 'GLASS' ? (
              // GLASSMORPHISM TEMPLATE
              <div className="flex items-center gap-6 px-8 py-4 backdrop-blur-xl bg-white/10 text-white rounded-3xl border border-white/20 shadow-2xl">
                <div className="flex items-center gap-4 border-r border-white/20 pr-6">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center font-black text-emerald-300 border border-emerald-400/40">
                    {battingTeamName.substring(0, 3)}
                  </div>
                  <div>
                    <div className="text-xs uppercase font-bold text-emerald-300 tracking-wider">{battingTeamName}</div>
                    <div className="text-3xl font-black tracking-tight">{totalRuns}/{wickets}</div>
                  </div>
                </div>

                <div className="flex flex-col text-xs space-y-1">
                  {strikerStat && (
                    <div>
                      STRIKER: <strong className="text-emerald-300">{strikerStat.playerName}</strong> {strikerStat.runs} ({strikerStat.ballsFaced})
                    </div>
                  )}
                  {nonStrikerStat && (
                    <div className="text-slate-300">
                      NON-STRIKER: <strong>{nonStrikerStat.playerName}</strong> {nonStrikerStat.runs}
                    </div>
                  )}
                </div>

                <div className="border-l border-white/20 pl-6 flex flex-col text-xs">
                  <span className="text-slate-300 uppercase">OVERS: <strong className="text-white">{oversDisplay}</strong></span>
                  {currentBowlerStat && (
                    <span className="text-slate-300">
                      BOWLER: <strong className="text-emerald-300">{currentBowlerStat.bowlerName || currentBowlerStat.playerName || 'Bowler'}</strong> {currentBowlerStat.wickets ?? 0}-{currentBowlerStat.runsConceded ?? 0}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              // MODERN SPORTS DEFAULT TEMPLATE
              <div className="flex items-stretch bg-slate-900/95 text-white rounded-xl overflow-hidden border border-emerald-500/40 shadow-2xl">
                {/* Team & Logo Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-3 flex items-center gap-3">
                  {visibility.tournamentLogo && match?.tournament?.logoUrl && (
                    <img
                      src={match.tournament.logoUrl}
                      alt="Logo"
                      className="w-8 h-8 object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div>
                    {visibility.tournamentName && match?.tournament?.name && (
                      <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 opacity-90">
                        {match.tournament.name}
                      </div>
                    )}
                    {visibility.teamName && (
                      <div className="text-lg font-black tracking-tight uppercase">{battingTeamName}</div>
                    )}
                  </div>
                </div>

                {/* Score Section */}
                <div className="px-6 py-3 flex items-center gap-6 bg-slate-900">
                  {visibility.score && (
                    <div className="flex flex-col">
                      <div className="text-3xl font-black tracking-tight text-emerald-400">
                        {totalRuns} <span className="text-white">/ {wickets}</span>
                      </div>
                      {visibility.overs && (
                        <div className="text-xs font-mono text-slate-300">
                          {oversDisplay} OVERS • CRR {crr}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Striker & Non-Striker */}
                  <div className="h-8 w-px bg-slate-700/80" />
                  <div className="flex flex-col justify-center text-xs space-y-1">
                    {visibility.striker && strikerStat && (
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">★</span>
                        <span className="font-bold text-white">{strikerStat.playerName}</span>
                        <span className="text-emerald-400 font-black">{strikerStat.runs}</span>
                        <span className="text-slate-400">({strikerStat.ballsFaced}b)</span>
                      </div>
                    )}
                    {visibility.nonStriker && nonStrikerStat && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-2" />
                        <span>{nonStrikerStat.playerName}</span>
                        <span className="font-bold text-white">{nonStrikerStat.runs}</span>
                        <span className="text-slate-400">({nonStrikerStat.ballsFaced}b)</span>
                      </div>
                    )}
                  </div>

                  {/* Bowler Figures */}
                  {visibility.bowlerName && currentBowlerStat && (
                    <>
                      <div className="h-8 w-px bg-slate-700/80" />
                      <div className="flex flex-col justify-center text-xs">
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">CURRENT BOWLER</span>
                        <span className="font-bold text-white">{currentBowlerStat.bowlerName || currentBowlerStat.playerName || 'Bowler'}</span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          {currentBowlerStat.oversDisplay || currentBowlerStat.overs || '0.0'}-{currentBowlerStat.maidens ?? 0}-{currentBowlerStat.runsConceded ?? 0}-{currentBowlerStat.wickets ?? 0}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Universal Live Assigned On-Air Graphic / Multi-Layer Stack Overlay */}
      <AnimatePresence>
        {(activeGraphics && activeGraphics.length > 0 ? activeGraphics : (onAirItem ? [onAirItem] : [])).map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: item.entryAnimation === 'ZOOM' ? 0.4 : item.entryAnimation === 'POP' ? 0.7 : 1, y: item.entryAnimation === 'SLIDE_UP' ? 100 : item.entryAnimation === 'SLIDE_DOWN' ? -100 : 0, x: item.entryAnimation === 'SLIDE_LEFT' ? 120 : item.entryAnimation === 'SLIDE_RIGHT' ? -120 : 0 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: item.exitAnimation === 'ZOOM' ? 0.5 : 0.95, y: item.exitAnimation === 'SLIDE_DOWN' ? 100 : item.exitAnimation === 'SLIDE_UP' ? -100 : 0, x: item.exitAnimation === 'SLIDE_LEFT' ? -120 : item.exitAnimation === 'SLIDE_RIGHT' ? 120 : 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="absolute inset-0 pointer-events-none z-50 overflow-hidden"
          >
            {/* 1. Single Assigned Studio Graphic */}
            {item.graphic && item.graphic.elements && (
              <div className="relative w-[1920px] h-[1080px]">
                {[...item.graphic.elements]
                  .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                  .map((el) => (
                    <StudioGraphicElementRenderer
                      key={el.id}
                      element={el}
                      isSimulatingData={false}
                      dataContext={activeDataContext}
                    />
                  ))}
              </div>
            )}

            {/* 2. Multi-layer Graphic Scene */}
            {item.layers && item.layers.length > 0 && (
              <div className="relative w-[1920px] h-[1080px]">
                {[...item.layers]
                  .filter((l) => l.enabled && l.graphic && l.graphic.elements)
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((layer) => (
                    <div
                      key={layer.id}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: layer.opacity ?? 1,
                        transform: `translate(${layer.offsetX || 0}px, ${layer.offsetY || 0}px) scale(${layer.scale ?? 1})`,
                        transformOrigin: 'center center',
                        zIndex: layer.order || 1,
                      }}
                    >
                      {[...(layer.graphic!.elements || [])]
                        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                        .map((el) => (
                          <StudioGraphicElementRenderer
                            key={el.id}
                            element={el}
                            isSimulatingData={false}
                            dataContext={activeDataContext}
                          />
                        ))}
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Optional Operator Diagnostic HUD (Disabled by default; activated with ?diag=1 or ?debug=1) */}
      {showDiagnostics && (
        <div
          id="sports-pulse-broadcast-diagnostic-hud"
          className="absolute top-4 left-4 z-[9999] pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono text-slate-300 shadow-2xl"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'RECONNECTING'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-bold text-white tracking-wider">
              {connectionStatus}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>SYNC {syncSecondsAgo}s ago</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            STAGE 1920x1080 ({stageScale.toFixed(2)}x)
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold truncate max-w-[200px]">
            PGM: {onAirItem ? (onAirItem.graphicName || onAirItem.sceneName || 'Active') : 'IDLE'}
          </span>
        </div>
      )}
      </div>
    </div>
  );
};
