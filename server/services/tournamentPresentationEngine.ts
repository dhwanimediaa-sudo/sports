/**
 * SportsPulse - Tournament Broadcast & Public Presentation Engine
 * 
 * Manages Server-Sent Events (SSE) for transparent 1920x1080 broadcast presentation
 * overlays, stadium screens, and live spectator pages without modifying scoring events.
 */

import { Response } from 'express';
import crypto from 'crypto';
import { getDb, saveDatabase } from '../db/database';
import {
  TournamentPresentationEvent,
  TournamentAwardItem,
  TournamentRecordDetail,
  TournamentHallOfFameData,
} from '../../src/types';
import {
  getTournamentHallOfFame,
  calculateTournamentAwards,
  getTournamentRecordsCenter,
  replacePresentationTokens,
} from './tournamentAwardsEngine';
import { getChampionshipSummary } from './tournamentEngine';

// Active SSE Connections per Tournament
const presentationClientsMap = new Map<string, Response[]>();

// Last active presentation state per Tournament
const currentPresentationStateMap = new Map<string, TournamentPresentationEvent | null>();

/**
 * Register SSE Client for Tournament Presentation Stream
 */
export function registerPresentationClient(tournamentId: string, res: Response) {
  if (!presentationClientsMap.has(tournamentId)) {
    presentationClientsMap.set(tournamentId, []);
  }
  const clients = presentationClientsMap.get(tournamentId)!;
  clients.push(res);

  // Send current active state immediately if exists
  const currentState = currentPresentationStateMap.get(tournamentId);
  if (currentState) {
    res.write(`data: ${JSON.stringify(currentState)}\n\n`);
  }

  // Handle client disconnect
  res.on('close', () => {
    const list = presentationClientsMap.get(tournamentId) || [];
    presentationClientsMap.set(
      tournamentId,
      list.filter((c) => c !== res)
    );
  });
}

/**
 * Broadcast Presentation Event to Connected Clients
 */
export function broadcastPresentationEvent(tournamentId: string, event: TournamentPresentationEvent) {
  currentPresentationStateMap.set(tournamentId, event.type === 'CLEAR' ? null : event);

  const clients = presentationClientsMap.get(tournamentId);
  if (!clients || clients.length === 0) return;

  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((res) => {
    try {
      res.write(data);
    } catch (err) {
      // client disconnected
    }
  });
}

/**
 * Trigger a Tournament Presentation Card (Manual Director Deck)
 */
