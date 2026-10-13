import {
  Match,
  Tournament,
  Group,
  Team,
  Player,
  KabaddiRaidEvent,
  KabaddiTimeout,
  KabaddiSubstitution,
  KabaddiMatchReport,
  AwardCandidate,
} from '../../src/types';
import { calculateKabaddiScoringState } from './kabaddiScoringEngine';

export interface KabaddiReportOptions {
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  manOfTheMatchId?: string;
  manOfTheMatchReason?: string;
  bestRaiderId?: string;
  bestDefenderId?: string;
  bestAllRounderId?: string;
}

export function calculateKabaddiMatchReport(
  match: Match,
  raids: KabaddiRaidEvent[],
  timeouts: KabaddiTimeout[],
  substitutions: KabaddiSubstitution[],
  allPlayers: Player[],
  teams: Team[],
  tournaments: Tournament[],
  groups: Group[],
  options?: KabaddiReportOptions
): KabaddiMatchReport {
  const scoringState = calculateKabaddiScoringState(match, raids, timeouts, substitutions, allPlayers);

  const teamA = teams.find((t) => t.id === match.teamAId) || match.teamA;
  const teamB = teams.find((t) => t.id === match.teamBId) || match.teamB;
  const tournament = tournaments.find((t) => t.id === match.tournamentId) || match.tournament;
  const group = groups.find((g) => g.id === match.groupId) || match.group;

  const teamAPlayers = allPlayers.filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === match.teamBId);

  // Playing squads
  const teamAStarting = (match.teamASquad?.playingIds || [])
    .map((id) => teamAPlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[];
  const teamASubs = (match.teamASquad?.substituteIds || [])
    .map((id) => teamAPlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const teamBStarting = (match.teamBSquad?.playingIds || [])
    .map((id) => teamBPlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[];
  const teamBSubs = (match.teamBSquad?.substituteIds || [])
    .map((id) => teamBPlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  // Fallbacks if squad not explicitly set
  const startingSevenA = teamAStarting.length > 0 ? teamAStarting : teamAPlayers.slice(0, 7);
  const substitutesA = teamASubs.length > 0 ? teamASubs : teamAPlayers.slice(7);
  const startingSevenB = teamBStarting.length > 0 ? teamBStarting : teamBPlayers.slice(0, 7);
  const substitutesB = teamBSubs.length > 0 ? teamBSubs : teamBPlayers.slice(7);

  // Award Auto-Suggestions
  const playerStats = scoringState.playerStats;

  // 1. Man of the Match Candidate Scoring:
  // Points formula: totalPoints + (superRaids * 2) + (superTackles * 3) + (bonusPoints * 0.5)
  const rankedMom = [...playerStats]
    .map((p) => {
      const score =
        p.totalPoints +
        p.tacklePoints * 0.5 +
        p.superRaids * 2 +
        p.superTackles * 3 +
        p.bonusPoints * 0.5;
      return { player: p, score };
    })
    .sort((a, b) => b.score - a.score);

  const topMom = rankedMom.length > 0 ? rankedMom[0].player : undefined;
  const suggestedPlayerOfMatch: AwardCandidate | undefined = topMom
    ? {
        playerId: topMom.playerId,
        playerName: topMom.playerName,
        teamName: topMom.teamName,
        details: `${topMom.totalPoints} total points (${topMom.totalRaidPoints} raid, ${topMom.tacklePoints} tackle)${topMom.superRaids > 0 ? `, ${topMom.superRaids} Super Raids` : ''}${topMom.superTackles > 0 ? `, ${topMom.superTackles} Super Tackles` : ''}`,
      }
    : undefined;

  // 2. Best Raider Candidate
  const rankedRaiders = [...playerStats].sort(
    (a, b) => b.totalRaidPoints - a.totalRaidPoints || b.superRaids - a.superRaids
  );
  const topRaider = rankedRaiders.length > 0 && rankedRaiders[0].totalRaidPoints > 0 ? rankedRaiders[0] : undefined;
  const suggestedBestRaider: AwardCandidate | undefined = topRaider
    ? {
        playerId: topRaider.playerId,
        playerName: topRaider.playerName,
        teamName: topRaider.teamName,
        details: `${topRaider.totalRaidPoints} raid points (${topRaider.touchPoints} touch, ${topRaider.bonusPoints} bonus) across ${topRaider.raidAttempts} raids (${topRaider.raidSuccessRate}% success)`,
      }
    : undefined;

  // 3. Best Defender Candidate
  const rankedDefenders = [...playerStats].sort(
    (a, b) => b.tacklePoints - a.tacklePoints || b.superTackles - a.superTackles
  );
  const topDefender = rankedDefenders.length > 0 && rankedDefenders[0].tacklePoints > 0 ? rankedDefenders[0] : undefined;
  const suggestedBestDefender: AwardCandidate | undefined = topDefender
    ? {
        playerId: topDefender.playerId,
        playerName: topDefender.playerName,
        teamName: topDefender.teamName,
        details: `${topDefender.tacklePoints} tackle points (${topDefender.successfulTackles} successful tackles, ${topDefender.superTackles} Super Tackles)`,
      }
    : undefined;

  // 4. Best All-Rounder Candidate
  const rankedAllRounders = [...playerStats]
    .filter((p) => p.totalRaidPoints > 0 && p.tacklePoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints);
  const topAllRounder = rankedAllRounders.length > 0 ? rankedAllRounders[0] : undefined;
  const suggestedBestAllRounder: AwardCandidate | undefined = topAllRounder
    ? {
        playerId: topAllRounder.playerId,
        playerName: topAllRounder.playerName,
        teamName: topAllRounder.teamName,
        details: `${topAllRounder.totalPoints} total points (${topAllRounder.totalRaidPoints} raid + ${topAllRounder.tacklePoints} tackle)`,
      }
    : undefined;

  // Selected overrides
  const selectedMom = options?.manOfTheMatchId
    ? playerStats.find((p) => p.playerId === options.manOfTheMatchId)
    : undefined;
  const selectedPlayerOfMatch: AwardCandidate | undefined = selectedMom
    ? {
        playerId: selectedMom.playerId,
        playerName: selectedMom.playerName,
        teamName: selectedMom.teamName,
        details: options?.manOfTheMatchReason || `${selectedMom.totalPoints} total points`,
      }
    : suggestedPlayerOfMatch;

  const selectedRaider = options?.bestRaiderId
    ? playerStats.find((p) => p.playerId === options.bestRaiderId)
    : undefined;
  const selectedBestRaider = selectedRaider
    ? {
        playerId: selectedRaider.playerId,
        playerName: selectedRaider.playerName,
        teamName: selectedRaider.teamName,
        details: `${selectedRaider.totalRaidPoints} raid points`,
      }
    : suggestedBestRaider;

  const selectedDefender = options?.bestDefenderId
    ? playerStats.find((p) => p.playerId === options.bestDefenderId)
    : undefined;
  const selectedBestDefender = selectedDefender
    ? {
        playerId: selectedDefender.playerId,
        playerName: selectedDefender.playerName,
        teamName: selectedDefender.teamName,
        details: `${selectedDefender.tacklePoints} tackle points`,
      }
    : suggestedBestDefender;

  const selectedAllRounder = options?.bestAllRounderId
    ? playerStats.find((p) => p.playerId === options.bestAllRounderId)
    : undefined;
  const selectedBestAllRounder = selectedAllRounder
    ? {
        playerId: selectedAllRounder.playerId,
        playerName: selectedAllRounder.playerName,
        teamName: selectedAllRounder.teamName,
        details: `${selectedAllRounder.totalPoints} total points`,
      }
    : suggestedBestAllRounder;

  // Summary Cards stats
  const totalSuperRaids = playerStats.reduce((sum, p) => sum + p.superRaids, 0);
  const totalSuperTackles = playerStats.reduce((sum, p) => sum + p.superTackles, 0);
  const totalAllOuts = scoringState.teamAStats.allOutsInflicted + scoringState.teamBStats.allOutsInflicted;
  const totalBonusPoints = scoringState.teamAStats.bonusPoints + scoringState.teamBStats.bonusPoints;

  const winnerName = scoringState.matchWinnerId
    ? scoringState.matchWinnerId === match.teamAId
      ? (match.teamA?.name || 'Team A')
      : (match.teamB?.name || 'Team B')
    : scoringState.isMatchComplete
    ? 'Match Tied'
    : 'Match in Progress';

  return {
    match,
    tournament,
    group,
    teamA,
    teamB,
    status: match.status,
    isFinalized: options?.isFinalized ?? false,
    finalizedAt: options?.finalizedAt,
    finalizedBy: options?.finalizedBy,
    matchResultText: scoringState.matchResultText || (scoringState.isMatchComplete ? 'Match Completed' : 'In Progress'),
    winningTeamId: scoringState.matchWinnerId,
    winningMarginText: scoringState.matchResultText,
    firstHalfScores: {
      teamA: scoringState.teamAScoreHalf1,
      teamB: scoringState.teamBScoreHalf1,
    },
    secondHalfScores: {
      teamA: scoringState.teamAScoreHalf2,
      teamB: scoringState.teamBScoreHalf2,
    },
    finalScores: {
      teamA: scoringState.teamAScore,
      teamB: scoringState.teamBScore,
    },
    playerStats: scoringState.playerStats,
    teamAStats: scoringState.teamAStats,
    teamBStats: scoringState.teamBStats,
    raids: scoringState.raids,
    timeouts,
    substitutions,
    suggestedPlayerOfMatch,
    selectedPlayerOfMatch,
    suggestedBestRaider,
    selectedBestRaider,
    suggestedBestDefender,
    selectedBestDefender,
    suggestedBestAllRounder,
    selectedBestAllRounder,
    squadsReport: {
      teamA: {
        team: teamA || ({ id: match.teamAId, name: 'Team A' } as Team),
        captain: teamAPlayers.find((p) => p.isCaptain),
        viceCaptain: teamAPlayers.find((p) => p.isViceCaptain),
        startingSeven: startingSevenA,
        substitutes: substitutesA,
      },
      teamB: {
        team: teamB || ({ id: match.teamBId, name: 'Team B' } as Team),
        captain: teamBPlayers.find((p) => p.isCaptain),
        viceCaptain: teamBPlayers.find((p) => p.isViceCaptain),
        startingSeven: startingSevenB,
        substitutes: substitutesB,
      },
    },
    officialsReport: {
      referee: match.officials?.referee || match.officials?.official1,
      umpire: match.officials?.umpire || (match.officials?.umpires ? match.officials.umpires.join(', ') : undefined),
      scorer: match.officials?.scorer || (match.officials?.scorers ? match.officials.scorers.join(', ') : undefined),
      assistant: match.officials?.assistant,
      commentator: match.officials?.commentator,
    },
    sponsorsReport: {
      tournamentSponsor: match.sponsors?.tournamentSponsor,
      matchSponsor: match.sponsors?.matchSponsor,
    },
    summaryCards: {
      winnerName,
      finalScoreA: scoringState.teamAScore,
      finalScoreB: scoringState.teamBScore,
      highestRaiderText: topRaider ? `${topRaider.playerName} (${topRaider.totalRaidPoints} pts)` : 'None',
      bestDefenderText: topDefender ? `${topDefender.playerName} (${topDefender.tacklePoints} pts)` : 'None',
      totalSuperRaids,
      totalSuperTackles,
      totalAllOuts,
      totalBonusPoints,
    },
  };
}
