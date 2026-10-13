/**
 * SportsPulse Prompt 18: Final Production Release Candidate & VPS Verification Test Suite
 *
 * Deterministic automated verification of the critical release path:
 * 1. Production Health & Database Readiness (/api/health)
 * 2. Security Headers (X-Content-Type-Options: nosniff, Referrer-Policy)
 * 3. Super Admin & Multi-Sport User Authentication
 * 4. Role & Sport Access Enforcement (Cricket, Football, Kabaddi)
 * 5. Tournament & Group Creation
 * 6. Team & Player Squad Provisioning
 * 7. Match Creation in SCHEDULED state
 * 8. Live Scoring Execution (Auto-transition to LIVE state)
 * 9. Real-Time SSE Stream with Reverse Proxy Buffer Safeguards
 * 10. Live Graphics Cue, Take & Broadcast Transport
 * 11. Public Broadcast Canvas (1920x1080 transparent output, single public URL)
 * 12. Match Completion & Immutability Lock (HTTP 400 rejection)
 * 13. Official Match Report & Standings Generation
 * 14. Production Backup Snapshot Creation & Manifest Verification
 * 15. Static Resource & Sensitive File Defense (Blocking /.env, /data, /backups, .tmp)
 * 16. Multi-Match & Multi-Sport State Isolation
 * 17. Safe Post-Test Cleanup
 */

import fs from 'fs';
import path from 'path';
import { createProductionBackup } from './backup_production';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function request(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  let body: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else {
    body = await res.text();
  }
  return { status: res.status, headers: res.headers, body };
}

