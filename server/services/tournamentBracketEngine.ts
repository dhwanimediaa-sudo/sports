import crypto from 'crypto';
import { getDb, saveDatabase } from '../db/database';
import { addAuditLog } from '../utils/logger';
import {
  Tournament,
  TournamentStatus,
  Group,
  Team,
  Match,
  MatchStatus,
  SportType,
  KnockoutBracket,
  KnockoutBracketRound,
  KnockoutMatchNode,
  KnockoutSeedItem,
  KnockoutAuditLogItem,
  KnockoutGenerationOptions,
  ChampionshipSummary,
  User,
} from '../../src/types';
import { calculateTournamentStandingsDeterministic, extractStandingMatchResult } from './tournamentStandingsEngine';

export type GenerateKnockoutOptions = KnockoutGenerationOptions;

function getSeedTeamId(item: any): string | undefined {
  if (!item) return undefined;
  return item.teamId || item.id || undefined;
}

function getSeedTeamName(item: any): string | undefined {
  if (!item) return undefined;
  return item.teamName || item.name || undefined;
}

function getSeedTeamLogo(item: any): string | undefined {
  if (!item) return undefined;
  return item.teamLogoUrl || item.logoUrl || undefined;
}

/**
 * Standard tournament bracket pairing positions for power of 2 sizes
 */
function getStandardBracketPairings(size: number): Array<[number, number]> {
  if (size === 2) return [[1, 2]];
  if (size === 4) return [[1, 4], [2, 3]];
  if (size === 8) return [[1, 8], [4, 5], [2, 7], [3, 6]];
  if (size === 16) {
    return [
      [1, 16], [8, 9], [4, 13], [5, 12],
      [2, 15], [7, 10], [3, 14], [6, 11],
    ];
  }
  if (size === 32) {
    return [
      [1, 32], [16, 17], [8, 25], [9, 24],
      [4, 29], [13, 20], [5, 28], [12, 21],
      [2, 31], [15, 18], [7, 26], [10, 23],
      [3, 30], [14, 19], [6, 27], [11, 22],
    ];
  }

  // Fallback linear pairings
  const pairings: Array<[number, number]> = [];
  for (let i = 0; i < size / 2; i++) {
    pairings.push([i + 1, size - i]);
  }
  return pairings;
}

/**
 * Apply sport-specific default configuration to a knockout match fixture
 */
function applySportConfig(match: Match, tournament: Tournament) {
  const sport = tournament.sport;
  const cfg = tournament.formatConfig?.defaultMatchConfig || {};

  switch (sport) {
    case 'CRICKET':
      match.cricketConfig = {
        matchType: cfg.matchType || 'T20',
        overs: cfg.overs || tournament.cricketDefaultOvers || 20,
        powerplaySettings: cfg.powerplaySettings || '1-6',
      };
      break;
    case 'FOOTBALL':
      match.footballConfig = {
        halfDuration: cfg.halfDuration || 45,
        extraTimeEnabled: true,
        penaltyShootoutEnabled: true,
      };
      break;
    case 'HOCKEY':
      match.hockeyConfig = {
        periods: cfg.periods || 4,
        periodDuration: cfg.periodDuration || 15,
        penaltyShootoutEnabled: true,
      };
      break;
    case 'VOLLEYBALL':
      match.volleyballConfig = {
        format: cfg.format || 'Best of 3',
        pointsPerSet: cfg.pointsPerSet || 25,
        decidingSetPoints: cfg.decidingSetPoints || 15,
      };
      break;
    case 'KABADDI':
      match.kabaddiConfig = {
        firstHalfDuration: cfg.firstHalfDuration || 20,
        secondHalfDuration: cfg.secondHalfDuration || 20,
        raidDuration: cfg.raidDuration || 30,
      };
      break;
    case 'BASKETBALL':
      match.basketballConfig = {
        quarters: cfg.quarters || 4,
        quarterDuration: cfg.quarterDuration || 10,
      };
      break;
    case 'TENNIS':
      match.tennisConfig = {
        matchType: cfg.matchType || 'SINGLES',
        format: cfg.format || 'BEST_OF_3',
        setRules: cfg.setRules || 'STANDARD',
        gamesToWinSet: cfg.gamesToWinSet || 6,
        setAdvantage: true,
        tiebreakAtGames: 6,
        tiebreakPoints: 7,
        finalSetRule: 'NORMAL',
        surface: cfg.surface || 'HARD',
      };
      break;
    case 'BADMINTON':
      match.badmintonConfig = {
        matchType: cfg.matchType || 'SINGLES',
        format: cfg.format || 'BEST_OF_3',
        pointsPerGame: cfg.pointsPerGame || 21,
        pointDifference: 2,
        maxPoints: 30,
      };
      break;
    case 'TABLE_TENNIS':
      match.tableTennisConfig = {
        matchType: cfg.matchType || 'SINGLES',
        format: cfg.format || 'BEST_OF_5',
        pointsPerGame: cfg.pointsPerGame || 11,
        pointDifference: 2,
        serviceRotation: 2,
        deuceServiceRotation: 1,
      };
      break;
    case 'CUSTOM':
    default:
      match.customSportConfig = {
        periods: cfg.periods || 2,
        periodDurationMinutes: cfg.periodDurationMinutes || 30,
      };
      break;
  }
}

/**
 * Seed qualified teams from group standings or tournament teams
 */
export function seedQualifiedTeams(
  tournamentId: string,
  options: Partial<KnockoutGenerationOptions> = {}
): {
  seeds: KnockoutSeedItem[];
  qualifiedByGroup: Array<{
    groupId: string;
    groupName: string;
    teams: Array<{ team: Team; rank: number; points: number; diff: string }>;
  }>;
} {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const standings = calculateTournamentStandingsDeterministic(tournamentId);
  const qualifiedByGroup: Array<{
    groupId: string;
    groupName: string;
    teams: Array<{ team: Team; rank: number; points: number; diff: string }>;
  }> = [];

  // 1. Collect qualified teams per group
  standings.groups.forEach((grp) => {
    const qualRows = grp.rows.filter(
      (r) => r.qualificationStatus === 'QUALIFIED' || r.qualificationStatus === 'MANUAL_QUALIFIED'
    );
    // If none are formally marked qualified yet, take top slots as provisional seeds
    const targetRows = qualRows.length > 0 ? qualRows : grp.rows.slice(0, grp.qualificationSlots || 2);

    const groupQualified: Array<{ team: Team; rank: number; points: number; diff: string }> = [];
    targetRows.forEach((r) => {
      const tm = db.teams.find((t) => t.id === r.teamId);
      if (tm) {
        groupQualified.push({
          team: tm,
          rank: r.rank,
          points: r.points,
          diff: r.differenceDisplay,
        });
      }
    });

    if (groupQualified.length > 0) {
      qualifiedByGroup.push({
        groupId: grp.groupId,
        groupName: grp.groupName,
        teams: groupQualified,
      });
    }
  });

  // 2. Build Seed list
  const seeds: KnockoutSeedItem[] = [];

  if (options.manualSeeds && options.manualSeeds.length > 0) {
    // Manual seed order provided by admin
    options.manualSeeds.forEach((ms) => {
      const tm = db.teams.find((t) => t.id === ms.teamId);
      if (tm) {
        const grp = db.groups.find((g) => g.id === tm.groupId);
        seeds.push({
          seed: ms.seed,
          teamId: tm.id,
          teamName: tm.name,
          teamLogoUrl: tm.logoUrl,
          groupId: tm.groupId,
          groupName: grp?.name,
        });
      }
    });
  } else if (qualifiedByGroup.length >= 2 && options.seedingMethod !== 'OVERALL_RANK') {
    // Group-based seeding (Winners first, then Runners-up, etc.)
    let maxRank = 1;
    qualifiedByGroup.forEach((g) => {
      maxRank = Math.max(maxRank, g.teams.length);
    });

    let currentSeed = 1;
    for (let r = 1; r <= maxRank; r++) {
      // Sort teams at this rank by points and diff
      const teamsAtRank: Array<{
        team: Team;
        groupId: string;
        groupName: string;
        rank: number;
        points: number;
        diff: string;
      }> = [];

      qualifiedByGroup.forEach((g) => {
        const item = g.teams.find((t) => t.rank === r);
        if (item) {
          teamsAtRank.push({
            team: item.team,
            groupId: g.groupId,
            groupName: g.groupName,
            rank: item.rank,
            points: item.points,
            diff: item.diff,
          });
        }
      });

      // Sort within the rank tier
      teamsAtRank.sort((a, b) => b.points - a.points || a.team.name.localeCompare(b.team.name));

      teamsAtRank.forEach((t) => {
        seeds.push({
          seed: currentSeed++,
          teamId: t.team.id,
          teamName: t.team.name,
          teamLogoUrl: t.team.logoUrl,
          groupId: t.groupId,
          groupName: t.groupName,
          groupRank: t.rank,
          points: t.points,
          differenceDisplay: t.diff,
        });
      });
    }
  } else {
    // Single group or overall standings rank seeding
    const overallRows = standings.overall.filter((r) => r.played > 0 || r.qualificationStatus === 'QUALIFIED');
    const sourceRows = overallRows.length > 0 ? overallRows : standings.overall;

    sourceRows.forEach((r, idx) => {
      const tm = db.teams.find((t) => t.id === r.teamId);
      if (tm) {
        seeds.push({
          seed: idx + 1,
          teamId: tm.id,
          teamName: tm.name,
          teamLogoUrl: tm.logoUrl,
          groupId: r.groupId,
          groupName: r.groupName,
          groupRank: r.rank,
          points: r.points,
          differenceDisplay: r.differenceDisplay,
        });
      }
    });
  }

  // Fallback: If no standings existed, seed from tournament teams
  if (seeds.length === 0) {
    const tournamentTeams = db.teams.filter((t) => t.tournamentId === tournamentId);
    tournamentTeams.forEach((tm, idx) => {
      const grp = db.groups.find((g) => g.id === tm.groupId);
      seeds.push({
        seed: idx + 1,
        teamId: tm.id,
        teamName: tm.name,
        teamLogoUrl: tm.logoUrl,
        groupId: tm.groupId,
        groupName: grp?.name,
      });
    });
  }

  return { seeds, qualifiedByGroup };
}

