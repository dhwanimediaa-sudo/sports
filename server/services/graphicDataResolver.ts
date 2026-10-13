import { getDb } from '../db/database';
import {
  Match,
  SportType,
  GraphicElement,
  StudioGraphic,
  Player,
  Team,
  Tournament,
} from '../../src/types';
import { getScoringStateForMatch } from '../routes/scoring';
import { DYNAMIC_FIELDS } from './studioGraphicsPresets';

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
 * Standard default fallback images
 */
export const DEFAULT_FALLBACK_IMAGES = {
  PLAYER_PLACEHOLDER: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  TEAM_PLACEHOLDER: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
  TOURNAMENT_PLACEHOLDER: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80',
  SPONSOR_PLACEHOLDER: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  TROPHY_PLACEHOLDER: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=300&auto=format&fit=crop&q=80',
  FLAG_PLACEHOLDER: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200&auto=format&fit=crop&q=80',
};

/**
 * Builds a complete dictionary of resolved dynamic variables for a match and its scoring state.
 */
export function buildGraphicDataContext(
  match: Match,
  scoringState?: any
): GraphicDataContext {
  const db = getDb();
  const state = scoringState || getScoringStateForMatch(match);
  const vars: Record<string, string> = {};
  const imageVars: Record<string, string> = {};

  // Hydrate teams and tournament if not fully populated
  const teamA: Team | undefined =
    match.teamA || (db.teams || []).find((t) => t.id === match.teamAId);
  const teamB: Team | undefined =
    match.teamB || (db.teams || []).find((t) => t.id === match.teamBId);
  const tournament: Tournament | undefined =
    match.tournament || (db.tournaments || []).find((t) => t.id === match.tournamentId);

  const teamAName = teamA?.name || 'Team A';
  const teamBName = teamB?.name || 'Team B';
  const teamAShort = teamA?.shortName || teamAName.substring(0, 3).toUpperCase();
  const teamBShort = teamB?.shortName || teamBName.substring(0, 3).toUpperCase();

  const tournamentName = tournament?.name || match.description || 'Championship Tournament';
  const groupName = (match as any).group || (match as any).groupName || (tournament as any)?.groups?.[0]?.name || 'Group A';
  const venue = match.venue ? (match.ground ? `${match.venue}, ${match.ground}` : match.venue) : 'Main Arena';

  // 1. General Match & Tournament Variables
  vars['{{SPORT}}'] = match.sport || 'CRICKET';
  vars['{{SPORT_TYPE}}'] = match.sport || 'CRICKET';
  vars['{{SPORT_NAME}}'] = match.sport || 'CRICKET';
  vars['{{TOURNAMENT_NAME}}'] = tournamentName;
  vars['{{GROUP_NAME}}'] = groupName;
  vars['{{MATCH_NAME}}'] = match.name || `${teamAName} vs ${teamBName}`;
  vars['{{MATCH_STATUS}}'] = match.status || 'LIVE';
  vars['{{MATCH_ROUND}}'] = match.round || 'Group Stage';
  vars['{{MATCH_NUMBER}}'] = match.matchNumber ? `Match #${match.matchNumber}` : 'Match 1';
  vars['{{MATCH_DATE}}'] = match.date || new Date().toISOString().split('T')[0];
  vars['{{MATCH_TIME}}'] = match.time || '18:00';
  vars['{{VENUE}}'] = venue;
  vars['{{GROUND}}'] = match.ground || match.venue || 'Stadium';
  vars['{{REFEREE}}'] = match.officials?.referee || match.officials?.official1 || 'Official Referee';
  vars['{{UMPIRE}}'] = match.officials?.umpire || match.officials?.official2 || 'Lead Umpire';
  vars['{{COMMENTATOR}}'] = match.officials?.commentator || 'Live Broadcast Desk';

  // 2. Team Variables
  vars['{{TEAM_A}}'] = teamAName;
  vars['{{TEAM_B}}'] = teamBName;
  vars['{{TEAM_A_NAME}}'] = teamAName;
  vars['{{TEAM_B_NAME}}'] = teamBName;
  vars['{{TEAM_A_SHORT}}'] = teamAShort;
  vars['{{TEAM_B_SHORT}}'] = teamBShort;
  vars['{{TEAM_A_CODE}}'] = teamA?.code || teamAShort;
  vars['{{TEAM_B_CODE}}'] = teamB?.code || teamBShort;

  // Active / Batting team logic
  let activeTeam = teamA;
  let opponentTeam = teamB;
  if (state?.battingTeamId) {
    if (state.battingTeamId === teamB?.id) {
      activeTeam = teamB;
      opponentTeam = teamA;
    }
  } else if (state?.activeRaidingTeamId) {
    if (state.activeRaidingTeamId === teamB?.id) {
      activeTeam = teamB;
      opponentTeam = teamA;
    }
  } else if (state?.servingTeamId) {
    if (state.servingTeamId === teamB?.id) {
      activeTeam = teamB;
      opponentTeam = teamA;
    }
  }

  const activeTeamName = activeTeam?.name || teamAName;
  const opponentTeamName = opponentTeam?.name || teamBName;
  vars['{{ACTIVE_TEAM_NAME}}'] = activeTeamName;
  vars['{{OPPONENT_TEAM_NAME}}'] = opponentTeamName;
  vars['{{BATTING_TEAM_NAME}}'] = activeTeamName;
  vars['{{BOWLING_TEAM_NAME}}'] = opponentTeamName;

  // Toss
  if (match.toss || match.tossWinnerId) {
    const tossTeam = match.tossWinnerId === teamB?.id ? teamB : teamA;
    const tossDecision = match.tossDecision || match.toss?.decision || 'BAT';
    vars['{{TOSS_WINNER}}'] = tossTeam?.name || 'Toss Winner';
    vars['{{TOSS_DECISION}}'] = tossDecision === 'BAT' ? 'Batted first' : 'Bowled first';
    vars['{{TOSS_RESULT}}'] = `${tossTeam?.name || 'Team'} won the toss and chose to ${tossDecision.toLowerCase()}`;
  } else {
    vars['{{TOSS_WINNER}}'] = teamAName;
    vars['{{TOSS_DECISION}}'] = 'Bat';
    vars['{{TOSS_RESULT}}'] = `${teamAName} won the toss and elected to bat`;
  }

  // 3. Image URLs and Fallbacks
  const teamALogo = teamA?.logoUrl || DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER;
  const teamBLogo = teamB?.logoUrl || DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER;
  const tournamentLogo = tournament?.logoUrl || DEFAULT_FALLBACK_IMAGES.TOURNAMENT_PLACEHOLDER;
  const sponsorLogo = match.sponsors?.sponsorLogoUrl || tournament?.sponsor || DEFAULT_FALLBACK_IMAGES.SPONSOR_PLACEHOLDER;

  imageVars['{{TEAM_A_LOGO}}'] = teamALogo;
  imageVars['{{TEAM_B_LOGO}}'] = teamBLogo;
  imageVars['{{TEAM_LOGO}}'] = activeTeam?.logoUrl || teamALogo;
  imageVars['{{TOURNAMENT_LOGO}}'] = tournamentLogo;
  imageVars['{{SPONSOR_LOGO}}'] = sponsorLogo;
  imageVars['{{ORGANIZER_LOGO}}'] = tournamentLogo;
  imageVars['{{TROPHY_IMAGE}}'] = DEFAULT_FALLBACK_IMAGES.TROPHY_PLACEHOLDER;
  imageVars['{{FLAG}}'] = DEFAULT_FALLBACK_IMAGES.FLAG_PLACEHOLDER;
  imageVars['{{COUNTRY_FLAG}}'] = DEFAULT_FALLBACK_IMAGES.FLAG_PLACEHOLDER;

  // Also store into vars for direct string substitution
  Object.assign(vars, imageVars);

  // 4. Sport-Specific Variable Resolution
  switch (match.sport) {
    case 'CRICKET': {
      const runs = state?.totalRuns !== undefined ? state.totalRuns : 184;
      const wickets = state?.wickets !== undefined ? state.wickets : 4;
      const oversDisplay = state?.oversDisplay || '18.3';
      const crr = state?.runRate !== undefined ? state.runRate.toFixed(2) : '9.95';
      const rrr = state?.requiredRunRate !== undefined ? state.requiredRunRate.toFixed(2) : '10.50';
      const target = state?.targetRuns !== undefined ? String(state.targetRuns) : '205';
      const totalOvers = state?.maxOvers || (match as any).overs || 20;
      const runsReq = state?.runsRequired !== undefined ? String(state.runsRequired) : state?.targetRuns ? String(Math.max(0, state.targetRuns - runs)) : '21';
      const ballsRem = state?.ballsRemaining !== undefined ? String(state.ballsRemaining) : String(Math.max(0, (totalOvers * 6) - (state?.ballsBowled || 111)));

      vars['{{SCORE}}'] = `${runs}/${wickets} (${oversDisplay} ov)`;
      vars['{{SCORE_RUNS_WICKETS}}'] = `${runs}/${wickets}`;
      vars['{{RUNS}}'] = String(runs);
      vars['{{WICKETS}}'] = String(wickets);
      vars['{{OVERS}}'] = oversDisplay;
      vars['{{CURRENT_OVER}}'] = state?.currentOverNumber ? `${state.currentOverNumber}th Over` : '19th Over';
      vars['{{CURRENT_BALL}}'] = state?.currentBallInOver !== undefined ? String(state.currentBallInOver) : '3';
      vars['{{BALL}}'] = vars['{{CURRENT_BALL}}'];
      vars['{{TOTAL_OVERS}}'] = String(totalOvers);
      vars['{{OVER_PROGRESS}}'] = `${oversDisplay} / ${totalOvers} OVERS`;
      vars['{{RUN_RATE}}'] = crr;
      vars['{{CRR}}'] = crr;
      vars['{{REQUIRED_RUN_RATE}}'] = rrr;
      vars['{{REQUIRED_RATE}}'] = rrr;
      vars['{{RRR}}'] = rrr;
      vars['{{REQ_RUN_RATE}}'] = rrr;
      vars['{{TARGET}}'] = target;
      vars['{{RUNS_REQUIRED}}'] = runsReq;
      vars['{{RUNS_NEEDED}}'] = runsReq;
      vars['{{BALLS_REMAINING}}'] = ballsRem;
      vars['{{EXTRAS}}'] = state?.extras !== undefined ? String(state.extras) : '12';
      vars['{{EXTRA_RUNS}}'] = vars['{{EXTRAS}}'];
      vars['{{INNINGS}}'] = state?.inningsNumber ? `Innings ${state.inningsNumber}` : 'Innings 2';
      vars['{{INNINGS_NUMBER}}'] = state?.inningsNumber ? `${state.inningsNumber}${state.inningsNumber === 1 ? 'st' : 'nd'} Innings` : '2nd Innings';
      vars['{{INNINGS_STATUS}}'] = state?.inningsStatus || (state?.inningsNumber === 2 ? '2nd Innings in progress' : '1st Innings in progress');

      // Team scores
      const battingTeamName = state?.battingTeamId === match.teamBId ? teamBName : teamAName;
      const bowlingTeamName = state?.battingTeamId === match.teamBId ? teamAName : teamBName;
      vars['{{BATTING_TEAM_NAME}}'] = battingTeamName;
      vars['{{BOWLING_TEAM_NAME}}'] = bowlingTeamName;
      vars['{{TEAM_A_SCORE}}'] = state?.teamAScore || (match.teamAId === state?.battingTeamId ? `${runs}/${wickets} (${oversDisplay} ov)` : (state?.firstInningsScore || '184/6 (20.0 ov)'));
      vars['{{TEAM_B_SCORE}}'] = state?.teamBScore || (match.teamBId === state?.battingTeamId ? `${runs}/${wickets} (${oversDisplay} ov)` : (state?.targetRuns ? `${Number(state.targetRuns) - 1}/7 (20.0 ov)` : 'Yet to bat'));
      vars['{{TEAM_A_INNINGS_SCORE}}'] = vars['{{TEAM_A_SCORE}}'];
      vars['{{TEAM_B_INNINGS_SCORE}}'] = vars['{{TEAM_B_SCORE}}'];
      vars['{{SCORE_WITH_OVERS}}'] = vars['{{SCORE}}'];

      // Striker / Batsman 1
      const striker = state?.strikerStat || null;
      const nonStriker = state?.nonStrikerStat || null;
      const bowler = state?.currentBowlerStat || null;

      // Find striker player object if available
      let strikerPlayer: Player | undefined;
      if (striker?.playerId) {
        strikerPlayer = (db.players || []).find((p) => p.id === striker.playerId);
      }
      const strikerName = striker?.playerName || strikerPlayer?.name || 'Virat Kohli';
      const strikerParts = strikerName.split(/\s+/);
      const strikerShortName = strikerParts.length > 1 ? `${strikerParts[0][0]}. ${strikerParts.slice(1).join(' ')}` : strikerName;
      const strikerRuns = striker ? `${striker.runs}` : '76';
      const strikerScore = striker ? `${striker.runs}${striker.isNotOut ? '*' : ''}` : '76*';
      const strikerBalls = striker ? String(striker.ballsFaced || 0) : '42';
      const strikerFours = striker ? String(striker.fours || 0) : '8';
      const strikerSixes = striker ? String(striker.sixes || 0) : '4';
      const strikerSr = striker?.strikeRate !== undefined ? striker.strikeRate.toFixed(2) : '180.95';
      const strikerPhoto = striker?.photoUrl || strikerPlayer?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

      vars['{{STRIKER}}'] = `${strikerShortName} ${strikerScore} (${strikerBalls})`;
      vars['{{STRIKER_NAME}}'] = strikerName;
      vars['{{STRIKER_SHORT_NAME}}'] = strikerShortName;
      vars['{{STRIKER_SCORE}}'] = strikerScore;
      vars['{{STRIKER_RUNS}}'] = strikerRuns;
      vars['{{STRIKER_BALLS}}'] = strikerBalls;
      vars['{{STRIKER_4S}}'] = strikerFours;
      vars['{{STRIKER_FOURS}}'] = strikerFours;
      vars['{{STRIKER_6S}}'] = strikerSixes;
      vars['{{STRIKER_SIXES}}'] = strikerSixes;
      vars['{{STRIKER_SR}}'] = strikerSr;
      vars['{{STRIKER_PHOTO}}'] = strikerPhoto;
      imageVars['{{STRIKER_PHOTO}}'] = strikerPhoto;

      // Aliases for compatibility
      vars['{{BATSMAN_NAME}}'] = strikerName;
      vars['{{BATSMAN_RUNS}}'] = strikerScore;
      vars['{{BATSMAN_BALLS}}'] = strikerBalls;
      vars['{{BATSMAN_FOURS}}'] = strikerFours;
      vars['{{BATSMAN_SIXES}}'] = strikerSixes;
      vars['{{BATSMAN_SR}}'] = strikerSr;
      vars['{{PLAYER_NAME}}'] = strikerName;
      imageVars['{{PLAYER_PHOTO}}'] = strikerPhoto;
      vars['{{PLAYER_PHOTO}}'] = strikerPhoto;

      // Non-Striker / Batsman 2
      let nonStrikerPlayer: Player | undefined;
      if (nonStriker?.playerId) {
        nonStrikerPlayer = (db.players || []).find((p) => p.id === nonStriker.playerId);
      }
      const nonStrikerName = nonStriker?.playerName || nonStrikerPlayer?.name || 'KL Rahul';
      const nonStrikerParts = nonStrikerName.split(/\s+/);
      const nonStrikerShortName = nonStrikerParts.length > 1 ? `${nonStrikerParts[0][0]}. ${nonStrikerParts.slice(1).join(' ')}` : nonStrikerName;
      const nonStrikerRuns = nonStriker ? `${nonStriker.runs}` : '34';
      const nonStrikerScore = nonStriker ? `${nonStriker.runs}${nonStriker.isNotOut ? '*' : ''}` : '34*';
      const nonStrikerBalls = nonStriker ? String(nonStriker.ballsFaced || 0) : '21';
      const nonStrikerFours = nonStriker ? String(nonStriker.fours || 0) : '3';
      const nonStrikerSixes = nonStriker ? String(nonStriker.sixes || 0) : '1';
      const nonStrikerSr = nonStriker?.strikeRate !== undefined ? nonStriker.strikeRate.toFixed(2) : '161.90';
      const nonStrikerPhoto = nonStriker?.photoUrl || nonStrikerPlayer?.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80';

      vars['{{NON_STRIKER}}'] = `${nonStrikerShortName} ${nonStrikerScore} (${nonStrikerBalls})`;
      vars['{{NON_STRIKER_NAME}}'] = nonStrikerName;
      vars['{{NON_STRIKER_SHORT_NAME}}'] = nonStrikerShortName;
      vars['{{NON_STRIKER_SCORE}}'] = nonStrikerScore;
      vars['{{NON_STRIKER_RUNS}}'] = nonStrikerRuns;
      vars['{{NON_STRIKER_BALLS}}'] = nonStrikerBalls;
      vars['{{NON_STRIKER_4S}}'] = nonStrikerFours;
      vars['{{NON_STRIKER_FOURS}}'] = nonStrikerFours;
      vars['{{NON_STRIKER_6S}}'] = nonStrikerSixes;
      vars['{{NON_STRIKER_SIXES}}'] = nonStrikerSixes;
      vars['{{NON_STRIKER_SR}}'] = nonStrikerSr;
      vars['{{NON_STRIKER_PHOTO}}'] = nonStrikerPhoto;
      imageVars['{{NON_STRIKER_PHOTO}}'] = nonStrikerPhoto;

      // Current Bowler
      let bowlerPlayer: Player | undefined;
      if (bowler?.bowlerId || bowler?.playerId) {
        const bId = bowler.bowlerId || bowler.playerId;
        bowlerPlayer = (db.players || []).find((p) => p.id === bId);
      }
      const bowlerName = bowler?.bowlerName || bowlerPlayer?.name || 'Jasprit Bumrah';
      const bowlerParts = bowlerName.split(/\s+/);
      const bowlerShortName = bowlerParts.length > 1 ? `${bowlerParts[0][0]}. ${bowlerParts.slice(1).join(' ')}` : bowlerName;
      const bowlerOvers = bowler?.oversDisplay || (bowler?.ballsBowled !== undefined ? `${Math.floor(bowler.ballsBowled / 6)}.${bowler.ballsBowled % 6}` : '3.3');
      const bowlerBalls = bowler?.ballsBowled !== undefined ? String(bowler.ballsBowled) : '21';
      const bowlerMaidens = String(bowler?.maidens || 0);
      const bowlerRunsConceded = String(bowler?.runsConceded !== undefined ? bowler.runsConceded : 28);
      const bowlerWickets = String(bowler?.wickets !== undefined ? bowler.wickets : 2);
      const bowlerEconomy = bowler?.economy !== undefined ? bowler.economy.toFixed(2) : '8.00';
      const bowlerDots = String(bowler?.dotBalls || bowler?.dots || 12);
      const bowlerFigures = `${bowlerWickets}/${bowlerRunsConceded} (${bowlerOvers} ov)`;
      const bowlerPhoto = bowler?.photoUrl || bowlerPlayer?.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80';

      vars['{{BOWLER}}'] = `${bowlerShortName} ${bowlerFigures}`;
      vars['{{CURRENT_BOWLER}}'] = `${bowlerShortName} ${bowlerFigures}`;
      vars['{{BOWLER_NAME}}'] = bowlerName;
      vars['{{BOWLER_SHORT_NAME}}'] = bowlerShortName;
      vars['{{BOWLER_OVERS}}'] = bowlerOvers;
      vars['{{BOWLER_BALLS}}'] = bowlerBalls;
      vars['{{BOWLER_RUNS}}'] = bowlerRunsConceded;
      vars['{{BOWLER_RUNS_CONCEDED}}'] = bowlerRunsConceded;
      vars['{{BOWLER_WICKETS}}'] = bowlerWickets;
      vars['{{BOWLER_ECONOMY}}'] = bowlerEconomy;
      vars['{{BOWLER_MAIDENS}}'] = bowlerMaidens;
      vars['{{BOWLER_DOTS}}'] = bowlerDots;
      vars['{{BOWLER_FIGURES}}'] = bowlerFigures;
      vars['{{BOWLER_PHOTO}}'] = bowlerPhoto;
      imageVars['{{BOWLER_PHOTO}}'] = bowlerPhoto;

      // Partnership & Over balls
      if (state?.currentPartnership) {
        vars['{{PARTNERSHIP}}'] = `${state.currentPartnership.runs} runs (${state.currentPartnership.balls} balls)`;
        vars['{{PARTNERSHIP_RUNS}}'] = String(state.currentPartnership.runs || 0);
        vars['{{PARTNERSHIP_BALLS}}'] = String(state.currentPartnership.balls || 0);
        const pBalls = state.currentPartnership.balls || 1;
        vars['{{PARTNERSHIP_RATE}}'] = ((state.currentPartnership.runs / pBalls) * 6).toFixed(2);
        vars['{{PARTNERSHIP_START_SCORE}}'] = state.currentPartnership.startScore || `${Math.max(0, runs - state.currentPartnership.runs)}/${Math.max(0, wickets - 1)}`;
      } else {
        vars['{{PARTNERSHIP}}'] = '88 (49 balls)';
        vars['{{PARTNERSHIP_RUNS}}'] = '88';
        vars['{{PARTNERSHIP_BALLS}}'] = '49';
        vars['{{PARTNERSHIP_RATE}}'] = '10.77';
        vars['{{PARTNERSHIP_START_SCORE}}'] = '96/4';
      }

      // Ball Events and Over History
      if (state?.currentOverBalls && state.currentOverBalls.length > 0) {
        vars['{{THIS_OVER}}'] = state.currentOverBalls.map((b: any) => b.ballDisplay || `${b.runs}`).join(' • ');
        vars['{{RECENT_BALLS}}'] = vars['{{THIS_OVER}}'];
        const lastB = state.currentOverBalls[state.currentOverBalls.length - 1];
        const lastBallText = lastB?.ballDisplay || (lastB?.isWicket ? 'W' : String(lastB?.runs || 0));
        vars['{{LAST_BALL_RESULT}}'] = lastBallText;
        vars['{{LAST_BALL_RUNS}}'] = String(lastB?.runs || 0);
        vars['{{LAST_BALL_WICKET}}'] = lastB?.isWicket ? 'WICKET!' : '';
        vars['{{LAST_BALL_DISMISSAL}}'] = lastB?.dismissalDescription || (lastB?.isWicket ? 'OUT' : '');
        vars['{{CURRENT_BALL_EVENT}}'] = lastB?.isBoundary ? (lastB.runs === 6 ? '6 (MAXIMUM SIX)' : '4 (BOUNDARY FOUR)') : lastB?.isWicket ? 'WICKET!' : `${lastB?.runs || 0} Runs`;
        vars['{{BALL_EVENT}}'] = lastB?.isBoundary ? (lastB.runs === 6 ? 'SIX' : 'FOUR') : lastB?.isWicket ? 'WICKET' : 'BALL';
        vars['{{LAST_EVENT}}'] = vars['{{CURRENT_BALL_EVENT}}'];
        vars['{{LAST_BALL_OVER_BALL}}'] = `Over ${oversDisplay}`;

        const overRunsSum = state.currentOverBalls.reduce((acc: number, b: any) => acc + (b.runs || 0) + (b.extras || 0), 0);
        vars['{{OVER_RUNS}}'] = String(overRunsSum);
        vars['{{OVER_NUMBER}}'] = String(Math.floor((state?.ballsBowled || 0) / 6) + 1);
        vars['{{OVER_BALLS}}'] = String(state.currentOverBalls.length);
        vars['{{OVER_WICKETS}}'] = String(state.currentOverBalls.filter((b: any) => b.isWicket).length);
        vars['{{OVER_SUMMARY}}'] = `OVER ${vars['{{OVER_NUMBER}}']}: ${vars['{{THIS_OVER}}']} (${overRunsSum} runs)`;

        // Wicket & extra breakdown
        vars['{{WICKET}}'] = lastB?.isWicket ? 'WICKET' : '';
        vars['{{WICKET_TYPE}}'] = lastB?.dismissalType || (lastB?.isWicket ? 'CAUGHT' : 'NONE');
        vars['{{DISMISSED_PLAYER}}'] = lastB?.dismissedPlayerName || strikerName;
        vars['{{DISMISSAL_TEXT}}'] = lastB?.dismissalDescription || (lastB?.isWicket ? 'c WK b Bowler' : '');
        vars['{{ASSIST_PLAYER}}'] = lastB?.assistPlayerName || 'Fielder';
        vars['{{EXTRA_TYPE}}'] = lastB?.extraType || (lastB?.isWide ? 'WIDE' : lastB?.isNoBall ? 'NO BALL' : lastB?.isBye ? 'BYE' : lastB?.isLegBye ? 'LEG BYE' : 'NONE');
        vars['{{TOTAL_BALL_RUNS}}'] = String((lastB?.runs || 0) + (lastB?.extras || 0));
      } else {
        vars['{{THIS_OVER}}'] = '1 • 4 • 6 • W • 2 • 1';
        vars['{{RECENT_BALLS}}'] = '1 • 4 • 6 • W • 2 • 1';
        vars['{{LAST_BALL_RESULT}}'] = '4';
        vars['{{LAST_BALL_RUNS}}'] = '4';
        vars['{{LAST_BALL_WICKET}}'] = '';
        vars['{{LAST_BALL_DISMISSAL}}'] = 'c Rahul b Bumrah';
        vars['{{CURRENT_BALL_EVENT}}'] = '4 (BOUNDARY)';
        vars['{{BALL_EVENT}}'] = 'FOUR';
        vars['{{LAST_EVENT}}'] = 'BOUNDARY FOUR';
        vars['{{LAST_BALL_OVER_BALL}}'] = `Over ${oversDisplay}`;
        vars['{{OVER_RUNS}}'] = '14';
        vars['{{OVER_NUMBER}}'] = '19';
        vars['{{OVER_BALLS}}'] = '6';
        vars['{{OVER_WICKETS}}'] = '1';
        vars['{{OVER_SUMMARY}}'] = 'OVER 19: 1 • 4 • 6 • W • 2 • 1 (14 runs)';
        vars['{{WICKET}}'] = 'WICKET';
        vars['{{WICKET_TYPE}}'] = 'CAUGHT';
        vars['{{DISMISSED_PLAYER}}'] = strikerName;
        vars['{{DISMISSAL_TEXT}}'] = 'c Rahul b Bumrah';
        vars['{{ASSIST_PLAYER}}'] = 'KL Rahul';
        vars['{{EXTRA_TYPE}}'] = 'NONE';
        vars['{{TOTAL_BALL_RUNS}}'] = '4';
      }

      // Milestones
      const sNum = parseInt(strikerRuns, 10) || 76;
      vars['{{MILESTONE_TEXT}}'] = sNum >= 100 ? `100 FOR ${strikerName}!` : sNum >= 50 ? `50 FOR ${strikerName}!` : '50 RUN MILESTONE';
      vars['{{BATSMAN_MILESTONE}}'] = sNum >= 100 ? 'CENTURY (100 RUNS)' : 'HALF CENTURY (50 RUNS)';
      vars['{{PARTNERSHIP_MILESTONE}}'] = '50 RUN PARTNERSHIP';
      const bWkts = parseInt(bowlerWickets, 10) || 2;
      vars['{{BOWLER_MILESTONE}}'] = bWkts >= 5 ? '5-WICKET HAUL' : bWkts >= 3 ? '3-WICKET HAUL' : 'KEY SPELL';

      // Innings Break & Summary
      vars['{{INNINGS_BREAK_TITLE}}'] = 'INNINGS BREAK';
      vars['{{TOP_BATSMAN}}'] = `${strikerName} ${strikerScore} (${strikerBalls}b)`;
      vars['{{TOP_BOWLER}}'] = `${bowlerName} ${bowlerFigures}`;

      // Match Result
      vars['{{WINNING_TEAM}}'] = (state as any)?.winningTeamName || (match as any).winnerName || (match as any).winner || teamAName;
      vars['{{RESULT_TEXT}}'] = state?.matchResultText || (match as any).resultText || (match as any).statusDetails || `${teamAName} won by 24 runs`;
      vars['{{WIN_MARGIN}}'] = (state as any)?.winMargin || '24 runs';
      vars['{{POTM_NAME}}'] = (match as any).potmName || (match as any).playerOfTheMatch?.name || (match as any).playerOfTheMatch || strikerName;
      vars['{{POTM_PHOTO}}'] = (match as any).potmPhotoUrl || (match as any).potmPhoto || strikerPhoto;
      imageVars['{{POTM_PHOTO}}'] = vars['{{POTM_PHOTO}}'];

      if (state?.matchResultText) {
        vars['{{MATCH_RESULT}}'] = state.matchResultText;
      }
      break;
    }

    case 'TENNIS': {
      const setsA = state?.setsWonA !== undefined ? state.setsWonA : 0;
      const setsB = state?.setsWonB !== undefined ? state.setsWonB : 0;
      const gamesA = state?.currentSet?.teamAGames !== undefined ? state.currentSet.teamAGames : 0;
      const gamesB = state?.currentSet?.teamBGames !== undefined ? state.currentSet.teamBGames : 0;
      const pointsA = state?.currentPointA !== undefined ? state.currentPointA : '0';
      const pointsB = state?.currentPointB !== undefined ? state.currentPointB : '0';

      vars['{{SCORE}}'] = `Sets: ${setsA}-${setsB} | Games: ${gamesA}-${gamesB} | Points: ${pointsA}-${pointsB}`;
      vars['{{SET_SCORE}}'] = `${setsA} - ${setsB}`;
      vars['{{GAME_SCORE}}'] = `${gamesA} - ${gamesB}`;
      vars['{{CURRENT_POINT}}'] = `${pointsA} - ${pointsB}`;
      vars['{{POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{SERVER_NAME}}'] = state?.serverPlayerName || state?.serverTeamName || teamAName;
      vars['{{SERVER}}'] = vars['{{SERVER_NAME}}'];
      vars['{{RECEIVER_NAME}}'] = state?.receiverPlayerName || state?.receiverTeamName || teamBName;
      vars['{{RECEIVER}}'] = vars['{{RECEIVER_NAME}}'];
      vars['{{PLAYER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{SET_NUMBER}}'] = state?.currentSetNumber ? `Set ${state.currentSetNumber}` : 'Set 1';
      vars['{{MATCH_POINT}}'] = state?.isMatchPoint ? 'MATCH POINT' : '';
      vars['{{SET_POINT}}'] = state?.isSetPoint ? 'SET POINT' : '';
      vars['{{DEUCE}}'] = state?.isDeuce ? 'DEUCE' : '';
      vars['{{BREAK_POINT}}'] = state?.isBreakPoint ? 'BREAK POINT' : '';

      if (state?.sets && Array.isArray(state.sets)) {
        state.sets.forEach((s: any, idx: number) => {
          vars[`{{SET_${idx + 1}_SCORE}}`] = `${s.teamAGames || 0}-${s.teamBGames || 0}`;
        });
      }
      break;
    }

    case 'BADMINTON': {
      const gamesA = state?.gamesWonA !== undefined ? state.gamesWonA : 0;
      const gamesB = state?.gamesWonB !== undefined ? state.gamesWonB : 0;
      const pointsA = state?.currentGame?.teamAPoints !== undefined ? state.currentGame.teamAPoints : 0;
      const pointsB = state?.currentGame?.teamBPoints !== undefined ? state.currentGame.teamBPoints : 0;

      vars['{{SCORE}}'] = `Games: ${gamesA}-${gamesB} (${pointsA}-${pointsB})`;
      vars['{{SET_SCORE}}'] = `${gamesA} - ${gamesB}`;
      vars['{{GAME_SCORE}}'] = `${gamesA} - ${gamesB}`;
      vars['{{CURRENT_GAME_POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{CURRENT_SET_POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{SERVER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{SERVER}}'] = vars['{{SERVER_NAME}}'];
      vars['{{RECEIVER_NAME}}'] = state?.receiverPlayerName || teamBName;
      vars['{{RECEIVER}}'] = vars['{{RECEIVER_NAME}}'];
      vars['{{SERVICE_COURT}}'] = state?.serviceCourt || 'Right Court';
      vars['{{PLAYER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{GAME_NUMBER}}'] = state?.currentGameNumber ? `Game ${state.currentGameNumber}` : 'Game 1';
      vars['{{MATCH_POINT}}'] = state?.isMatchPoint ? 'MATCH POINT' : '';
      vars['{{GAME_POINT}}'] = state?.isGamePoint ? 'GAME POINT' : '';
      vars['{{INTERVAL}}'] = state?.isInterval ? 'INTERVAL' : '';
      break;
    }

    case 'TABLE_TENNIS': {
      const gamesA = state?.gamesWonA !== undefined ? state.gamesWonA : 0;
      const gamesB = state?.gamesWonB !== undefined ? state.gamesWonB : 0;
      const pointsA = state?.currentGame?.teamAPoints !== undefined ? state.currentGame.teamAPoints : 0;
      const pointsB = state?.currentGame?.teamBPoints !== undefined ? state.currentGame.teamBPoints : 0;

      vars['{{SCORE}}'] = `Games: ${gamesA}-${gamesB} (${pointsA}-${pointsB})`;
      vars['{{GAME_SCORE}}'] = `${gamesA} - ${gamesB}`;
      vars['{{CURRENT_GAME_POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{SERVER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{SERVER}}'] = vars['{{SERVER_NAME}}'];
      vars['{{RECEIVER_NAME}}'] = state?.receiverPlayerName || teamBName;
      vars['{{RECEIVER}}'] = vars['{{RECEIVER_NAME}}'];
      vars['{{PLAYER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{SERVICE_REMAINING}}'] = state?.serviceCountInRotation ? `${2 - state.serviceCountInRotation} Serve Left` : '1 Serve Left';
      vars['{{DEUCE}}'] = state?.isDeuce ? 'DEUCE' : '';
      vars['{{GAME_POINT}}'] = state?.isGamePoint ? 'GAME POINT' : '';
      vars['{{MATCH_POINT}}'] = state?.isMatchPoint ? 'MATCH POINT' : '';
      break;
    }

    case 'VOLLEYBALL': {
      const setsA = state?.setsWonA !== undefined ? state.setsWonA : 0;
      const setsB = state?.setsWonB !== undefined ? state.setsWonB : 0;
      const currentSetA = state?.currentSet?.teamAScore !== undefined ? state.currentSet.teamAScore : 0;
      const currentSetB = state?.currentSet?.teamBScore !== undefined ? state.currentSet.teamBScore : 0;

      vars['{{SCORE}}'] = `Sets: ${setsA}-${setsB} (${currentSetA}-${currentSetB})`;
      vars['{{SET_SCORE}}'] = `${setsA} - ${setsB}`;
      vars['{{SETS_WON_A}}'] = String(setsA);
      vars['{{SETS_WON_B}}'] = String(setsB);
      vars['{{CURRENT_SET_POINTS}}'] = `${currentSetA} - ${currentSetB}`;
      vars['{{SET_NUMBER}}'] = state?.currentSetNumber ? `Set ${state.currentSetNumber}` : 'Set 1';
      vars['{{SERVER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{SERVER}}'] = vars['{{SERVER_NAME}}'];
      vars['{{ROTATION}}'] = state?.currentRotation ? `Rotation ${state.currentRotation}` : 'Position 1';
      vars['{{PLAYER_NAME}}'] = state?.serverPlayerName || 'Volleyball Spiker';
      vars['{{TIMEOUTS_REMAINING}}'] = `${(state?.teamATimeouts || 0)} - ${(state?.teamBTimeouts || 0)} Timeouts Used`;
      vars['{{SET_POINT}}'] = state?.isSetPoint ? 'SET POINT' : '';
      vars['{{MATCH_POINT}}'] = state?.isMatchPoint ? 'MATCH POINT' : '';
      break;
    }

    case 'KABADDI': {
      const scoreA = state?.teamAScore !== undefined ? state.teamAScore : 0;
      const scoreB = state?.teamBScore !== undefined ? state.teamBScore : 0;
      vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
      vars['{{TEAM_A_SCORE}}'] = String(scoreA);
      vars['{{TEAM_B_SCORE}}'] = String(scoreB);
      vars['{{CURRENT_HALF}}'] = state?.currentHalf ? `${state.currentHalf}${state.currentHalf === 1 ? 'st' : 'nd'} Half` : '1st Half';
      vars['{{RAIDER_NAME}}'] = state?.activeRaiderName || state?.lastRaid?.raiderName || 'Raider';
      vars['{{RAIDER}}'] = vars['{{RAIDER_NAME}}'];
      vars['{{DEFENDER_NAME}}'] = state?.lastTackleDefenderName || 'Lead Defender';
      vars['{{DEFENDER}}'] = vars['{{DEFENDER_NAME}}'];
      vars['{{PLAYER_NAME}}'] = state?.activeRaiderName || 'Super Raider';
      vars['{{RAID_POINTS}}'] = state?.lastRaid?.totalPoints ? `+${state.lastRaid.totalPoints} Pts` : '+1 Touch';
      vars['{{TACKLE_POINTS}}'] = state?.lastTacklePoints ? `+${state.lastTacklePoints} Pts` : '+1 Tackle';
      vars['{{RAID_TIMER}}'] = state?.raidTimer ? `${state.raidTimer}s` : '30s';
      vars['{{ACTIVE_DEFENDERS}}'] = state?.activeCourtPlayerIdsA ? `${state.activeCourtPlayerIdsA.length} vs ${state.activeCourtPlayerIdsB?.length || 7}` : '7 Defenders';
      vars['{{DO_OR_DIE}}'] = state?.isCurrentRaidDoOrDie ? 'DO OR DIE RAID' : 'Normal Raid';
      vars['{{SUPER_RAID}}'] = state?.isSuperRaid ? 'SUPER RAID' : '';
      vars['{{SUPER_TACKLE}}'] = state?.isSuperTackle ? 'SUPER TACKLE ON' : '';
      vars['{{ALL_OUT}}'] = state?.isAllOut ? 'ALL OUT' : '';
      break;
    }

    case 'FOOTBALL': {
      const scoreA = state?.teamAGoals !== undefined ? state.teamAGoals : 0;
      const scoreB = state?.teamBGoals !== undefined ? state.teamBGoals : 0;
      const clock = state?.matchClock?.formattedTime || '74:20';
      const period = state?.matchClock?.periodName || '2nd Half';

      vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
      vars['{{TEAM_A_GOALS}}'] = String(scoreA);
      vars['{{TEAM_B_GOALS}}'] = String(scoreB);
      vars['{{TEAM_A_SCORE}}'] = String(scoreA);
      vars['{{TEAM_B_SCORE}}'] = String(scoreB);
      vars['{{MATCH_CLOCK}}'] = clock;
      vars['{{PERIOD}}'] = period;
      vars['{{GOAL_SCORER}}'] = state?.lastGoal?.playerName ? `${state.lastGoal.playerName} (${state.lastGoal.minute}')` : 'Striker (68\')';
      vars['{{PLAYER_NAME}}'] = state?.lastGoal?.playerName || 'Football Star';
      vars['{{YELLOW_CARDS_A}}'] = String(state?.teamAYellowCards || 0);
      vars['{{YELLOW_CARDS_B}}'] = String(state?.teamBYellowCards || 0);
      vars['{{RED_CARDS_A}}'] = String(state?.teamARedCards || 0);
      vars['{{RED_CARDS_B}}'] = String(state?.teamBRedCards || 0);
      vars['{{CORNERS_A}}'] = String(state?.teamACorners || 0);
      vars['{{CORNERS_B}}'] = String(state?.teamBCorners || 0);
      vars['{{PENALTY}}'] = state?.isPenalty ? 'PENALTY' : '';
      vars['{{SUBSTITUTION}}'] = state?.lastSubstitution ? `${state.lastSubstitution.inPlayer} (IN) / ${state.lastSubstitution.outPlayer} (OUT)` : 'Substitution';
      break;
    }

    case 'HOCKEY': {
      const scoreA = state?.teamAGoals !== undefined ? state.teamAGoals : 0;
      const scoreB = state?.teamBGoals !== undefined ? state.teamBGoals : 0;
      const clock = state?.matchClock?.formattedTime || '42:15';
      const period = state?.matchClock?.periodName || 'Q3';

      vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
      vars['{{TEAM_A_GOALS}}'] = String(scoreA);
      vars['{{TEAM_B_GOALS}}'] = String(scoreB);
      vars['{{TEAM_A_SCORE}}'] = String(scoreA);
      vars['{{TEAM_B_SCORE}}'] = String(scoreB);
      vars['{{MATCH_CLOCK}}'] = clock;
      vars['{{PERIOD}}'] = period;
      vars['{{QUARTER}}'] = period;
      vars['{{GOAL_SCORER}}'] = state?.lastGoal?.playerName || 'Hockey Forward';
      vars['{{PLAYER_NAME}}'] = state?.lastGoal?.playerName || 'Hockey Star';
      vars['{{PENALTY_CORNER}}'] = state?.isPenaltyCorner ? 'PENALTY CORNER' : '';
      vars['{{PENALTY_STROKE}}'] = state?.isPenaltyStroke ? 'PENALTY STROKE' : '';
      vars['{{GREEN_CARDS_A}}'] = String(state?.teamAGreenCards || 0);
      vars['{{GREEN_CARDS_B}}'] = String(state?.teamBGreenCards || 0);
      vars['{{YELLOW_CARDS_A}}'] = String(state?.teamAYellowCards || 0);
      vars['{{YELLOW_CARDS_B}}'] = String(state?.teamBYellowCards || 0);
      vars['{{RED_CARDS_A}}'] = String(state?.teamARedCards || 0);
      vars['{{RED_CARDS_B}}'] = String(state?.teamBRedCards || 0);
      break;
    }

    case 'BASKETBALL': {
      const scoreA = state?.teamAScore !== undefined ? state.teamAScore : 0;
      const scoreB = state?.teamBScore !== undefined ? state.teamBScore : 0;
      const clock = state?.matchClock?.formattedTime || '08:45';
      const quarter = state?.currentQuarter ? `Q${state.currentQuarter}` : 'Q3';

      vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
      vars['{{TEAM_A_POINTS}}'] = String(scoreA);
      vars['{{TEAM_B_POINTS}}'] = String(scoreB);
      vars['{{TEAM_A_SCORE}}'] = String(scoreA);
      vars['{{TEAM_B_SCORE}}'] = String(scoreB);
      vars['{{GAME_CLOCK}}'] = clock;
      vars['{{MATCH_CLOCK}}'] = clock;
      vars['{{QUARTER}}'] = quarter;
      vars['{{SHOT_CLOCK}}'] = state?.shotClock !== undefined ? `${state.shotClock}s` : '14s';
      vars['{{TEAM_A_FOULS}}'] = String(state?.teamAFouls || 0);
      vars['{{TEAM_B_FOULS}}'] = String(state?.teamBFouls || 0);
      vars['{{TIMEOUTS_A}}'] = String(state?.teamATimeoutsLeft !== undefined ? state.teamATimeoutsLeft : 2);
      vars['{{TIMEOUTS_B}}'] = String(state?.teamBTimeoutsLeft !== undefined ? state.teamBTimeoutsLeft : 1);
      vars['{{PLAYER_NAME}}'] = state?.topScorer?.playerName || 'Shooting Guard';
      vars['{{TOP_SCORER_NAME}}'] = state?.topScorer?.playerName || 'Shooting Guard';
      vars['{{TOP_SCORER_POINTS}}'] = state?.topScorer?.points ? `${state.topScorer.points} PTS` : '28 PTS';
      break;
    }

    case 'PICKLEBALL': {
      const gamesA = state?.gamesWonA !== undefined ? state.gamesWonA : 0;
      const gamesB = state?.gamesWonB !== undefined ? state.gamesWonB : 0;
      const pointsA = state?.currentGame?.teamAPoints !== undefined ? state.currentGame.teamAPoints : 0;
      const pointsB = state?.currentGame?.teamBPoints !== undefined ? state.currentGame.teamBPoints : 0;
      const serverNumber = state?.serverNumber || 1;

      vars['{{SCORE}}'] = `${pointsA} - ${pointsB} (Server ${serverNumber})`;
      vars['{{GAME_SCORE}}'] = `${gamesA} - ${gamesB}`;
      vars['{{CURRENT_GAME_POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{SERVER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{SERVER}}'] = vars['{{SERVER_NAME}}'];
      vars['{{SERVER_NUMBER}}'] = `Server ${serverNumber}`;
      vars['{{PLAYER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{GAME_POINT}}'] = state?.isGamePoint ? 'GAME POINT' : '';
      vars['{{MATCH_POINT}}'] = state?.isMatchPoint ? 'MATCH POINT' : '';
      break;
    }

    case 'HANDBALL': {
      const scoreA = state?.teamAGoals !== undefined ? state.teamAGoals : (state?.teamAScore || 0);
      const scoreB = state?.teamBGoals !== undefined ? state.teamBGoals : (state?.teamBScore || 0);
      const clock = state?.matchClock?.formattedTime || '24:10';
      const half = state?.currentHalf ? `${state.currentHalf}st Half` : '1st Half';

      vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
      vars['{{TEAM_A_GOALS}}'] = String(scoreA);
      vars['{{TEAM_B_GOALS}}'] = String(scoreB);
      vars['{{TEAM_A_SCORE}}'] = String(scoreA);
      vars['{{TEAM_B_SCORE}}'] = String(scoreB);
      vars['{{MATCH_CLOCK}}'] = clock;
      vars['{{HALF}}'] = half;
      vars['{{PERIOD}}'] = half;
      vars['{{GOAL_SCORER}}'] = state?.lastGoal?.playerName || 'Handball Pivot';
      vars['{{PLAYER_NAME}}'] = state?.lastGoal?.playerName || 'Handball Player';
      vars['{{2MIN_SUSPENSION_A}}'] = String(state?.teamASuspensions || 0);
      vars['{{2MIN_SUSPENSION_B}}'] = String(state?.teamBSuspensions || 0);
      break;
    }

    case 'SQUASH': {
      const gamesA = state?.gamesWonA !== undefined ? state.gamesWonA : 0;
      const gamesB = state?.gamesWonB !== undefined ? state.gamesWonB : 0;
      const pointsA = state?.currentGame?.teamAPoints !== undefined ? state.currentGame.teamAPoints : 0;
      const pointsB = state?.currentGame?.teamBPoints !== undefined ? state.currentGame.teamBPoints : 0;

      vars['{{SCORE}}'] = `Games: ${gamesA}-${gamesB} (${pointsA}-${pointsB})`;
      vars['{{SET_SCORE}}'] = `${gamesA} - ${gamesB}`;
      vars['{{GAME_SCORE}}'] = `${gamesA} - ${gamesB}`;
      vars['{{CURRENT_GAME_POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{POINTS}}'] = `${pointsA} - ${pointsB}`;
      vars['{{SERVER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{SERVER}}'] = vars['{{SERVER_NAME}}'];
      vars['{{PLAYER_NAME}}'] = state?.serverPlayerName || teamAName;
      vars['{{GAME_POINT}}'] = state?.isGamePoint ? 'GAME POINT' : '';
      vars['{{MATCH_POINT}}'] = state?.isMatchPoint ? 'MATCH POINT' : '';
      break;
    }

    default: {
      // CUSTOM / GENERIC SPORT
      const scoreA = state?.teamAScore !== undefined ? state.teamAScore : 0;
      const scoreB = state?.teamBScore !== undefined ? state.teamBScore : 0;
      vars['{{SCORE}}'] = `${scoreA} - ${scoreB}`;
      vars['{{SCORE_A}}'] = String(scoreA);
      vars['{{SCORE_B}}'] = String(scoreB);
      vars['{{TEAM_A_SCORE}}'] = String(scoreA);
      vars['{{TEAM_B_SCORE}}'] = String(scoreB);
      vars['{{PERIOD}}'] = state?.currentPeriod ? `Period ${state.currentPeriod}` : 'Period 1';
      vars['{{MATCH_CLOCK}}'] = state?.clock?.formattedTime || '12:00';
      vars['{{PLAYER_NAME}}'] = 'Champion Athlete';
      break;
    }
  }

  // Captain photos & fallbacks
  const teamACaptainId = match.teamASquad?.captainId;
  const teamBCaptainId = match.teamBSquad?.captainId;
  const playerA = (db.players || []).find((p) => p.id === teamACaptainId);
  const playerB = (db.players || []).find((p) => p.id === teamBCaptainId);

  if (playerA?.photoUrl) {
    imageVars['{{TEAM_A_CAPTAIN_PHOTO}}'] = playerA.photoUrl;
    imageVars['{{CAPTAIN_PHOTO}}'] = playerA.photoUrl;
    vars['{{TEAM_A_CAPTAIN_PHOTO}}'] = playerA.photoUrl;
    vars['{{CAPTAIN_PHOTO}}'] = playerA.photoUrl;
    vars['{{TEAM_A_CAPTAIN}}'] = playerA.name;
  } else {
    vars['{{TEAM_A_CAPTAIN}}'] = playerA?.name || 'Captain A';
  }

  if (playerB?.photoUrl) {
    imageVars['{{TEAM_B_CAPTAIN_PHOTO}}'] = playerB.photoUrl;
    vars['{{TEAM_B_CAPTAIN_PHOTO}}'] = playerB.photoUrl;
    vars['{{TEAM_B_CAPTAIN}}'] = playerB.name;
  } else {
    vars['{{TEAM_B_CAPTAIN}}'] = playerB?.name || 'Captain B';
  }

  // Default player fallback if not yet set
  if (!imageVars['{{PLAYER_PHOTO}}']) {
    imageVars['{{PLAYER_PHOTO}}'] = DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
    imageVars['{{PLAYER_IMAGE}}'] = DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
    vars['{{PLAYER_PHOTO}}'] = DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
    vars['{{PLAYER_IMAGE}}'] = DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
  }

  if (!imageVars['{{CAPTAIN_PHOTO}}']) {
    imageVars['{{CAPTAIN_PHOTO}}'] = DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
    vars['{{CAPTAIN_PHOTO}}'] = DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
  }

  return {
    matchId: match.id,
    sport: match.sport,
    matchTitle: vars['{{MATCH_NAME}}'],
    status: vars['{{MATCH_STATUS}}'],
    variables: vars,
    imageVariables: imageVars,
    fallbackImages: DEFAULT_FALLBACK_IMAGES,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generates rich sample mock data for design preview mode in Graphics Studio.
 */
export function getSampleDataContextForSport(sport: SportType): GraphicDataContext {
  const vars: Record<string, string> = {};
  const imageVars: Record<string, string> = { ...DEFAULT_FALLBACK_IMAGES };

  DYNAMIC_FIELDS.forEach((field) => {
    vars[field.key] = field.sampleValue;
    if (field.key.includes('LOGO') || field.key.includes('PHOTO') || field.key.includes('IMAGE') || field.key.includes('FLAG')) {
      imageVars[field.key] = field.sampleValue;
    }
  });

  return {
    sport,
    matchTitle: `${sport} Championship Grand Final`,
    status: 'LIVE - SAMPLE MODE',
    variables: vars,
    imageVariables: imageVars,
    fallbackImages: DEFAULT_FALLBACK_IMAGES,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Resolves a text string by replacing all known dynamic variables {{VAR}}.
 */
export function resolveDynamicText(
  rawText: string,
  variables: Record<string, string>
): string {
  if (!rawText) return '';
  let result = rawText;
  Object.entries(variables).forEach(([k, v]) => {
    if (result.includes(k)) {
      result = result.replaceAll(k, String(v));
    }
  });
  return result;
}

/**
 * Resolves an image URL with dynamic field binding and multi-level fallback cascade.
 */
export function resolveDynamicImageUrl(
  element: GraphicElement,
  dataContext: GraphicDataContext
): string {
  // 1. Direct dynamic field key binding
  if (element.dynamicFieldKey && dataContext.variables[element.dynamicFieldKey]) {
    const candidate = dataContext.variables[element.dynamicFieldKey];
    if (candidate && !candidate.startsWith('{{')) return candidate;
  }

  // 2. Dynamic tag inside element.imageUrl string (e.g. {{PLAYER_PHOTO}})
  if (element.imageUrl && element.imageUrl.includes('{{')) {
    const substituted = resolveDynamicText(element.imageUrl, dataContext.variables);
    if (substituted && !substituted.includes('{{')) return substituted;
  }

  // 3. Static image URL if provided
  if (element.imageUrl && !element.imageUrl.includes('{{')) {
    return element.imageUrl;
  }

  // 4. Fallback based on element type
  switch (element.type) {
    case 'PLAYER_PHOTO':
    case 'CAPTAIN_PHOTO':
      return dataContext.imageVariables['{{PLAYER_PHOTO}}'] || DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
    case 'TEAM_LOGO':
      return dataContext.imageVariables['{{TEAM_LOGO}}'] || DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER;
    case 'TOURNAMENT_LOGO':
      return dataContext.imageVariables['{{TOURNAMENT_LOGO}}'] || DEFAULT_FALLBACK_IMAGES.TOURNAMENT_PLACEHOLDER;
    case 'SPONSOR_LOGO':
      return dataContext.imageVariables['{{SPONSOR_LOGO}}'] || DEFAULT_FALLBACK_IMAGES.SPONSOR_PLACEHOLDER;
    default:
      return element.imageUrl || '';
  }
}

/**
 * Resolves a full GraphicElement layer
 */
export function resolveGraphicElement(
  el: GraphicElement,
  dataContext: GraphicDataContext
): GraphicElement {
  const resolved = { ...el };

  // Text substitution
  if (resolved.text) {
    resolved.text = resolveDynamicText(resolved.text, dataContext.variables);
  }

  // Image substitution
  if (
    resolved.type === 'IMAGE' ||
    resolved.type === 'LOGO' ||
    resolved.type === 'PLAYER_PHOTO' ||
    resolved.type === 'TEAM_LOGO' ||
    resolved.type === 'TOURNAMENT_LOGO' ||
    resolved.type === 'SPONSOR_LOGO' ||
    resolved.type === 'CAPTAIN_PHOTO' ||
    resolved.dynamicFieldKey
  ) {
    resolved.imageUrl = resolveDynamicImageUrl(resolved, dataContext);
  }

  return resolved;
}

/**
 * Resolves all layers of a StudioGraphic given a match context.
 */
export function resolveStudioGraphic(
  graphic: StudioGraphic,
  dataContext: GraphicDataContext
): StudioGraphic {
  return {
    ...graphic,
    elements: (graphic.elements || []).map((el) => resolveGraphicElement(el, dataContext)),
  };
}