export function triggerPresentationAction(
  tournamentId: string,
  type: TournamentPresentationEvent['type'],
  customData?: any,
  cardConfig?: TournamentPresentationEvent['cardConfig'],
  adminUser?: any
): TournamentPresentationEvent {
  const db = getDb();
  if (!db.tournament_presentation_events) db.tournament_presentation_events = [];

  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) throw new Error('Tournament not found.');

  const championship = getChampionshipSummary(tournamentId);
  const hallOfFame = getTournamentHallOfFame(tournamentId);
  const awards = calculateTournamentAwards(tournamentId);
  const records = getTournamentRecordsCenter(tournamentId);

  let payloadData: any = customData || {};
  let title = '';

  // Generate dynamic tokens
  const tokens: Record<string, string> = {
    TOURNAMENT_NAME: tournament.name || 'SportsPulse Championship',
    TOURNAMENT_LOGO: tournament.logoUrl || '',
    CHAMPION: championship?.champion?.teamName || tournament.championTeamName || 'Champion Team',
    RUNNER_UP: championship?.runnerUp?.teamName || tournament.runnerUpTeamName || 'Runner-Up',
    THIRD_PLACE: championship?.thirdPlace?.teamName || 'Third Place',
    PLAYER_NAME: payloadData.playerName || '',
    TEAM_NAME: payloadData.teamName || '',
    AWARD_NAME: payloadData.awardTitle || payloadData.title || '',
    AWARD_REASON: payloadData.citation || payloadData.recommendationReason || '',
    RECORD_NAME: payloadData.recordTitle || payloadData.title || '',
    RECORD_VALUE: String(payloadData.recordValue || ''),
    PLAYER_PHOTO: payloadData.photo || payloadData.recipientPhoto || '',
    TEAM_LOGO: payloadData.teamLogoUrl || '',
    SPONSOR: cardConfig?.sponsor?.name || tournament.sponsor || 'SportsPulse Live',
  };

  switch (type) {
    case 'CHAMPION':
      title = '🏆 TOURNAMENT CHAMPIONS';
      payloadData = {
        teamId: championship?.champion?.teamId || tournament.championTeamId,
        teamName: championship?.champion?.teamName || tournament.championTeamName || 'Tournament Champions',
        teamLogoUrl: championship?.champion?.teamLogoUrl,
        scoreSummary: championship?.champion?.finalScore || 'Championship Title',
        runnerUpName: championship?.runnerUp?.teamName || tournament.runnerUpTeamName,
        tournamentName: tournament.name,
        sport: tournament.sport,
      };
      break;

    case 'RUNNER_UP':
      title = '🥈 RUNNER-UP PRESENTATION';
      payloadData = {
        teamId: championship?.runnerUp?.teamId || tournament.runnerUpTeamId,
        teamName: championship?.runnerUp?.teamName || tournament.runnerUpTeamName || 'Tournament Runner-Up',
        teamLogoUrl: championship?.runnerUp?.teamLogoUrl,
        scoreSummary: championship?.runnerUp?.finalScore || 'Finalist',
        tournamentName: tournament.name,
        sport: tournament.sport,
      };
      break;

    case 'THIRD_PLACE':
      title = '🥉 THIRD PLACE WINNER';
      payloadData = {
        teamId: championship?.thirdPlace?.teamId,
        teamName: championship?.thirdPlace?.teamName || 'Third Place Finish',
        teamLogoUrl: championship?.thirdPlace?.teamLogoUrl,
        tournamentName: tournament.name,
        sport: tournament.sport,
      };
      break;

    case 'MVP':
      title = '👑 PLAYER OF THE TOURNAMENT';
      const mvpAward = awards.find((a) => a.awardKey === 'MVP') || awards[0];
      payloadData = {
        playerId: mvpAward?.recipientPlayerId,
        playerName: mvpAward?.recipientName || 'Tournament MVP',
        teamName: mvpAward?.recipientTeamName,
        photo: mvpAward?.recipientPhoto,
        statSummary: mvpAward?.recommendedStatSummary || 'Tournament MVP',
        citation: mvpAward?.citation || `Most Valuable Player of ${tournament.name}`,
        awardIcon: '👑',
        tournamentName: tournament.name,
      };
      break;

    case 'AWARD':
      title = payloadData.awardTitle || payloadData.title || '🏆 OFFICIAL TOURNAMENT AWARD';
      break;

    case 'RECORD':
      title = payloadData.title || '🌟 TOURNAMENT RECORD';
      break;

    case 'HALL_OF_FAME':
      title = '🏛️ TOURNAMENT HALL OF FAME';
      payloadData = hallOfFame;
      break;

    case 'CEREMONY':
      title = '🎉 OFFICIAL AWARDS CEREMONY';
      payloadData = {
        tournament,
        championship,
        awards,
      };
      break;

    case 'CLEAR':
      title = 'CLEAR OVERLAY';
      payloadData = {};
      break;
  }

  const event: TournamentPresentationEvent = {
    id: crypto.randomUUID(),
    tournamentId,
    type,
    title,
    data: payloadData,
    cardConfig: {
      template: cardConfig?.template || 'CHAMPIONSHIP_GOLD',
      font: cardConfig?.font || 'MODERN',
      fontSize: cardConfig?.fontSize || 'LARGE',
      fontColor: cardConfig?.fontColor || '#ffffff',
      background: cardConfig?.background || 'DARK_TRANSPARENT',
      gradient: cardConfig?.gradient || 'GOLD_EMERALD',
      animation: cardConfig?.animation || (type === 'CHAMPION' ? 'CHAMPIONSHIP_REVEAL' : 'GLOW'),
      duration: cardConfig?.duration || 10,
      position: cardConfig?.position || 'CENTER',
      sponsor: cardConfig?.sponsor || {
        name: tournament.sponsor || 'SportsPulse Broadcast',
        tagline: 'Official Tournament Partner',
      },
      dynamicTokens: tokens,
    },
    timestamp: new Date().toISOString(),
    triggeredBy: adminUser?.name || 'Director Console',
  };

  // Broadcast to all active overlays & spectator views
  broadcastPresentationEvent(tournamentId, event);

  // Store in event history (capped at 50)
  db.tournament_presentation_events.push(event);
  if (db.tournament_presentation_events.length > 200) {
    db.tournament_presentation_events = db.tournament_presentation_events.slice(-200);
  }
  saveDatabase();

  return event;
}