/**
 * Generate a complete, deterministic Knockout Bracket with seeding, byes, and schedule
 */
export function generateKnockoutBracket(
  options: KnockoutGenerationOptions,
  user?: User | { id?: string; name: string; email?: string }
): KnockoutBracket {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === options.tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  if (!db.knockout_brackets) db.knockout_brackets = [];
  const existingBracketIdx = db.knockout_brackets.findIndex((b: any) => b.tournamentId === options.tournamentId);
  const existingBracket = existingBracketIdx >= 0 ? db.knockout_brackets[existingBracketIdx] : null;

  // Retrieve seed list
  const { seeds, qualifiedByGroup } = seedQualifiedTeams(tournament.id, options);

  // Determine stage hierarchy
  const stageHierarchy: Array<{
    stage: KnockoutMatchNode['stage'];
    key: string;
    title: string;
    matchCount: number;
  }> = [];

  const stage = options.stage || 'QUARTER_FINALS';

  if (stage === 'ROUND_OF_64') {
    stageHierarchy.push({ stage: 'ROUND_OF_32', key: 'r64', title: 'Round of 64', matchCount: 32 });
    stageHierarchy.push({ stage: 'ROUND_OF_32', key: 'r32', title: 'Round of 32', matchCount: 16 });
    stageHierarchy.push({ stage: 'ROUND_OF_16', key: 'r16', title: 'Round of 16', matchCount: 8 });
    stageHierarchy.push({ stage: 'QUARTER_FINAL', key: 'qf', title: 'Quarter Finals', matchCount: 4 });
    stageHierarchy.push({ stage: 'SEMI_FINAL', key: 'sf', title: 'Semi Finals', matchCount: 2 });
    stageHierarchy.push({ stage: 'FINAL', key: 'fn', title: 'Championship Final', matchCount: 1 });
  } else if (stage === 'ROUND_OF_32') {
    stageHierarchy.push({ stage: 'ROUND_OF_32', key: 'r32', title: 'Round of 32', matchCount: 16 });
    stageHierarchy.push({ stage: 'ROUND_OF_16', key: 'r16', title: 'Round of 16', matchCount: 8 });
    stageHierarchy.push({ stage: 'QUARTER_FINAL', key: 'qf', title: 'Quarter Finals', matchCount: 4 });
    stageHierarchy.push({ stage: 'SEMI_FINAL', key: 'sf', title: 'Semi Finals', matchCount: 2 });
    stageHierarchy.push({ stage: 'FINAL', key: 'fn', title: 'Championship Final', matchCount: 1 });
  } else if (stage === 'ROUND_OF_16') {
    stageHierarchy.push({ stage: 'ROUND_OF_16', key: 'r16', title: 'Round of 16', matchCount: 8 });
    stageHierarchy.push({ stage: 'QUARTER_FINAL', key: 'qf', title: 'Quarter Finals', matchCount: 4 });
    stageHierarchy.push({ stage: 'SEMI_FINAL', key: 'sf', title: 'Semi Finals', matchCount: 2 });
    stageHierarchy.push({ stage: 'FINAL', key: 'fn', title: 'Championship Final', matchCount: 1 });
  } else if (stage === 'QUARTER_FINALS') {
    stageHierarchy.push({ stage: 'QUARTER_FINAL', key: 'qf', title: 'Quarter Finals', matchCount: 4 });
    stageHierarchy.push({ stage: 'SEMI_FINAL', key: 'sf', title: 'Semi Finals', matchCount: 2 });
    stageHierarchy.push({ stage: 'FINAL', key: 'fn', title: 'Championship Final', matchCount: 1 });
  } else if (stage === 'SEMI_FINALS') {
    stageHierarchy.push({ stage: 'SEMI_FINAL', key: 'sf', title: 'Semi Finals', matchCount: 2 });
    stageHierarchy.push({ stage: 'FINAL', key: 'fn', title: 'Championship Final', matchCount: 1 });
  } else {
    stageHierarchy.push({ stage: 'FINAL', key: 'fn', title: 'Championship Final', matchCount: 1 });
  }

  const firstStageCapacity = stageHierarchy[0].matchCount * 2;
  const pairings = getStandardBracketPairings(firstStageCapacity);

  // Check for BYEs if qualified seeds < firstStageCapacity
  const byesList: Array<{ teamId: string; teamName: string; seed: number; targetNodeId: string }> = [];
  const activeTeamsCount = Math.min(seeds.length, firstStageCapacity);
  const byeCount = Math.max(0, firstStageCapacity - activeTeamsCount);

  // Set of seeds that get a BYE (top seeds 1..byeCount)
  const byeSeedSet = new Set<number>();
  for (let b = 1; b <= byeCount; b++) {
    byeSeedSet.add(b);
  }

  const baseDate = new Date(options.startDate || new Date().toISOString().split('T')[0]);
  const daysBetweenRounds = options.daysBetweenRounds !== undefined ? options.daysBetweenRounds : 2;
  const matchIntervalMinutes = options.matchIntervalMinutes || 120;
  const defaultVenue = options.venue || tournament.location || tournament.venue || 'Main Stadium';
  const defaultGround = options.ground || 'Center Pitch';

  // Build rounds
  const rounds: KnockoutBracketRound[] = [];
  const nodeMap = new Map<string, KnockoutMatchNode>();
  let globalKoCounter = 1;

  stageHierarchy.forEach((stg, roundIdx) => {
    const roundDate = new Date(baseDate);
    roundDate.setDate(roundDate.getDate() + roundIdx * daysBetweenRounds);
    const dateStr = roundDate.toISOString().split('T')[0];

    const [startH, startM] = (options.matchStartTime || '15:00').split(':').map(Number);
    let timeOffsetMins = 0;

    const matches: KnockoutMatchNode[] = [];
    const isFinalStage = stg.stage === 'FINAL';

    for (let m = 0; m < stg.matchCount; m++) {
      const matchNum = m + 1;
      const nodeId = `${stg.key}_m${matchNum}`;
      const customTitle = options.customRoundNames?.[stg.key] || stg.title;
      const title = `${customTitle} ${stg.matchCount > 1 ? `#${matchNum}` : ''}`.trim();

      const matchTotalMinutes = (startH || 15) * 60 + (startM || 0) + timeOffsetMins;
      const matchH = Math.floor(matchTotalMinutes / 60) % 24;
      const matchM = matchTotalMinutes % 60;
      const timeStr = `${matchH.toString().padStart(2, '0')}:${matchM.toString().padStart(2, '0')}`;
      timeOffsetMins += matchIntervalMinutes;

      const node: KnockoutMatchNode = {
        id: nodeId,
        stage: stg.stage,
        roundNumber: roundIdx + 1,
        matchNumber: matchNum,
        title,
        homeTeamPlaceholder: `Winner of Prev Round`,
        awayTeamPlaceholder: `Winner of Prev Round`,
        status: 'SCHEDULED',
        isChampionshipMatch: isFinalStage,
        matchDate: dateStr,
        matchTime: timeStr,
        venue: defaultVenue,
        ground: defaultGround,
      };

      matches.push(node);
      nodeMap.set(nodeId, node);
      globalKoCounter++;
    }

    rounds.push({
      roundKey: stg.key,
      title: options.customRoundNames?.[stg.key] || stg.title,
      stage: stg.stage,
      matches,
    });
  });

  // Link advancement paths between rounds
  for (let r = 0; r < rounds.length - 1; r++) {
    const currentRound = rounds[r];
    const nextRound = rounds[r + 1];

    currentRound.matches.forEach((node, idx) => {
      const nextMatchIdx = Math.floor(idx / 2);
      const isHome = idx % 2 === 0;
      const targetNextNode = nextRound.matches[nextMatchIdx];

      if (targetNextNode) {
        node.nextMatchNodeId = targetNextNode.id;
        node.nextMatchSlot = isHome ? 'HOME' : 'AWAY';
        if (isHome) {
          targetNextNode.homeTeamPlaceholder = `Winner ${node.title}`;
        } else {
          targetNextNode.awayTeamPlaceholder = `Winner ${node.title}`;
        }
      }
    });
  }

  // 3rd Place Bronze Medal Match
  const hasThirdPlace = options.hasThirdPlaceMatch !== undefined ? options.hasThirdPlaceMatch : true;
  if (hasThirdPlace && rounds.length >= 2) {
    const semiRound = rounds.find((r) => r.stage === 'SEMI_FINAL');
    if (semiRound && semiRound.matches.length === 2) {
      const finalRound = rounds.find((r) => r.stage === 'FINAL');
      const bronzeDate = finalRound?.matches[0]?.matchDate || baseDate.toISOString().split('T')[0];

      const thirdPlaceNode: KnockoutMatchNode = {
        id: 'third_place_m1',
        stage: 'THIRD_PLACE',
        roundNumber: rounds.length,
        matchNumber: 1,
        title: '3rd Place Bronze Medal Match',
        homeTeamPlaceholder: 'Loser Semi Final 1',
        awayTeamPlaceholder: 'Loser Semi Final 2',
        status: 'SCHEDULED',
        isThirdPlaceMatch: true,
        matchDate: bronzeDate,
        matchTime: '13:00',
        venue: defaultVenue,
        ground: defaultGround,
      };

      semiRound.matches[0].loserNextMatchNodeId = thirdPlaceNode.id;
      semiRound.matches[0].loserNextMatchSlot = 'HOME';
      semiRound.matches[1].loserNextMatchNodeId = thirdPlaceNode.id;
      semiRound.matches[1].loserNextMatchSlot = 'AWAY';

      rounds.push({
        roundKey: 'third_place',
        title: '3rd Place Match',
        stage: 'THIRD_PLACE',
        matches: [thirdPlaceNode],
      });
      nodeMap.set(thirdPlaceNode.id, thirdPlaceNode);
    }
  }

  // Seed first round nodes
  const firstRound = rounds[0];
  const seedingMethod = options.seedingMethod || 'GROUP_CROSSOVER';

  if (firstRound) {
    if (seedingMethod === 'GROUP_CROSSOVER' && qualifiedByGroup.length === 2 && firstRound.matches.length === 2) {
      // 2 Groups -> Semi-Finals: A1 vs B2, B1 vs A2
      const grpA = qualifiedByGroup[0];
      const grpB = qualifiedByGroup[1];
      const a1 = grpA.teams.find((t) => t.rank === 1)?.team || seeds[0];
      const a2 = grpA.teams.find((t) => t.rank === 2)?.team || seeds[2];
      const b1 = grpB.teams.find((t) => t.rank === 1)?.team || seeds[1];
      const b2 = grpB.teams.find((t) => t.rank === 2)?.team || seeds[3];

      const m1 = firstRound.matches[0];
      const m2 = firstRound.matches[1];

      m1.homeTeamPlaceholder = 'Winner Group A';
      m1.awayTeamPlaceholder = 'Runner-up Group B';
      m1.homeSeed = 1;
      m1.awaySeed = 4;
      if (a1) { m1.homeTeamId = getSeedTeamId(a1); m1.homeTeamName = getSeedTeamName(a1); m1.homeTeamLogoUrl = getSeedTeamLogo(a1); }
      if (b2) { m1.awayTeamId = getSeedTeamId(b2); m1.awayTeamName = getSeedTeamName(b2); m1.awayTeamLogoUrl = getSeedTeamLogo(b2); }

      m2.homeTeamPlaceholder = 'Winner Group B';
      m2.awayTeamPlaceholder = 'Runner-up Group A';
      m2.homeSeed = 2;
      m2.awaySeed = 3;
      if (b1) { m2.homeTeamId = getSeedTeamId(b1); m2.homeTeamName = getSeedTeamName(b1); m2.homeTeamLogoUrl = getSeedTeamLogo(b1); }
      if (a2) { m2.awayTeamId = getSeedTeamId(a2); m2.awayTeamName = getSeedTeamName(a2); m2.awayTeamLogoUrl = getSeedTeamLogo(a2); }
    } else if (seedingMethod === 'GROUP_CROSSOVER' && qualifiedByGroup.length === 2 && firstRound.matches.length === 4) {
      // 2 Groups -> Quarter Finals (Top 4 each): A1 vs B4, B2 vs A3, B1 vs A4, A2 vs B3
      const grpA = qualifiedByGroup[0];
      const grpB = qualifiedByGroup[1];
      const a = (rank: number) => grpA.teams.find((t) => t.rank === rank)?.team;
      const b = (rank: number) => grpB.teams.find((t) => t.rank === rank)?.team;

      const qfPairs = [
        { hName: 'Group A Winner', aName: 'Group B 4th Place', hTeam: a(1), aTeam: b(4), hSeed: 1, aSeed: 8 },
        { hName: 'Group B Runner-up', aName: 'Group A 3rd Place', hTeam: b(2), aTeam: a(3), hSeed: 4, aSeed: 5 },
        { hName: 'Group B Winner', aName: 'Group A 4th Place', hTeam: b(1), aTeam: a(4), hSeed: 2, aSeed: 7 },
        { hName: 'Group A Runner-up', aName: 'Group B 3rd Place', hTeam: a(2), aTeam: b(3), hSeed: 3, aSeed: 6 },
      ];

      firstRound.matches.forEach((node, idx) => {
        const pair = qfPairs[idx];
        if (pair) {
          node.homeTeamPlaceholder = pair.hName;
          node.awayTeamPlaceholder = pair.aName;
          node.homeSeed = pair.hSeed;
          node.awaySeed = pair.aSeed;
          if (pair.hTeam) { node.homeTeamId = pair.hTeam.id; node.homeTeamName = pair.hTeam.name; node.homeTeamLogoUrl = pair.hTeam.logoUrl; }
          if (pair.aTeam) { node.awayTeamId = pair.aTeam.id; node.awayTeamName = pair.aTeam.name; node.awayTeamLogoUrl = pair.aTeam.logoUrl; }
        }
      });
    } else if (seedingMethod === 'GROUP_CROSSOVER' && qualifiedByGroup.length === 4 && firstRound.matches.length === 4) {
      // 4 Groups (A, B, C, D) -> Quarter Finals: A1 vs B2, C1 vs D2, B1 vs A2, D1 vs C2
      const grp = (idx: number) => qualifiedByGroup[idx];
      const gTeam = (gIdx: number, rank: number) => grp(gIdx)?.teams.find((t) => t.rank === rank)?.team;

      const qfPairs = [
        { hName: 'Group A Winner', aName: 'Group B Runner-up', hTeam: gTeam(0, 1), aTeam: gTeam(1, 2), hSeed: 1, aSeed: 8 },
        { hName: 'Group C Winner', aName: 'Group D Runner-up', hTeam: gTeam(2, 1), aTeam: gTeam(3, 2), hSeed: 4, aSeed: 5 },
        { hName: 'Group B Winner', aName: 'Group A Runner-up', hTeam: gTeam(1, 1), aTeam: gTeam(0, 2), hSeed: 2, aSeed: 7 },
        { hName: 'Group D Winner', aName: 'Group C Runner-up', hTeam: gTeam(3, 1), aTeam: gTeam(2, 2), hSeed: 3, aSeed: 6 },
      ];

      firstRound.matches.forEach((node, idx) => {
        const pair = qfPairs[idx];
        if (pair) {
          node.homeTeamPlaceholder = pair.hName;
          node.awayTeamPlaceholder = pair.aName;
          node.homeSeed = pair.hSeed;
          node.awaySeed = pair.aSeed;
          if (pair.hTeam) { node.homeTeamId = pair.hTeam.id; node.homeTeamName = pair.hTeam.name; node.homeTeamLogoUrl = pair.hTeam.logoUrl; }
          if (pair.aTeam) { node.awayTeamId = pair.aTeam.id; node.awayTeamName = pair.aTeam.name; node.awayTeamLogoUrl = pair.aTeam.logoUrl; }
        }
      });
    } else {
      // Standard Seed Pairing (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6, etc.)
      firstRound.matches.forEach((node, idx) => {
        const pair = pairings[idx] || [idx * 2 + 1, idx * 2 + 2];
        const s1 = pair[0];
        const s2 = pair[1];

        node.homeSeed = s1;
        node.awaySeed = s2;
        node.homeTeamPlaceholder = `Seed #${s1}`;
        node.awayTeamPlaceholder = `Seed #${s2}`;

        const t1 = seeds[s1 - 1];
        const t2 = seeds[s2 - 1];

        if (t1) {
          node.homeTeamId = t1.teamId;
          node.homeTeamName = t1.teamName;
          node.homeTeamLogoUrl = t1.teamLogoUrl;
        }

        // Check if team 1 gets a BYE (s2 has no team or s1 is in byeSeedSet)
        if (!t2 || (byeSeedSet.has(s1) && byeCount > 0)) {
          node.isBye = true;
          node.byeTeamId = t1?.teamId;
          node.byeTeamName = t1?.teamName;
          node.awayTeamPlaceholder = 'BYE (Auto Advance)';
          node.status = 'COMPLETED';
          node.winnerTeamId = t1?.teamId;
          node.winnerTeamName = t1?.teamName;

          if (t1) {
            byesList.push({
              teamId: t1.teamId,
              teamName: t1.teamName,
              seed: s1,
              targetNodeId: node.nextMatchNodeId || '',
            });
          }
        } else if (t2) {
          node.awayTeamId = t2.teamId;
          node.awayTeamName = t2.teamName;
          node.awayTeamLogoUrl = t2.teamLogoUrl;
        }
      });
    }
  }

  // Resolve immediate BYE advancements into round 2
  if (rounds.length > 1 && byesList.length > 0) {
    firstRound.matches.forEach((node) => {
      if (node.isBye && node.winnerTeamId && node.nextMatchNodeId) {
        const nextRound = rounds[1];
        const target = nextRound?.matches.find((m) => m.id === node.nextMatchNodeId);
        if (target) {
          if (node.nextMatchSlot === 'HOME' || !target.homeTeamId) {
            target.homeTeamId = node.winnerTeamId;
            target.homeTeamName = node.winnerTeamName;
            target.homeTeamLogoUrl = node.homeTeamLogoUrl;
            target.homeSeed = node.homeSeed;
          } else {
            target.awayTeamId = node.winnerTeamId;
            target.awayTeamName = node.winnerTeamName;
            target.awayTeamLogoUrl = node.homeTeamLogoUrl;
            target.awaySeed = node.homeSeed;
          }
        }
      }
    });
  }

  // Create real Match entities in db.matches if requested
  const createMatches = options.createMatchEntities !== undefined ? options.createMatchEntities : true;
  if (createMatches) {
    rounds.forEach((rnd) => {
      rnd.matches.forEach((node) => {
        if (node.isBye) return; // Do not create match entity for a free BYE

        // Look for existing match if preserving played matches
        let existingMatch: Match | undefined;
        if (options.preservePlayedMatches && existingBracket) {
          const oldNode = existingBracket.rounds
            .flatMap((r) => r.matches)
            .find((m) => m.id === node.id);
          if (oldNode?.matchId) {
            existingMatch = db.matches.find((m) => m.id === oldNode.matchId);
          }
        }

        if (existingMatch && (existingMatch.status === 'LIVE' || existingMatch.status === 'COMPLETED')) {
          // Preserve existing played match
          node.matchId = existingMatch.id;
          node.homeTeamId = existingMatch.teamAId;
          node.awayTeamId = existingMatch.teamBId;
          node.homeTeamName = db.teams.find((t) => t.id === existingMatch?.teamAId)?.name;
          node.awayTeamName = db.teams.find((t) => t.id === existingMatch?.teamBId)?.name;
          node.status = existingMatch.status;
          node.matchDate = existingMatch.date;
          node.matchTime = existingMatch.time;
          node.venue = existingMatch.venue;
          node.ground = existingMatch.ground;
        } else {
          // Create or update match entity
          const matchId = node.matchId || crypto.randomUUID();
          node.matchId = matchId;

          const teamA = db.teams.find((t) => t.id === node.homeTeamId);
          const teamB = db.teams.find((t) => t.id === node.awayTeamId);

          const matchName = teamA && teamB
            ? `${teamA.name} vs ${teamB.name}`
            : `${node.title} (${node.homeTeamName || 'TBD'} vs ${node.awayTeamName || 'TBD'})`;

          const newMatch: Match = {
            id: matchId,
            tournamentId: tournament.id,
            groupId: '',
            sport: tournament.sport,
            name: matchName,
            matchNumber: `KO-${node.stage.substring(0, 2)}-${node.matchNumber}`,
            round: node.title,
            teamAId: node.homeTeamId || '',
            teamBId: node.awayTeamId || '',
            date: node.matchDate || baseDate.toISOString().split('T')[0],
            time: node.matchTime || '15:00',
            venue: node.venue || defaultVenue,
            ground: node.ground || defaultGround,
            description: `${tournament.name} - ${node.title}`,
            status: 'SCHEDULED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          applySportConfig(newMatch, tournament);

          // Upsert match in db.matches
          const existingIdx = db.matches.findIndex((m) => m.id === matchId);
          if (existingIdx >= 0) {
            db.matches[existingIdx] = newMatch;
          } else {
            db.matches.push(newMatch);
          }
        }
      });
    });
  }

  // Build audit log entries
  const auditLogs: KnockoutAuditLogItem[] = [
    {
      id: crypto.randomUUID(),
      tournamentId: tournament.id,
      action: existingBracket ? 'BRACKET_REGENERATED' : 'BRACKET_GENERATED',
      details: `Generated knockout bracket starting at ${stage} with ${rounds.length} rounds, ${seeds.length} seeded teams, and ${byesList.length} BYEs.`,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userName: user?.name || 'Administrator',
    },
  ];

  if (byesList.length > 0) {
    byesList.forEach((bye) => {
      auditLogs.push({
        id: crypto.randomUUID(),
        tournamentId: tournament.id,
        action: 'BYE_ASSIGNED',
        details: `Assigned Round 1 BYE to Seed #${bye.seed} (${bye.teamName}) and automatically advanced to next round.`,
        timestamp: new Date().toISOString(),
        userId: user?.id,
        userName: user?.name || 'System Auto Seeder',
      });
    });
  }

  const bracket: KnockoutBracket = {
    id: existingBracket?.id || crypto.randomUUID(),
    tournamentId: tournament.id,
    name: `${tournament.name} Knockout Championship Bracket`,
    status: 'ACTIVE',
    format: 'SINGLE_ELIMINATION',
    startingStage: stage as any,
    hasThirdPlaceMatch: hasThirdPlace,
    seedingMethod,
    crossGroupRestrictions: Boolean(options.crossGroupRestrictions),
    sameGroupProtection: Boolean(options.sameGroupProtection),
    rounds,
    seeds,
    byes: byesList,
    auditLogs: [...auditLogs, ...(existingBracket?.auditLogs || [])],
    updatedAt: new Date().toISOString(),
  };

  if (existingBracketIdx >= 0) {
    db.knockout_brackets[existingBracketIdx] = bracket;
  } else {
    db.knockout_brackets.push(bracket);
  }

  saveDatabase();

  addAuditLog(
    'TOURNAMENT_UPDATE',
    `Knockout Bracket generated for tournament "${tournament.name}" (${rounds.length} rounds, ${seeds.length} seeds)`,
    user
  );

  return bracket;
}

/**
 * Synchronize all match results, live scores, winners, and automatic advancement
 */
export function syncKnockoutBracket(
  tournamentId: string,
  user?: { id?: string; name: string; email?: string }
): KnockoutBracket | null {
  const db = getDb();
  if (!db.knockout_brackets) return null;

  const bracket = db.knockout_brackets.find((b: any) => b.tournamentId === tournamentId) as KnockoutBracket | undefined;
  if (!bracket) return null;

  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const tournament = db.tournaments.find((t) => t.id === tournamentId);

  let modified = false;

  bracket.rounds.forEach((round, roundIdx) => {
    round.matches.forEach((node) => {
      if (node.isBye) return;

      let nodeMatch: Match | undefined;
      if (node.matchId) {
        nodeMatch = matches.find((m) => m.id === node.matchId);
      } else if (node.homeTeamId && node.awayTeamId) {
        nodeMatch = matches.find(
          (m) =>
            ((m.teamAId === node.homeTeamId && m.teamBId === node.awayTeamId) ||
              (m.teamAId === node.awayTeamId && m.teamBId === node.homeTeamId)) &&
            (m.round?.toLowerCase().includes(round.stage.toLowerCase()) ||
              m.round?.toLowerCase().includes('final') ||
              m.round?.toLowerCase().includes('semi') ||
              m.round?.toLowerCase().includes('qualifier') ||
              m.description?.toLowerCase().includes(node.title.toLowerCase()))
        );
        if (nodeMatch) {
          node.matchId = nodeMatch.id;
          modified = true;
        }
      }

      if (nodeMatch) {
        node.status = nodeMatch.status;
        node.matchDate = nodeMatch.date;
        node.matchTime = nodeMatch.time;
        node.venue = nodeMatch.venue;
        node.ground = nodeMatch.ground;

        // Extract score and sport-specific outcome
        const res = extractStandingMatchResult(nodeMatch);

        const isHomeTeamA = nodeMatch.teamAId === node.homeTeamId;
        node.homeTeamScore = isHomeTeamA ? res.teamAScore : res.teamBScore;
        node.awayTeamScore = isHomeTeamA ? res.teamBScore : res.teamAScore;

        // Team logos
        const homeTeam = db.teams.find((t) => t.id === node.homeTeamId);
        const awayTeam = db.teams.find((t) => t.id === node.awayTeamId);
        if (homeTeam?.logoUrl) node.homeTeamLogoUrl = homeTeam.logoUrl;
        if (awayTeam?.logoUrl) node.awayTeamLogoUrl = awayTeam.logoUrl;

        // Check if COMPLETED
        if (nodeMatch.status === 'COMPLETED' && !res.isCancelled && !res.isNoResult) {
          if (res.isDraw || res.isTie || !res.winnerTeamId) {
            // TIE DETECTED — flag for admin action! Do NOT auto advance
            node.isTie = true;
            node.tieRequiresAdminAction = true;
            node.tieReason = `Match finished in a tie (${node.homeTeamScore} - ${node.awayTeamScore}). Administrator winner selection required.`;
          } else {
            node.isTie = false;
            node.tieRequiresAdminAction = false;
            node.winnerTeamId = res.winnerTeamId;

            const winnerTeam = db.teams.find((t) => t.id === res.winnerTeamId);
            const loserTeamId = res.winnerTeamId === node.homeTeamId ? node.awayTeamId : node.homeTeamId;
            const loserTeam = db.teams.find((t) => t.id === loserTeamId);

            node.winnerTeamName = winnerTeam?.name;
            node.loserTeamId = loserTeamId;
            node.loserTeamName = loserTeam?.name;

            // Advance Winner to next round node
            if (node.nextMatchNodeId) {
              const nextRound = bracket.rounds[roundIdx + 1];
              if (nextRound) {
                const targetNode = nextRound.matches.find((m) => m.id === node.nextMatchNodeId);
                if (targetNode) {
                  const isHomeSlot = node.nextMatchSlot === 'HOME' || (!targetNode.homeTeamId && targetNode.awayTeamId !== winnerTeam?.id);

                  if (isHomeSlot) {
                    if (targetNode.homeTeamId !== winnerTeam?.id) {
                      targetNode.homeTeamId = winnerTeam?.id;
                      targetNode.homeTeamName = winnerTeam?.name;
                      targetNode.homeTeamLogoUrl = winnerTeam?.logoUrl;
                      targetNode.homeSeed = node.homeTeamId === winnerTeam?.id ? node.homeSeed : node.awaySeed;
                      modified = true;

                      // Also update underlying match entity if one already exists
                      if (targetNode.matchId) {
                        const targetMatch = db.matches.find((m) => m.id === targetNode.matchId);
                        if (targetMatch && targetMatch.status !== 'LIVE' && targetMatch.status !== 'COMPLETED') {
                          targetMatch.teamAId = winnerTeam?.id || '';
                          const opponentTeam = db.teams.find((t) => t.id === targetMatch.teamBId);
                          targetMatch.name = opponentTeam ? `${winnerTeam?.name} vs ${opponentTeam.name}` : targetNode.title;
                          targetMatch.updatedAt = new Date().toISOString();
                        }
                      }
                    }
                  } else {
                    if (targetNode.awayTeamId !== winnerTeam?.id) {
                      targetNode.awayTeamId = winnerTeam?.id;
                      targetNode.awayTeamName = winnerTeam?.name;
                      targetNode.awayTeamLogoUrl = winnerTeam?.logoUrl;
                      targetNode.awaySeed = node.homeTeamId === winnerTeam?.id ? node.homeSeed : node.awaySeed;
                      modified = true;

                      // Also update underlying match entity if one already exists
                      if (targetNode.matchId) {
                        const targetMatch = db.matches.find((m) => m.id === targetNode.matchId);
                        if (targetMatch && targetMatch.status !== 'LIVE' && targetMatch.status !== 'COMPLETED') {
                          targetMatch.teamBId = winnerTeam?.id || '';
                          const opponentTeam = db.teams.find((t) => t.id === targetMatch.teamAId);
                          targetMatch.name = opponentTeam ? `${opponentTeam.name} vs ${winnerTeam?.name}` : targetNode.title;
                          targetMatch.updatedAt = new Date().toISOString();
                        }
                      }
                    }
                  }
                }
              }
            }

            // Advance Loser to 3rd Place Match if enabled
            if (node.loserNextMatchNodeId && loserTeam) {
              const thirdPlaceRound = bracket.rounds.find((r) => r.stage === 'THIRD_PLACE');
              if (thirdPlaceRound && thirdPlaceRound.matches[0]) {
                const tpNode = thirdPlaceRound.matches[0];
                const isHomeSlot = node.loserNextMatchSlot === 'HOME' || !tpNode.homeTeamId;

                if (isHomeSlot) {
                  if (tpNode.homeTeamId !== loserTeam.id) {
                    tpNode.homeTeamId = loserTeam.id;
                    tpNode.homeTeamName = loserTeam.name;
                    tpNode.homeTeamLogoUrl = loserTeam.logoUrl;
                    modified = true;

                    if (tpNode.matchId) {
                      const tpMatch = db.matches.find((m) => m.id === tpNode.matchId);
                      if (tpMatch && tpMatch.status !== 'LIVE' && tpMatch.status !== 'COMPLETED') {
                        tpMatch.teamAId = loserTeam.id;
                        tpMatch.updatedAt = new Date().toISOString();
                      }
                    }
                  }
                } else {
                  if (tpNode.awayTeamId !== loserTeam.id) {
                    tpNode.awayTeamId = loserTeam.id;
                    tpNode.awayTeamName = loserTeam.name;
                    tpNode.awayTeamLogoUrl = loserTeam.logoUrl;
                    modified = true;

                    if (tpNode.matchId) {
                      const tpMatch = db.matches.find((m) => m.id === tpNode.matchId);
                      if (tpMatch && tpMatch.status !== 'LIVE' && tpMatch.status !== 'COMPLETED') {
                        tpMatch.teamBId = loserTeam.id;
                        tpMatch.updatedAt = new Date().toISOString();
                      }
                    }
                  }
                }
              }
            }

            // If this is the Championship Final, declare Champion & Runner-up!
            if (node.stage === 'FINAL' && winnerTeam) {
              bracket.championTeamId = winnerTeam.id;
              bracket.championTeamName = winnerTeam.name;
              bracket.championTeamLogoUrl = winnerTeam.logoUrl;

              if (loserTeam) {
                bracket.runnerUpTeamId = loserTeam.id;
                bracket.runnerUpTeamName = loserTeam.name;
                bracket.runnerUpTeamLogoUrl = loserTeam.logoUrl;
              }

              // Check if bronze match is completed or not needed
              const thirdPlaceRound = bracket.rounds.find((r) => r.stage === 'THIRD_PLACE');
              const isBronzeDone = !thirdPlaceRound || thirdPlaceRound.matches[0]?.status === 'COMPLETED';

              if (isBronzeDone) {
                bracket.status = 'COMPLETED';
                if (tournament && tournament.status !== 'COMPLETED') {
                  tournament.status = 'COMPLETED';
                  tournament.championTeamId = winnerTeam.id;
                  tournament.championTeamName = winnerTeam.name;
                  tournament.runnerUpTeamId = loserTeam?.id;
                  tournament.runnerUpTeamName = loserTeam?.name;
                  tournament.completedAt = new Date().toISOString();
                  modified = true;
                }
              }
            }

            // If 3rd Place Match completed, store 3rd & 4th place
            if (node.stage === 'THIRD_PLACE' && winnerTeam) {
              bracket.thirdPlaceTeamId = winnerTeam.id;
              bracket.thirdPlaceTeamName = winnerTeam.name;
              bracket.thirdPlaceTeamLogoUrl = winnerTeam.logoUrl;

              if (loserTeam) {
                bracket.fourthPlaceTeamId = loserTeam.id;
                bracket.fourthPlaceTeamName = loserTeam.name;
                bracket.fourthPlaceTeamLogoUrl = loserTeam.logoUrl;
              }

              if (tournament) {
                tournament.thirdPlaceTeamId = winnerTeam.id;
                tournament.thirdPlaceTeamName = winnerTeam.name;
              }
              modified = true;
            }
          }
        }
      }
    });
  });

  if (modified) {
    bracket.updatedAt = new Date().toISOString();
    saveDatabase();
  }

  return bracket;
}

/**
 * Manually advance a team or override winner for a knockout match node
 */
export function advanceWinner(
  tournamentId: string,
  nodeId: string,
  winnerTeamId: string,
  user?: User | { id?: string; name: string; email?: string },
  reason?: string
): { success: boolean; message: string; bracket: KnockoutBracket } {
  const db = getDb();
  if (!db.knockout_brackets) db.knockout_brackets = [];

  const bracket = db.knockout_brackets.find((b: any) => b.tournamentId === tournamentId) as KnockoutBracket | undefined;
  if (!bracket) throw new Error('Knockout bracket not found');

  let targetNode: KnockoutMatchNode | undefined;
  let targetRoundIdx = -1;

  bracket.rounds.forEach((round, rIdx) => {
    const node = round.matches.find((m) => m.id === nodeId);
    if (node) {
      targetNode = node;
      targetRoundIdx = rIdx;
    }
  });

  if (!targetNode) throw new Error(`Knockout match node "${nodeId}" not found`);

  const winnerTeam = db.teams.find((t) => t.id === winnerTeamId);
  if (!winnerTeam) throw new Error(`Team with ID "${winnerTeamId}" not found`);

  const prevWinnerId = targetNode.winnerTeamId;
  const prevWinnerName = targetNode.winnerTeamName;

  targetNode.winnerTeamId = winnerTeam.id;
  targetNode.winnerTeamName = winnerTeam.name;
  targetNode.status = 'COMPLETED';
  targetNode.isTie = false;
  targetNode.tieRequiresAdminAction = false;

  const loserId = winnerTeam.id === targetNode.homeTeamId ? targetNode.awayTeamId : targetNode.homeTeamId;
  const loserTeam = db.teams.find((t) => t.id === loserId);
  targetNode.loserTeamId = loserId;
  targetNode.loserTeamName = loserTeam?.name;

  // Record audit log
  if (!bracket.auditLogs) bracket.auditLogs = [];
  bracket.auditLogs.unshift({
    id: crypto.randomUUID(),
    tournamentId,
    action: prevWinnerId ? 'WINNER_OVERRIDDEN' : 'TEAM_ADVANCED',
    details: `Advanced "${winnerTeam.name}" as winner of ${targetNode.title}.${reason ? ` Reason: ${reason}` : ''}`,
    timestamp: new Date().toISOString(),
    userId: user?.id,
    userName: user?.name || 'Administrator',
    nodeId: targetNode.id,
    previousState: { winnerTeamId: prevWinnerId, winnerTeamName: prevWinnerName },
    newState: { winnerTeamId: winnerTeam.id, winnerTeamName: winnerTeam.name },
  });

  // Advance winner to next round node
  if (targetNode.nextMatchNodeId) {
    const nextRound = bracket.rounds[targetRoundIdx + 1];
    if (nextRound) {
      const nextNode = nextRound.matches.find((m) => m.id === targetNode.nextMatchNodeId);
      if (nextNode) {
        if (targetNode.nextMatchSlot === 'HOME' || !nextNode.homeTeamId) {
          nextNode.homeTeamId = winnerTeam.id;
          nextNode.homeTeamName = winnerTeam.name;
          nextNode.homeTeamLogoUrl = winnerTeam.logoUrl;
        } else {
          nextNode.awayTeamId = winnerTeam.id;
          nextNode.awayTeamName = winnerTeam.name;
          nextNode.awayTeamLogoUrl = winnerTeam.logoUrl;
        }
      }
    }
  }

  // Advance loser to 3rd place match if applicable
  if (targetNode.loserNextMatchNodeId && loserTeam) {
    const thirdPlaceRound = bracket.rounds.find((r) => r.stage === 'THIRD_PLACE');
    if (thirdPlaceRound && thirdPlaceRound.matches[0]) {
      const tpNode = thirdPlaceRound.matches[0];
      if (targetNode.loserNextMatchSlot === 'HOME' || !tpNode.homeTeamId) {
        tpNode.homeTeamId = loserTeam.id;
        tpNode.homeTeamName = loserTeam.name;
        tpNode.homeTeamLogoUrl = loserTeam.logoUrl;
      } else {
        tpNode.awayTeamId = loserTeam.id;
        tpNode.awayTeamName = loserTeam.name;
        tpNode.awayTeamLogoUrl = loserTeam.logoUrl;
      }
    }
  }

  // Check championship completion
  if (targetNode.stage === 'FINAL') {
    bracket.championTeamId = winnerTeam.id;
    bracket.championTeamName = winnerTeam.name;
    bracket.championTeamLogoUrl = winnerTeam.logoUrl;
    if (loserTeam) {
      bracket.runnerUpTeamId = loserTeam.id;
      bracket.runnerUpTeamName = loserTeam.name;
      bracket.runnerUpTeamLogoUrl = loserTeam.logoUrl;
    }
    bracket.status = 'COMPLETED';

    const tournament = db.tournaments.find((t) => t.id === tournamentId);
    if (tournament) {
      tournament.status = 'COMPLETED';
      tournament.championTeamId = winnerTeam.id;
      tournament.championTeamName = winnerTeam.name;
      tournament.runnerUpTeamId = loserTeam?.id;
      tournament.runnerUpTeamName = loserTeam?.name;
      tournament.completedAt = new Date().toISOString();
    }
  }

  bracket.updatedAt = new Date().toISOString();
  saveDatabase();

  return {
    success: true,
    message: `Team "${winnerTeam.name}" advanced successfully.`,
    bracket,
  };
}

/**
 * Resolve a tied knockout match with admin decision / tie-break method
 */
export function resolveTie(
  tournamentId: string,
  nodeId: string,
  winnerTeamId: string,
  resolutionMethod: string,
  user?: User | { id?: string; name: string; email?: string }
): { success: boolean; message: string; bracket: KnockoutBracket } {
  return advanceWinner(tournamentId, nodeId, winnerTeamId, user, `Tie resolved via ${resolutionMethod}`);
}

/**
 * Resolve an unfulfilled BYE position manually
 */
export function resolveBye(
  tournamentId: string,
  nodeId: string,
  user?: User | { id?: string; name: string; email?: string }
): { success: boolean; message: string; bracket: KnockoutBracket } {
  const db = getDb();
  const bracket = db.knockout_brackets?.find((b: any) => b.tournamentId === tournamentId) as KnockoutBracket | undefined;
  if (!bracket) throw new Error('Knockout bracket not found');

  let node: KnockoutMatchNode | undefined;
  bracket.rounds.forEach((r) => {
    const n = r.matches.find((m) => m.id === nodeId);
    if (n) node = n;
  });

  if (!node) throw new Error('Match node not found');
  const advancingTeamId = node.homeTeamId || node.awayTeamId;
  if (!advancingTeamId) throw new Error('No team present in node to advance via BYE');

  return advanceWinner(tournamentId, nodeId, advancingTeamId, user, 'Manual BYE Resolution');
}

/**
 * Recalculate and cascade bracket updates safely
 */
export function recalculateBracket(
  tournamentId: string,
  options: { preservePlayedMatches?: boolean } = { preservePlayedMatches: true },
  user?: User | { id?: string; name: string; email?: string }
): { success: boolean; message: string; bracket: KnockoutBracket } {
  const syncResult = syncKnockoutBracket(tournamentId, user);
  if (!syncResult) throw new Error('Knockout bracket not found for recalculation');

  return {
    success: true,
    message: 'Knockout bracket recalculated and synchronized with official match scores.',
    bracket: syncResult,
  };
}

/**
 * Explicitly declare tournament champion, runner-up, and 3rd place
 */
export function declareChampion(
  tournamentId: string,
  data: { championTeamId: string; runnerUpTeamId?: string; thirdPlaceTeamId?: string },
  user?: User | { id?: string; name: string; email?: string }
): { success: boolean; message: string; summary: ChampionshipSummary } {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const champion = db.teams.find((t) => t.id === data.championTeamId);
  if (!champion) throw new Error('Champion team not found');

  const runnerUp = data.runnerUpTeamId ? db.teams.find((t) => t.id === data.runnerUpTeamId) : undefined;
  const thirdPlace = data.thirdPlaceTeamId ? db.teams.find((t) => t.id === data.thirdPlaceTeamId) : undefined;

  tournament.championTeamId = champion.id;
  tournament.championTeamName = champion.name;
  if (runnerUp) {
    tournament.runnerUpTeamId = runnerUp.id;
    tournament.runnerUpTeamName = runnerUp.name;
  }
  if (thirdPlace) {
    tournament.thirdPlaceTeamId = thirdPlace.id;
    tournament.thirdPlaceTeamName = thirdPlace.name;
  }
  tournament.status = 'COMPLETED';
  tournament.completedAt = new Date().toISOString();
  tournament.updatedAt = new Date().toISOString();

  // Sync back to bracket
  const bracket = db.knockout_brackets?.find((b: any) => b.tournamentId === tournamentId) as KnockoutBracket | undefined;
  if (bracket) {
    bracket.championTeamId = champion.id;
    bracket.championTeamName = champion.name;
    bracket.championTeamLogoUrl = champion.logoUrl;
    if (runnerUp) {
      bracket.runnerUpTeamId = runnerUp.id;
      bracket.runnerUpTeamName = runnerUp.name;
      bracket.runnerUpTeamLogoUrl = runnerUp.logoUrl;
    }
    if (thirdPlace) {
      bracket.thirdPlaceTeamId = thirdPlace.id;
      bracket.thirdPlaceTeamName = thirdPlace.name;
      bracket.thirdPlaceTeamLogoUrl = thirdPlace.logoUrl;
    }
    bracket.status = 'COMPLETED';
    bracket.updatedAt = new Date().toISOString();

    if (!bracket.auditLogs) bracket.auditLogs = [];
    bracket.auditLogs.unshift({
      id: crypto.randomUUID(),
      tournamentId,
      action: 'CHAMPION_DECLARED',
      details: `Declared "${champion.name}" as Tournament Champion. Runner-up: "${runnerUp?.name || 'N/A'}", 3rd Place: "${thirdPlace?.name || 'N/A'}".`,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userName: user?.name || 'Administrator',
    });
  }

  saveDatabase();

  addAuditLog(
    'TOURNAMENT_UPDATE',
    `Declared Champion "${champion.name}" for tournament "${tournament.name}". Tournament marked COMPLETED.`,
    user
  );

  const summary = getChampionshipSummary(tournamentId);
  return {
    success: true,
    message: `Tournament completed! Champion declared: ${champion.name}`,
    summary,
  };
}

/**
 * Reopen a completed tournament with audit log
 */
export function reopenTournament(
  tournamentId: string,
  reason: string = 'Administrator reopened tournament for scoring adjustments',
  user?: User | { id?: string; name: string; email?: string }
): { success: boolean; message: string; tournament: Tournament } {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  tournament.status = 'LIVE';
  tournament.updatedAt = new Date().toISOString();

  const bracket = db.knockout_brackets?.find((b: any) => b.tournamentId === tournamentId) as KnockoutBracket | undefined;
  if (bracket) {
    bracket.status = 'ACTIVE';
    bracket.updatedAt = new Date().toISOString();
    if (!bracket.auditLogs) bracket.auditLogs = [];
    bracket.auditLogs.unshift({
      id: crypto.randomUUID(),
      tournamentId,
      action: 'TOURNAMENT_REOPENED',
      details: `Tournament status reopened from COMPLETED to LIVE. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userName: user?.name || 'Administrator',
    });
  }

  saveDatabase();

  addAuditLog(
    'TOURNAMENT_UPDATE',
    `Tournament "${tournament.name}" reopened by administrator. Reason: ${reason}`,
    user
  );

  return {
    success: true,
    message: `Tournament "${tournament.name}" reopened successfully.`,
    tournament,
  };
}

/**
 * Validate bracket consistency and integrity
 */
export function validateBracket(bracket: KnockoutBracket): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    errors.push('Bracket has no rounds defined.');
    return { isValid: false, errors, warnings };
  }

  const allNodeIds = new Set<string>();

  bracket.rounds.forEach((round, rIdx) => {
    const teamsInRound = new Set<string>();

    round.matches.forEach((node) => {
      // Duplicate node ID
      if (allNodeIds.has(node.id)) {
        errors.push(`Duplicate node ID "${node.id}" detected in round "${round.title}".`);
      }
      allNodeIds.add(node.id);

      // Same team in both home and away
      if (node.homeTeamId && node.awayTeamId && node.homeTeamId === node.awayTeamId) {
        errors.push(`Match "${node.title}" has the same team playing against itself (${node.homeTeamName}).`);
      }

      // Team appearing twice in the same round
      if (node.homeTeamId) {
        if (teamsInRound.has(node.homeTeamId)) {
          warnings.push(`Team "${node.homeTeamName}" appears multiple times in round "${round.title}".`);
        }
        teamsInRound.add(node.homeTeamId);
      }
      if (node.awayTeamId) {
        if (teamsInRound.has(node.awayTeamId)) {
          warnings.push(`Team "${node.awayTeamName}" appears multiple times in round "${round.title}".`);
        }
        teamsInRound.add(node.awayTeamId);
      }

      // Completed match without valid winner
      if (node.status === 'COMPLETED' && !node.isBye && !node.winnerTeamId) {
        warnings.push(`Match "${node.title}" is marked COMPLETED but has no winner declared (Tie/Action Required).`);
      }

      // Winner not matching either home or away
      if (node.winnerTeamId && node.winnerTeamId !== node.homeTeamId && node.winnerTeamId !== node.awayTeamId) {
        errors.push(`Match "${node.title}" has winner (${node.winnerTeamName}) that is not Team A or Team B.`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get comprehensive state of tournament bracket
 */
export function getBracketState(tournamentId: string): {
  bracket: KnockoutBracket | null;
  validation: { isValid: boolean; errors: string[]; warnings: string[] };
} {
  const db = getDb();
  syncKnockoutBracket(tournamentId);

  const bracket = (db.knockout_brackets || []).find((b: any) => b.tournamentId === tournamentId) as KnockoutBracket | undefined;
  if (!bracket) {
    return {
      bracket: null,
      validation: { isValid: true, errors: [], warnings: [] },
    };
  }

  const validation = validateBracket(bracket);
  return { bracket, validation };
}

/**
 * Generate comprehensive championship summary
 */
export function getChampionshipSummary(tournamentId: string): ChampionshipSummary {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  const bracket = (db.knockout_brackets || []).find((b: any) => b.tournamentId === tournamentId) as KnockoutBracket | undefined;

  const champTeam = tournament?.championTeamId
    ? db.teams.find((t) => t.id === tournament.championTeamId)
    : bracket?.championTeamId
    ? db.teams.find((t) => t.id === bracket.championTeamId)
    : undefined;

  const runnerTeam = tournament?.runnerUpTeamId
    ? db.teams.find((t) => t.id === tournament.runnerUpTeamId)
    : bracket?.runnerUpTeamId
    ? db.teams.find((t) => t.id === bracket.runnerUpTeamId)
    : undefined;

  const thirdTeam = tournament?.thirdPlaceTeamId
    ? db.teams.find((t) => t.id === tournament.thirdPlaceTeamId)
    : bracket?.thirdPlaceTeamId
    ? db.teams.find((t) => t.id === bracket.thirdPlaceTeamId)
    : undefined;

  const fourthTeam = bracket?.fourthPlaceTeamId ? db.teams.find((t) => t.id === bracket.fourthPlaceTeamId) : undefined;

  const finalRound = bracket?.rounds.find((r) => r.stage === 'FINAL');
  const finalMatch = finalRound?.matches[0];

  const bronzeRound = bracket?.rounds.find((r) => r.stage === 'THIRD_PLACE');
  const bronzeMatch = bronzeRound?.matches[0];

  return {
    tournamentId,
    tournamentName: tournament?.name || 'Tournament',
    sport: tournament?.sport || 'CRICKET',
    status: tournament?.status || 'LIVE',
    isCompleted: tournament?.status === 'COMPLETED' || bracket?.status === 'COMPLETED',
    champion: champTeam
      ? {
          teamId: champTeam.id,
          teamName: champTeam.name,
          teamLogoUrl: champTeam.logoUrl,
          finalScore: finalMatch?.homeTeamId === champTeam.id ? finalMatch.homeTeamScore : finalMatch?.awayTeamScore,
        }
      : undefined,
    runnerUp: runnerTeam
      ? {
          teamId: runnerTeam.id,
          teamName: runnerTeam.name,
          teamLogoUrl: runnerTeam.logoUrl,
          finalScore: finalMatch?.homeTeamId === runnerTeam.id ? finalMatch.homeTeamScore : finalMatch?.awayTeamScore,
        }
      : undefined,
    thirdPlace: thirdTeam
      ? {
          teamId: thirdTeam.id,
          teamName: thirdTeam.name,
          teamLogoUrl: thirdTeam.logoUrl,
        }
      : undefined,
    fourthPlace: fourthTeam
      ? {
          teamId: fourthTeam.id,
          teamName: fourthTeam.name,
          teamLogoUrl: fourthTeam.logoUrl,
        }
      : undefined,
    finalMatch: finalMatch
      ? {
          matchId: finalMatch.matchId,
          title: finalMatch.title,
          date: finalMatch.matchDate,
          venue: finalMatch.venue,
          scoreSummary: `${finalMatch.homeTeamName || 'Team A'} (${finalMatch.homeTeamScore ?? '-'}) vs ${finalMatch.awayTeamName || 'Team B'} (${finalMatch.awayTeamScore ?? '-'})`,
          winnerName: finalMatch.winnerTeamName,
        }
      : undefined,
    thirdPlaceMatch: bronzeMatch
      ? {
          matchId: bronzeMatch.matchId,
          title: bronzeMatch.title,
          scoreSummary: `${bronzeMatch.homeTeamName || 'Team A'} (${bronzeMatch.homeTeamScore ?? '-'}) vs ${bronzeMatch.awayTeamName || 'Team B'} (${bronzeMatch.awayTeamScore ?? '-'})`,
          winnerName: bronzeMatch.winnerTeamName,
        }
      : undefined,
    completedAt: tournament?.completedAt || bracket?.updatedAt,
  };
}
