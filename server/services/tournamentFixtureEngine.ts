import crypto from 'crypto';
import { getDb, saveDatabase } from '../db/database';
import { addAuditLog } from '../utils/logger';
import { Match, SportType, Team, Group, Tournament, User } from '../../src/types';

export interface FixtureGenerationOptions {
  tournamentId: string;
  groupId?: string; // If undefined or 'ALL', generates for all groups / entire tournament
  type?: 'SINGLE_ROUND_ROBIN' | 'DOUBLE_ROUND_ROBIN';
  rounds?: number; // 1 for single round robin, 2 for double, or custom
  homeAwayPreference?: 'BALANCED' | 'TEAM_A_HOME' | 'NEUTRAL';
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm, default '09:00'
  matchIntervalMinutes?: number; // default 120
  matchDurationMinutes?: number; // estimated duration, default 105
  breakMinutes?: number; // break between matches, default 15
  matchesPerDay?: number; // optional limit of matches per day across tournament
  daysBetweenRounds?: number; // e.g. 1 day, 0 for same day, 7 for weekly
  venues?: string[]; // list of venue names
  grounds?: string[]; // list of ground/pitch/court names
  venueAllocationStrategy?: 'ROUND_ROBIN_ROTATION' | 'CONCURRENT_VENUES' | 'SINGLE_VENUE' | 'MANUAL';
  minRestHours?: number; // default 4 hours
  enforceStrictRest?: boolean;
  clearExistingDraftFixtures?: boolean;
  customMatchConfig?: Record<string, any>;
}

export interface FixtureConflictWarning {
  type: 'VENUE_OVERLAP' | 'TEAM_FATIGUE' | 'TEAM_SIMULTANEOUS' | 'DATE_OUT_OF_RANGE';
  severity: 'ERROR' | 'WARNING';
  message: string;
  details?: string;
  affectedMatchNumbers?: string[];
}

export interface FixturePreviewItem {
  tempId: string;
  matchNumber: string;
  numericIndex: number;
  roundNumber: number;
  roundName: string;
  legNumber: number;
  groupId?: string;
  groupName?: string;
  groupCode?: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamShortName?: string;
  homeTeamLogoUrl?: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamShortName?: string;
  awayTeamLogoUrl?: string;
  date: string;
  time: string;
  venue: string;
  ground?: string;
  isBye?: boolean;
  byeTeamId?: string;
  byeTeamName?: string;
  estimatedDurationMinutes?: number;
  conflicts?: FixtureConflictWarning[];
}

export interface FixturePreviewResponse {
  fixtures: FixturePreviewItem[];
  byes: Array<{
    roundNumber: number;
    roundName: string;
    teamId: string;
    teamName: string;
    groupId?: string;
    groupName?: string;
  }>;
  conflicts: FixtureConflictWarning[];
  summary: {
    totalMatches: number;
    totalRounds: number;
    totalDays: number;
    totalVenues: number;
    startDate: string;
    estimatedEndDate: string;
    teamsCount: number;
    groupsCount: number;
    existingMatchesStats: {
      total: number;
      draft: number;
      scheduled: number;
      live: number;
      completed: number;
      cancelled: number;
    };
  };
}

/**
 * Circle Method (Berger Tables) for generating deterministic round-robin pairings
 */
interface TeamPair {
  home: Team;
  away: Team;
  isBye: boolean;
  byeTeam?: Team;
}

interface GeneratedRound {
  roundNumber: number;
  roundName: string;
  legNumber: number;
  pairs: TeamPair[];
}

