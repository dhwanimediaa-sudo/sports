/**
 * SportsPulse - Automated End-to-End Production QA & Integration Verification
 * Prompt 11 Verification Suite
 */

import { generateToken, hashPassword } from '../server/utils/security';
import { getDb, saveDatabase } from '../server/db/database';
import { resolveBroadcastDataContext } from '../src/utils/broadcastDataResolver';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000';

// Super Admin Token
const adminToken = generateToken({
  userId: 'c29178a2-9608-41fa-a57f-4c6c147c6041',
  email: 'admin@sportspulse.com',
  role: 'SUPER_ADMIN',
});

// User A: Cricket only
const userAToken = generateToken({
  userId: 'user-a-cricket',
  email: 'usera@test.com',
  role: 'USER',
});

// User B: Kabaddi only
const userBToken = generateToken({
  userId: 'user-b-kabaddi',
  email: 'userb@test.com',
  role: 'USER',
});

// User C: Cricket + Kabaddi
const userCToken = generateToken({
  userId: 'user-c-multi',
  email: 'userc@test.com',
  role: 'USER',
});

// Disabled User Token
const disabledUserToken = generateToken({
  userId: 'user-disabled',
  email: 'disabled@test.com',
  role: 'USER',
});

// Helper for API calls
async function request(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as any),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // text output
  }

  return {
    status: res.status,
    ok: res.ok,
    body: json || text,
  };
}

