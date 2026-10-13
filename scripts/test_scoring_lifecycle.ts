/**
 * Automated Test Script: Multi-Sport Live Scoring Reliability & Match Lifecycle QA
 * Prompt 10 Verification Suite
 */

import { generateToken } from '../server/utils/security';
import { getDb, saveDatabase } from '../server/db/database';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000';

// Test Tokens
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

// Helper for API calls
async function request(path: string, options: RequestInit = {}, token = adminToken) {
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
    // not JSON
  }

  return {
    status: res.status,
    ok: res.ok,
    body: json || text,
  };
}

// Setup temporary test teams and users in db for testing
function setupTestAuthUsers() {
  const db = getDb();
  if (!db.users.find((u) => u.id === 'user-a-cricket')) {
    db.users.push({
      id: 'user-a-cricket',
      name: 'User A (Cricket)',
      email: 'usera@test.com',
      passwordHash: 'dummy',
      role: 'USER',
      allowedSports: ['CRICKET'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (!db.users.find((u) => u.id === 'user-b-kabaddi')) {
    db.users.push({
      id: 'user-b-kabaddi',
      name: 'User B (Kabaddi)',
      email: 'userb@test.com',
      passwordHash: 'dummy',
      role: 'USER',
      allowedSports: ['KABADDI'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Ensure two test teams
  let teamA = db.teams.find((t) => t.id === 'test-team-a');
  if (!teamA) {
    teamA = {
      id: 'test-team-a',
      name: 'Test Titans A',
      shortName: 'TTA',
      sport: 'CRICKET',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.teams.push(teamA);
  }

  let teamB = db.teams.find((t) => t.id === 'test-team-b');
  if (!teamB) {
    teamB = {
      id: 'test-team-b',
      name: 'Test Warriors B',
      shortName: 'TWB',
      sport: 'CRICKET',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.teams.push(teamB);
  }

  // Ensure test players
  const p1 = db.players.find((p) => p.id === 'test-player-a1');
  if (!p1) {
    db.players.push(
      { id: 'test-player-a1', name: 'Striker One', teamId: 'test-team-a', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'test-player-a2', name: 'NonStriker Two', teamId: 'test-team-a', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'test-player-b1', name: 'Bowler One', teamId: 'test-team-b', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    );
  }

  saveDatabase();
}

function createScheduledMatch(
  sport: string,
  name: string,
  ownerUserId = 'c29178a2-9608-41fa-a57f-4c6c147c6041',
  scorerUserIds: string[] = []
) {
  const db = getDb();
  const matchId = `test-m-${sport.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const match: any = {
    id: matchId,
    name,
    sport,
    teamAId: 'test-team-a',
    teamBId: 'test-team-b',
    status: 'SCHEDULED',
    date: new Date().toISOString(),
    venue: 'Test Stadium',
    ownerUserId,
    scorerUserIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.matches.push(match);
  saveDatabase();
  return matchId;
}

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING SPORTSPULSE MULTI-SPORT QA & LIFECYCLE TESTS');
  console.log('====================================================\n');

  setupTestAuthUsers();

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

  // ==========================================
  // 1. CRICKET LIFECYCLE & REGRESSION TEST
  // ==========================================
  console.log('\n--- 1. Testing Cricket Lifecycle & Regression ---');
  const cricketMatchId = createScheduledMatch('CRICKET', 'QA Cricket Match');

  // Verify initially SCHEDULED
  const initCricket = await request(`/api/matches/${cricketMatchId}`);
  assert(initCricket.body?.match?.status === 'SCHEDULED', 'Cricket match created with status SCHEDULED', JSON.stringify(initCricket.body));

  // REGRESSION TEST: Record delivery while match is SCHEDULED
  // Must NOT fail with "Match is not currently in LIVE state"
  const ball1 = await request(`/api/matches/${cricketMatchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 1 }),
  });
  assert(ball1.status === 200, 'First ball scoring succeeded on SCHEDULED match without manual start step');
  assert(ball1.body.state?.match?.status === 'LIVE' || ball1.body.state?.matchStatus === 'LIVE', 'Match auto-transitioned to LIVE upon first scoring action');
  assert(ball1.body.state.currentInnings?.totalRuns === 1, 'Score correctly recorded 1 run');

  // Test extras without error
  const wideBall = await request(`/api/matches/${cricketMatchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ extraRuns: 1, extraType: 'WIDE' }),
  });
  assert(wideBall.status === 200, 'Wide extra recorded successfully');
  assert(wideBall.body.state.currentInnings?.totalRuns === 2, 'Score increased to 2 after wide');

  const noBall = await request(`/api/matches/${cricketMatchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ extraRuns: 1, extraType: 'NO_BALL' }),
  });
  assert(noBall.status === 200, 'No ball extra recorded successfully');

  const wicketBall = await request(`/api/matches/${cricketMatchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ isWicket: true, wicketType: 'BOWLED' }),
  });
  assert(wicketBall.status === 200, 'Wicket ball recorded successfully');
  assert(wicketBall.body.state.currentInnings?.totalWickets === 1, 'Wickets count updated to 1');

  // Complete Cricket Match
  const endCricket = await request(`/api/matches/${cricketMatchId}/scoring/end-match`, {
    method: 'POST',
  });
  assert(endCricket.status === 200, 'Cricket match completed successfully');
  assert(endCricket.body.state?.match?.status === 'COMPLETED' || endCricket.body.state?.matchStatus === 'COMPLETED', 'Match status is now COMPLETED');

  // Attempt scoring mutation on COMPLETED match -> must be rejected
  const ballOnCompleted = await request(`/api/matches/${cricketMatchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 4 }),
  });
  assert(ballOnCompleted.status === 400, 'Ball delivery on COMPLETED match is properly rejected (400)');

  const startOnCompleted = await request(`/api/matches/${cricketMatchId}/scoring/start`, {
    method: 'POST',
    body: JSON.stringify({
      battingTeamId: 'test-team-a',
      bowlingTeamId: 'test-team-b',
      strikerId: 'test-player-a1',
      nonStrikerId: 'test-player-a2',
      bowlerId: 'test-player-b1',
    }),
  });
  assert(startOnCompleted.status === 400, '/start on COMPLETED match is properly rejected (400)');

  // ==========================================
  // 2. VOLLEYBALL LIFECYCLE
  // ==========================================
  console.log('\n--- 2. Testing Volleyball Lifecycle ---');
  const vballMatchId = createScheduledMatch('VOLLEYBALL', 'QA Volleyball Match');

  const vballPoint1 = await request(`/api/matches/${vballMatchId}/scoring/volleyball/point`, {
    method: 'POST',
    body: JSON.stringify({ pointWinner: 'test-team-a' }),
  });
  assert(vballPoint1.status === 200, 'Volleyball first point recorded on SCHEDULED match');
  assert(vballPoint1.body.state?.match?.status === 'LIVE' || vballPoint1.body.state?.matchStatus === 'LIVE', 'Volleyball match transitioned to LIVE');
  assert(vballPoint1.body.state?.currentSet?.teamAScore === 1 || vballPoint1.body.state?.teamAScore === 1, 'Volleyball Team A score is 1');

  const vballPoint2 = await request(`/api/matches/${vballMatchId}/scoring/volleyball/point`, {
    method: 'POST',
    body: JSON.stringify({ pointWinner: 'test-team-b' }),
  });
  assert(vballPoint2.status === 200, 'Volleyball second point recorded');
  assert(vballPoint2.body.state?.currentSet?.teamBScore === 1 || vballPoint2.body.state?.teamBScore === 1, 'Volleyball Team B score is 1');

  // Complete volleyball match
  const endVball = await request(`/api/matches/${vballMatchId}/scoring/end-match`, {
    method: 'POST',
  });
  assert(endVball.status === 200, 'Volleyball match completed');

  // Attempt scoring on completed volleyball match
  const vballOnCompleted = await request(`/api/matches/${vballMatchId}/scoring/volleyball/point`, {
    method: 'POST',
    body: JSON.stringify({ pointWinner: 'test-team-a' }),
  });
  assert(vballOnCompleted.status === 400, 'Volleyball point on COMPLETED match is rejected (400)');

  // ==========================================
  // 3. KABADDI LIFECYCLE
  // ==========================================
  console.log('\n--- 3. Testing Kabaddi Lifecycle ---');
  const kabaddiMatchId = createScheduledMatch('KABADDI', 'QA Kabaddi Match');

  const kabaddiRaid1 = await request(`/api/matches/${kabaddiMatchId}/scoring/kabaddi/raid`, {
    method: 'POST',
    body: JSON.stringify({
      raidingTeamId: 'test-team-a',
      defendingTeamId: 'test-team-b',
      raiderPlayerId: 'test-player-a1',
      outcome: 'TOUCH_POINT',
      touchPoints: 1,
    }),
  });
  assert(kabaddiRaid1.status === 200, 'Kabaddi first raid recorded on SCHEDULED match');
  assert(kabaddiRaid1.body.state.teamAScore === 1, 'Kabaddi Team A score is 1');

  // Verify match is LIVE in db
  const kabaddiMatchState = await request(`/api/matches/${kabaddiMatchId}`);
  assert(kabaddiMatchState.body.match.status === 'LIVE', 'Kabaddi match transitioned to LIVE');

  // Complete Kabaddi match via half transition
  const endKabaddi = await request(`/api/matches/${kabaddiMatchId}/scoring/kabaddi/half`, {
    method: 'POST',
    body: JSON.stringify({ targetStatus: 'COMPLETED' }),
  });
  assert(endKabaddi.status === 200, 'Kabaddi match completed');

  // Attempt raid on completed match
  const kabaddiOnCompleted = await request(`/api/matches/${kabaddiMatchId}/scoring/kabaddi/raid`, {
    method: 'POST',
    body: JSON.stringify({
      raidingTeamId: 'test-team-a',
      defendingTeamId: 'test-team-b',
      outcome: 'TOUCH_POINT',
      touchPoints: 1,
    }),
  });
  assert(kabaddiOnCompleted.status === 400, 'Kabaddi raid on COMPLETED match is rejected (400)');

  // ==========================================
  // 4. FOOTBALL LIFECYCLE
  // ==========================================
  console.log('\n--- 4. Testing Football Lifecycle ---');
  const footballMatchId = createScheduledMatch('FOOTBALL', 'QA Football Match');

  const footballGoal1 = await request(`/api/matches/${footballMatchId}/scoring/football/event`, {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'GOAL',
      teamId: 'test-team-a',
      playerId: 'test-player-a1',
    }),
  });
  assert(footballGoal1.status === 200, 'Football first goal recorded on SCHEDULED match');
  assert(footballGoal1.body.state.teamAScore === 1, 'Football Team A score is 1');

  const footballMatchState = await request(`/api/matches/${footballMatchId}`);
  assert(footballMatchState.body.match.status === 'LIVE', 'Football match transitioned to LIVE');

  // Complete football match
  const endFootball = await request(`/api/matches/${footballMatchId}/scoring/football/period`, {
    method: 'POST',
    body: JSON.stringify({ action: 'COMPLETE' }),
  });
  assert(endFootball.status === 200, 'Football match completed');

  // Attempt goal on completed match
  const footballOnCompleted = await request(`/api/matches/${footballMatchId}/scoring/football/event`, {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'GOAL',
      teamId: 'test-team-b',
    }),
  });
  assert(footballOnCompleted.status === 400, 'Football goal on COMPLETED match is rejected (400)');

  // ==========================================
  // 5. BASKETBALL LIFECYCLE
  // ==========================================
  console.log('\n--- 5. Testing Basketball Lifecycle ---');
  const basketballMatchId = createScheduledMatch('BASKETBALL', 'QA Basketball Match');

  const bballScore1 = await request(`/api/matches/${basketballMatchId}/scoring/basketball/event`, {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'SCORE_2PT',
      teamId: 'test-team-a',
      pointsScored: 2,
    }),
  });
  assert(bballScore1.status === 200, 'Basketball 2PT scored on SCHEDULED match');
  assert(bballScore1.body.state.teamAScore === 2, 'Basketball Team A score is 2');

  const bballMatchState = await request(`/api/matches/${basketballMatchId}`);
  assert(bballMatchState.body.match.status === 'LIVE', 'Basketball match transitioned to LIVE');

  // Complete basketball match
  const endBasketball = await request(`/api/matches/${basketballMatchId}/scoring/basketball/quarter`, {
    method: 'POST',
    body: JSON.stringify({ action: 'COMPLETE_MATCH' }),
  });
  assert(endBasketball.status === 200, 'Basketball match completed');

  // Attempt scoring on completed basketball match
  const bballOnCompleted = await request(`/api/matches/${basketballMatchId}/scoring/basketball/event`, {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'SCORE_3PT',
      teamId: 'test-team-a',
    }),
  });
  assert(bballOnCompleted.status === 400, 'Basketball score on COMPLETED match is rejected (400)');

  // ==========================================
  // 6. TENNIS LIFECYCLE
  // ==========================================
  console.log('\n--- 6. Testing Tennis Lifecycle ---');
  const tennisMatchId = createScheduledMatch('TENNIS', 'QA Tennis Match');

  const tennisPoint1 = await request(`/api/matches/${tennisMatchId}/scoring/tennis/point`, {
    method: 'POST',
    body: JSON.stringify({ pointWinner: 'TEAM_A' }),
  });
  assert(tennisPoint1.status === 200, 'Tennis first point scored on SCHEDULED match');
  assert(tennisPoint1.body.state.currentPointsA === '15', 'Tennis Team A score is 15');

  const tennisMatchState = await request(`/api/matches/${tennisMatchId}`);
  assert(tennisMatchState.body.match.status === 'LIVE', 'Tennis match transitioned to LIVE');

  // Transition to COMPLETED
  await request(`/api/matches/${tennisMatchId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'COMPLETED' }),
  });

  const tennisOnCompleted = await request(`/api/matches/${tennisMatchId}/scoring/tennis/point`, {
    method: 'POST',
    body: JSON.stringify({ pointWinner: 'TEAM_B' }),
  });
  assert(tennisOnCompleted.status === 400, 'Tennis point on COMPLETED match is rejected (400)');

  // ==========================================
  // 7. BADMINTON LIFECYCLE
  // ==========================================
  console.log('\n--- 7. Testing Badminton Lifecycle ---');
  const badmintonMatchId = createScheduledMatch('BADMINTON', 'QA Badminton Match');

  const badmRally1 = await request(`/api/matches/${badmintonMatchId}/scoring/badminton/rally`, {
    method: 'POST',
    body: JSON.stringify({ winnerSide: 'SIDE_A' }),
  });
  assert(badmRally1.status === 200, 'Badminton rally scored on SCHEDULED match');
  assert(badmRally1.body.state?.currentScoreA === 1 || badmRally1.body.state?.scoreA === 1, 'Badminton Team A score is 1');

  const badmMatchState = await request(`/api/matches/${badmintonMatchId}`);
  assert(badmMatchState.body.match.status === 'LIVE', 'Badminton match transitioned to LIVE');

  await request(`/api/matches/${badmintonMatchId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'COMPLETED' }),
  });

  const badmOnCompleted = await request(`/api/matches/${badmintonMatchId}/scoring/badminton/rally`, {
    method: 'POST',
    body: JSON.stringify({ winnerSide: 'SIDE_B' }),
  });
  assert(badmOnCompleted.status === 400, 'Badminton rally on COMPLETED match is rejected (400)');

  // ==========================================
  // 8. TABLE TENNIS LIFECYCLE
  // ==========================================
  console.log('\n--- 8. Testing Table Tennis Lifecycle ---');
  const ttMatchId = createScheduledMatch('TABLE_TENNIS', 'QA Table Tennis Match');

  const ttPoint1 = await request(`/api/matches/${ttMatchId}/scoring/table-tennis/point`, {
    method: 'POST',
    body: JSON.stringify({ winnerSide: 'SIDE_A' }),
  });
  assert(ttPoint1.status === 200, 'Table tennis point recorded on SCHEDULED match');
  assert(ttPoint1.body.state.currentScoreA === 1, 'Table tennis Team A score is 1');

  const ttMatchState = await request(`/api/matches/${ttMatchId}`);
  assert(ttMatchState.body.match.status === 'LIVE', 'Table tennis match transitioned to LIVE');

  await request(`/api/matches/${ttMatchId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'COMPLETED' }),
  });

  const ttOnCompleted = await request(`/api/matches/${ttMatchId}/scoring/table-tennis/point`, {
    method: 'POST',
    body: JSON.stringify({ winnerSide: 'SIDE_B' }),
  });
  assert(ttOnCompleted.status === 400, 'Table tennis point on COMPLETED match is rejected (400)');

  // ==========================================
  // 9. FIELD HOCKEY LIFECYCLE
  // ==========================================
  console.log('\n--- 9. Testing Field Hockey Lifecycle ---');
  const hockeyMatchId = createScheduledMatch('HOCKEY', 'QA Hockey Match');

  const hockeyGoal1 = await request(`/api/matches/${hockeyMatchId}/scoring/hockey/goal`, {
    method: 'POST',
    body: JSON.stringify({ teamId: 'test-team-a', goalType: 'FIELD_GOAL' }),
  });
  assert(hockeyGoal1.status === 200, 'Field hockey goal recorded on SCHEDULED match');
  assert(hockeyGoal1.body.state.teamAScore === 1, 'Hockey Team A score is 1');

  const hockeyMatchState = await request(`/api/matches/${hockeyMatchId}`);
  assert(hockeyMatchState.body.match.status === 'LIVE', 'Hockey match transitioned to LIVE');

  await request(`/api/matches/${hockeyMatchId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'COMPLETED' }),
  });

  const hockeyOnCompleted = await request(`/api/matches/${hockeyMatchId}/scoring/hockey/goal`, {
    method: 'POST',
    body: JSON.stringify({ teamId: 'test-team-b' }),
  });
  assert(hockeyOnCompleted.status === 400, 'Hockey goal on COMPLETED match is rejected (400)');

  // ==========================================
  // 10. CUSTOM, PICKLEBALL, HANDBALL, SQUASH
  // ==========================================
  console.log('\n--- 10. Testing Pickleball, Handball, Squash & Custom Sport ---');
  for (const sp of ['PICKLEBALL', 'HANDBALL', 'SQUASH', 'CUSTOM']) {
    const mId = createScheduledMatch(sp, `QA ${sp} Match`);

    const event1 = await request(`/api/matches/${mId}/scoring/custom/record-event`, {
      method: 'POST',
      body: JSON.stringify({ teamId: 'test-team-a', points: 1, eventName: 'Point' }),
    });
    assert(event1.status === 201, `${sp} first event recorded on SCHEDULED match`);
    assert(event1.body.state.scoreA === 1, `${sp} Team A score is 1`);

    const mState = await request(`/api/matches/${mId}`);
    assert(mState.body.match.status === 'LIVE', `${sp} match transitioned to LIVE`);

    // Complete custom match
    const endCustom = await request(`/api/matches/${mId}/scoring/custom/complete`, {
      method: 'POST',
    });
    assert(endCustom.status === 200, `${sp} match completed`);

    const customOnCompleted = await request(`/api/matches/${mId}/scoring/custom/record-event`, {
      method: 'POST',
      body: JSON.stringify({ teamId: 'test-team-b', points: 1 }),
    });
    assert(customOnCompleted.status === 400, `${sp} event on COMPLETED match is rejected (400)`);
  }

  // ==========================================
  // 11. AUTHORIZATION ENFORCEMENT
  // ==========================================
  console.log('\n--- 11. Testing Sport & Match Access Control Enforcement ---');
  // Match where User A is authorized scorer
  const authCricketMatchId = createScheduledMatch('CRICKET', 'Auth Cricket Match', 'user-a-cricket', ['user-a-cricket']);
  // Match where User B is authorized scorer
  const authKabaddiMatchId = createScheduledMatch('KABADDI', 'Auth Kabaddi Match', 'user-b-kabaddi', ['user-b-kabaddi']);
  // Match where User A has NO access
  const unauthCricketMatchId = createScheduledMatch('CRICKET', 'Unauth Cricket Match', 'c29178a2-9608-41fa-a57f-4c6c147c6041', []);

  // User A has allowedSports = ['CRICKET']
  // Should succeed scoring their authorized Cricket match
  const userAScoreCricket = await request(
    `/api/matches/${authCricketMatchId}/scoring/ball`,
    {
      method: 'POST',
      body: JSON.stringify({ runsOffBat: 1 }),
    },
    userAToken
  );
  assert(userAScoreCricket.status === 200, 'User A (CRICKET only) successfully scores authorized Cricket match', JSON.stringify(userAScoreCricket.body));

  // Should fail scoring unauthorized Cricket match
  const userAScoreUnauthCricket = await request(
    `/api/matches/${unauthCricketMatchId}/scoring/ball`,
    {
      method: 'POST',
      body: JSON.stringify({ runsOffBat: 1 }),
    },
    userAToken
  );
  assert(userAScoreUnauthCricket.status === 403, "User A is DENIED scoring unauthorized user's Cricket match (403)");

  // Should fail scoring Kabaddi match
  const userAScoreKabaddi = await request(
    `/api/matches/${authKabaddiMatchId}/scoring/kabaddi/raid`,
    {
      method: 'POST',
      body: JSON.stringify({ raidingTeamId: 'test-team-a', defendingTeamId: 'test-team-b' }),
    },
    userAToken
  );
  assert(userAScoreKabaddi.status === 403, 'User A (CRICKET only) is DENIED scoring Kabaddi match (403)');

  // User B has allowedSports = ['KABADDI']
  // Should succeed scoring their authorized Kabaddi match
  const userBScoreKabaddi = await request(
    `/api/matches/${authKabaddiMatchId}/scoring/kabaddi/raid`,
    {
      method: 'POST',
      body: JSON.stringify({
        raidingTeamId: 'test-team-a',
        defendingTeamId: 'test-team-b',
        outcome: 'TOUCH_POINT',
        touchPoints: 1,
      }),
    },
    userBToken
  );
  assert(userBScoreKabaddi.status === 200, 'User B (KABADDI only) successfully scores authorized Kabaddi match', JSON.stringify(userBScoreKabaddi.body));

  // Should fail scoring Cricket match
  const userBScoreCricket = await request(
    `/api/matches/${authCricketMatchId}/scoring/ball`,
    {
      method: 'POST',
      body: JSON.stringify({ runsOffBat: 1 }),
    },
    userBToken
  );
  assert(userBScoreCricket.status === 403, 'User B (KABADDI only) is DENIED scoring Cricket match (403)');

  // Super Admin: Full access to any match
  const adminScoreCricket = await request(
    `/api/matches/${authCricketMatchId}/scoring/ball`,
    {
      method: 'POST',
      body: JSON.stringify({ runsOffBat: 1 }),
    },
    adminToken
  );
  assert(adminScoreCricket.status === 200, 'Super Admin has full scoring access across all matches and sports');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