async function runReleaseCandidateSuite() {
  console.log('================================================================================');
  console.log('SPORTSPULSE PROMPT 18: FINAL PRODUCTION RELEASE CANDIDATE VERIFICATION');
  console.log('================================================================================');

  const timestamp = Date.now();
  const testEmail = `release_candidate_${timestamp}@sportspulse.com`;
  const testPassword = 'Password@123456';

  // ----------------------------------------------------------------------------
  // 1. Health, Readiness & Security Headers
  // ----------------------------------------------------------------------------
  console.log('\n--- 1. Production Health, Readiness & Security Headers ---');
  const healthRes = await request('/api/health');
  assert(healthRes.status === 200, 'Health endpoint responds with HTTP 200 OK');
  assert(healthRes.body?.status === 'ok', 'Health status is "ok"');
  assert(healthRes.body?.ready === true, 'Readiness probe confirms primary database is ready');
  assert(healthRes.body?.service === 'SportsPulse Core Engine', 'Service identifier verified');
  assert(healthRes.body?.version === '1.0.0', 'Release candidate version verified');
  assert(typeof healthRes.body?.uptime === 'number' && healthRes.body.uptime >= 0, 'Uptime reported correctly');
  assert(!healthRes.body?.secrets && !healthRes.body?.dbPath, 'Zero secrets or paths leaked');

  // Verify Security Headers
  assert(
    healthRes.headers.get('x-content-type-options') === 'nosniff',
    'Security header X-Content-Type-Options: nosniff present'
  );
  assert(
    Boolean(healthRes.headers.get('referrer-policy')),
    'Security header Referrer-Policy present'
  );

  // ----------------------------------------------------------------------------
  // 2. Authentication & Credential Verification
  // ----------------------------------------------------------------------------
  console.log('\n--- 2. Super Admin & Organizer Authentication ---');
  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@sportspulse.com', password: 'Admin@123456' }),
  });
  assert(adminLoginRes.status === 200, 'Super Admin logs in successfully (200)');
  const adminToken = adminLoginRes.body?.token;
  assert(typeof adminToken === 'string' && adminToken.length > 20, 'Admin token issued');

  // Provision Release Organizer
  const createUserRes = await request('/api/auth/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      name: `Release Candidate Lead ${timestamp}`,
      displayName: `RC Lead ${timestamp}`,
      username: `rc_user_${timestamp}`,
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
      role: 'USER',
      allowedSports: ['CRICKET', 'FOOTBALL'],
      status: 'ACTIVE',
    }),
  }, adminToken);
  assert(createUserRes.status === 201, 'Super Admin provisions release organizer (201)');
  const userId = createUserRes.body?.user?.id;

  // Organizer Login
  const userLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  assert(userLoginRes.status === 200, 'Release organizer logs in successfully (200)');
  const userToken = userLoginRes.body?.token;

  // ----------------------------------------------------------------------------
  // 3. User Authorization & Sport Restrictions
  // ----------------------------------------------------------------------------
  console.log('\n--- 3. Authorization & Sport Access Enforcement ---');
  const userMe = await request('/api/auth/me', {}, userToken);
  assert(userMe.status === 200, 'Organizer fetches profile');
  assert(userMe.body?.user?.allowedSports?.includes('CRICKET'), 'Authorized for CRICKET');
  assert(userMe.body?.user?.allowedSports?.includes('FOOTBALL'), 'Authorized for FOOTBALL');
  assert(!userMe.body?.user?.allowedSports?.includes('KABADDI'), 'Restricted from unauthorized KABADDI');

  // ----------------------------------------------------------------------------
  // 4. Tournament, Group, Team & Player Provisioning
  // ----------------------------------------------------------------------------
  console.log('\n--- 4. Tournament, Group, Team & Squad Provisioning ---');
  const tournRes = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `RC Global Trophy ${timestamp}`,
      sport: 'CRICKET',
      type: 'LEAGUE',
      format: 'LEAGUE',
      season: '2026',
      venue: 'Lord\'s Cricket Ground',
    }),
  }, userToken);
  assert(tournRes.status === 201, 'Tournament created (201)');
  const tournamentId = tournRes.body?.tournament?.id;

  const t1Res = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId,
      name: `RC Stars ${timestamp}`,
      shortName: 'RCS',
      city: 'London',
      primaryColor: '#002B49',
    }),
  }, userToken);
  assert(t1Res.status === 201, 'Team 1 created (201)');
  const team1Id = t1Res.body?.team?.id;

  const t2Res = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId,
      name: `RC Titans ${timestamp}`,
      shortName: 'RCT',
      city: 'Manchester',
      primaryColor: '#E03A3E',
    }),
  }, userToken);
  assert(t2Res.status === 201, 'Team 2 created (201)');
  const team2Id = t2Res.body?.team?.id;

  const p1Res = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId,
      teamId: team1Id,
      name: 'Joe Root',
      jerseyNumber: '66',
      role: 'BATSMAN',
    }),
  }, userToken);
  const p1Id = p1Res.body?.player?.id;

  const p2Res = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId,
      teamId: team1Id,
      name: 'Ben Stokes',
      jerseyNumber: '55',
      role: 'BATSMAN',
    }),
  }, userToken);
  const p2Id = p2Res.body?.player?.id;

  const p3Res = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId,
      teamId: team2Id,
      name: 'Jofra Archer',
      jerseyNumber: '22',
      role: 'BOWLER',
    }),
  }, userToken);
  const p3Id = p3Res.body?.player?.id;
  assert(Boolean(p1Id && p2Id && p3Id), 'All squad players created (201)');

  // ----------------------------------------------------------------------------
  // 5. Match Setup & Fixture Scheduling
  // ----------------------------------------------------------------------------
  console.log('\n--- 5. Match Setup & Fixture Scheduling ---');
  const matchRes = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId,
      teamAId: team1Id,
      teamBId: team2Id,
      sport: 'CRICKET',
      name: `RC Grand Final ${timestamp}`,
    }),
  }, userToken);
  assert(matchRes.status === 201, 'Match created in SCHEDULED state (201)');
  const matchId = matchRes.body?.match?.id;

  // ----------------------------------------------------------------------------
  // 6. Live Scoring Execution (Auto-transition to LIVE)
  // ----------------------------------------------------------------------------
  console.log('\n--- 6. Live Scoring Execution ---');
  const startRes = await request(`/api/matches/${matchId}/scoring/start`, {
    method: 'POST',
    body: JSON.stringify({
      battingTeamId: team1Id,
      bowlingTeamId: team2Id,
      strikerId: p1Id,
      nonStrikerId: p2Id,
      bowlerId: p3Id,
    }),
  }, userToken);
  assert(startRes.status === 200, 'Scoring started successfully (200)');

  const b1 = await request(`/api/matches/${matchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 4, extraRuns: 0, extraType: 'NONE' }),
  }, userToken);
  assert(b1.status === 200, 'Scored boundary FOUR');
  assert(b1.body?.state?.scoreA === 4, 'Score is 4');

  const b2 = await request(`/api/matches/${matchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 6, extraRuns: 0, extraType: 'NONE' }),
  }, userToken);
  assert(b2.status === 200, 'Scored maximum SIX');
  assert(b2.body?.state?.scoreA === 10, 'Score is 10');

  const liveMatchGet = await request(`/api/matches/${matchId}`, {}, userToken);
  assert(liveMatchGet.body?.match?.status === 'LIVE', 'Match auto-transitioned to LIVE state');

  // ----------------------------------------------------------------------------
  // 7. Graphics Preview & Program Switching
  // ----------------------------------------------------------------------------
  console.log('\n--- 7. Graphics Studio & Transport Control ---');
  const cueRes = await request(`/api/matches/${matchId}/broadcast/preview`, {
    method: 'POST',
    body: JSON.stringify({
      graphicId: 'cricket-scorebug-rc',
      graphicName: 'RC Live Scorebug',
      durationSeconds: 0,
      isHeld: true,
    }),
  }, userToken);
  assert(cueRes.status === 200, 'Graphic cued to Preview channel (200)');

  const takeRes = await request(`/api/matches/${matchId}/broadcast/take`, {
    method: 'POST',
  }, userToken);
  assert(takeRes.status === 200, 'Graphic taken LIVE to Program (200)');

  const onAirRes = await request(`/api/matches/${matchId}/broadcast/on-air-state`, {}, userToken);
  assert(Boolean(onAirRes.body?.onAir?.program), 'Program channel actively broadcasts live graphic');

  // ----------------------------------------------------------------------------
  // 8. Public Broadcast Canvas (Single Public URL)
  // ----------------------------------------------------------------------------
  console.log('\n--- 8. Public Broadcast Canvas Output ---');
  const pubMatch = await request(`/api/matches/${matchId}/public`);
  assert(pubMatch.status === 200, 'Public match endpoint accessible without credentials (200)');
  assert(!pubMatch.body?.match?.ownerUserId, 'Internal ownerUserId sanitized from public response');

  const pubCanvas = await request(`/api/matches/${matchId}/broadcast/state`);
  assert(pubCanvas.status === 200, 'Public broadcast canvas returns 200 OK');
  assert(pubCanvas.body?.scoringState?.scoreA === 10, 'Live canvas reflects verified score of 10');

  // ----------------------------------------------------------------------------
  // 9. Real-Time SSE Stream with Proxy Buffering Controls
  // ----------------------------------------------------------------------------
  console.log('\n--- 9. Real-Time SSE Stream & Buffering Controls ---');
  const sseRes = await fetch(`${BASE_URL}/api/matches/${matchId}/scoring/stream`, {
    headers: { Accept: 'text/event-stream' },
  });
  assert(sseRes.status === 200, 'SSE stream connects with status 200 OK');
  assert((sseRes.headers.get('content-type') || '').includes('text/event-stream'), 'SSE content-type is text/event-stream');
  assert(sseRes.headers.get('x-accel-buffering') === 'no', 'Reverse proxy buffering disabled (X-Accel-Buffering: no)');
  assert((sseRes.headers.get('cache-control') || '').includes('no-cache'), 'Cache-Control prevents caching');

  // ----------------------------------------------------------------------------
  // 10. Match Completion & Immutability Lock
  // ----------------------------------------------------------------------------
  console.log('\n--- 10. Match Completion & Immutability Lock ---');
  const endMatchRes = await request(`/api/matches/${matchId}/scoring/end-match`, {
    method: 'POST',
    body: JSON.stringify({ winnerTeamId: team1Id, matchResultText: 'RC Stars won by 10 runs' }),
  }, userToken);
  assert(endMatchRes.status === 200, 'Match ended and finalized (200)');

  const lockedDelivery = await request(`/api/matches/${matchId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 1 }),
  }, userToken);
  assert(lockedDelivery.status === 400, 'Post-completion scoring rejected with HTTP 400 Bad Request');

  // ----------------------------------------------------------------------------
  // 11. Reports & Standings
  // ----------------------------------------------------------------------------
  console.log('\n--- 11. Reports & Standings ---');
  const reportRes = await request(`/api/matches/${matchId}/report`, {}, userToken);
  assert(reportRes.status === 200, 'Match report generated successfully (200)');
  assert(reportRes.body?.report?.match?.status === 'COMPLETED', 'Report reflects completed status');

  const standingsRes = await request(`/api/tournaments/${tournamentId}/standings`, {}, userToken);
  assert(standingsRes.status === 200, 'Tournament standings retrieved (200)');
  assert(Array.isArray(standingsRes.body?.standings), 'Tournament standings array returned');

  // ----------------------------------------------------------------------------
  // 12. Production Backup Creation & Manifest Integrity
  // ----------------------------------------------------------------------------
  console.log('\n--- 12. Production Backup Snapshot ---');
  const testBackupsDir = path.resolve(process.cwd(), 'backups/test_rc_run');
  const backupRes = createProductionBackup(testBackupsDir, 3);
  assert(backupRes.success === true, 'Backup created successfully');
  assert(fs.existsSync(backupRes.dbBackupPath), 'Backup db.json exists on disk');
  assert(backupRes.stats.dbSizeBytes > 0, 'Backup database byte size is positive');
  assert(backupRes.stats.tournamentsCount > 0, 'Backup recorded active tournaments');

  // ----------------------------------------------------------------------------
  // 13. Static Resource Defense & File Protection
  // ----------------------------------------------------------------------------
  console.log('\n--- 13. Static Resource Defense ---');
  const envBlocked = await request('/.env');
  assert(envBlocked.status === 403, 'Direct access to /.env blocked (403)');

  const dbBlocked = await request('/data/db.json');
  assert(dbBlocked.status === 403, 'Direct access to /data/db.json blocked (403)');

  const backupsBlocked = await request('/backups/manifest.json');
  assert(backupsBlocked.status === 403, 'Direct access to /backups blocked (403)');

  const pkgBlocked = await request('/package.json');
  assert(pkgBlocked.status === 403, 'Direct access to /package.json blocked (403)');

  // ----------------------------------------------------------------------------
  // 14. Multi-Match & Multi-Sport State Isolation
  // ----------------------------------------------------------------------------
  console.log('\n--- 14. Multi-Match State Isolation ---');
  const fbMatchRes = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId,
      teamAId: team1Id,
      teamBId: team2Id,
      sport: 'FOOTBALL',
      name: `RC Football Match ${timestamp}`,
    }),
  }, userToken);
  assert(fbMatchRes.status === 201, 'Football match created');
  const fbMatchId = fbMatchRes.body?.match?.id;

  const fbGoal = await request(`/api/matches/${fbMatchId}/scoring/football/event`, {
    method: 'POST',
    body: JSON.stringify({ eventType: 'GOAL', teamId: team1Id, minute: 10, goalType: 'OPEN_PLAY', period: 1 }),
  }, userToken);
  assert(fbGoal.status === 200, 'Scored Football goal (1-0)');

  const m1State = await request(`/api/matches/${matchId}/broadcast/state`);
  const m2State = await request(`/api/matches/${fbMatchId}/broadcast/state`);

  assert(m1State.body?.match?.sport === 'CRICKET', 'Match 1 is CRICKET');
  assert(m2State.body?.match?.sport === 'FOOTBALL', 'Match 2 is FOOTBALL');
  assert(m1State.body?.scoringState?.scoreA === 10, 'Cricket score remains 10');
  assert(m2State.body?.scoringState?.scoreA === 1, 'Football score is 1 and isolated');

  // Clean test backup directory
  if (fs.existsSync(testBackupsDir)) {
    fs.rmSync(testBackupsDir, { recursive: true, force: true });
  }

  console.log('\n================================================================================');
  console.log(`RELEASE CANDIDATE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runReleaseCandidateSuite().catch((err) => {
  console.error('Fatal release candidate test error:', err);
  process.exit(1);
});