export function generateCircleMethodRounds(
  teams: Team[],
  legsCount: number = 1,
  groupCode?: string
): GeneratedRound[] {
  if (teams.length < 2) return [];

  const teamList = [...teams];
  const isOdd = teamList.length % 2 !== 0;
  if (isOdd) {
    teamList.push({
      id: '__BYE__',
      name: 'BYE',
      tournamentId: teams[0].tournamentId,
      createdAt: '',
      updatedAt: '',
    } as Team);
  }

  const n = teamList.length;
  const roundsPerLeg = n - 1;
  const matchesPerRound = n / 2;
  const allRounds: GeneratedRound[] = [];

  for (let leg = 1; leg <= legsCount; leg++) {
    // Rotating array: index 0 is fixed, remaining rotate
    const rotating = [...teamList];

    for (let r = 0; r < roundsPerLeg; r++) {
      const overallRoundNum = (leg - 1) * roundsPerLeg + (r + 1);
      const roundTitle = legsCount > 1
        ? `Round ${overallRoundNum} (Leg ${leg})`
        : `Round ${r + 1}`;

      const pairs: TeamPair[] = [];

      for (let i = 0; i < matchesPerRound; i++) {
        let t1 = rotating[i];
        let t2 = rotating[n - 1 - i];

        let isBye = false;
        let byeTeam: Team | undefined;

        if (t1.id === '__BYE__') {
          isBye = true;
          byeTeam = t2;
        } else if (t2.id === '__BYE__') {
          isBye = true;
          byeTeam = t1;
        }

        // Home/Away distribution logic
        let home = t1;
        let away = t2;

        if (leg === 1) {
          // In single round robin, alternate for fixed team & other pairs
          if (i === 0) {
            if (r % 2 === 1) {
              home = t2;
              away = t1;
            }
          } else {
            if ((i + r) % 2 === 1) {
              home = t2;
              away = t1;
            }
          }
        } else {
          // Double round robin: invert the Leg 1 pairing
          if (i === 0) {
            if (r % 2 === 0) {
              home = t2;
              away = t1;
            }
          } else {
            if ((i + r) % 2 === 0) {
              home = t2;
              away = t1;
            }
          }
        }

        pairs.push({ home, away, isBye, byeTeam });
      }

      allRounds.push({
        roundNumber: overallRoundNum,
        roundName: groupCode ? `Group ${groupCode} - ${roundTitle}` : roundTitle,
        legNumber: leg,
        pairs,
      });

      // Rotate array for next round: keep rotating[0] fixed, rotate the rest clockwise
      const fixed = rotating[0];
      const last = rotating[rotating.length - 1];
      const middle = rotating.slice(1, rotating.length - 1);
      rotating.splice(0, rotating.length, fixed, last, ...middle);
    }
  }

  return allRounds;
}

/**
 * Apply sport-specific default configuration to a match
 */