// Setup test users in database
async function setupUsers() {
  const db = getDb();
  const passwordHash = await hashPassword('UserPass@123');

  const usersToEnsure = [
    {
      id: 'user-a-cricket',
      name: 'User A (Cricket Specialist)',
      email: 'usera@test.com',
      passwordHash,
      role: 'USER',
      allowedSports: ['CRICKET'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'user-b-kabaddi',
      name: 'User B (Kabaddi Specialist)',
      email: 'userb@test.com',
      passwordHash,
      role: 'USER',
      allowedSports: ['KABADDI'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'user-c-multi',
      name: 'User C (Multi Sport Specialist)',
      email: 'userc@test.com',
      passwordHash,
      role: 'USER',
      allowedSports: ['CRICKET', 'KABADDI'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'user-disabled',
      name: 'Disabled User',
      email: 'disabled@test.com',
      passwordHash,
      role: 'USER',
      allowedSports: ['CRICKET'],
      status: 'DISABLED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const u of usersToEnsure) {
    const existingIndex = db.users.findIndex((x) => x.id === u.id);
    if (existingIndex >= 0) {
      db.users[existingIndex] = { ...db.users[existingIndex], ...u } as any;
    } else {
      db.users.push(u as any);
    }
  }

  saveDatabase();
}

async function runEndToEndQA() {
  console.log('=================================================================');
  console.log('SPORTSPULSE PROMPT 11: END-TO-END QA & INTEGRATION VERIFICATION');
  console.log('=================================================================\n');

  await setupUsers();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // ========================================================
  // 1. NORMAL USER JOURNEY (CRICKET WORKSPACE)
  // ========================================================
  console.log('\n--- 1. Testing Normal User Journey (Cricket) ---');

  // 1.1 Login & Profile verification
  const meA = await request('/api/auth/me', { method: 'GET' }, userAToken);
  assert(meA.status === 200, 'User A profile retrieved');
  assert(
    Array.isArray(meA.body.user?.allowedSports) &&
      meA.body.user.allowedSports.length === 1 &&
      meA.body.user.allowedSports[0] === 'CRICKET',
    'User A restricted to CRICKET sport only'
  );

  // 1.2 Create Cricket Tournament
  const tCricketRes = await request(
    '/api/tournaments',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Cricket League 2026',
        sport: 'CRICKET',
        season: '2026',
        venue: 'Eden Park',
        startDate: '2026-10-01',
        endDate: '2026-10-15',
        competitionFormat: 'LEAGUE',
        cricketDefaultOvers: 20,
        isPublic: true,
      }),
    },
    userAToken
  );
  assert(tCricketRes.status === 201, 'User A creates Cricket tournament', JSON.stringify(tCricketRes.body));
  const tournamentAId = tCricketRes.body.tournament?.id;

  // 1.3 Create Group A
  const groupARes = await request(
    '/api/groups',
    {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: tournamentAId,
        name: 'Group A',
        code: 'A',
      }),
    },
    userAToken
  );
  assert(groupARes.status === 201, 'User A creates Group A', JSON.stringify(groupARes.body));
  const groupAId = groupARes.body.group?.id;

  // 1.4 Create 2 Cricket Teams
  const team1Res = await request(
    '/api/teams',
    {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: tournamentAId,
        groupId: groupAId,
        name: 'Auckland Aces',
        shortName: 'ACA',
        sport: 'CRICKET',
        teamColor: '#0055ff',
      }),
    },
    userAToken
  );
  assert(team1Res.status === 201, 'User A creates Team 1 (Auckland Aces)');
  const team1Id = team1Res.body.team?.id;

  const team2Res = await request(
    '/api/teams',
    {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: tournamentAId,
        groupId: groupAId,
        name: 'Canterbury Kings',
        shortName: 'CTK',
        sport: 'CRICKET',
        teamColor: '#cc0000',
      }),
    },
    userAToken
  );
  assert(team2Res.status === 201, 'User A creates Team 2 (Canterbury Kings)');
  const team2Id = team2Res.body.team?.id;

  // 1.5 Add Players to both teams (Player-First Workflow)
  const p1Res = await request(
    '/api/players',
    {
      method: 'POST',
      body: JSON.stringify({
        teamId: team1Id,
        name: 'Martin Guptill',
        jerseyNumber: 31,
        role: 'BATSMAN',
      }),
    },
    userAToken
  );
  assert(p1Res.status === 201, 'Player 1 created for Team 1');
  const p1Id = p1Res.body.player?.id;

  const p2Res = await request(
    '/api/players',
    {
      method: 'POST',
      body: JSON.stringify({
        teamId: team1Id,
        name: 'Colin Munro',
        jerseyNumber: 82,
        role: 'ALL_ROUNDER',
      }),
    },
    userAToken
  );
  assert(p2Res.status === 201, 'Player 2 created for Team 1');

  const p3Res = await request(
    '/api/players',
    {
      method: 'POST',
      body: JSON.stringify({
        teamId: team2Id,
        name: 'Matt Henry',
        jerseyNumber: 21,
        role: 'BOWLER',
      }),
    },
    userAToken
  );
  assert(p3Res.status === 201, 'Player 3 created for Team 2');

  // Edit player
  const editP1 = await request(
    `/api/players/${p1Id}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Martin J. Guptill',
        jerseyNumber: 31,
      }),
    },
    userAToken
  );
  assert(editP1.status === 200 && editP1.body.player?.name === 'Martin J. Guptill', 'Player successfully edited');

  // 1.6 Generate Fixtures
  const fixturesRes = await request(
    `/api/tournaments/${tournamentAId}/fixtures/generate`,
    {
      method: 'POST',
      body: JSON.stringify({
        groupId: groupAId,
        startDate: '2026-10-01',
        timeSlot: '14:00',
        venue: 'Eden Park',
      }),
    },
    userAToken
  );
  assert(fixturesRes.status === 201, 'Fixtures generated automatically for tournament');

  // 1.7 Create Match or pick generated match
  const matchesRes = await request(`/api/matches?tournamentId=${tournamentAId}`, { method: 'GET' }, userAToken);
  assert(matchesRes.status === 200 && matchesRes.body.matches?.length > 0, 'Matches list retrieved for tournament');
  const matchA = matchesRes.body.matches[0];
  const matchAId = matchA.id;

  // 1.8 Verify Match Detail endpoint
  const matchDetail = await request(`/api/matches/${matchAId}`, { method: 'GET' }, userAToken);
  assert(matchDetail.status === 200 && matchDetail.body.match?.id === matchAId, 'Match detail retrieved');

  // 1.9 Start Live Scoring
  const ball1 = await request(
    `/api/matches/${matchAId}/scoring/ball`,
    {
      method: 'POST',
      body: JSON.stringify({ runsOffBat: 4, isFour: true }),
    },
    userAToken
  );
  assert(ball1.status === 200, 'Recorded FOUR on first ball (Match auto-transitions to LIVE)');
  assert(ball1.body.state?.match?.status === 'LIVE' || ball1.body.state?.matchStatus === 'LIVE', 'Match is now LIVE');

  // Extras
  const wide = await request(
    `/api/matches/${matchAId}/scoring/ball`,
    {
      method: 'POST',
      body: JSON.stringify({ extraRuns: 1, extraType: 'WIDE' }),
    },
    userAToken
  );
  assert(wide.status === 200, 'Recorded Wide extra');

  // Wicket
  const wicket = await request(
    `/api/matches/${matchAId}/scoring/ball`,
    {
      method: 'POST',
      body: JSON.stringify({ isWicket: true, wicketType: 'BOWLED' }),
    },
    userAToken
  );
  assert(wicket.status === 200, 'Recorded Wicket delivery');

  // 1.10 Graphics Flow: Cue, Take Live, Stop
  const cueRes = await request(
    `/api/broadcast/onair/${matchAId}/cue`,
    {
      method: 'POST',
      body: JSON.stringify({
        targetId: 'cricket-scoreboard-modern',
        graphicName: 'Cricket Scoreboard (Pro Lower Bug)',
        durationSeconds: 0,
        isHeld: true,
      }),
    },
    userAToken
  );
  assert(cueRes.status === 200, 'Cued Cricket Scoreboard graphic to Preview');

  const takeLiveRes = await request(
    `/api/broadcast/onair/${matchAId}/play`,
    {
      method: 'POST',
      body: JSON.stringify({
        targetId: 'cricket-scoreboard-modern',
        graphicName: 'Cricket Scoreboard (Pro Lower Bug)',
        durationSeconds: 0,
        isHeld: true,
      }),
    },
    userAToken
  );
  assert(takeLiveRes.status === 200, 'Took Cricket Scoreboard graphic LIVE to program');

  // Check OnAir state
  const onAirStateRes = await request(`/api/broadcast/onair/${matchAId}`, { method: 'GET' }, userAToken);
  assert(
    onAirStateRes.status === 200 &&
      (onAirStateRes.body.state?.currentOnAir?.targetId === 'cricket-scoreboard-modern' ||
        onAirStateRes.body.state?.activeGraphics?.some((g: any) => g.targetId === 'cricket-scoreboard-modern')),
    'On-Air state accurately reflects live graphic'
  );

  // Stop graphic
  const stopRes = await request(
    `/api/broadcast/onair/${matchAId}/stop-graphic`,
    {
      method: 'POST',
      body: JSON.stringify({ graphicId: 'cricket-scoreboard-modern' }),
    },
    userAToken
  );
  assert(stopRes.status === 200, 'Took down graphic from air');

  // 1.11 Public Broadcast Page availability
  const publicMatch = await request(`/api/matches/${matchAId}/public`, { method: 'GET' });
  assert(publicMatch.status === 200, 'Public match endpoint works without authentication for broadcast canvas');

  // 1.12 Complete match
  const endMatch = await request(`/api/matches/${matchAId}/scoring/end-match`, { method: 'POST' }, userAToken);
  assert(endMatch.status === 200, 'Cricket match completed');

  // 1.13 Match Report & Tournament Standings/Stats
  const matchReport = await request(`/api/matches/${matchAId}/report`, { method: 'GET' }, userAToken);
  assert(matchReport.status === 200 && matchReport.body.report, 'Match full report generated successfully');

  const standings = await request(`/api/tournaments/${tournamentAId}/standings`, { method: 'GET' }, userAToken);
  assert(standings.status === 200, 'Tournament standings retrieved');

  const stats = await request(`/api/tournaments/${tournamentAId}/statistics`, { method: 'GET' }, userAToken);
  assert(stats.status === 200, 'Tournament statistics retrieved');

  // ========================================================
  // 2. KABADDI WORKFLOW & SPORT ISOLATION
  // ========================================================
  console.log('\n--- 2. Testing Kabaddi Workflow & Sport Isolation ---');

  // 2.1 Login as User B
  const meB = await request('/api/auth/me', { method: 'GET' }, userBToken);
  assert(
    meB.status === 200 &&
      meB.body.user?.allowedSports?.includes('KABADDI') &&
      !meB.body.user?.allowedSports?.includes('CRICKET'),
    'User B restricted to KABADDI sport only'
  );

  // 2.2 Create Kabaddi Tournament
  const tKabaddiRes = await request(
    '/api/tournaments',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Pro Kabaddi Cup 2026',
        sport: 'KABADDI',
        season: '2026',
        venue: 'Patliputra Stadium',
        competitionFormat: 'LEAGUE',
        isPublic: true,
      }),
    },
    userBToken
  );
  assert(tKabaddiRes.status === 201, 'User B creates Kabaddi tournament');
  const tournamentBId = tKabaddiRes.body.tournament?.id;

  // 2.3 Create Kabaddi Teams & Match
  const kabaddiTeamA = await request(
    '/api/teams',
    {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: tournamentBId,
        name: 'Patna Pirates',
        shortName: 'PAT',
        sport: 'KABADDI',
      }),
    },
    userBToken
  );
  const kabaddiTeamB = await request(
    '/api/teams',
    {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: tournamentBId,
        name: 'Bengaluru Bulls',
        shortName: 'BLR',
        sport: 'KABADDI',
      }),
    },
    userBToken
  );

  const kabaddiMatchRes = await request(
    '/api/matches',
    {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: tournamentBId,
        groupId: 'default',
        teamAId: kabaddiTeamA.body.team?.id,
        teamBId: kabaddiTeamB.body.team?.id,
        sport: 'KABADDI',
        date: '2026-10-05',
        time: '19:00',
        venue: 'Patliputra Stadium',
        status: 'SCHEDULED',
      }),
    },
    userBToken
  );
  assert(kabaddiMatchRes.status === 201, 'User B schedules Kabaddi match');
  const matchBId = kabaddiMatchRes.body.match?.id;

  // 2.4 Score Raid
  const raidRes = await request(
    `/api/matches/${matchBId}/scoring/kabaddi/raid`,
    {
      method: 'POST',
      body: JSON.stringify({
        raidingTeamId: kabaddiTeamA.body.team?.id,
        defendingTeamId: kabaddiTeamB.body.team?.id,
        outcome: 'TOUCH_POINT',
        touchPoints: 2,
      }),
    },
    userBToken
  );
  assert(raidRes.status === 200, 'User B scores 2 touch points in Kabaddi raid');

  // 2.5 Cross-Sport & ACL Authorization Rejection Tests:
  // User A (Cricket only) tries to score Kabaddi match -> 403
  const userAScoreKabaddi = await request(
    `/api/matches/${matchBId}/scoring/kabaddi/raid`,
    {
      method: 'POST',
      body: JSON.stringify({
        raidingTeamId: kabaddiTeamA.body.team?.id,
        defendingTeamId: kabaddiTeamB.body.team?.id,
        outcome: 'BONUS_POINT',
      }),
    },
    userAToken
  );
  assert(userAScoreKabaddi.status === 403, 'User A (Cricket only) DENIED scoring Kabaddi match (403)');

  // User A (Cricket only) tries to create Kabaddi tournament -> 403
  const userACreateKabaddi = await request(
    '/api/tournaments',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Unauthorized Kabaddi Cup',
        sport: 'KABADDI',
      }),
    },
    userAToken
  );
  assert(userACreateKabaddi.status === 403, 'User A (Cricket only) DENIED creating Kabaddi tournament (403)');

  // User B (Kabaddi only) tries to score Cricket match -> 403
  const userBScoreCricket = await request(
    `/api/matches/${matchAId}/scoring/ball`,
    {
      method: 'POST',
      body: JSON.stringify({ runsOffBat: 1 }),
    },
    userBToken
  );
  assert(userBScoreCricket.status === 403 || userBScoreCricket.status === 400, 'User B (Kabaddi only) DENIED scoring Cricket match (403 or 400 locked)');

  // User B tries to modify User A's private Cricket tournament -> 403
  const userBEditTournamentA = await request(
    `/api/tournaments/${tournamentAId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ name: 'Hacked Name' }),
    },
    userBToken
  );
  assert(userBEditTournamentA.status === 403, "User B DENIED editing User A's tournament (403)");

  // 2.6 Complete Kabaddi match
  const endKabaddi = await request(
    `/api/matches/${matchBId}/scoring/kabaddi/half`,
    {
      method: 'POST',
      body: JSON.stringify({ targetStatus: 'COMPLETED' }),
    },
    userBToken
  );
  assert(endKabaddi.status === 200, 'Kabaddi match marked as completed');

  // Kabaddi report
  const kabaddiReport = await request(`/api/matches/${matchBId}/report`, { method: 'GET' }, userBToken);
  assert(kabaddiReport.status === 200 && kabaddiReport.body.report, 'Kabaddi match report generated');

  // ========================================================
  // 3. MULTI-SPORT USER C & DATA SEPARATION
  // ========================================================
  console.log('\n--- 3. Testing Multi-Sport User C & Data Separation ---');

  const meC = await request('/api/auth/me', { method: 'GET' }, userCToken);
  assert(
    meC.status === 200 &&
      meC.body.user?.allowedSports?.includes('CRICKET') &&
      meC.body.user?.allowedSports?.includes('KABADDI'),
    'User C has both CRICKET and KABADDI sport visibility'
  );

  // User C cannot access other user's private tournament without authorization
  const userCTouchTournamentA = await request(
    `/api/tournaments/${tournamentAId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ name: 'Tampered Name' }),
    },
    userCToken
  );
  assert(userCTouchTournamentA.status === 403, "User C DENIED modifying other user's tournament without permission (403)");

  // Verify Sport filtering in API:
  const cricketMatchesOnly = await request('/api/matches?sport=CRICKET', { method: 'GET' }, adminToken);
  const allCricket = (cricketMatchesOnly.body.matches || []).every((m: any) => m.sport === 'CRICKET');
  assert(allCricket, 'API properly filters matches by sport=CRICKET');

  const kabaddiMatchesOnly = await request('/api/matches?sport=KABADDI', { method: 'GET' }, adminToken);
  const allKabaddi = (kabaddiMatchesOnly.body.matches || []).every((m: any) => m.sport === 'KABADDI');
  assert(allKabaddi, 'API properly filters matches by sport=KABADDI');

  // ========================================================
  // 4. GRAPHICS TEMPLATES & LIVE DATA BINDINGS
  // ========================================================
  console.log('\n--- 4. Testing Live Data Bindings & Graphics ---');

  // 4.1 Cricket Data Context Resolver Test
  const mockCricketMatch: any = {
    id: 'test-cricket-data',
    name: 'Auckland Aces vs Canterbury Kings',
    sport: 'CRICKET',
    status: 'LIVE',
    venue: 'Eden Park',
    teamA: { name: 'Auckland Aces', shortName: 'ACA' },
    teamB: { name: 'Canterbury Kings', shortName: 'CTK' },
    teamAId: 'team-a',
    teamBId: 'team-b',
  };

  const mockCricketScoring: any = {
    sport: 'CRICKET',
    currentInnings: {
      inningsNumber: 1,
      totalRuns: 184,
      totalWickets: 3,
      totalOvers: 19,
      legalBallsCount: 118,
      currentStrikerId: 'p1',
      currentNonStrikerId: 'p2',
      currentBowlerId: 'b1',
    },
    batsmenStats: [
      { playerId: 'p1', playerName: 'Martin Guptill', runs: 78, ballsFaced: 45, fours: 7, sixes: 4, strikeRate: 173.3 },
      { playerId: 'p2', playerName: 'Colin Munro', runs: 42, ballsFaced: 28, fours: 4, sixes: 2, strikeRate: 150.0 },
    ],
    bowlerStats: [
      { playerId: 'b1', bowlerName: 'Matt Henry', wickets: 2, runsConceded: 32, oversDisplay: '3.4', economyRate: 8.7 },
    ],
    currentPartnership: { runs: 65, balls: 38 },
    currentOverEvents: [{ runsOffBat: 4, totalRuns: 4, display: '4' }],
    extras: { total: 8 },
  };

  const resolvedCricket = resolveBroadcastDataContext(mockCricketMatch, mockCricketScoring);
  assert(resolvedCricket.variables['{{SCORE}}'] === '184/3 (19.4 ov)', 'Live data binding: {{SCORE}} resolved 184/3 (19.4 ov)');
  assert(resolvedCricket.variables['{{RUNS}}'] === '184', 'Live data binding: {{RUNS}} resolved 184');
  assert(resolvedCricket.variables['{{WICKETS}}'] === '3', 'Live data binding: {{WICKETS}} resolved 3');
  assert(resolvedCricket.variables['{{STRIKER_NAME}}'] === 'Martin Guptill', 'Live data binding: {{STRIKER_NAME}} resolved Martin Guptill');
  assert(resolvedCricket.variables['{{STRIKER_RUNS}}'] === '78', 'Live data binding: {{STRIKER_RUNS}} resolved 78');
  assert(resolvedCricket.variables['{{BOWLER_NAME}}'] === 'Matt Henry', 'Live data binding: {{BOWLER_NAME}} resolved Matt Henry');
  assert(resolvedCricket.variables['{{BOWLER_WICKETS}}'] === '2', 'Live data binding: {{BOWLER_WICKETS}} resolved 2');

  // 4.2 Multi-Sport Live Data Binding tests
  // Football
  const footballCtx = resolveBroadcastDataContext(
    { sport: 'FOOTBALL', teamA: { name: 'Arsenal' }, teamB: { name: 'Chelsea' } } as any,
    { teamAGoals: 2, teamBGoals: 1, halfName: '2ND HALF', displayTime: '78:30' }
  );
  assert(footballCtx.variables['{{SCORE}}'] === '2 - 1', 'Football {{SCORE}} binding resolved 2 - 1');
  assert(footballCtx.variables['{{MATCH_CLOCK}}'] === '78:30', 'Football {{MATCH_CLOCK}} binding resolved 78:30');

  // Basketball
  const bballCtx = resolveBroadcastDataContext(
    { sport: 'BASKETBALL', teamA: { name: 'Lakers' }, teamB: { name: 'Celtics' } } as any,
    { teamAScore: 98, teamBScore: 95, currentQuarter: 4, clockDisplay: '02:15' }
  );
  assert(bballCtx.variables['{{SCORE}}'] === '98 - 95', 'Basketball {{SCORE}} binding resolved 98 - 95');
  assert(bballCtx.variables['{{QUARTER}}'] === '4', 'Basketball {{QUARTER}} binding resolved 4');

  // Volleyball
  const vballCtx = resolveBroadcastDataContext(
    { sport: 'VOLLEYBALL', teamA: { name: 'Poland' }, teamB: { name: 'Brazil' } } as any,
    { setsWonA: 2, setsWonB: 1, currentSet: { teamAScore: 24, teamBScore: 22 } }
  );
  assert(vballCtx.variables['{{SET_SCORE}}'] === 'Sets: 2-1', 'Volleyball {{SET_SCORE}} binding resolved Sets: 2-1');
  assert(vballCtx.variables['{{POINTS_A}}'] === '24', 'Volleyball {{POINTS_A}} binding resolved 24');

  // Kabaddi
  const kabaddiCtx = resolveBroadcastDataContext(
    { sport: 'KABADDI', teamA: { name: 'Pirates' }, teamB: { name: 'Bulls' } } as any,
    { teamAScore: 34, teamBScore: 29, teamARaidPoints: 20, defendersOnMat: 5 }
  );
  assert(kabaddiCtx.variables['{{SCORE}}'] === '34 - 29', 'Kabaddi {{SCORE}} binding resolved 34 - 29');
  assert(kabaddiCtx.variables['{{DEFENDERS_COUNT}}'] === '5', 'Kabaddi {{DEFENDERS_COUNT}} binding resolved 5');

  // Tennis
  const tennisCtx = resolveBroadcastDataContext(
    { sport: 'TENNIS', teamA: { name: 'Alcaraz' }, teamB: { name: 'Sinner' } } as any,
    { setsWonA: 1, setsWonB: 0, currentGamesA: 4, currentGamesB: 3, currentPointsA: '40', currentPointsB: '30' }
  );
  assert(tennisCtx.variables['{{POINTS_A}}'] === '40', 'Tennis {{POINTS_A}} binding resolved 40');

  // ========================================================
  // 5. DISABLED USER AND AUTHENTICATION HARDENING
  // ========================================================
  console.log('\n--- 5. Testing Disabled User Rejection & Auth Hardening ---');

  // 5.1 Login with disabled user credentials
  const disabledLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'disabled@test.com',
      password: 'UserPass@123',
    }),
  });
  assert(disabledLogin.status === 403, 'Disabled user login rejected with 403 Forbidden');

  // 5.2 API request using pre-existing token of disabled user
  const disabledApiReq = await request('/api/tournaments', { method: 'GET' }, disabledUserToken);
  assert(disabledApiReq.status === 401, 'Disabled user protected API call rejected with 401 Unauthorized');

  // 5.3 Super Admin full platform administration
  const adminGetUsers = await request('/api/auth/users', { method: 'GET' }, adminToken);
  assert(adminGetUsers.status === 200 && Array.isArray(adminGetUsers.body.users), 'Super Admin successfully accesses user management');

  // Normal user cannot access user management
  const userAccessUsers = await request('/api/auth/users', { method: 'GET' }, userAToken);
  assert(userAccessUsers.status === 403, 'Normal user A DENIED accessing user management (403)');

  console.log('\n=================================================================');
  console.log(`END-TO-END QA TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEndToEndQA().catch((err) => {
  console.error('Fatal error during E2E QA:', err);
  process.exit(1);
});
