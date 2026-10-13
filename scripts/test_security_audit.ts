/**
 * SportsPulse Prompt 14: Comprehensive Production Security & Authorization Audit Suite
 *
 * Programmatically tests:
 * 1. Authentication audit (login, invalid creds, token validation, expired/tampered, disabled users, no passwords leaked)
 * 2. Role isolation (Super Admin vs normal User, privilege escalation, user management lockdown)
 * 3. Sport access control (per-user allowedSports server enforcement across tournaments, matches, scoring, graphics, broadcast)
 * 4. Tenant / user data isolation (cross-user access barriers, private tournaments/matches/auctions)
 * 5. IDOR & object-reference audit (direct object modification, deletion, and action execution)
 * 6. Match scoring security (completed match locks, engine-sport alignment, unauthorized scorer prevention)
 */

const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string, detail?: any) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}${detail !== undefined ? ` (Actual: ${typeof detail === 'object' ? JSON.stringify(detail) : detail})` : ''}`);
  }
}

async function request(path: string, options: RequestInit = {}, token?: string): Promise<{ status: number; body: any; headers: Headers }> {
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
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: res.status, body, headers: res.headers };
}

async function runSecurityAudit() {
  console.log('================================================================================');
  console.log('SPORTSPULSE PROMPT 14: PRODUCTION SECURITY & AUTHORIZATION AUDIT');
  console.log('================================================================================\n');

  // --- SECTION 1: AUTHENTICATION AUDIT ---
  console.log('--- SECTION 1: Authentication & Credentials Audit ---');

  // 1.1 Login with valid admin credentials
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@sportspulse.com', password: 'Admin@123456' }),
  });
  assert(adminLogin.status === 200, 'Admin logs in successfully with status 200');
  assert(!!adminLogin.body.token, 'Admin receives valid JWT token');
  assert(adminLogin.body.user?.password === undefined, 'Password is not leaked in login user object');
  assert(adminLogin.body.user?.passwordHash === undefined, 'Password hash is not leaked in login user object');
  const adminToken = adminLogin.body.token;

  // 1.2 Login with invalid credentials returns structured 401 JSON
  const invalidLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@sportspulse.com', password: 'WrongPassword999!' }),
  });
  assert(invalidLogin.status === 401, 'Invalid password returns 401 Unauthorized');
  assert(typeof invalidLogin.body.error === 'string', 'Invalid password returns structured error message');

  // 1.3 Missing credentials returns 400
  const missingCreds = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: '', password: '' }),
  });
  assert(missingCreds.status === 400, 'Missing credentials returns 400 Bad Request');

  // 1.4 Protected endpoint without token returns 401 JSON
  const noTokenRes = await request('/api/auth/me');
  assert(noTokenRes.status === 401, 'Protected endpoint without token returns 401');
  assert(typeof noTokenRes.body.error === 'string', 'Missing token returns structured JSON error');

  // 1.5 Malformed token returns 401 JSON
  const malformedTokenRes = await request('/api/auth/me', {}, 'Bearer invalid.token.payload');
  assert(malformedTokenRes.status === 401, 'Malformed token returns 401 Unauthorized');

  // 1.6 Tampered token signature returns 401 JSON
  const tamperedToken = adminToken.substring(0, adminToken.length - 8) + 'XXXXXX';
  const tamperedRes = await request('/api/auth/me', {}, tamperedToken);
  assert(tamperedRes.status === 401, 'Tampered token returns 401 Unauthorized');

  // 1.7 Register normal user
  const uniqueNum = Date.now().toString().slice(-6);
  const regUser = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: `Auditor User ${uniqueNum}`,
      email: `auditor_${uniqueNum}@sportspulse.test`,
      password: 'AuditPassword123!',
      role: 'SUPER_ADMIN', // Attempt privilege escalation during registration
      allowedSports: ['CRICKET', 'FOOTBALL'], // Attempt sport escalation during registration
    }),
  });
  assert(regUser.status === 201, 'Normal user registers successfully');
  assert(regUser.body.user.role === 'USER', 'Role parameter in registration ignored; assigned USER');
  assert(regUser.body.user.passwordHash === undefined, 'Password hash not leaked in registration response');
  const user1Token = regUser.body.token;
  const user1Id = regUser.body.user.id;

  // 1.8 Verify user cannot change their own role or sports via profile edit
  const profileEdit = await request('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({
      name: `Auditor Updated ${uniqueNum}`,
      email: `auditor_${uniqueNum}@sportspulse.test`,
      role: 'SUPER_ADMIN', // Attempt privilege escalation via profile update
    }),
  }, user1Token);
  assert(profileEdit.status === 200, 'Profile update succeeds for valid fields');
  assert(profileEdit.body.user.role === 'USER', 'Role privilege escalation blocked in profile update');

  // --- SECTION 2: SUPER ADMIN / USER ROLE ISOLATION ---
  console.log('\n--- SECTION 2: Super Admin / User Role Isolation ---');

  // 2.1 Normal user cannot list users at /api/auth/users
  const userListForbidden = await request('/api/auth/users', {}, user1Token);
  assert(userListForbidden.status === 403, 'Normal USER blocked from /api/auth/users (403)');

  // 2.2 Normal user cannot access /api/auth/admin/users
  const adminUsersForbidden = await request('/api/auth/admin/users', {}, user1Token);
  assert(adminUsersForbidden.status === 403, 'Normal USER blocked from /api/auth/admin/users (403)');

  // 2.3 Normal user cannot create another user via admin endpoint
  const userCreateForbidden = await request('/api/auth/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Hacker User',
      email: `hacker_${uniqueNum}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'SUPER_ADMIN',
    }),
  }, user1Token);
  assert(userCreateForbidden.status === 403, 'Normal USER blocked from creating users (403)');

  // 2.4 Normal user cannot reset another user password via admin endpoint
  const passResetForbidden = await request(`/api/auth/admin/users/${user1Id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword: 'NewPassword123!', confirmPassword: 'NewPassword123!' }),
  }, user1Token);
  assert(passResetForbidden.status === 403, 'Normal USER blocked from admin password reset (403)');

  // 2.5 Normal user cannot disable/enable another user
  const statusForbidden = await request(`/api/auth/admin/users/${user1Id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'DISABLED' }),
  }, user1Token);
  assert(statusForbidden.status === 403, 'Normal USER blocked from changing user status (403)');

  // 2.6 Normal user cannot access platform system audit logs
  const systemAuditForbidden = await request('/api/system/audit-logs', {}, user1Token);
  assert(systemAuditForbidden.status === 403, 'Normal USER blocked from system audit logs (403)');

  // 2.7 Normal user cannot trigger platform graphics reset-defaults
  const graphicsResetForbidden = await request('/api/graphics/reset-defaults', { method: 'POST' }, user1Token);
  assert(graphicsResetForbidden.status === 403, 'Normal USER blocked from resetting platform graphics (403)');

  // 2.8 Super Admin retains legitimate administrative access
  const adminUserList = await request('/api/auth/admin/users', {}, adminToken);
  assert(adminUserList.status === 200, 'Super Admin successfully accesses /api/auth/admin/users');
  assert(Array.isArray(adminUserList.body.users), 'Super Admin receives user list');

  // --- SECTION 3: SPORT ACCESS CONTROL ---
  console.log('\n--- SECTION 3: Sport Access Control Enforcement ---');

  // Set up User A (Cricket only) and User B (Kabaddi only) via Admin
  const userAEmail = `cricket_user_${uniqueNum}@test.com`;
  const userBEmail = `kabaddi_user_${uniqueNum}@test.com`;

  const createUserA = await request('/api/auth/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      name: 'User A (Cricket Only)',
      email: userAEmail,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      role: 'USER',
      allowedSports: ['CRICKET'],
    }),
  }, adminToken);
  assert(createUserA.status === 201, 'Super Admin created User A (Cricket Only)');

  const createUserB = await request('/api/auth/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      name: 'User B (Kabaddi Only)',
      email: userBEmail,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      role: 'USER',
      allowedSports: ['KABADDI'],
    }),
  }, adminToken);
  assert(createUserB.status === 201, 'Super Admin created User B (Kabaddi Only)');

  // Login User A and User B
  const loginA = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userAEmail, password: 'SecurePassword123!' }),
  });
  const tokenA = loginA.body.token;

  const loginB = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userBEmail, password: 'SecurePassword123!' }),
  });
  const tokenB = loginB.body.token;

  // 3.1 User A can create Cricket tournament
  const tournACricket = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `User A Cricket Cup ${uniqueNum}`,
      sport: 'CRICKET',
      competitionFormat: 'SINGLE_LEAGUE',
    }),
  }, tokenA);
  assert(tournACricket.status === 201, 'User A can create Cricket tournament (201)');
  const tournACricketId = tournACricket.body.tournament.id;

  // 3.2 User A CANNOT create Kabaddi tournament (denied by sport access)
  const tournAKabaddi = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `User A Illegal Kabaddi ${uniqueNum}`,
      sport: 'KABADDI',
      competitionFormat: 'SINGLE_LEAGUE',
    }),
  }, tokenA);
  assert(tournAKabaddi.status === 403, 'User A blocked from creating Kabaddi tournament (403)');

  // 3.3 User B can create Kabaddi tournament
  const tournBKabaddi = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `User B Kabaddi Pro ${uniqueNum}`,
      sport: 'KABADDI',
      competitionFormat: 'SINGLE_LEAGUE',
    }),
  }, tokenB);
  assert(tournBKabaddi.status === 201, 'User B can create Kabaddi tournament (201)');
  const tournBKabaddiId = tournBKabaddi.body.tournament.id;

  // 3.4 User B CANNOT create Cricket tournament
  const tournBCricket = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `User B Illegal Cricket ${uniqueNum}`,
      sport: 'CRICKET',
      competitionFormat: 'SINGLE_LEAGUE',
    }),
  }, tokenB);
  assert(tournBCricket.status === 403, 'User B blocked from creating Cricket tournament (403)');

  // 3.5 User A cannot create custom sport configuration
  const customSportA = await request('/api/custom-sports', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Dodgeball Custom',
      shortCode: 'DGB',
    }),
  }, tokenA);
  assert(customSportA.status === 403, 'User A (Cricket only) blocked from managing Custom sports (403)', customSportA.status);

  // 3.6 User A cannot create graphics presets for Football or Kabaddi
  const graphicPresetKabaddi = await request('/api/graphics/presets', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Kabaddi Scorebug',
      sport: 'KABADDI',
      category: 'Scorebug',
      graphic: { elements: [] },
    }),
  }, tokenA);
  assert(graphicPresetKabaddi.status === 403, 'User A blocked from creating Kabaddi graphic presets (403)', graphicPresetKabaddi.status);

  // 3.7 User A cannot save broadcast assignments for Kabaddi
  const broadcastAssignKabaddi = await request('/api/broadcast/assignments', {
    method: 'POST',
    body: JSON.stringify({
      assignments: [{
        id: 'assign-test-1',
        sport: 'KABADDI',
        eventType: 'SUPER_RAID',
        triggerMode: 'AUTO',
        autoHideDuration: 3,
      }],
    }),
  }, tokenA);
  assert(broadcastAssignKabaddi.status === 403, 'User A blocked from saving Kabaddi broadcast assignments (403)', { status: broadcastAssignKabaddi.status, body: broadcastAssignKabaddi.body });

  // --- SECTION 4: TENANT & USER DATA ISOLATION ---
  console.log('\n--- SECTION 4: Tenant & User Data Isolation ---');

  // Create private matches for User A and User B
  // Team A & B for User A's Cricket Tournament
  const team1A = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId: tournACricketId, name: `Team A1 ${uniqueNum}` }),
  }, tokenA);
  const team2A = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId: tournACricketId, name: `Team A2 ${uniqueNum}` }),
  }, tokenA);

  const matchA = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId: tournACricketId,
      sport: 'CRICKET',
      teamAId: team1A.body.team.id,
      teamBId: team2A.body.team.id,
      name: `Match A (User A Private) ${uniqueNum}`,
    }),
  }, tokenA);
  assert(matchA.status === 201, 'User A created private match');
  const matchAId = matchA.body.match.id;

  // Team 1 & 2 for User B's Kabaddi Tournament
  const team1B = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId: tournBKabaddiId, name: `Team B1 ${uniqueNum}` }),
  }, tokenB);
  const team2B = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId: tournBKabaddiId, name: `Team B2 ${uniqueNum}` }),
  }, tokenB);

  const matchB = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId: tournBKabaddiId,
      sport: 'KABADDI',
      teamAId: team1B.body.team.id,
      teamBId: team2B.body.team.id,
      name: `Match B (User B Private) ${uniqueNum}`,
    }),
  }, tokenB);
  assert(matchB.status === 201, 'User B created private match');
  const matchBId = matchB.body.match.id;

  // 4.1 User B cannot access User A's private match details
  const crossMatchAccess = await request(`/api/matches/${matchAId}`, {}, tokenB);
  assert(crossMatchAccess.status === 403, 'User B blocked from viewing User A match (403)');

  // 4.2 User A cannot access User B's private match details
  const crossMatchAccessA = await request(`/api/matches/${matchBId}`, {}, tokenA);
  assert(crossMatchAccessA.status === 403, 'User A blocked from viewing User B match (403)');

  // 4.3 User B cannot access User A's match report
  const crossReportAccess = await request(`/api/matches/${matchAId}/report`, {}, tokenB);
  assert(crossReportAccess.status === 403, 'User B blocked from viewing User A match report (403)');

  // 4.4 User B cannot access User A's tournament dashboard
  const crossDashAccess = await request(`/api/tournaments/${tournACricketId}/dashboard`, {}, tokenB);
  assert(crossDashAccess.status === 403, 'User B blocked from viewing User A tournament dashboard (403)');

  // 4.5 User B cannot access User A's tournament standings rules
  const crossRulesAccess = await request(`/api/tournaments/${tournACricketId}/standings/rules`, {}, tokenB);
  assert(crossRulesAccess.status === 403, 'User B blocked from viewing User A standings rules (403)');

  // 4.6 User B cannot access User A's tournament championship summary
  const crossChampAccess = await request(`/api/tournaments/${tournACricketId}/championship-summary`, {}, tokenB);
  assert(crossChampAccess.status === 403, 'User B blocked from viewing User A championship summary (403)');

  // 4.7 User B cannot access User A's tournament records
  const crossRecordsAccess = await request(`/api/tournaments/${tournACricketId}/records`, {}, tokenB);
  assert(crossRecordsAccess.status === 403, 'User B blocked from viewing User A tournament records (403)');

  // 4.8 User B cannot access User A's tournament awards
  const crossAwardsAccess = await request(`/api/tournaments/${tournACricketId}/awards`, {}, tokenB);
  assert(crossAwardsAccess.status === 403, 'User B blocked from viewing User A tournament awards (403)');

  // --- SECTION 5: IDOR & OBJECT REFERENCE AUDIT ---
  console.log('\n--- SECTION 5: IDOR & Object-Reference Audit ---');

  // 5.1 IDOR: User B attempts to PUT /api/tournaments/:id on User A's tournament
  const idorTournPut = await request(`/api/tournaments/${tournACricketId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Hacked Tournament Name' }),
  }, tokenB);
  assert(idorTournPut.status === 403, 'IDOR blocked: User B cannot modify User A tournament (403)');

  // 5.2 IDOR: User B attempts to DELETE /api/tournaments/:id on User A's tournament
  const idorTournDelete = await request(`/api/tournaments/${tournACricketId}`, {
    method: 'DELETE',
  }, tokenB);
  assert(idorTournDelete.status === 403, 'IDOR blocked: User B cannot delete User A tournament (403)');

  // 5.3 IDOR: User B attempts to modify User A's team
  const idorTeamPut = await request(`/api/teams/${team1A.body.team.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Hacked Team Name' }),
  }, tokenB);
  assert(idorTeamPut.status === 403, 'IDOR blocked: User B cannot modify User A team (403)');

  // 5.4 IDOR: User B attempts to DELETE User A's team
  const idorTeamDelete = await request(`/api/teams/${team1A.body.team.id}`, {
    method: 'DELETE',
  }, tokenB);
  assert(idorTeamDelete.status === 403, 'IDOR blocked: User B cannot delete User A team (403)');

  // 5.5 IDOR: User B attempts to PUT /api/matches/:id on User A's match
  const idorMatchPut = await request(`/api/matches/${matchAId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Hacked Match Name' }),
  }, tokenB);
  assert(idorMatchPut.status === 403, 'IDOR blocked: User B cannot modify User A match (403)');

  // 5.6 IDOR: User B attempts to change match status on User A's match
  const idorStatusPatch = await request(`/api/matches/${matchAId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'COMPLETED' }),
  }, tokenB);
  assert(idorStatusPatch.status === 403, 'IDOR blocked: User B cannot alter User A match status (403)');

  // 5.7 IDOR: User B attempts to update squad on User A's match
  const idorSquadPut = await request(`/api/matches/${matchAId}/squad`, {
    method: 'PUT',
    body: JSON.stringify({ teamASquad: [] }),
  }, tokenB);
  assert(idorSquadPut.status === 403, 'IDOR blocked: User B cannot update User A match squad (403)');

  // 5.8 IDOR: User B attempts to DELETE User A's match
  const idorMatchDelete = await request(`/api/matches/${matchAId}`, {
    method: 'DELETE',
  }, tokenB);
  assert(idorMatchDelete.status === 403, 'IDOR blocked: User B cannot delete User A match (403)');

  // 5.9 IDOR: User B attempts to modify broadcast config on User A's match
  const idorBroadcastConfig = await request(`/api/matches/${matchAId}/broadcast/config`, {
    method: 'POST',
    body: JSON.stringify({ scoreboardVisible: true }),
  }, tokenB);
  assert(idorBroadcastConfig.status === 403, 'IDOR blocked: User B cannot modify broadcast config for User A match (403)');

  // 5.10 IDOR on Auctions: User A creates an auction
  const createAuctionA = await request('/api/auctions', {
    method: 'POST',
    body: JSON.stringify({
      name: `User A Cricket Auction ${uniqueNum}`,
      sport: 'CRICKET',
      season: '2026',
    }),
  }, tokenA);
  assert(createAuctionA.status === 201, 'User A created auction');
  const auctionAId = createAuctionA.body.auction.id;

  // User B attempts to access User A's auction
  const idorAuctionGet = await request(`/api/auctions/${auctionAId}`, {}, tokenB);
  assert(idorAuctionGet.status === 403, 'IDOR blocked: User B cannot view User A auction (403)');

  // User B attempts to update User A's auction
  const idorAuctionPut = await request(`/api/auctions/${auctionAId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Hacked Auction Name' }),
  }, tokenB);
  assert(idorAuctionPut.status === 403, 'IDOR blocked: User B cannot update User A auction (403)');

  // User B attempts to place bid on User A's auction
  const idorAuctionBid = await request(`/api/auctions/${auctionAId}/bid`, {
    method: 'POST',
    body: JSON.stringify({ teamId: 'fake-team', amount: 500000 }),
  }, tokenB);
  assert(idorAuctionBid.status === 403, 'IDOR blocked: User B cannot bid on User A auction (403)');

  // User B attempts to delete User A's auction
  const idorAuctionDelete = await request(`/api/auctions/${auctionAId}`, {
    method: 'DELETE',
  }, tokenB);
  assert(idorAuctionDelete.status === 403, 'IDOR blocked: User B cannot delete User A auction (403)');

  // --- SECTION 6: MATCH SCORING SECURITY ---
  console.log('\n--- SECTION 6: Match Scoring Security & Engine Mismatch Audit ---');

  // 6.1 Unauthorized User B attempts to score User A's match merely by knowing the match ID
  const idorScoreAttempt = await request(`/api/matches/${matchAId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 4, extraRuns: 0, extraType: 'NONE' }),
  }, tokenB);
  assert(idorScoreAttempt.status === 403, 'Unauthorized scoring blocked: User B cannot score User A match (403)');

  // 6.2 Match sport must match scoring engine:
  // User A attempts to submit Football scoring event to their own Cricket match
  const wrongEngineAttempt = await request(`/api/matches/${matchAId}/scoring/football/event`, {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'GOAL',
      teamId: team1A.body.team.id,
      goalType: 'OPEN_PLAY',
    }),
  }, tokenA);
  assert(wrongEngineAttempt.status === 400, 'Engine mismatch blocked: Football event on Cricket match rejected (400)');
  assert(wrongEngineAttempt.body.error?.includes('not configured for Football'), 'Returns explicit sport engine mismatch message');

  // 6.3 User A attempts to submit Kabaddi raid to Cricket match
  const wrongEngineKabaddi = await request(`/api/matches/${matchAId}/scoring/kabaddi/raid`, {
    method: 'POST',
    body: JSON.stringify({
      raidingTeamId: team1A.body.team.id,
      raidOutcome: 'SUCCESS',
      touchPoints: 1,
    }),
  }, tokenA);
  assert(wrongEngineKabaddi.status === 400, 'Engine mismatch blocked: Kabaddi raid on Cricket match rejected (400)');

  // 6.4 User A attempts to submit Volleyball point to Cricket match
  const wrongEngineVolleyball = await request(`/api/matches/${matchAId}/scoring/volleyball/point`, {
    method: 'POST',
    body: JSON.stringify({
      pointWinner: team1A.body.team.id,
      pointType: 'ATTACK_KILL',
    }),
  }, tokenA);
  assert(wrongEngineVolleyball.status === 400, 'Engine mismatch blocked: Volleyball point on Cricket match rejected (400)');

  // 6.5 User B attempts to submit Cricket ball to their own Kabaddi match
  const wrongEngineCricket = await request(`/api/matches/${matchBId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 1, extraRuns: 0, extraType: 'NONE' }),
  }, tokenB);
  assert(wrongEngineCricket.status === 400, 'Engine mismatch blocked: Cricket ball on Kabaddi match rejected (400)');

  // 6.6 Valid authorized scorer scores legal deliveries
  // First start the cricket match properly
  const p1A = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({ teamId: team1A.body.team.id, tournamentId: tournACricketId, name: 'Striker A1' }),
  }, tokenA);
  const p2A = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({ teamId: team1A.body.team.id, tournamentId: tournACricketId, name: 'NonStriker A1' }),
  }, tokenA);
  const p3A = await request('/api/players', {
    method: 'POST',
    body: JSON.stringify({ teamId: team2A.body.team.id, tournamentId: tournACricketId, name: 'Bowler A2' }),
  }, tokenA);

  const startMatchA = await request(`/api/matches/${matchAId}/scoring/start`, {
    method: 'POST',
    body: JSON.stringify({
      battingTeamId: team1A.body.team.id,
      bowlingTeamId: team2A.body.team.id,
      strikerId: p1A.body.player.id,
      nonStrikerId: p2A.body.player.id,
      bowlerId: p3A.body.player.id,
    }),
  }, tokenA);
  assert(startMatchA.status === 200, 'Authorized owner can start Cricket match');

  const ball1 = await request(`/api/matches/${matchAId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 4, extraRuns: 0, extraType: 'NONE', isWicket: false }),
  }, tokenA);
  assert(ball1.status === 200, 'Authorized owner scores legal boundary (Four)');

  // 6.7 Complete the match
  const endMatchRes = await request(`/api/matches/${matchAId}/scoring/end-match`, {
    method: 'POST',
  }, tokenA);
  assert(endMatchRes.status === 200, 'Match successfully completed via end-match');

  // 6.8 Completed matches remain locked against all scoring operations
  const lockedScoreAttempt = await request(`/api/matches/${matchAId}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 6, extraRuns: 0, extraType: 'NONE', isWicket: false }),
  }, tokenA);
  assert(lockedScoreAttempt.status === 400, 'Scoring on completed match blocked with status 400');
  assert(lockedScoreAttempt.body.error?.includes('locked') || lockedScoreAttempt.body.error?.includes('completed'), 'Explicitly indicates match scoring is locked');

  // --- SECTION 7: DISABLED USERS LOSE ACCESS IMMEDIATELY ---
  console.log('\n--- SECTION 7: Account Suspension & Disabled Users Audit ---');

  // Disable User A via Admin
  const disableUserA = await request(`/api/auth/admin/users/${createUserA.body.user.id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'DISABLED' }),
  }, adminToken);
  assert(disableUserA.status === 200, 'Super Admin disabled User A');

  // User A attempts request with their existing token -> immediately rejected
  const disabledTokenRes = await request('/api/auth/me', {}, tokenA);
  assert(disabledTokenRes.status === 401, 'Disabled user existing token rejected immediately with 401');

  // Disabled user cannot log in
  const disabledLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userAEmail, password: 'SecurePassword123!' }),
  });
  assert(disabledLoginRes.status === 403, 'Disabled user login rejected with 403 (Account deactivated)');

  // Re-enable User A via Admin
  const reEnableUserA = await request(`/api/auth/admin/users/${createUserA.body.user.id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'ACTIVE' }),
  }, adminToken);
  assert(reEnableUserA.status === 200, 'Super Admin re-enabled User A');

  // --- SECTION 8: PUBLIC BROADCAST ARCHITECTURE PRESERVATION ---
  console.log('\n--- SECTION 8: Public Broadcast Architecture Integrity ---');

  // Public match endpoint /api/matches/:id/public is intentionally accessible without token
  const publicMatchRes = await request(`/api/matches/${matchAId}/public`);
  assert(publicMatchRes.status === 200, 'Public match endpoint accessible without auth (200)');
  assert(publicMatchRes.body.match.id === matchAId, 'Public match endpoint returns correct match data');
  assert(publicMatchRes.body.match.ownerUserId === undefined, 'Internal ownerUserId sanitized from public match response');

  // Public broadcast canvas state endpoint /api/matches/:id/broadcast/state is accessible without token
  const publicBroadcastState = await request(`/api/matches/${matchAId}/broadcast/state`);
  assert(publicBroadcastState.status === 200, 'Public broadcast canvas endpoint accessible without auth (200)');
  assert(!!publicBroadcastState.body.scoringState, 'Public broadcast canvas provides scoring state for OBS/vMix');

  // Public report endpoint /api/matches/:id/public-report is accessible without token
  const publicReportRes = await request(`/api/matches/${matchAId}/public-report`);
  assert(publicReportRes.status === 200, 'Public match report endpoint accessible without auth (200)');

  // Public auction state endpoint
  const publicAuctionRes = await request(`/api/auctions/${auctionAId}/public`);
  assert(publicAuctionRes.status === 200, 'Public auction endpoint accessible without auth (200)');

  // --- SECTION 9: MULTI-SPORT USER ISOLATION (USER C) ---
  console.log('\n--- SECTION 9: Multi-Sport User Access Control ---');

  // Create User C with allowedSports: ['CRICKET', 'FOOTBALL']
  const userCEmail = `multisport_user_${uniqueNum}@test.com`;
  const createUserC = await request('/api/auth/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      name: 'User C (Cricket + Football)',
      email: userCEmail,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      role: 'USER',
      allowedSports: ['CRICKET', 'FOOTBALL'],
    }),
  }, adminToken);
  assert(createUserC.status === 201, 'Super Admin created User C (Cricket + Football)');

  const loginC = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userCEmail, password: 'SecurePassword123!' }),
  });
  const tokenC = loginC.body.token;

  // User C CAN create Cricket tournament
  const tournCCricket = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `User C Cricket League ${uniqueNum}`,
      sport: 'CRICKET',
      competitionFormat: 'SINGLE_LEAGUE',
    }),
  }, tokenC);
  assert(tournCCricket.status === 201, 'Multi-sport user can create Cricket tournament (201)');

  // User C CAN create Football tournament
  const tournCFootball = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `User C Football Championship ${uniqueNum}`,
      sport: 'FOOTBALL',
      competitionFormat: 'SINGLE_LEAGUE',
    }),
  }, tokenC);
  assert(tournCFootball.status === 201, 'Multi-sport user can create Football tournament (201)');

  // User C CANNOT create Kabaddi tournament
  const tournCKabaddi = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `User C Illegal Kabaddi ${uniqueNum}`,
      sport: 'KABADDI',
      competitionFormat: 'SINGLE_LEAGUE',
    }),
  }, tokenC);
  assert(tournCKabaddi.status === 403, 'Multi-sport user blocked from unassigned sport Kabaddi (403)');

  // User C CANNOT create Volleyball tournament
  const tournCVolleyball = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `User C Illegal Volleyball ${uniqueNum}`,
      sport: 'VOLLEYBALL',
      competitionFormat: 'SINGLE_LEAGUE',
    }),
  }, tokenC);
  assert(tournCVolleyball.status === 403, 'Multi-sport user blocked from unassigned sport Volleyball (403)');

  // --- SECTION 10: PLAYER OBJECT IDOR AUDIT ---
  console.log('\n--- SECTION 10: Player Object IDOR Audit ---');

  // User B attempts to update User A's player
  const idorPlayerPut = await request(`/api/players/${p1A.body.player.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Hacked Player Name' }),
  }, tokenB);
  assert(idorPlayerPut.status === 403, 'IDOR blocked: User B cannot modify User A player (403)');

  // User B attempts to delete User A's player
  const idorPlayerDelete = await request(`/api/players/${p1A.body.player.id}`, {
    method: 'DELETE',
  }, tokenB);
  assert(idorPlayerDelete.status === 403, 'IDOR blocked: User B cannot delete User A player (403)');

  // --- SECTION 11: SCORING EVENT PAYLOAD VALIDATION ---
  console.log('\n--- SECTION 11: Scoring Event Payload Validation ---');

  // Start a fresh Cricket match for User A to test payload validation
  const matchA2 = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId: tournACricketId,
      sport: 'CRICKET',
      teamAId: team1A.body.team.id,
      teamBId: team2A.body.team.id,
      name: `Validation Test Match ${uniqueNum}`,
    }),
  }, tokenA);
  const matchA2Id = matchA2.body.match.id;

  await request(`/api/matches/${matchA2Id}/scoring/start`, {
    method: 'POST',
    body: JSON.stringify({
      battingTeamId: team1A.body.team.id,
      bowlingTeamId: team2A.body.team.id,
      strikerId: p1A.body.player.id,
      nonStrikerId: p2A.body.player.id,
      bowlerId: p3A.body.player.id,
    }),
  }, tokenA);

  // Negative runs rejected
  const negativeRuns = await request(`/api/matches/${matchA2Id}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: -5, extraRuns: 0, extraType: 'NONE' }),
  }, tokenA);
  assert(negativeRuns.status === 400, 'Negative runs rejected with 400 Bad Request');

  // Excessive runs rejected (> 6 off bat)
  const excessiveRuns = await request(`/api/matches/${matchA2Id}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 999, extraRuns: 0, extraType: 'NONE' }),
  }, tokenA);
  assert(excessiveRuns.status === 400, 'Excessive runs (>6) rejected with 400 Bad Request');

  // Invalid extraType enum rejected
  const invalidExtra = await request(`/api/matches/${matchA2Id}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 0, extraRuns: 2, extraType: 'INVALID_EXTRA' }),
  }, tokenA);
  assert(invalidExtra.status === 400, 'Invalid extra type rejected with 400 Bad Request');

  // Starting match with non-existent player IDs rejected safely
  const fakePlayerMatch = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId: tournACricketId,
      sport: 'CRICKET',
      teamAId: team1A.body.team.id,
      teamBId: team2A.body.team.id,
      name: `Fake Player Match ${uniqueNum}`,
    }),
  }, tokenA);
  const fakeStart = await request(`/api/matches/${fakePlayerMatch.body.match.id}/scoring/start`, {
    method: 'POST',
    body: JSON.stringify({
      battingTeamId: team1A.body.team.id,
      bowlingTeamId: team2A.body.team.id,
      strikerId: '00000000-0000-0000-0000-000000000000',
      nonStrikerId: '11111111-1111-1111-1111-111111111111',
      bowlerId: '22222222-2222-2222-2222-222222222222',
    }),
  }, tokenA);
  assert(fakeStart.status === 400, 'Non-existent player IDs rejected safely (400)');

  // --- SECTION 12: PUBLIC BROADCAST BOUNDARY PROTECTION ---
  console.log('\n--- SECTION 12: Public Broadcast Boundary Protection ---');

  // Public visitor attempts to mutate match state via scoring endpoint without token -> 401
  const unauthScore = await request(`/api/matches/${matchA2Id}/scoring/ball`, {
    method: 'POST',
    body: JSON.stringify({ runsOffBat: 1, extraRuns: 0, extraType: 'NONE' }),
  });
  assert(unauthScore.status === 401, 'Unauthenticated public request cannot score match (401)');

  // Public visitor attempts to access admin endpoints -> 401
  const unauthAdmin = await request('/api/auth/admin/users');
  assert(unauthAdmin.status === 401, 'Unauthenticated public request cannot access admin users (401)');

  // Public visitor attempts to modify tournament -> 401
  const unauthTournPut = await request(`/api/tournaments/${tournACricketId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Hacked By Public' }),
  });
  assert(unauthTournPut.status === 401, 'Unauthenticated public request cannot modify tournament (401)');

  // --- SECTION 13: FILE & UPLOAD SECURITY ---
  console.log('\n--- SECTION 13: File & Upload Security ---');

  // Executable / non-whitelisted extension rejected
  const exeUpload = await request('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName: 'exploit.exe',
      fileContent: Buffer.from('binary-payload').toString('base64'),
      mimeType: 'application/x-msdownload',
    }),
  }, tokenA);
  assert(exeUpload.status === 400, 'Executable file upload (.exe) rejected with 400');

  // Path traversal in filename rejected
  const traversalUpload = await request('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName: '../../../etc/passwd.png',
      fileContent: Buffer.from('fake-png').toString('base64'),
      mimeType: 'image/png',
    }),
  }, tokenA);
  assert(traversalUpload.status === 400, 'Path traversal in upload filename rejected with 400');

  // Malicious SVG with active script rejected
  const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('xss')</script><circle r="10"/></svg>`;
  const svgXssUpload = await request('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName: 'malicious.svg',
      fileContent: Buffer.from(maliciousSvg).toString('base64'),
      mimeType: 'image/svg+xml',
    }),
  }, tokenA);
  assert(svgXssUpload.status === 400, 'SVG containing active script rejected with 400');

  // Safe PNG image accepted
  const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const validUpload = await request('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName: 'valid_logo.png',
      fileContent: validPngBase64,
      mimeType: 'image/png',
    }),
  }, tokenA);
  assert(validUpload.status === 200 || validUpload.status === 201, 'Legitimate PNG upload succeeds (200/201)', validUpload.status);

  // Safe SVG accepted
  const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>`;
  const cleanSvgUpload = await request('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName: 'clean_badge.svg',
      fileContent: Buffer.from(cleanSvg).toString('base64'),
      mimeType: 'image/svg+xml',
    }),
  }, tokenA);
  assert(cleanSvgUpload.status === 200 || cleanSvgUpload.status === 201, 'Clean SVG upload without scripts succeeds (200/201)', cleanSvgUpload.status);

  // --- SECTION 14: INTERNAL FILES & STATIC SERVING PROTECTION ---
  console.log('\n--- SECTION 14: Internal Files & Static Protection ---');

  // Direct HTTP request to /data/db.json blocked
  const dbFileBlocked = await request('/data/db.json');
  assert(dbFileBlocked.status === 403, 'Internal database file /data/db.json blocked with 403');

  // Direct HTTP request to /.env blocked
  const envFileBlocked = await request('/.env');
  assert(envFileBlocked.status === 403, 'Sensitive configuration /.env blocked with 403');

  // Direct HTTP request to /package.json blocked
  const pkgFileBlocked = await request('/package.json');
  assert(pkgFileBlocked.status === 403, 'Internal package.json blocked with 403');

  // --- SECTION 15: SSE STREAM AUTHORIZATION & ISOLATION ---
  console.log('\n--- SECTION 15: SSE Stream Authorization & Isolation ---');

  // Public match SSE endpoint connects successfully
  const ssePublicRes = await fetch(`${BASE_URL}/api/matches/${matchAId}/scoring/stream`);
  assert(ssePublicRes.status === 200, 'Public match SSE stream connects with status 200');
  assert(ssePublicRes.headers.get('content-type')?.includes('text/event-stream') === true, 'SSE stream responds with text/event-stream');

  // Close SSE connection immediately
  const reader = ssePublicRes.body?.getReader();
  if (reader) {
    await reader.cancel();
  }

  // Non-existent match SSE stream returns 404
  const sseMissingRes = await fetch(`${BASE_URL}/api/matches/non-existent-match-id-9999/scoring/stream`);
  assert(sseMissingRes.status === 404, 'Non-existent match SSE stream returns 404');

  console.log('\n================================================================================');
  console.log(`SECURITY AUDIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error('Security audit fatal error:', err);
  process.exit(1);
});