export function applySportDefaultsToMatch(match: Match, tournament: Tournament, customConfig?: Record<string, any>) {
  const sport = tournament.sport;

  if (sport === 'CRICKET') {
    const overs = customConfig?.totalOvers || customConfig?.overs || tournament.cricketDefaultOvers || tournament.formatConfig?.defaultMatchConfig?.overs || 20;
    const matchType = tournament.cricketMatchFormat || (overs === 20 ? 'T20' : overs === 10 ? 'T10' : overs === 50 ? 'T50' : 'Custom Overs');
    match.cricketConfig = {
      matchType,
      overs: Number(overs),
      isOversOverridden: false,
      ballType: customConfig?.ballType || 'LEATHER_WHITE',
      pitchType: customConfig?.pitchType || 'TURF',
      boundaryInfo: customConfig?.boundaryInfo || '65-70m standard',
    };
    match.matchOvers = Number(overs);
    match.effectiveMatchOvers = Number(overs);
  } else if (sport === 'VOLLEYBALL') {
    const sets = customConfig?.totalSets || customConfig?.format || 3;
    match.volleyballConfig = {
      format: sets === 5 ? 'Best of 5' : 'Best of 3',
      pointsPerSet: customConfig?.pointsPerSet || 25,
      decidingSetPoints: customConfig?.decidingSetPoints || 15,
      winningMargin: 2,
      timeoutsPerSet: 2,
    };
  } else if (sport === 'FOOTBALL') {
    const halfDuration = customConfig?.halfDurationMinutes || customConfig?.halfDuration || 45;
    match.footballConfig = {
      matchDuration: halfDuration * 2,
      halfDuration: halfDuration,
      firstHalfDuration: halfDuration,
      secondHalfDuration: halfDuration,
      extraTimeEnabled: Boolean(customConfig?.extraTimeEnabled),
      penaltyShootoutEnabled: Boolean(customConfig?.penaltyShootoutEnabled),
    };
  } else if (sport === 'HOCKEY') {
    match.hockeyConfig = {
      matchDuration: customConfig?.matchDuration || 60,
      periods: customConfig?.periods || 4,
      periodDuration: customConfig?.periodDuration || 15,
      penaltyShootoutEnabled: true,
    };
  } else if (sport === 'KABADDI') {
    const half = customConfig?.halfDurationMinutes || 20;
    match.kabaddiConfig = {
      matchDuration: half * 2,
      firstHalfDuration: half,
      secondHalfDuration: half,
      teamSize: 7,
      substitutesCount: 5,
      superTackleActiveDefenders: 3,
      superTacklePoints: 2,
      allOutPoints: 2,
      bonusLineActive: true,
    };
  } else if (sport === 'BASKETBALL') {
    match.basketballConfig = {
      quarters: 4,
      quarterDuration: customConfig?.quarterDuration || 10,
      shotClockDuration: 24,
      shotClockOffensiveRebound: 14,
      playerFoulLimit: 5,
    };
  } else if (sport === 'TENNIS') {
    match.tennisConfig = {
      matchType: customConfig?.matchType || 'SINGLES',
      format: customConfig?.format || 'BEST_OF_3',
      setRules: 'STANDARD',
      gamesToWinSet: 6,
      setAdvantage: true,
      tiebreakAtGames: 6,
      tiebreakPoints: 7,
      finalSetRule: 'NORMAL',
      surface: customConfig?.surface || 'HARD',
    };
  } else if (sport === 'BADMINTON') {
    match.badmintonConfig = {
      matchType: customConfig?.matchType || 'SINGLES',
      format: 'BEST_OF_3',
      pointsPerGame: 21,
      pointDifference: 2,
      maxPoints: 30,
    };
  } else if (sport === 'TABLE_TENNIS') {
    match.tableTennisConfig = {
      matchType: customConfig?.matchType || 'SINGLES',
      format: 'BEST_OF_5',
      pointsPerGame: 11,
      pointDifference: 2,
      serviceRotation: 2,
      deuceServiceRotation: 1,
    };
  }
}

/**
 * Preview Tournament Fixtures (Deterministic Simulation)
 */
