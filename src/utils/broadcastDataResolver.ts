import { Match, SportType } from '../types';
import { DEFAULT_FALLBACK_IMAGES } from '../constants/studioGraphicsConstants';

export interface GraphicDataContext {
  matchId?: string;
  sport: SportType;
  matchTitle: string;
  status: string;
  variables: Record<string, string>;
  imageVariables: Record<string, string>;
  fallbackImages: Record<string, string>;
  lastUpdated: string;
}

/**
 * Resolves live data context for a match and its scoring state on the client side.
 * Safely merges server-provided context with local live scoring state.
 */
export function resolveBroadcastDataContext(
  match: Match | null,
  scoringState: any,
  serverContext?: Partial<GraphicDataContext>
): GraphicDataContext {
  const vars: Record<string, string> = { ...(serverContext?.variables || {}) };
  const imageVars: Record<string, string> = { ...(serverContext?.imageVariables || {}) };

  const sport: SportType = match?.sport || scoringState?.sport || 'CRICKET';
  const teamAName = match?.teamA?.name || scoringState?.teamAName || 'Team A';
  const teamBName = match?.teamB?.name || scoringState?.teamBName || 'Team B';
  const teamAShort = match?.teamA?.shortName || teamAName.substring(0, 3).toUpperCase();
  const teamBShort = match?.teamB?.shortName || teamBName.substring(0, 3).toUpperCase();
  const tournamentName = match?.tournament?.name || match?.description || 'Championship Tournament';
  const venue = match?.venue ? (match.ground ? `${match.venue}, ${match.ground}` : match.venue) : 'Main Arena';

  // Base Match & Tournament
  vars['{{SPORT}}'] = sport;
  vars['{{SPORT_TYPE}}'] = sport;
  vars['{{SPORT_NAME}}'] = sport;
  vars['{{TOURNAMENT_NAME}}'] = tournamentName;
  vars['{{MATCH_NAME}}'] = match?.name || `${teamAName} vs ${teamBName}`;
  vars['{{MATCH_STATUS}}'] = match?.status || 'LIVE';
  vars['{{MATCH_ROUND}}'] = match?.round || 'Group Stage';
  vars['{{VENUE}}'] = venue;
  vars['{{GROUND}}'] = match?.ground || match?.venue || 'Stadium';

  // Teams
  vars['{{TEAM_A}}'] = teamAName;
  vars['{{TEAM_B}}'] = teamBName;
  vars['{{TEAM_A_NAME}}'] = teamAName;
  vars['{{TEAM_B_NAME}}'] = teamBName;
  vars['{{TEAM_A_SHORT}}'] = teamAShort;
  vars['{{TEAM_B_SHORT}}'] = teamBShort;
  vars['{{TEAM_A_CODE}}'] = match?.teamA?.code || teamAShort;
  vars['{{TEAM_B_CODE}}'] = match?.teamB?.code || teamBShort;

  // Active / Opponent
  let activeTeamName = teamAName;
  let opponentTeamName = teamBName;
  if (scoringState?.battingTeamId === match?.teamBId || scoringState?.servingTeam === 'TEAM_B') {
    activeTeamName = teamBName;
    opponentTeamName = teamAName;
  }
  vars['{{ACTIVE_TEAM_NAME}}'] = activeTeamName;
  vars['{{OPPONENT_TEAM_NAME}}'] = opponentTeamName;
  vars['{{BATTING_TEAM_NAME}}'] = activeTeamName;
  vars['{{BOWLING_TEAM_NAME}}'] = opponentTeamName;

  // Images
  const teamALogo = match?.teamA?.logoUrl || DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER;
  const teamBLogo = match?.teamB?.logoUrl || DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER;
  const tournamentLogo = match?.tournament?.logoUrl || DEFAULT_FALLBACK_IMAGES.TOURNAMENT_PLACEHOLDER;

  imageVars['{{TEAM_A_LOGO}}'] = teamALogo;
  imageVars['{{TEAM_B_LOGO}}'] = teamBLogo;
  imageVars['{{TEAM_LOGO}}'] = activeTeamName === teamBName ? teamBLogo : teamALogo;
  imageVars['{{TOURNAMENT_LOGO}}'] = tournamentLogo;
  imageVars['{{TROPHY_IMAGE}}'] = DEFAULT_FALLBACK_IMAGES.TROPHY_PLACEHOLDER;

  Object.assign(vars, imageVars);

  // Sport Specific Variables
  if (sport === 'CRICKET') {
    const runs = scoringState?.totalRuns ?? scoringState?.currentInnings?.totalRuns ?? 0;
    const wickets = scoringState?.wickets ?? scoringState?.currentInnings?.totalWickets ?? 0;
    const oversDisplay = scoringState?.oversDisplay || (scoringState?.currentInnings?.totalOvers !== undefined ? `${scoringState.currentInnings.totalOvers}.${(scoringState.currentInnings.legalBallsCount || 0) % 6}` : '0.0');
    const crr = scoringState?.runRate !== undefined ? Number(scoringState.runRate).toFixed(2) : scoringState?.currentRunRate !== undefined ? Number(scoringState.currentRunRate).toFixed(2) : '0.00';
    const rrr = scoringState?.requiredRunRate !== undefined ? Number(scoringState.requiredRunRate).toFixed(2) : '-';
    const target = scoringState?.targetRuns !== undefined ? String(scoringState.targetRuns) : scoringState?.target !== undefined ? String(scoringState.target) : '-';

    vars['{{SCORE}}'] = `${runs}/${wickets} (${oversDisplay} ov)`;
    vars['{{SCORE_WITH_OVERS}}'] = `${runs}/${wickets} (${oversDisplay} ov)`;
    vars['{{SCORE_RUNS_WICKETS}}'] = `${runs}/${wickets}`;
    vars['{{RUNS}}'] = String(runs);
    vars['{{WICKETS}}'] = String(wickets);
    vars['{{OVERS}}'] = oversDisplay;
    vars['{{RUN_RATE}}'] = crr;
    vars['{{CRR}}'] = crr;
    vars['{{CURRENT_RUN_RATE}}'] = crr;
    vars['{{REQUIRED_RUN_RATE}}'] = rrr;
    vars['{{RRR}}'] = rrr;
    vars['{{TARGET}}'] = target;
    vars['{{TARGET_RUNS}}'] = target;
    vars['{{INNINGS_NUMBER}}'] = String(scoringState?.currentInnings?.inningsNumber || 1);
    vars['{{EXTRAS}}'] = String(scoringState?.extras?.total ?? 0);
    vars['{{MATCH_RESULT}}'] = scoringState?.matchResult || match?.result || '';

    // Striker & Non-Striker
    const strikerId = scoringState?.currentInnings?.currentStrikerId;
    const striker = scoringState?.strikerStat || scoringState?.striker || (strikerId && scoringState?.batsmenStats ? scoringState.batsmenStats.find((b: any) => b.playerId === strikerId) : undefined);
    if (striker) {
      const name = striker.playerName || striker.name || 'Striker';
      vars['{{STRIKER}}'] = `${name} ${striker.runs || 0} (${striker.ballsFaced || striker.balls || 0})`;
      vars['{{STRIKER_NAME}}'] = name;
      vars['{{STRIKER_RUNS}}'] = String(striker.runs || 0);
      vars['{{STRIKER_BALLS}}'] = String(striker.ballsFaced || striker.balls || 0);
      vars['{{STRIKER_4S}}'] = String(striker.fours || 0);
      vars['{{STRIKER_FOURS}}'] = String(striker.fours || 0);
      vars['{{STRIKER_6S}}'] = String(striker.sixes || 0);
      vars['{{STRIKER_SIXES}}'] = String(striker.sixes || 0);
      vars['{{STRIKER_SR}}'] = striker.strikeRate !== undefined ? Number(striker.strikeRate).toFixed(1) : '-';
    } else {
      vars['{{STRIKER}}'] = '-';
      vars['{{STRIKER_NAME}}'] = '-';
      vars['{{STRIKER_RUNS}}'] = '0';
      vars['{{STRIKER_BALLS}}'] = '0';
      vars['{{STRIKER_4S}}'] = '0';
      vars['{{STRIKER_6S}}'] = '0';
      vars['{{STRIKER_SR}}'] = '-';
    }

    const nonStrikerId = scoringState?.currentInnings?.currentNonStrikerId;
    const nonStriker = scoringState?.nonStrikerStat || scoringState?.nonStriker || (nonStrikerId && scoringState?.batsmenStats ? scoringState.batsmenStats.find((b: any) => b.playerId === nonStrikerId) : undefined);
    if (nonStriker) {
      const name = nonStriker.playerName || nonStriker.name || 'Non-Striker';
      vars['{{NON_STRIKER}}'] = `${name} ${nonStriker.runs || 0} (${nonStriker.ballsFaced || nonStriker.balls || 0})`;
      vars['{{NON_STRIKER_NAME}}'] = name;
      vars['{{NON_STRIKER_RUNS}}'] = String(nonStriker.runs || 0);
      vars['{{NON_STRIKER_BALLS}}'] = String(nonStriker.ballsFaced || nonStriker.balls || 0);
    } else {
      vars['{{NON_STRIKER}}'] = '-';
      vars['{{NON_STRIKER_NAME}}'] = '-';
      vars['{{NON_STRIKER_RUNS}}'] = '0';
      vars['{{NON_STRIKER_BALLS}}'] = '0';
    }

    const bowlerId = scoringState?.currentInnings?.currentBowlerId;
    const bowler = scoringState?.currentBowlerStat || scoringState?.bowler || (bowlerId && scoringState?.bowlerStats ? scoringState.bowlerStats.find((b: any) => b.playerId === bowlerId) : undefined);
    if (bowler) {
      const name = bowler.bowlerName || bowler.name || 'Bowler';
      vars['{{BOWLER}}'] = `${name} ${bowler.wickets || 0}/${bowler.runsConceded || 0} (${bowler.oversDisplay || bowler.overs || '0.0'})`;
      vars['{{BOWLER_NAME}}'] = name;
      vars['{{BOWLER_OVERS}}'] = String(bowler.oversDisplay || bowler.overs || '0.0');
      vars['{{BOWLER_RUNS}}'] = String(bowler.runsConceded || bowler.runs || 0);
      vars['{{BOWLER_WICKETS}}'] = String(bowler.wickets || 0);
      vars['{{BOWLER_ECONOMY}}'] = bowler.economyRate !== undefined ? Number(bowler.economyRate).toFixed(2) : '-';
      vars['{{BOWLER_MAIDENS}}'] = String(bowler.maidens || 0);
    } else {
      vars['{{BOWLER}}'] = '-';
      vars['{{BOWLER_NAME}}'] = '-';
      vars['{{BOWLER_OVERS}}'] = '0.0';
      vars['{{BOWLER_RUNS}}'] = '0';
      vars['{{BOWLER_WICKETS}}'] = '0';
      vars['{{BOWLER_ECONOMY}}'] = '-';
      vars['{{BOWLER_MAIDENS}}'] = '0';
    }

    // Partnership
    const pRuns = scoringState?.currentPartnership?.runs ?? scoringState?.partnership?.runs ?? scoringState?.partnershipRuns ?? 0;
    const pBalls = scoringState?.currentPartnership?.balls ?? scoringState?.partnership?.balls ?? scoringState?.partnershipBalls ?? 0;
    vars['{{PARTNERSHIP}}'] = `${pRuns} runs (${pBalls} balls)`;
    vars['{{PARTNERSHIP_RUNS}}'] = String(pRuns);
    vars['{{PARTNERSHIP_BALLS}}'] = String(pBalls);

    // Recent ball result
    const recentBalls = scoringState?.currentOverEvents || scoringState?.recentBalls || scoringState?.currentOverBalls || [];
    if (recentBalls.length > 0) {
      const last = recentBalls[recentBalls.length - 1];
      vars['{{LAST_BALL_RESULT}}'] = typeof last === 'object' ? last.display || `${last.totalRuns ?? last.runsOffBat ?? 0}r` : String(last);
      vars['{{THIS_OVER_BALLS}}'] = recentBalls.map((b: any) => typeof b === 'object' ? b.display || `${b.totalRuns ?? b.runsOffBat ?? 0}` : b).join(' ');
    }
  } else if (sport === 'FOOTBALL') {
    const goalsA = scoringState?.teamAGoals ?? scoringState?.goalsA ?? scoringState?.teamAScore ?? 0;
    const goalsB = scoringState?.teamBGoals ?? scoringState?.goalsB ?? scoringState?.teamBScore ?? 0;
    vars['{{SCORE}}'] = `${goalsA} - ${goalsB}`;
    vars['{{TEAM_A_SCORE}}'] = String(goalsA);
    vars['{{TEAM_B_SCORE}}'] = String(goalsB);
    vars['{{HALF_NAME}}'] = scoringState?.halfName || scoringState?.currentHalf || '1ST HALF';
    vars['{{MATCH_CLOCK}}'] = scoringState?.displayTime || scoringState?.formattedTime || '00:00';
    vars['{{EXTRA_TIME}}'] = scoringState?.stoppageTimeMinutes ? `+${scoringState.stoppageTimeMinutes}'` : '';
  } else if (sport === 'BASKETBALL') {
    const scoreA = scoringState?.teamAScore ?? scoringState?.scoreA ?? 0;
    const scoreB = scoringState?.teamBScore ?? scoringState?.scoreB ?? 0;
    vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
    vars['{{TEAM_A_SCORE}}'] = String(scoreA);
    vars['{{TEAM_B_SCORE}}'] = String(scoreB);
    vars['{{QUARTER}}'] = String(scoringState?.currentQuarter || scoringState?.quarter || 1);
    vars['{{MATCH_CLOCK}}'] = scoringState?.clockDisplay || scoringState?.displayTime || '10:00';
  } else if (sport === 'HOCKEY') {
    const scoreA = scoringState?.teamAScore ?? scoringState?.scoreA ?? 0;
    const scoreB = scoringState?.teamBScore ?? scoringState?.scoreB ?? 0;
    vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
    vars['{{TEAM_A_SCORE}}'] = String(scoreA);
    vars['{{TEAM_B_SCORE}}'] = String(scoreB);
    vars['{{QUARTER}}'] = String(scoringState?.currentQuarter || scoringState?.quarter || 1);
    vars['{{MATCH_CLOCK}}'] = scoringState?.clockDisplay || scoringState?.displayTime || '15:00';
  } else if (sport === 'VOLLEYBALL') {
    const setsA = scoringState?.setsWonA ?? 0;
    const setsB = scoringState?.setsWonB ?? 0;
    const ptsA = scoringState?.currentSet?.teamAScore ?? scoringState?.currentSetPointsA ?? scoringState?.pointsA ?? 0;
    const ptsB = scoringState?.currentSet?.teamBScore ?? scoringState?.currentSetPointsB ?? scoringState?.pointsB ?? 0;
    vars['{{SCORE}}'] = `Sets: ${setsA}-${setsB} (Pts: ${ptsA}-${ptsB})`;
    vars['{{SET_SCORE}}'] = `Sets: ${setsA}-${setsB}`;
    vars['{{SETS_A}}'] = String(setsA);
    vars['{{SETS_B}}'] = String(setsB);
    vars['{{POINTS_A}}'] = String(ptsA);
    vars['{{POINTS_B}}'] = String(ptsB);
  } else if (sport === 'KABADDI') {
    const ptsA = scoringState?.teamAScore ?? scoringState?.teamAPoints ?? scoringState?.pointsA ?? 0;
    const ptsB = scoringState?.teamBScore ?? scoringState?.teamBPoints ?? scoringState?.pointsB ?? 0;
    vars['{{SCORE}}'] = `${ptsA} - ${ptsB}`;
    vars['{{TEAM_A_SCORE}}'] = String(ptsA);
    vars['{{TEAM_B_SCORE}}'] = String(ptsB);
    vars['{{RAID_POINTS_A}}'] = String(scoringState?.teamARaidPoints || ptsA);
    vars['{{RAID_POINTS_B}}'] = String(scoringState?.teamBRaidPoints || ptsB);
    vars['{{DEFENDERS_COUNT}}'] = String(scoringState?.defendersOnMat || 7);
  } else if (sport === 'TENNIS' || sport === 'TABLE_TENNIS' || sport === 'BADMINTON') {
    const setsA = scoringState?.setsWonA ?? scoringState?.gamesWonA ?? 0;
    const setsB = scoringState?.setsWonB ?? scoringState?.gamesWonB ?? 0;
    const gameA = scoringState?.currentGamesA ?? scoringState?.currentGameA ?? 0;
    const gameB = scoringState?.currentGamesB ?? scoringState?.currentGameB ?? 0;
    const ptA = scoringState?.currentPointsA ?? scoringState?.currentScoreA ?? scoringState?.currentPointA ?? '0';
    const ptB = scoringState?.currentPointsB ?? scoringState?.currentScoreB ?? scoringState?.currentPointB ?? '0';
    vars['{{SCORE}}'] = `(${setsA}) ${gameA}:${ptA} - (${setsB}) ${gameB}:${ptB}`;
    vars['{{SETS_A}}'] = String(setsA);
    vars['{{SETS_B}}'] = String(setsB);
    vars['{{GAMES_A}}'] = String(gameA);
    vars['{{GAMES_B}}'] = String(gameB);
    vars['{{POINTS_A}}'] = String(ptA);
    vars['{{POINTS_B}}'] = String(ptB);
  } else {
    // Universal sport fallback
    const scoreA = scoringState?.teamAScore ?? scoringState?.scoreA ?? 0;
    const scoreB = scoringState?.teamBScore ?? scoringState?.scoreB ?? 0;
    vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
    vars['{{TEAM_A_SCORE}}'] = String(scoreA);
    vars['{{TEAM_B_SCORE}}'] = String(scoreB);
  }

  return {
    matchId: match?.id,
    sport,
    matchTitle: match?.name || `${teamAName} vs ${teamBName}`,
    status: match?.status || 'LIVE',
    variables: vars,
    imageVariables: imageVars,
    fallbackImages: DEFAULT_FALLBACK_IMAGES,
    lastUpdated: new Date().toISOString(),
  };
}
