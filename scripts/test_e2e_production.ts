/**
 * SportsPulse Prompt 11: End-to-End Production QA and Integration Verification Suite
 * Tests the complete user journeys, ACL enforcement, multi-sport isolation,
 * graphics cues/take-live, public broadcast outputs, reports, and live data bindings.
 */

import { generateToken } from '../server/utils/security';
import { getDb, saveDatabase } from '../server/db/database';
import { buildGraphicDataContext } from '../server/services/graphicDataResolver';
import { SportType } from '../src/types';

const BASE_URL = 'http://localhost:3000';

// Setup test users
const adminToken = generateToken({
  userId: 'c29178a2-9608-41fa-a57f-4c6c147c6041',
  email: 'admin@sportspulse.com',
  role: 'SUPER_ADMIN',
});

const userCricketToken = generateToken({
  userId: 'qa-user-cricket',
  email: 'cricket.user@sportspulse.test',
  role: 'USER',
});

const userKabaddiToken = generateToken({
  userId: 'qa-user-kabaddi',
  email: 'kabaddi.user@sportspulse.test',
  role: 'USER',
});

const userMultiToken = generateToken({
  userId: 'qa-user-multi',
  email: 'multi.user@sportspulse.test',
  role: 'USER',
});

async function request(path: string, options: any = {}, token?: string) {
  let body = options.body;
  if (body !== undefined && typeof body !== 'string') {
    body = JSON.stringify(body);
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as any),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    body,
    headers,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // raw text
  }

  return {
    status: res.status,
    ok: res.ok,
    body: json || text,
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string, details?: any) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    if (details) {
      console.error('   Details:', typeof details === 'string' ? details : JSON.stringify(details, null, 2));
    }
    failed++;
  }
}