export function previewTournamentFixtures(options: FixtureGenerationOptions): FixturePreviewResponse {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === options.tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const allTournamentTeams = db.teams.filter((tm) => tm.tournamentId === tournament.id);
  const allTournamentGroups = db.groups.filter((g) => g.tournamentId === tournament.id);

  // Determine target groups
  let targetGroups: Group[] = [];
  if (options.groupId && options.groupId !== 'ALL') {
    targetGroups = allTournamentGroups.filter((g) => g.id === options.groupId);
    if (targetGroups.length === 0) {
      throw new Error(`Specified group ID "${options.groupId}" does not exist in this tournament.`);
    }
  } else if (allTournamentGroups.length > 0) {
    targetGroups = allTournamentGroups;
  } else {
    // Single pool / Unassigned group
    targetGroups = [
      {
        id: 'UNASSIGNED',
        tournamentId: tournament.id,
        name: 'Single League',
        code: 'MAIN',
        maxTeams: 100,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  const legs = options.type === 'DOUBLE_ROUND_ROBIN' || options.rounds === 2 ? 2 : (options.rounds || 1);

  // Venues & Grounds
  const rawVenues = options.venues && options.venues.length > 0
    ? options.venues
    : [tournament.venue || tournament.location || 'Main Stadium'];
  const rawGrounds = options.grounds && options.grounds.length > 0
    ? options.grounds
    : ['Pitch 1'];

  const intervalMins = options.matchIntervalMinutes || 120;
  const matchDurationMins = options.matchDurationMinutes || 105;
  const daysBetweenRounds = options.daysBetweenRounds !== undefined ? options.daysBetweenRounds : 1;
  const minRestHours = options.minRestHours !== undefined ? options.minRestHours : 4;
  const venueStrategy = options.venueAllocationStrategy || 'ROUND_ROBIN_ROTATION';

  const baseDate = new Date(options.startDate || new Date().toISOString().split('T')[0]);
  const [startH, startM] = (options.startTime || '09:00').split(':').map(Number);

  const previewFixtures: FixturePreviewItem[] = [];
  const byesList: Array<{
    roundNumber: number;
    roundName: string;
    teamId: string;
    teamName: string;
    groupId?: string;
    groupName?: string;
  }> = [];

  let globalMatchCounter = 1;
  const teamLastMatchTimestamp = new Map<string, { dateStr: string; timeStr: string; matchNumber: string; totalMinutes: number }>();
  const venueSlotMap = new Map<string, string[]>(); // key: `${dateStr}_${venue}_${ground}` -> array of time intervals

  const conflicts: FixtureConflictWarning[] = [];

  // Iterate each group
  let currentGroupRoundOffset = 0;

  targetGroups.forEach((grp) => {
    const grpTeams = grp.id === 'UNASSIGNED'
      ? allTournamentTeams
      : allTournamentTeams.filter((tm) => tm.groupId === grp.id);

    if (grpTeams.length < 2) {
      return;
    }

    const groupRounds = generateCircleMethodRounds(grpTeams, legs, grp.code);

    let venueIndex = 0;
    let groundIndex = 0;

    groupRounds.forEach((round) => {
      const roundDate = new Date(baseDate);
      const dayOffset = (round.roundNumber - 1 + currentGroupRoundOffset) * daysBetweenRounds;
      roundDate.setDate(roundDate.getDate() + dayOffset);
      const dateStr = roundDate.toISOString().split('T')[0];

      let timeOffsetMinutes = 0;

      round.pairs.forEach((pair) => {
        if (pair.isBye && pair.byeTeam) {
          byesList.push({
            roundNumber: round.roundNumber,
            roundName: round.roundName,
            teamId: pair.byeTeam.id,
            teamName: pair.byeTeam.name,
            groupId: grp.id === 'UNASSIGNED' ? undefined : grp.id,
            groupName: grp.name,
          });
          return;
        }

        const matchTotalMinutes = (startH || 9) * 60 + (startM || 0) + timeOffsetMinutes;
        const matchH = Math.floor(matchTotalMinutes / 60) % 24;
        const matchM = matchTotalMinutes % 60;
        const timeStr = `${matchH.toString().padStart(2, '0')}:${matchM.toString().padStart(2, '0')}`;

        let chosenVenue = rawVenues[venueIndex % rawVenues.length];
        let chosenGround = rawGrounds[groundIndex % rawGrounds.length];

        if (venueStrategy === 'CONCURRENT_VENUES') {
          // Advance venue first, only advance time when all venues for this slot are filled
          venueIndex++;
          groundIndex++;
          if (venueIndex % rawVenues.length === 0) {
            timeOffsetMinutes += intervalMins;
          }
        } else {
          timeOffsetMinutes += intervalMins;
          venueIndex++;
          groundIndex++;
        }

        const matchNumber = `M${globalMatchCounter.toString().padStart(3, '0')}`;
        const tempId = `preview-${grp.id}-${globalMatchCounter}`;

        const item: FixturePreviewItem = {
          tempId,
          matchNumber,
          numericIndex: globalMatchCounter,
          roundNumber: round.roundNumber,
          roundName: round.roundName,
          legNumber: round.legNumber,
          groupId: grp.id === 'UNASSIGNED' ? undefined : grp.id,
          groupName: grp.name,
          groupCode: grp.code,
          homeTeamId: pair.home.id,
          homeTeamName: pair.home.name,
          homeTeamShortName: pair.home.shortName,
          homeTeamLogoUrl: pair.home.logoUrl,
          awayTeamId: pair.away.id,
          awayTeamName: pair.away.name,
          awayTeamShortName: pair.away.shortName,
          awayTeamLogoUrl: pair.away.logoUrl,
          date: dateStr,
          time: timeStr,
          venue: chosenVenue,
          ground: chosenGround,
          estimatedDurationMinutes: matchDurationMins,
          conflicts: [],
        };

        // Check venue collision
        const venueSlotKey = `${dateStr}__${chosenVenue}__${chosenGround || 'G1'}`;
        const existingTimes = venueSlotMap.get(venueSlotKey) || [];
        const matchStartMin = matchTotalMinutes;
        const matchEndMin = matchStartMin + matchDurationMins;

        existingTimes.forEach((slot) => {
          const [sStart, sEnd, prevMNum] = slot.split('__');
          const prevStart = Number(sStart);
          const prevEnd = Number(sEnd);
          if (matchStartMin < prevEnd && matchEndMin > prevStart) {
            const conflict: FixtureConflictWarning = {
              type: 'VENUE_OVERLAP',
              severity: 'ERROR',
              message: `Venue Collision at "${chosenVenue}" (${chosenGround || 'Ground 1'}) between ${matchNumber} and ${prevMNum} on ${dateStr}`,
              affectedMatchNumbers: [matchNumber, prevMNum],
            };
            item.conflicts?.push(conflict);
            conflicts.push(conflict);
          }
        });
        existingTimes.push(`${matchStartMin}__${matchEndMin}__${matchNumber}`);
        venueSlotMap.set(venueSlotKey, existingTimes);

        // Check team rest / fatigue conflict
        [pair.home, pair.away].forEach((team) => {
          const lastMatch = teamLastMatchTimestamp.get(team.id);
          if (lastMatch) {
            const date1 = new Date(`${lastMatch.dateStr}T${lastMatch.timeStr}:00`);
            const date2 = new Date(`${dateStr}T${timeStr}:00`);
            const diffHours = (date2.getTime() - date1.getTime()) / (1000 * 60 * 60);

            if (diffHours >= 0 && diffHours < minRestHours) {
              const conflict: FixtureConflictWarning = {
                type: 'TEAM_FATIGUE',
                severity: diffHours < 1 ? 'ERROR' : 'WARNING',
                message: `Fatigue Warning: "${team.name}" has only ${diffHours.toFixed(1)} hrs rest between ${lastMatch.matchNumber} and ${matchNumber}`,
                affectedMatchNumbers: [lastMatch.matchNumber, matchNumber],
              };
              item.conflicts?.push(conflict);
              conflicts.push(conflict);
            } else if (diffHours < 0 && Math.abs(diffHours) < minRestHours) {
              const conflict: FixtureConflictWarning = {
                type: 'TEAM_SIMULTANEOUS',
                severity: 'ERROR',
                message: `Double-booking: "${team.name}" is scheduled concurrently in ${lastMatch.matchNumber} and ${matchNumber}`,
                affectedMatchNumbers: [lastMatch.matchNumber, matchNumber],
              };
              item.conflicts?.push(conflict);
              conflicts.push(conflict);
            }
          }
          teamLastMatchTimestamp.set(team.id, {
            dateStr,
            timeStr,
            matchNumber,
            totalMinutes: matchTotalMinutes,
          });
        });

        previewFixtures.push(item);
        globalMatchCounter++;
      });
    });
  });

  // Calculate summary
  const distinctDates = Array.from(new Set(previewFixtures.map((f) => f.date))).sort();
  const maxRounds = Math.max(0, ...previewFixtures.map((f) => f.roundNumber));
  const distinctVenues = Array.from(new Set(previewFixtures.map((f) => f.venue)));

  const existingMatches = db.matches.filter((m) => m.tournamentId === tournament.id);
  const existingStats = {
    total: existingMatches.length,
    draft: existingMatches.filter((m) => m.status === 'DRAFT').length,
    scheduled: existingMatches.filter((m) => m.status === 'SCHEDULED').length,
    live: existingMatches.filter((m) => m.status === 'LIVE').length,
    completed: existingMatches.filter((m) => m.status === 'COMPLETED').length,
    cancelled: existingMatches.filter((m) => m.status === 'CANCELLED').length,
  };

  return {
    fixtures: previewFixtures,
    byes: byesList,
    conflicts,
    summary: {
      totalMatches: previewFixtures.length,
      totalRounds: maxRounds,
      totalDays: distinctDates.length,
      totalVenues: distinctVenues.length,
      startDate: distinctDates[0] || options.startDate,
      estimatedEndDate: distinctDates[distinctDates.length - 1] || options.startDate,
      teamsCount: allTournamentTeams.length,
      groupsCount: targetGroups.length,
      existingMatchesStats: existingStats,
    },
  };
}

/**
 * Generate and Commit Tournament Fixtures to Database
 */
export function generateTournamentFixtures(
  options: FixtureGenerationOptions,
  user?: User
): {
  createdMatches: Match[];
  warnings: FixtureConflictWarning[];
  message: string;
  summary: FixturePreviewResponse['summary'];
} {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === options.tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  // Verify tournament competition format
  if (
    tournament.competitionFormat === 'SINGLE_ELIMINATION' ||
    tournament.competitionFormat === 'DOUBLE_ELIMINATION' ||
    tournament.competitionFormat === 'PAGE_PLAYOFF'
  ) {
    throw new Error(
      `Automatic round-robin fixture generator is designed for League and Group stages. Knockout/Playoff bracket generation will be available in the next phase.`
    );
  }

  // Preview first to perform full mathematical generation & validation
  const preview = previewTournamentFixtures(options);

  if (preview.fixtures.length === 0) {
    throw new Error(
      'No fixtures could be generated. Ensure there are at least 2 teams assigned to the selected groups or tournament pool.'
    );
  }

  // Handle existing fixtures safety: ONLY delete DRAFT or SCHEDULED fixtures created by generator
  // NEVER delete LIVE, COMPLETED, or CANCELLED matches!
  if (options.clearExistingDraftFixtures) {
    const targetGroupId = options.groupId && options.groupId !== 'ALL' ? options.groupId : undefined;

    const initialMatchCount = db.matches.length;
    db.matches = db.matches.filter((m) => {
      if (m.tournamentId !== tournament.id) return true;
      if (targetGroupId && m.groupId !== targetGroupId) return true;

      // SAFETY: Protect active/finished matches
      if (m.status === 'LIVE' || m.status === 'COMPLETED' || m.status === 'CANCELLED') {
        return true;
      }

      // Check if match has any existing scoring events or innings attached
      const hasEvents = (db.scoring_events || []).some((e: any) => e.matchId === m.id) ||
        (db.match_innings || []).some((inn: any) => inn.matchId === m.id) ||
        (db.volleyball_sets || []).some((s: any) => s.matchId === m.id) ||
        (db.kabaddi_raids || []).some((r: any) => r.matchId === m.id);

      if (hasEvents) {
        return true; // Keep safe
      }

      // Delete draft/scheduled placeholder
      return false;
    });

    const removedCount = initialMatchCount - db.matches.length;
    if (removedCount > 0) {
      addAuditLog(
        'FIXTURE_REGENERATED',
        `Cleared ${removedCount} unstarted draft fixtures before regenerating schedule for "${tournament.name}"`,
        user
      );
    }
  }

  // Convert preview items into real database Match records
  const createdMatches: Match[] = [];
  const now = new Date().toISOString();

  preview.fixtures.forEach((p) => {
    const matchId = crypto.randomUUID();

    const newMatch: Match = {
      id: matchId,
      tournamentId: tournament.id,
      groupId: p.groupId || '',
      sport: tournament.sport,
      name: `${p.homeTeamName} vs ${p.awayTeamName}`,
      matchNumber: p.matchNumber,
      round: p.roundName,
      teamAId: p.homeTeamId,
      teamBId: p.awayTeamId,
      date: p.date,
      time: p.time,
      venue: p.venue,
      ground: p.ground || '',
      description: `${p.groupName ? `${p.groupName} • ` : ''}${p.roundName}`,
      status: 'SCHEDULED',
      createdAt: now,
      updatedAt: now,
    };

    // Apply sport defaults
    applySportDefaultsToMatch(newMatch, tournament, options.customMatchConfig);

    db.matches.push(newMatch);
    createdMatches.push(newMatch);
  });

  saveDatabase();

  addAuditLog(
    'MATCH_CREATE',
    `Generated ${createdMatches.length} round-robin fixtures for tournament "${tournament.name}" (Format: ${options.type || 'SINGLE_ROUND_ROBIN'}, ${preview.summary.totalRounds} rounds)`,
    user
  );

  return {
    createdMatches,
    warnings: preview.conflicts,
    message: `Successfully generated ${createdMatches.length} fixtures across ${preview.summary.totalRounds} rounds (${preview.summary.startDate} to ${preview.summary.estimatedEndDate}).`,
    summary: preview.summary,
  };
}

/**
 * Update an existing fixture (reschedule date, time, venue, swap home/away, etc.)
 */
export function updateFixtureMatch(
  tournamentId: string,
  matchId: string,
  updates: {
    date?: string;
    time?: string;
    venue?: string;
    ground?: string;
    matchNumber?: string;
    round?: string;
    swapHomeAway?: boolean;
    description?: string;
  },
  user?: User
): { match: Match; message: string } {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const matchIndex = db.matches.findIndex((m) => m.id === matchId && m.tournamentId === tournamentId);
  if (matchIndex === -1) throw new Error('Match fixture not found');

  const match = db.matches[matchIndex];

  if (match.status === 'LIVE' || match.status === 'COMPLETED') {
    throw new Error('Cannot reschedule or modify teams for a live or completed match.');
  }

  if (updates.date !== undefined) match.date = updates.date;
  if (updates.time !== undefined) match.time = updates.time;
  if (updates.venue !== undefined) match.venue = updates.venue;
  if (updates.ground !== undefined) match.ground = updates.ground;
  if (updates.matchNumber !== undefined) match.matchNumber = updates.matchNumber;
  if (updates.round !== undefined) match.round = updates.round;
  if (updates.description !== undefined) match.description = updates.description;

  if (updates.swapHomeAway) {
    const oldA = match.teamAId;
    const oldB = match.teamBId;
    match.teamAId = oldB;
    match.teamBId = oldA;

    const teamA = db.teams.find((t) => t.id === match.teamAId);
    const teamB = db.teams.find((t) => t.id === match.teamBId);
    match.name = `${teamA?.name || 'Home'} vs ${teamB?.name || 'Away'}`;
  }

  match.updatedAt = new Date().toISOString();
  db.matches[matchIndex] = match;
  saveDatabase();

  addAuditLog(
    'MATCH_UPDATE',
    `Updated fixture #${match.matchNumber || match.id} (${match.name}) - Date: ${match.date} ${match.time}, Venue: ${match.venue}`,
    user
  );

  return {
    match,
    message: 'Fixture updated successfully.',
  };
}

/**
 * Delete a single unstarted fixture
 */
export function deleteFixtureMatch(
  tournamentId: string,
  matchId: string,
  user?: User
): { message: string } {
  const db = getDb();
  const matchIndex = db.matches.findIndex((m) => m.id === matchId && m.tournamentId === tournamentId);
  if (matchIndex === -1) throw new Error('Match fixture not found');

  const match = db.matches[matchIndex];
  if (match.status === 'LIVE' || match.status === 'COMPLETED') {
    throw new Error('Cannot delete a live or completed match fixture.');
  }

  const matchNumber = match.matchNumber || match.name;
  db.matches.splice(matchIndex, 1);
  saveDatabase();

  addAuditLog(
    'MATCH_DELETE',
    `Deleted scheduled fixture ${matchNumber} from tournament ID ${tournamentId}`,
    user
  );

  return {
    message: `Fixture ${matchNumber} deleted successfully.`,
  };
}
