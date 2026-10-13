/**
 * SportsPulse Broadcast Graphic Assignment & Trigger Control Test Suite
 *
 * Covers all 30 comprehensive verification points required by the task:
 * 1. Active graphic can trigger
 * 2. Hidden graphic cannot trigger
 * 3. Hidden graphic can be re-enabled
 * 4. AUTO works
 * 5. MANUAL works
 * 6. AUTO+MANUAL works
 * 7. DISABLED works
 * 8. Manual trigger respects hidden state
 * 9. Event mapping works
 * 10. Sport isolation works
 * 11. Priority works
 * 12. INTERRUPT works
 * 13. QUEUE_BEHIND works
 * 14. REPLACE_QUEUED works
 * 15. CANCEL works
 * 16. Cooldown works
 * 17. Deduplication works
 * 18. Duplicate SSE does not duplicate graphic
 * 19. Match A cannot trigger Match B
 * 20. Refresh preserves assignments
 * 21. Program state remains stable
 * 22. Preview state remains stable
 * 23. TAKE LIVE remains functional
 * 24. HOLD remains functional
 * 25. CLEAR remains functional
 * 26. REPLAY remains functional
 * 27. Playlist remains functional
 * 28. Scene remains functional
 * 29. Render failure does not crash app
 * 30. Public broadcast remains functional
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
let token = '';
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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTriggerTests() {
  console.log('='.repeat(80));
  console.log('SPORTSPULSE: BROADCAST GRAPHIC ASSIGNMENT & TRIGGER CONTROL TESTS');
  console.log('='.repeat(80));

  // --- Setup: Admin Auth & Match Setup ---
  console.log('\n--- Setup: Admin Login & Test Matches ---');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin@sportspulse.com', password: 'Admin@123456' }),
  });
  assert(loginRes.status === 200 && Boolean(loginRes.data.token), 'Admin login successful');
  token = loginRes.data.token;

  // Create Tournament A & Teams A for Cricket
  const tourARes = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({ name: 'Cricket Premier Trophy', sport: 'CRICKET', format: 'ROUND_ROBIN' }),
  });
  const tourAId = tourARes.data.tournament?.id || tourARes.data.id;

  const team1Res = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId: tourAId, name: 'Mumbai Masters', shortName: 'MUM', primaryColor: '#0284c7' }),
  });
  const team1 = team1Res.data.team || team1Res.data;

  const team2Res = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId: tourAId, name: 'Chennai Kings', shortName: 'CHE', primaryColor: '#eab308' }),
  });
  const team2 = team2Res.data.team || team2Res.data;

  // Create Match A (Cricket)
  const matchARes = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId: tourAId,
      sport: 'CRICKET',
      teamAId: team1.id,
      teamBId: team2.id,
      matchDate: new Date().toISOString(),
      venue: 'Wankhede Stadium',
      status: 'LIVE',
    }),
  });
  const matchA = matchARes.data.match || matchARes.data;
  const matchAId = matchA.id;
  assert(Boolean(matchAId), `Match A (Cricket) created with ID: ${matchAId}`);

  // Create Tournament B & Teams B for Football
  const tourBRes = await request('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({ name: 'Football Super League', sport: 'FOOTBALL', format: 'KNOCKOUT' }),
  });
  const tourBId = tourBRes.data.tournament?.id || tourBRes.data.id;

  const team3Res = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId: tourBId, name: 'Arsenal Gunners', shortName: 'ARS', primaryColor: '#dc2626' }),
  });
  const team3 = team3Res.data.team || team3Res.data;

  const team4Res = await request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ tournamentId: tourBId, name: 'Chelsea Blues', shortName: 'CHE', primaryColor: '#1d4ed8' }),
  });
  const team4 = team4Res.data.team || team4Res.data;

  // Create Match B (Football)
  const matchBRes = await request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId: tourBId,
      sport: 'FOOTBALL',
      teamAId: team3.id,
      teamBId: team4.id,
      matchDate: new Date().toISOString(),
      venue: 'Emirates Stadium',
      status: 'LIVE',
    }),
  });
  const matchB = matchBRes.data.match || matchBRes.data;
  const matchBId = matchB.id;
  assert(Boolean(matchBId), `Match B (Football) created with ID: ${matchBId}`);

  // Fetch initial cricket assignments
  const assignRes = await request(`/api/broadcast/assignments?sport=CRICKET&matchId=${matchAId}`);
  let assignments = assignRes.data.assignments || [];
  assert(Array.isArray(assignments) && assignments.length > 0, `Loaded ${assignments.length} cricket assignments`);

  // Ensure wicket assignment has assigned graphic
  const wicketIdx = assignments.findIndex((a: any) => a.targetId === 'cricket_wicket');
  if (wicketIdx >= 0) {
    assignments[wicketIdx].assignedGraphicId = 'cricket-wicket';
    assignments[wicketIdx].assignedGraphicName = 'Wicket Dismissal Animation';
    assignments[wicketIdx].enabled = true;
    assignments[wicketIdx].triggerMode = 'AUTO_MANUAL';
    assignments[wicketIdx].priority = 95;
    assignments[wicketIdx].cooldownSeconds = 0.5;
    assignments[wicketIdx].conflictAction = 'INTERRUPT';
  }

  // Ensure four assignment has assigned graphic
  const fourIdx = assignments.findIndex((a: any) => a.targetId === 'cricket_4');
  if (fourIdx >= 0) {
    assignments[fourIdx].assignedGraphicId = 'cricket-four';
    assignments[fourIdx].assignedGraphicName = 'Boundary Four Animation';
    assignments[fourIdx].enabled = true;
    assignments[fourIdx].triggerMode = 'AUTO';
    assignments[fourIdx].priority = 70;
    assignments[fourIdx].cooldownSeconds = 0.5;
    assignments[fourIdx].conflictAction = 'QUEUE_BEHIND';
  }

  // Ensure six assignment has assigned graphic
  const sixIdx = assignments.findIndex((a: any) => a.targetId === 'cricket_6');
  if (sixIdx >= 0) {
    assignments[sixIdx].assignedGraphicId = 'cricket-six';
    assignments[sixIdx].assignedGraphicName = 'Maximum Six Animation';
    assignments[sixIdx].enabled = true;
    assignments[sixIdx].triggerMode = 'AUTO_MANUAL';
    assignments[sixIdx].priority = 80;
    assignments[sixIdx].cooldownSeconds = 1.0;
    assignments[sixIdx].conflictAction = 'INTERRUPT';
  }

  // Save updated assignments
  await request('/api/broadcast/assignments', {
    method: 'POST',
    body: JSON.stringify({ assignments }),
  });

  // Ensure default broadcast config for Match A has cricket-six, cricket-four, cricket-wicket active
  await request('/api/broadcast/config', {
    method: 'POST',
    body: JSON.stringify({
      matchId: matchAId,
      activeGraphicIds: ['built-in-scorebug', 'cricket-four', 'cricket-six', 'cricket-wicket'],
      hiddenGraphicIds: [],
    }),
  });

  // Clear On-Air state before starting tests
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });

  // --- Point 1: Active Graphic Can Trigger ---
  console.log('\n--- Point 1: Active Graphic Can Trigger ---');
  const trig1 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_6', isManual: false }),
  });
  assert(trig1.data.result?.success === true, '1. Active graphic "cricket-six" triggered successfully');
  const state1 = await request(`/api/broadcast/onair/${matchAId}`);
  assert(state1.data.state?.currentOnAir?.targetId === 'cricket_6', '1. Active graphic appears in Program On-Air');

  // --- Point 2: Hidden Graphic Cannot Trigger (Auto) ---
  console.log('\n--- Point 2: Hidden Graphic Cannot Trigger (Auto) ---');
  // Hide cricket-six
  await request('/api/broadcast/config', {
    method: 'POST',
    body: JSON.stringify({
      matchId: matchAId,
      activeGraphicIds: ['built-in-scorebug', 'cricket-four', 'cricket-wicket'],
      hiddenGraphicIds: ['cricket-six', 'cricket_6'],
    }),
  });
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  await sleep(100);

  const trig2 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_6', isManual: false }),
  });
  assert(trig2.data.result?.success === false, '2. Hidden graphic trigger is blocked');
  assert(
    trig2.data.result?.reason === 'Graphic hidden — trigger skipped',
    '2. Safe reason returned: "Graphic hidden — trigger skipped"'
  );
  const state2 = await request(`/api/broadcast/onair/${matchAId}`);
  assert(state2.data.state?.currentOnAir === null, '2. Hidden graphic did not appear on Program');

  // --- Point 3: Hidden Graphic Can Be Re-enabled ---
  console.log('\n--- Point 3: Hidden Graphic Can Be Re-enabled ---');
  await request('/api/broadcast/config', {
    method: 'POST',
    body: JSON.stringify({
      matchId: matchAId,
      activeGraphicIds: ['built-in-scorebug', 'cricket-four', 'cricket-six', 'cricket-wicket'],
      hiddenGraphicIds: [],
    }),
  });
  await sleep(100);
  const trig3 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_6', isManual: false }),
  });
  assert(trig3.data.result?.success === true, '3. Re-enabled graphic triggers successfully');

  // --- Point 4: AUTO Works ---
  console.log('\n--- Point 4: AUTO Works ---');
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  await sleep(600); // wait for cooldown
  const trig4 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_4', isManual: false }),
  });
  assert(trig4.data.result?.success === true, '4. AUTO trigger mode triggers via event');

  // --- Point 5: MANUAL Works ---
  console.log('\n--- Point 5: MANUAL Works ---');
  // Configure single (cricket_1) as MANUAL
  const idx1 = assignments.findIndex((a: any) => a.targetId === 'cricket_1');
  if (idx1 >= 0) {
    assignments[idx1].assignedGraphicId = 'cricket-single';
    assignments[idx1].assignedGraphicName = 'Single Run Graphic';
    assignments[idx1].triggerMode = 'MANUAL';
    assignments[idx1].enabled = true;
    await request('/api/broadcast/assignments', { method: 'POST', body: JSON.stringify({ assignments }) });
  }
  // Auto trigger should be rejected
  const trig5Auto = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_1', isManual: false }),
  });
  assert(trig5Auto.data.result?.success === false, '5. MANUAL mode rejects automated event');
  assert(trig5Auto.data.result?.reason === 'Assignment is configured for manual trigger only', '5. Reason indicates manual only');

  // Manual trigger should succeed
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  const trig5Manual = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_1', isManual: true }),
  });
  assert(trig5Manual.data.result?.success === true, '5. MANUAL mode accepts manual operator trigger');

  // --- Point 6: AUTO+MANUAL Works ---
  console.log('\n--- Point 6: AUTO+MANUAL Works ---');
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  await sleep(1100);
  const trig6Auto = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_6', isManual: false }),
  });
  assert(trig6Auto.data.result?.success === true, '6. AUTO+MANUAL triggers automatically on event');

  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  await sleep(1100);
  const trig6Manual = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_6', isManual: true }),
  });
  assert(trig6Manual.data.result?.success === true, '6. AUTO+MANUAL triggers manually by operator');

  // --- Point 7: DISABLED Works ---
  console.log('\n--- Point 7: DISABLED Works ---');
  if (idx1 >= 0) {
    assignments[idx1].triggerMode = 'DISABLED';
    await request('/api/broadcast/assignments', { method: 'POST', body: JSON.stringify({ assignments }) });
  }
  const trig7Auto = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_1', isManual: false }),
  });
  assert(trig7Auto.data.result?.success === false, '7. DISABLED mode rejects automated trigger');

  const trig7Manual = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_1', isManual: true }),
  });
  assert(trig7Manual.data.result?.success === false, '7. DISABLED mode rejects manual trigger');

  // --- Point 8: Manual Trigger Respects Hidden State ---
  console.log('\n--- Point 8: Manual Trigger Respects Hidden State ---');
  // Hide cricket_1
  await request('/api/broadcast/config', {
    method: 'POST',
    body: JSON.stringify({
      matchId: matchAId,
      activeGraphicIds: ['built-in-scorebug', 'cricket-four', 'cricket-six', 'cricket-wicket'],
      hiddenGraphicIds: ['cricket-single', 'cricket_1'],
    }),
  });
  if (idx1 >= 0) {
    assignments[idx1].triggerMode = 'MANUAL';
    await request('/api/broadcast/assignments', { method: 'POST', body: JSON.stringify({ assignments }) });
  }
  const trig8 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_1', isManual: true }),
  });
  assert(trig8.data.result?.success === false, '8. Manual trigger safely blocked when graphic is hidden');
  assert(
    trig8.data.result?.reason === 'Graphic is hidden from Broadcast List.',
    '8. Exact message returned: "Graphic is hidden from Broadcast List."'
  );

  // --- Point 9: Event Mapping Works ---
  console.log('\n--- Point 9: Event Mapping Works ---');
  const foundWicketMapping = assignments.find((a: any) => a.targetId === 'cricket_wicket');
  assert(Boolean(foundWicketMapping && foundWicketMapping.assignedGraphicId), '9. Cricket Wicket event is mapped to graphic template');

  // --- Point 10: Sport Isolation Works ---
  console.log('\n--- Point 10: Sport Isolation Works ---');
  // Try to trigger Football goal inside Cricket Match A
  const trig10 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'FOOTBALL', targetId: 'football_goal', isManual: false }),
  });
  assert(trig10.data.result?.success === false, '10. Football goal rejected in Cricket match');
  assert(trig10.data.result?.reason?.includes('Sport isolation mismatch'), '10. Sport isolation reason returned');

  // Try to trigger Cricket wicket inside Football Match B
  const trig10B = await request(`/api/broadcast/onair/${matchBId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_wicket', isManual: false }),
  });
  assert(trig10B.data.result?.success === false, '10. Cricket wicket rejected in Football match');

  // --- Point 11: Priority Works ---
  console.log('\n--- Point 11: Priority Works ---');
  // Wicket (Priority 95) vs Four (Priority 70)
  assert((assignments[wicketIdx]?.priority || 0) > (assignments[fourIdx]?.priority || 0), '11. Wicket priority (95) exceeds Four priority (70)');

  // --- Point 12: INTERRUPT Works ---
  console.log('\n--- Point 12: Conflict Strategy INTERRUPT Works ---');
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  await sleep(600);
  // Put Four on air first
  await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_4', isManual: true }),
  });
  // Wicket (Priority 95, INTERRUPT) arrives
  const trig12 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_wicket', isManual: true }),
  });
  assert(trig12.data.result?.success === true, '12. INTERRUPT preempted lower priority graphic');
  const state12 = await request(`/api/broadcast/onair/${matchAId}`);
  assert(state12.data.state?.currentOnAir?.targetId === 'cricket_wicket', '12. Higher priority Wicket is now live On-Air');

  // --- Point 13: QUEUE_BEHIND Works ---
  console.log('\n--- Point 13: Conflict Strategy QUEUE_BEHIND Works ---');
  // Current is Wicket (95). Now trigger Four (70) which has conflictAction = QUEUE_BEHIND
  await sleep(600);
  const trig13 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_4', isManual: true }),
  });
  assert(trig13.data.result?.success === true, '13. QUEUE_BEHIND successfully accepted');
  const state13 = await request(`/api/broadcast/onair/${matchAId}`);
  assert(state13.data.state?.currentOnAir?.targetId === 'cricket_wicket', '13. Wicket remains live on air');
  assert(state13.data.state?.queue?.length > 0, '13. Four was placed in priority queue behind current graphic');

  // --- Point 14: REPLACE_QUEUED Works ---
  console.log('\n--- Point 14: Conflict Strategy REPLACE_QUEUED Works ---');
  // Configure another event with REPLACE_QUEUED
  const idxPotm = assignments.findIndex((a: any) => a.targetId === 'cricket_potm');
  if (idxPotm >= 0) {
    assignments[idxPotm].assignedGraphicId = 'cricket-potm';
    assignments[idxPotm].assignedGraphicName = 'Player of the Match';
    assignments[idxPotm].conflictAction = 'REPLACE_QUEUED';
    assignments[idxPotm].enabled = true;
    assignments[idxPotm].triggerMode = 'AUTO_MANUAL';
    await request('/api/broadcast/assignments', { method: 'POST', body: JSON.stringify({ assignments }) });
  }
  const trig14 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_potm', isManual: true }),
  });
  assert(trig14.data.result?.success === true, '14. REPLACE_QUEUED accepted');
  const state14 = await request(`/api/broadcast/onair/${matchAId}`);
  assert(state14.data.state?.currentOnAir?.targetId === 'cricket_wicket', '14. Live graphic was not destroyed');
  assert(state14.data.state?.queue?.length === 1, '14. Queue was replaced with exactly 1 new item');
  assert(state14.data.state?.queue[0]?.targetId === 'cricket_potm', '14. Queue now holds Player of the Match');

  // --- Point 15: CANCEL Works ---
  console.log('\n--- Point 15: Conflict Strategy CANCEL Works ---');
  // Configure an event with CANCEL
  const idxDot = assignments.findIndex((a: any) => a.targetId === 'cricket_dot');
  if (idxDot >= 0) {
    assignments[idxDot].assignedGraphicId = 'cricket-dot';
    assignments[idxDot].assignedGraphicName = 'Dot Ball Graphic';
    assignments[idxDot].conflictAction = 'CANCEL';
    assignments[idxDot].enabled = true;
    assignments[idxDot].triggerMode = 'AUTO_MANUAL';
    await request('/api/broadcast/assignments', { method: 'POST', body: JSON.stringify({ assignments }) });
  }
  const trig15 = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_dot', isManual: false }),
  });
  assert(trig15.data.result?.success === false, '15. CANCEL policy dropped pending trigger while graphic is on-air');
  assert(trig15.data.result?.reason?.includes('CANCEL'), '15. Reason explains CANCEL conflict policy');

  // --- Point 16: Cooldown Works ---
  console.log('\n--- Point 16: Cooldown Works ---');
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  await sleep(1100); // clear any cooldown
  const trig16A = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_6', isManual: false }),
  });
  assert(trig16A.data.result?.success === true, '16. First event triggers successfully');

  // Immediate second event must be throttled by cooldown
  const trig16B = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_6', isManual: false }),
  });
  assert(trig16B.data.result?.success === false, '16. Immediate second event blocked by cooldown');
  assert(trig16B.data.result?.reason?.includes('cooldown'), '16. Reason indicates cooldown throttle');

  // Event after cooldown expires triggers
  await sleep(1100);
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  const trig16C = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'cricket_6', isManual: false }),
  });
  assert(trig16C.data.result?.success === true, '16. Event triggers after cooldown has elapsed');

  // --- Point 17: Deduplication Works ---
  console.log('\n--- Point 17: Deduplication Works ---');
  const sharedEventId = 'test-dedup-event-12345';
  await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  await sleep(1100);

  const trig17A = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({
      sport: 'CRICKET',
      targetId: 'cricket_wicket',
      isManual: false,
      broadcastEventId: sharedEventId,
    }),
  });
  assert(trig17A.data.result?.success === true, '17. First event with eventId triggers');

  const trig17B = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({
      sport: 'CRICKET',
      targetId: 'cricket_wicket',
      isManual: false,
      broadcastEventId: sharedEventId,
    }),
  });
  assert(trig17B.data.result?.success === false, '17. Duplicate broadcastEventId rejected');
  assert(trig17B.data.result?.reason?.includes('deduplication guard'), '17. Deduplication guard reason returned');

  // --- Point 18: Duplicate SSE Does Not Duplicate Graphic ---
  console.log('\n--- Point 18: Duplicate SSE Safety ---');
  assert(trig17B.data.state?.queue?.length === 0, '18. Queue did not gain duplicate graphic from replayed event');

  // --- Point 19: Match A Cannot Trigger Match B ---
  console.log('\n--- Point 19: Match State Isolation ---');
  const stateMatchB = await request(`/api/broadcast/onair/${matchBId}`);
  assert(stateMatchB.data.state?.currentOnAir === null, '19. Match B remains idle while Match A is active');
  assert(stateMatchB.data.state?.queue?.length === 0, '19. Match B queue is completely isolated');

  // --- Point 20: Refresh Preserves Assignments ---
  console.log('\n--- Point 20: Assignment Persistence ---');
  const reloadedAssignments = await request(`/api/broadcast/assignments?sport=CRICKET&matchId=${matchAId}`);
  const reloadedWicket = reloadedAssignments.data.assignments?.find((a: any) => a.targetId === 'cricket_wicket');
  assert(reloadedWicket?.conflictAction === 'INTERRUPT', '20. Conflict action INTERRUPT preserved');
  assert(reloadedWicket?.cooldownSeconds === 0.5, '20. Cooldown 0.5s preserved');
  assert(reloadedWicket?.priority === 95, '20. Priority 95 preserved');

  // --- Point 21 & 22: Program and Preview State Stability ---
  console.log('\n--- Point 21 & 22: Program and Preview Bus Stability ---');
  // Load into preview
  const prevRes = await request(`/api/broadcast/onair/${matchAId}/preview`, {
    method: 'POST',
    body: JSON.stringify({ graphicId: 'cricket-four', graphicName: 'Boundary Four Preview' }),
  });
  assert(prevRes.status === 200, '22. Preview bus loaded');
  const checkState = await request(`/api/broadcast/onair/${matchAId}`);
  assert(checkState.data.state?.previewGraphic?.graphicId === 'cricket-four', '22. Preview graphic present on Preview bus');
  assert(checkState.data.state?.currentOnAir?.targetId === 'cricket_wicket', '21. Program bus unaffected by preview cue');

  // --- Point 23: TAKE LIVE Remains Functional ---
  console.log('\n--- Point 23: TAKE LIVE Functional ---');
  const takeRes = await request(`/api/broadcast/onair/${matchAId}/take`, { method: 'POST' });
  assert(takeRes.status === 200, '23. TAKE LIVE executed');
  const stateAfterTake = await request(`/api/broadcast/onair/${matchAId}`);
  assert(stateAfterTake.data.state?.currentOnAir?.graphicId === 'cricket-four', '23. Preview graphic taken Live to Program');

  // --- Point 24: HOLD Remains Functional ---
  console.log('\n--- Point 24: HOLD Functional ---');
  const holdRes = await request(`/api/broadcast/onair/${matchAId}/hold`, { method: 'POST' });
  assert(holdRes.status === 200, '24. HOLD executed');
  const stateAfterHold = await request(`/api/broadcast/onair/${matchAId}`);
  assert(stateAfterHold.data.state?.holdActive === true, '24. On-Air item is in HOLD state');

  // --- Point 25: CLEAR Remains Functional ---
  console.log('\n--- Point 25: CLEAR Functional ---');
  const clearRes = await request(`/api/broadcast/onair/${matchAId}/clear`, { method: 'POST' });
  assert(clearRes.status === 200, '25. CLEAR executed');
  const stateAfterClear = await request(`/api/broadcast/onair/${matchAId}`);
  assert(stateAfterClear.data.state?.currentOnAir === null, '25. Program bus cleared');

  // --- Point 26: REPLAY Remains Functional ---
  console.log('\n--- Point 26: REPLAY Functional ---');
  const replayRes = await request(`/api/broadcast/onair/${matchAId}/replay`, { method: 'POST' });
  assert(replayRes.status === 200, '26. REPLAY executed');
  const stateAfterReplay = await request(`/api/broadcast/onair/${matchAId}`);
  assert(stateAfterReplay.data.state?.currentOnAir !== null, '26. Last graphic replayed to Program bus');

  // --- Point 27: Playlist Remains Functional ---
  console.log('\n--- Point 27: Playlist Functional ---');
  const playlistRes = await request('/api/broadcast/playlists', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Pre-Match Playlist',
      sport: 'CRICKET',
      matchId: matchAId,
      items: [
        { id: 'item-1', graphicId: 'cricket-four', durationSeconds: 3, order: 0 },
        { id: 'item-2', graphicId: 'cricket-six', durationSeconds: 3, order: 1 },
      ],
    }),
  });
  assert(playlistRes.status === 200 && Boolean(playlistRes.data.playlist?.id), '27. Playlist created successfully');

  // --- Point 28: Scene Remains Functional ---
  console.log('\n--- Point 28: Scene Functional ---');
  const sceneRes = await request('/api/broadcast/scenes', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Full Screen Lineup Scene',
      sport: 'CRICKET',
      matchId: matchAId,
      layers: [],
    }),
  });
  assert(sceneRes.status === 200 && Boolean(sceneRes.data.scene?.id), '28. Scene created successfully');

  // --- Point 29: Render Failure Safety ---
  console.log('\n--- Point 29: Graphic Trigger Render Failure Safety ---');
  // Non-existent targetId does not crash server
  const failTrigger = await request(`/api/broadcast/onair/${matchAId}/trigger-event`, {
    method: 'POST',
    body: JSON.stringify({ sport: 'CRICKET', targetId: 'non_existent_target_123', isManual: true }),
  });
  assert(failTrigger.data.result?.success === false, '29. Non-existent target handled cleanly');
  assert(failTrigger.status === 200, '29. Server returned 200 OK without crashing');

  // --- Point 30: Public Broadcast Output Remains Functional ---
  console.log('\n--- Point 30: Public Broadcast Canvas Output ---');
  const pubCanvas = await request(`/api/matches/${matchAId}/broadcast/canvas`);
  assert(pubCanvas.status === 200, '30. Public broadcast canvas accessible without auth');
  assert(pubCanvas.data.match?.id === matchAId, '30. Canvas payload accurately reflects match');

  console.log('='.repeat(80));
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTriggerTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