function initUsersInDb() {
  const db = getDb();
  if (!db.users) db.users = [];

  const existingCricket = db.users.find((u) => u.id === 'qa-user-cricket');
  if (!existingCricket) {
    db.users.push({
      id: 'qa-user-cricket',
      name: 'QA Cricket User',
      email: 'cricket.user@sportspulse.test',
      passwordHash: 'dummy-hash',
      role: 'USER',
      allowedSports: ['CRICKET'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    existingCricket.allowedSports = ['CRICKET'];
  }

  const existingKabaddi = db.users.find((u) => u.id === 'qa-user-kabaddi');
  if (!existingKabaddi) {
    db.users.push({
      id: 'qa-user-kabaddi',
      name: 'QA Kabaddi User',
      email: 'kabaddi.user@sportspulse.test',
      passwordHash: 'dummy-hash',
      role: 'USER',
      allowedSports: ['KABADDI'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    existingKabaddi.allowedSports = ['KABADDI'];
  }

  const existingMulti = db.users.find((u) => u.id === 'qa-user-multi');
  if (!existingMulti) {
    db.users.push({
      id: 'qa-user-multi',
      name: 'QA Multi Sport User',
      email: 'multi.user@sportspulse.test',
      passwordHash: 'dummy-hash',
      role: 'USER',
      allowedSports: ['CRICKET', 'KABADDI'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    existingMulti.allowedSports = ['CRICKET', 'KABADDI'];
  }

  saveDatabase();
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('RUNNING SPORTSPULSE PROMPT 11 END-TO-END QA SUITE');
  console.log('====================================================\n');

  initUsersInDb();

  // ========================================================
  // 1. COMPLETE NORMAL USER JOURNEY (CRICKET)
  // ========================================================
  console.log('--- 1. Testing Complete Normal User Journey (Cricket) ---');

  // Step 1: User profile / assigned sports
  const meRes = await request('/api/auth/me', {}, userCricketToken);
  assert(meRes.status === 200, 'User A (Cricket) can fetch profile');
  assert(
    Array.isArray(meRes.body.user.allowedSports) &&
    meRes.body.user.allowedSports.length === 1 &&
    meRes.body.user.allowedSports[0] === 'CRICKET',
    'User A profile only has CRICKET access'
  );

  // Step 2: Create Cricket Tournament
  const tournRes = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Premier League',
      sport: 'CRICKET',
      season: '2026',
      competitionFormat: 'GROUP_KNOCKOUT',
      cricketDefaultOvers: 20,
    }),
  }, userCricketToken);
  assert(tournRes.status === 201, 'User A created Cricket Tournament', tournRes.body);
  const tournamentId = tournRes.body.tournament?.id || tournRes.body.id;
  assert(Boolean(tournamentId), 'Tournament ID generated');

  // Step 3: Open tournament detail
  const tournDetail = await request(`/api/tournaments/${tournamentId}`, {}, userCricketToken);
  assert(tournDetail.status === 200, 'User A can open Tournament details');

  // Step 4: Create Group A
  const groupRes = await request(`/api/tournaments/${tournamentId}/groups`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Group A',
      code: 'A',
    }),
  }, userCricketToken);
  assert(groupRes.status === 200 || groupRes.status === 201, 'Created Group A in Tournament', groupRes.body);
  const groupId = groupRes.body.group?.id || groupRes.body.id;

  // Step 5: Add two Cricket teams
  const team1Res = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Royal Strikers',
      shortName: 'RS',
      sport: 'CRICKET',
      tournamentId,
      groupId,
    }),
  }, userCricketToken);
  assert(team1Res.status === 201, 'Created Team 1 (Royal Strikers)', team1Res.body);
  const teamAId = team1Res.body.team?.id || team1Res.body.id;

  const team2Res = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Super Kings',
      shortName: 'SK',
      sport: 'CRICKET',
      tournamentId,
      groupId,
    }),
  }, userCricketToken);
  assert(team2Res.status === 201, 'Created Team 2 (Super Kings)', team2Res.body);
  const teamBId = team2Res.body.team?.id || team2Res.body.id;

  // Step 6: Verify player-first workflow (create player without team, then assign to team)
  const player1Res = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Aiden Markram',
      sport: 'CRICKET',
      role: 'BATSMAN',
      tournamentId,
    }),
  }, userCricketToken);
  assert(player1Res.status === 201, 'Created player without initial team (player-first workflow)', player1Res.body);
  const player1Id = player1Res.body.player?.id || player1Res.body.id;

  // Assign player1 to Team A
  const assignPlayer1 = await request(`/api/players/${player1Id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      teamId: teamAId,
    }),
  }, userCricketToken);
  assert(assignPlayer1.status === 200, 'Assigned player to Team A', assignPlayer1.body);

  // Add more players to Team A and Team B
  const pA2 = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({ name: 'Heinrich Klaasen', sport: 'CRICKET', teamId: teamAId, tournamentId }),
  }, userCricketToken);
  const player2Id = pA2.body.player?.id || pA2.body.id;

  const pB1 = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({ name: 'Trent Boult', sport: 'CRICKET', teamId: teamBId, tournamentId }),
  }, userCricketToken);
  const playerB1Id = pB1.body.player?.id || pB1.body.id;

  // Step 7: Create match
  const matchRes = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId,
      groupId,
      sport: 'CRICKET',
      teamAId,
      teamBId,
      name: 'Royal Strikers vs Super Kings',
      date: new Date().toISOString().split('T')[0],
      status: 'SCHEDULED',
      overs: 20,
    }),
  }, userCricketToken);
  assert(matchRes.status === 201, 'Created Cricket Match', matchRes.body);
  const matchId = matchRes.body.match?.id || matchRes.body.id;

  // Step 8: Open Match Detail & Scoring Console
  const matchDetail = await request(`/api/matches/${matchId}`, {}, userCricketToken);
  assert(matchDetail.status === 200, 'Opened Match Detail', matchDetail.body);
  assert(matchDetail.body.match?.status === 'SCHEDULED', 'Match initial status is SCHEDULED');

  const scoringState = await request(`/api/matches/${matchId}/scoring/state`, {}, userCricketToken);
  assert(scoringState.status === 200, 'Opened Cricket Scoring Console state');

  // Step 9: Start scoring naturally (balls, runs, extras, wicket)
  // Ball 1: 1 run off bat -> Match auto-starts to LIVE
  const ball1 = await request(`/api/matches/${matchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({
      runsOffBat: 1,
      strikerId: player1Id,
      bowlerId: playerB1Id,
    }),
  }, userCricketToken);
  assert(ball1.status === 200, 'Recorded 1st ball naturally on SCHEDULED match', ball1.body);

  const matchLive = await request(`/api/matches/${matchId}`, {}, userCricketToken);
  assert(matchLive.body.match?.status === 'LIVE', 'Match auto-transitioned to LIVE');

  // Ball 2: Wide Extra
  const ball2 = await request(`/api/matches/${matchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({
      isWide: true,
      extraRuns: 1,
      bowlerId: playerB1Id,
    }),
  }, userCricketToken);
  assert(ball2.status === 200, 'Recorded Wide Extra', ball2.body);

  // Ball 3: Wicket
  const ball3 = await request(`/api/matches/${matchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({
      isWicket: true,
      dismissalType: 'CAUGHT',
      dismissedPlayerId: player1Id,
      bowlerId: playerB1Id,
    }),
  }, userCricketToken);
  assert(ball3.status === 200, 'Recorded Wicket delivery', ball3.body);

  // Confirm score and match status
  const currentMatchState = await request(`/api/matches/${matchId}/scoring/state`, {}, userCricketToken);
  assert(currentMatchState.status === 200, 'Fetched active scoring state');
  const wicketsCount = currentMatchState.body.state?.wickets ?? currentMatchState.body.state?.currentInnings?.totalWickets ?? currentMatchState.body.state?.totalWickets;
  const runsCount = currentMatchState.body.state?.totalRuns ?? currentMatchState.body.state?.currentInnings?.totalRuns ?? 0;
  assert(wicketsCount === 1, 'Wickets count is 1', currentMatchState.body.state);
  assert(runsCount >= 2, 'Total runs recorded correctly', currentMatchState.body.state);

  // Step 10: Graphics flow
  // Assign template to match
  const assignGraphic = await request('/api/broadcast/assignments', {
    method: 'POST',
    body: JSON.stringify({
      assignments: [
        {
          matchId,
          sport: 'CRICKET',
          targetId: 'cricket-scoreboard-modern',
          graphicId: 'cricket-scoreboard-modern',
          graphicName: 'Cricket Scoreboard (Pro Lower Bug)',
          category: 'SCOREBOARD',
          isActive: true,
        },
      ],
    }),
  }, userCricketToken);
  assert(assignGraphic.status === 200, 'Assigned Cricket template to match', assignGraphic.body);

  // Cue graphic to Preview
  const cueRes = await request(`/api/broadcast/onair/${matchId}/cue`, {
    method: 'POST',
    body: {
      targetId: 'cricket-scoreboard-modern',
      graphicName: 'Cricket Scoreboard (Pro Lower Bug)',
      category: 'SCOREBOARD',
    },
  }, userCricketToken);
  assert(cueRes.status === 200, 'Cued graphic to Preview');

  // Take graphic Live to Program
  const takeRes = await request(`/api/broadcast/onair/${matchId}/take`, {
    method: 'POST',
    body: {
      targetId: 'cricket-scoreboard-modern',
      graphicName: 'Cricket Scoreboard (Pro Lower Bug)',
      category: 'SCOREBOARD',
    },
  }, userCricketToken);
  assert(takeRes.status === 200, 'Took graphic Live to air');

  // Step 11: Public Broadcast URL check (unauthenticated)
  const publicBroadcast = await request(`/api/matches/${matchId}/broadcast/state`);
  assert(publicBroadcast.status === 200, 'Public broadcast canvas accessible without login');
  assert(
    publicBroadcast.body.onAirState?.currentOnAir?.targetId === 'cricket-scoreboard-modern' ||
    publicBroadcast.body.assignedOnAirGraphic?.targetId === 'cricket-scoreboard-modern',
    'Graphic is active in public broadcast output'
  );

  // Step 12: Complete match
  const endMatch = await request(`/api/matches/${matchId}/scoring/end-match`, {
    method: 'POST',
    body: JSON.stringify({
      winningTeamId: teamAId,
      resultText: 'Royal Strikers won by 15 runs',
    }),
  }, userCricketToken);
  assert(endMatch.status === 200, 'Match completed successfully');

  // Step 13: Open match report
  const reportRes = await request(`/api/matches/${matchId}/report`, {}, userCricketToken);
  assert(reportRes.status === 200, 'Match report generated and accessible');

  // Step 14: Tournament standings and team stats
  const standingsRes = await request(`/api/tournaments/${tournamentId}/standings`, {}, userCricketToken);
  assert(standingsRes.status === 200, 'Tournament standings retrieved');

  const statsRes = await request(`/api/tournaments/${tournamentId}/team-stats`, {}, userCricketToken);
  assert(statsRes.status === 200, 'Tournament team statistics retrieved');

  // ========================================================
  // 2. KABADDI WORKFLOW & PERMISSION ISOLATION
  // ========================================================
  console.log('\n--- 2. Testing Kabaddi Workflow & Sport ACL Isolation ---');

  // Create Kabaddi tournament as Kabaddi user
  const kabaddiTourn = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Pro Kabaddi Cup',
      sport: 'KABADDI',
      season: '2026',
    }),
  }, userKabaddiToken);
  assert(kabaddiTourn.status === 201, 'User B created Kabaddi Tournament');
  const kabaddiTournId = kabaddiTourn.body.tournament?.id || kabaddiTourn.body.id;

  // Add teams
  const kTeam1 = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ name: 'Patna Pirates', shortName: 'PAT', sport: 'KABADDI', tournamentId: kabaddiTournId }),
  }, userKabaddiToken);
  const kTeamAId = kTeam1.body.team?.id || kTeam1.body.id;

  const kTeam2 = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ name: 'Bengaluru Bulls', shortName: 'BLR', sport: 'KABADDI', tournamentId: kabaddiTournId }),
  }, userKabaddiToken);
  const kTeamBId = kTeam2.body.team?.id || kTeam2.body.id;

  // Add players to teams (Prompt 11 Step 4: Create teams and players)
  const kp1 = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({ name: 'Pardeep Narwal', sport: 'KABADDI', teamId: kTeamAId, tournamentId: kabaddiTournId, role: 'RAIDER' }),
  }, userKabaddiToken);
  const raiderId = kp1.body.player?.id || kp1.body.id;

  const kp2 = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({ name: 'Saurabh Nandal', sport: 'KABADDI', teamId: kTeamBId, tournamentId: kabaddiTournId, role: 'DEFENDER' }),
  }, userKabaddiToken);
  const defenderId = kp2.body.player?.id || kp2.body.id;

  // Create Kabaddi match
  const kMatch = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId: kabaddiTournId,
      sport: 'KABADDI',
      teamAId: kTeamAId,
      teamBId: kTeamBId,
      name: 'Patna Pirates vs Bengaluru Bulls',
    }),
  }, userKabaddiToken);
  assert(kMatch.status === 201, 'Created Kabaddi match');
  const kabaddiMatchId = kMatch.body.match?.id || kMatch.body.id;

  // Record valid raid as Kabaddi user
  const raid1 = await request(`/api/matches/${kabaddiMatchId}/scoring/kabaddi/raid`, {
    method: 'POST',
    body: JSON.stringify({
      raidingTeamId: kTeamAId,
      defendingTeamId: kTeamBId,
      raiderPlayerId: raiderId,
      outcome: 'TOUCH_POINT',
      touchPoints: 2,
    }),
  }, userKabaddiToken);
  assert(raid1.status === 200, 'User B scored valid raid on Kabaddi match');
  assert(raid1.body.state?.teamAScore === 2, 'Kabaddi Team A score is 2');

  // Verify match auto-transitioned to LIVE
  const kMatchLive = await request(`/api/matches/${kabaddiMatchId}`, {}, userKabaddiToken);
  assert(kMatchLive.body.match?.status === 'LIVE', 'Kabaddi match transitioned to LIVE');

  // Assign Kabaddi template and take live
  const kAssign = await request('/api/broadcast/assignments', {
    method: 'POST',
    body: JSON.stringify({
      assignments: [
        {
          matchId: kabaddiMatchId,
          sport: 'KABADDI',
          targetId: 'kabaddi-scoreboard-main',
          graphicName: 'Kabaddi Scoreboard (Live Mat Bug)',
          category: 'SCOREBOARD',
          isActive: true,
        },
      ],
    }),
  }, userKabaddiToken);
  assert(kAssign.status === 200, 'Assigned Kabaddi template');

  const kTake = await request(`/api/broadcast/onair/${kabaddiMatchId}/take`, {
    method: 'POST',
    body: { targetId: 'kabaddi-scoreboard-main' },
  }, userKabaddiToken);
  assert(kTake.status === 200, 'Took Kabaddi graphic live');

  // Verify public broadcast state for Kabaddi
  const kPublic = await request(`/api/matches/${kabaddiMatchId}/broadcast/state`);
  assert(kPublic.status === 200, 'Public broadcast canvas accessible for Kabaddi without login');

  // Complete Kabaddi match
  const kComplete = await request(`/api/matches/${kabaddiMatchId}/scoring/kabaddi/end-match`, {
    method: 'POST',
    body: JSON.stringify({ winningTeamId: kTeamAId, winMargin: '2 points' }),
  }, userKabaddiToken);
  assert(kComplete.status === 200, 'Completed Kabaddi match');

  // ACL ISOLATION ENFORCEMENT:
  // User A (Cricket only) CANNOT mutate or access Kabaddi match scoring or management
  const unauthRaid = await request(`/api/matches/${kabaddiMatchId}/scoring/kabaddi/raid`, {
    method: 'POST',
    body: JSON.stringify({ raidingTeamId: kTeamAId, defendingTeamId: kTeamBId, touchPoints: 1 }),
  }, userCricketToken);
  assert(unauthRaid.status === 403, 'User A (Cricket only) is DENIED scoring Kabaddi match (403)');

  const unauthCue = await request(`/api/broadcast/onair/${kabaddiMatchId}/cue`, {
    method: 'POST',
    body: { targetId: 'kabaddi-scoreboard-main' },
  }, userCricketToken);
  assert(unauthCue.status === 403, 'User A (Cricket only) is DENIED cueing on Kabaddi match (403)');

  // User B (Kabaddi only) CANNOT mutate Cricket match scoring or management
  const unauthBall = await request(`/api/matches/${matchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 4 }),
  }, userKabaddiToken);
  assert(unauthBall.status === 403, 'User B (Kabaddi only) is DENIED scoring Cricket match (403)');

  // ========================================================
  // 3. MULTI-SPORT USER ISOLATION & FILTERS
  // ========================================================
  console.log('\n--- 3. Testing Multi-Sport User & Sport Filters ---');

  // User Multi has allowedSports: ['CRICKET', 'KABADDI']
  const multiProfile = await request('/api/auth/me', {}, userMultiToken);
  assert(multiProfile.status === 200, 'Multi-sport user fetched profile');
  assert(
    multiProfile.body.user.allowedSports.includes('CRICKET') &&
    multiProfile.body.user.allowedSports.includes('KABADDI'),
    'Multi-sport user has both CRICKET and KABADDI visible'
  );

  // Tournament sport filter
  const cricketOnlyTourns = await request('/api/tournaments?sport=CRICKET', {}, adminToken);
  assert(cricketOnlyTourns.status === 200, 'Filtered tournaments by CRICKET');
  const allCricket = (cricketOnlyTourns.body.tournaments || cricketOnlyTourns.body || []).every((t: any) => t.sport === 'CRICKET');
  assert(allCricket, 'All tournaments in CRICKET filter are CRICKET');

  const kabaddiOnlyTourns = await request('/api/tournaments?sport=KABADDI', {}, adminToken);
  assert(kabaddiOnlyTourns.status === 200, 'Filtered tournaments by KABADDI');
  const allKabaddi = (kabaddiOnlyTourns.body.tournaments || kabaddiOnlyTourns.body || []).every((t: any) => t.sport === 'KABADDI');
  assert(allKabaddi, 'All tournaments in KABADDI filter are KABADDI');

  // ========================================================
  // 4. GRAPHICS TEMPLATE FLOW & REJECTION OF INVALID TARGETS
  // ========================================================
  console.log('\n--- 4. Testing Graphics Template Assignment & Boundary Protections ---');

  // Template assignment cannot target non-existent match (404)
  const nonExistentMatchAssign = await request('/api/broadcast/assignments', {
    method: 'POST',
    body: JSON.stringify({
      assignments: [{ matchId: 'non-existent-id-999', sport: 'CRICKET', targetId: 'cricket-scoreboard-modern' }],
    }),
  }, userCricketToken);
  assert(nonExistentMatchAssign.status === 404, 'Assignment to non-existent match is rejected with 404');

  // Template assignment cannot target unauthorized match of another sport
  const crossSportAssign = await request('/api/broadcast/assignments', {
    method: 'POST',
    body: JSON.stringify({
      assignments: [{ matchId: kabaddiMatchId, sport: 'KABADDI', targetId: 'kabaddi-scoreboard-main' }],
    }),
  }, userCricketToken);
  assert(crossSportAssign.status === 403, 'Assignment to unauthorized sport match is rejected with 403');

  // Test Cue, Take, and Stop operations on authorized match
  const testAssign = await request(`/api/broadcast/onair/${matchId}/cue`, {
    method: 'POST',
    body: { targetId: 'cricket-team-vs-team', graphicName: 'Team vs Team Bug' },
  }, adminToken);
  assert(testAssign.status === 200, 'Cued graphic to preview');

  const testTake = await request(`/api/broadcast/onair/${matchId}/take`, {
    method: 'POST',
    body: { targetId: 'cricket-team-vs-team', graphicName: 'Team vs Team Bug' },
  }, adminToken);
  assert(testTake.status === 200, 'Took graphic live on air');

  const testStop = await request(`/api/broadcast/onair/${matchId}/stop-graphic`, {
    method: 'POST',
    body: { graphicId: 'cricket-team-vs-team' },
  }, adminToken);
  assert(testStop.status === 200, 'Stopped graphic successfully');

  // ========================================================
  // 5. LIVE DATA BINDINGS ACROSS REPRESENTATIVE SPORTS
  // ========================================================
  console.log('\n--- 5. Testing Live Data Bindings & Fallbacks ---');

  const sportsToTest: SportType[] = [
    'CRICKET',
    'VOLLEYBALL',
    'KABADDI',
    'FOOTBALL',
    'BASKETBALL',
    'TENNIS',
    'BADMINTON',
    'HOCKEY',
  ];

  for (const sp of sportsToTest) {
    const dummyMatch: any = {
      id: `binding-test-${sp.toLowerCase()}`,
      sport: sp,
      name: `Test ${sp} Binding Match`,
      status: 'LIVE',
      teamAId: 'test-team-a',
      teamBId: 'test-team-b',
      teamA: { id: 'test-team-a', name: `${sp} Team Alpha`, shortName: 'TTA', logoUrl: '' },
      teamB: { id: 'test-team-b', name: `${sp} Team Beta`, shortName: 'TTB', logoUrl: '' },
    };

    const context = buildGraphicDataContext(dummyMatch, {});
    assert(context.variables['{{TEAM_A}}'] === `${sp} Team Alpha`, `${sp} Team A binding resolved`);
    assert(context.variables['{{TEAM_B}}'] === `${sp} Team Beta`, `${sp} Team B binding resolved`);
    assert(Boolean(context.variables['{{SCORE}}']), `${sp} SCORE binding resolved`);
    assert(!context.variables['{{SCORE}}'].includes('undefined'), `${sp} SCORE has no 'undefined'`);
    assert(Boolean(context.variables['{{SPORT}}']), `${sp} SPORT binding resolved`);
  }

  // Verify Cricket comprehensive bindings
  const cricketBindingMatch: any = {
    id: 'cricket-deep-binding',
    sport: 'CRICKET',
    status: 'LIVE',
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamA: { id: 'team-a', name: 'India', shortName: 'IND' },
    teamB: { id: 'team-b', name: 'Australia', shortName: 'AUS' },
  };

  const cricketScoringStateMock: any = {
    totalRuns: 165,
    wickets: 3,
    oversDisplay: '17.2',
    runRate: 9.52,
    strikerStat: { playerName: 'Rohit Sharma', runs: 72, ballsFaced: 44, fours: 7, sixes: 4, strikeRate: 163.63, isNotOut: true },
    nonStrikerStat: { playerName: 'Virat Kohli', runs: 54, ballsFaced: 35, fours: 5, sixes: 1, strikeRate: 154.28, isNotOut: true },
    currentBowlerStat: { bowlerName: 'Mitchell Starc', wickets: 2, runsConceded: 32, oversDisplay: '3.2', economy: 9.60 },
    currentOverBalls: [{ runs: 4, isBoundary: true }],
  };

  const cContext = buildGraphicDataContext(cricketBindingMatch, cricketScoringStateMock);
  assert(cContext.variables['{{RUNS}}'] === '165', 'Cricket {{RUNS}} bound correctly');
  assert(cContext.variables['{{WICKETS}}'] === '3', 'Cricket {{WICKETS}} bound correctly');
  assert(cContext.variables['{{OVERS}}'] === '17.2', 'Cricket {{OVERS}} bound correctly');
  assert(cContext.variables['{{STRIKER_NAME}}'] === 'Rohit Sharma', 'Cricket {{STRIKER_NAME}} bound');
  assert(cContext.variables['{{STRIKER_SCORE}}'] === '72*', 'Cricket {{STRIKER_SCORE}} bound');
  assert(cContext.variables['{{BOWLER_NAME}}'] === 'Mitchell Starc', 'Cricket {{BOWLER_NAME}} bound');
  assert(cContext.variables['{{BALL_EVENT}}'] === 'FOUR', 'Cricket {{BALL_EVENT}} bound');

  // ========================================================
  // 6. PUBLIC BROADCAST RESOLUTION & CANVAS SAFETY
  // ========================================================
  console.log('\n--- 6. Testing Public Broadcast Endpoint & Headless Canvas ---');

  // Test match broadcast state
  const bState = await request(`/api/matches/${matchId}/broadcast/state`);
  assert(bState.status === 200, 'Broadcast state endpoint returned 200');
  assert(Boolean(bState.body.match), 'Broadcast payload includes match');
  assert(Boolean(bState.body.scoringState), 'Broadcast payload includes calculated scoring state');
  assert(Boolean(bState.body.broadcastConfig), 'Broadcast payload includes default broadcastConfig');

  console.log('\n====================================================');
  console.log(`E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal E2E test execution error:', err);
  process.exit(1);
});
