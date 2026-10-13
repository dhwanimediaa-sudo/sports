import { Match, SportType, BroadcastConfig, BroadcastActiveEventPayload } from '../types';
import { GraphicDataContext } from './broadcastDataResolver';
import { DEFAULT_FALLBACK_IMAGES } from '../constants/studioGraphicsConstants';

/**
 * Provides comprehensive sample / mock broadcast data for all 13 sports.
 * Ensures 100% offline preview capability without requiring a live match,
 * SSE connection, or network connectivity.
 */

export function getSampleMatchForSport(sport: SportType): Match {
  const sportNames: Record<SportType, { teamA: string; teamB: string; shortA: string; shortB: string; venue: string; tournament: string }> = {
    CRICKET: {
      teamA: 'London Monarchs',
      teamB: 'Yorkshire Titans',
      shortA: 'LDN',
      shortB: 'YKS',
      venue: "Lord's Cricket Ground, London",
      tournament: 'Premier T20 Championship',
    },
    FOOTBALL: {
      teamA: 'Madrid Royals',
      teamB: 'Manchester City Blues',
      shortA: 'RMA',
      shortB: 'MCI',
      venue: 'Santiago Bernabéu Stadium',
      tournament: 'Continental Super League',
    },
    KABADDI: {
      teamA: 'Bengaluru Panthers',
      teamB: 'Patna Pirates',
      shortA: 'BLR',
      shortB: 'PAT',
      venue: 'Kanteerava Indoor Arena',
      tournament: 'Pro Kabaddi Grand Prix',
    },
    VOLLEYBALL: {
      teamA: 'Trentino Volley',
      teamB: 'Sir Safety Perugia',
      shortA: 'TRN',
      shortB: 'PER',
      venue: 'PalaTrento Arena',
      tournament: 'SuperLega Championship',
    },
    BASKETBALL: {
      teamA: 'Boston Shamrocks',
      teamB: 'Golden State Warriors',
      shortA: 'BOS',
      shortB: 'GSW',
      venue: 'TD Garden Arena',
      tournament: 'National Finals',
    },
    TENNIS: {
      teamA: 'Carlos Alcaraz',
      teamB: 'Jannik Sinner',
      shortA: 'ALC',
      shortB: 'SIN',
      venue: 'Centre Court, Wimbledon',
      tournament: 'Championship Grand Slam',
    },
    BADMINTON: {
      teamA: 'Viktor Axelsen',
      teamB: 'Lakshya Sen',
      shortA: 'AXE',
      shortB: 'SEN',
      venue: 'Porte de La Chapelle Arena',
      tournament: 'World Badminton Tour Final',
    },
    TABLE_TENNIS: {
      teamA: 'Fan Zhendong',
      teamB: 'Ma Long',
      shortA: 'FAN',
      shortB: 'MAL',
      venue: 'Olympic Sports Center',
      tournament: 'World Table Tennis Finals',
    },
    HOCKEY: {
      teamA: 'Netherlands Lions',
      teamB: 'Kookaburras Australia',
      shortA: 'NED',
      shortB: 'AUS',
      venue: 'Yves-du-Manoir Stadium',
      tournament: 'World Hockey Pro League',
    },
    PICKLEBALL: {
      teamA: 'Ben Johns',
      teamB: 'Tyson McGuffin',
      shortA: 'BJN',
      shortB: 'TMG',
      venue: 'Center Court Arena',
      tournament: 'PPA Tour Championship',
    },
    HANDBALL: {
      teamA: 'THW Kiel',
      teamB: 'Barça Handball',
      shortA: 'KIE',
      shortB: 'BAR',
      venue: 'Wunderino Arena',
      tournament: 'European Handball League',
    },
    SQUASH: {
      teamA: 'Ali Farag',
      teamB: 'Diego Elias',
      shortA: 'FAR',
      shortB: 'ELI',
      venue: 'Glass Court Coliseum',
      tournament: 'PSA World Championship',
    },
    CUSTOM: {
      teamA: 'Strikers Athletic',
      teamB: 'Dynamo United',
      shortA: 'STR',
      shortB: 'DYN',
      venue: 'SportsPulse Grand Arena',
      tournament: 'Invitational Cup',
    },
    OTHER: {
      teamA: 'Team Alpha',
      teamB: 'Team Beta',
      shortA: 'TMA',
      shortB: 'TMB',
      venue: 'Grand Arena',
      tournament: 'Championship Showcase',
    },
  };

  const details = sportNames[sport] || sportNames.CRICKET;

  return ({
    id: `sample-match-${sport.toLowerCase()}`,
    sport,
    tournamentId: 'sample-tournament-1',
    tournament: {
      id: 'sample-tournament-1',
      name: details.tournament,
      sport,
      logoUrl: DEFAULT_FALLBACK_IMAGES.TOURNAMENT_PLACEHOLDER,
    } as any,
    teamAId: 'sample-team-a',
    teamBId: 'sample-team-b',
    teamA: {
      id: 'sample-team-a',
      name: details.teamA,
      shortName: details.shortA,
      code: details.shortA,
      primaryColor: '#0284c7',
      secondaryColor: '#0f172a',
      logoUrl: DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER,
    } as any,
    teamB: {
      id: 'sample-team-b',
      name: details.teamB,
      shortName: details.shortB,
      code: details.shortB,
      primaryColor: '#e11d48',
      secondaryColor: '#0f172a',
      logoUrl: DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER,
    } as any,
    name: `${details.teamA} vs ${details.teamB}`,
    round: 'Finals',
    venue: details.venue,
    ground: 'Main Court',
    status: 'LIVE',
    matchDate: new Date().toISOString(),
    matchTime: '19:30',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown) as Match;
}

export function getSampleScoringStateForSport(sport: SportType): any {
  if (sport === 'CRICKET') {
    return {
      sport: 'CRICKET',
      totalRuns: 125,
      wickets: 4,
      totalOvers: 17,
      legalBallsCount: 3,
      oversDisplay: '17.3',
      runRate: 7.14,
      currentRunRate: 7.14,
      requiredRunRate: 8.20,
      targetRuns: 165,
      target: 165,
      battingTeamId: 'sample-team-a',
      bowlingTeamId: 'sample-team-b',
      currentInnings: {
        inningsNumber: 2,
        totalRuns: 125,
        totalWickets: 4,
        totalOvers: 17,
        legalBallsCount: 3,
        oversDisplay: '17.3',
        battingTeamName: 'London Monarchs',
        bowlingTeamName: 'Yorkshire Titans',
        currentStrikerId: 'sample-p1',
        currentNonStrikerId: 'sample-p2',
        currentBowlerId: 'sample-b1',
      },
      batsmenStats: [
        {
          playerId: 'sample-p1',
          playerName: 'Joe Root',
          runs: 45,
          ballsFaced: 32,
          fours: 4,
          sixes: 2,
          strikeRate: 140.6,
        },
        {
          playerId: 'sample-p2',
          playerName: 'Harry Brook',
          runs: 28,
          ballsFaced: 19,
          fours: 3,
          sixes: 1,
          strikeRate: 147.3,
        },
      ],
      bowlerStats: [
        {
          playerId: 'sample-b1',
          playerName: 'Jofra Archer',
          bowlerName: 'Jofra Archer',
          wickets: 2,
          runsConceded: 24,
          overs: '3.3',
          oversDisplay: '3.3',
          maidens: 0,
          economyRate: 6.85,
        },
      ],
      strikerStat: {
        playerId: 'sample-p1',
        playerName: 'Joe Root',
        runs: 45,
        ballsFaced: 32,
        fours: 4,
        sixes: 2,
        strikeRate: 140.6,
      },
      nonStrikerStat: {
        playerId: 'sample-p2',
        playerName: 'Harry Brook',
        runs: 28,
        ballsFaced: 19,
        fours: 3,
        sixes: 1,
        strikeRate: 147.3,
      },
      bowlerStat: {
        playerId: 'sample-b1',
        playerName: 'Jofra Archer',
        bowlerName: 'Jofra Archer',
        wickets: 2,
        runsConceded: 24,
        overs: '3.3',
        oversDisplay: '3.3',
        maidens: 0,
        economyRate: 6.85,
      },
      extras: { total: 8, wides: 4, noBalls: 1, byes: 2, legByes: 1 },
      matchResult: 'London Monarchs need 40 runs in 15 balls to win',
    };
  }

  if (sport === 'FOOTBALL') {
    return {
      sport: 'FOOTBALL',
      teamAScore: 2,
      teamBScore: 1,
      currentPeriod: '2ND_HALF',
      matchClock: '67:40',
      periodName: '2nd Half',
      scorers: [
        { playerName: 'Vinicius Jr', minute: "24'", teamId: 'sample-team-a' },
        { playerName: 'Erling Haaland', minute: "52'", teamId: 'sample-team-b' },
        { playerName: 'Jude Bellingham', minute: "64'", teamId: 'sample-team-a' },
      ],
    };
  }

  if (sport === 'KABADDI') {
    return {
      sport: 'KABADDI',
      teamAScore: 34,
      teamBScore: 29,
      currentHalf: 2,
      defendersOnCourt: 5,
      lastRaidPoints: 3,
      activeRaiderName: 'Pawan Sehrawat',
      allOutCountTeamA: 1,
      allOutCountTeamB: 0,
    };
  }

  if (sport === 'BASKETBALL') {
    return {
      sport: 'BASKETBALL',
      teamAScore: 88,
      teamBScore: 84,
      quarter: 4,
      periodName: '4th Quarter',
      shotClock: 14,
      gameClock: '03:42',
      foulsA: 3,
      foulsB: 4,
    };
  }

  if (sport === 'VOLLEYBALL') {
    return {
      sport: 'VOLLEYBALL',
      setScores: { teamA: 2, teamB: 1 },
      currentSet: 4,
      currentPoints: { teamA: 21, teamB: 18 },
      servingTeam: 'TEAM_A',
      setsList: [
        { setNumber: 1, scoreA: 25, scoreB: 22 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 23 },
      ],
    };
  }

  if (sport === 'TENNIS') {
    return {
      sport: 'TENNIS',
      setsWon: { teamA: 1, teamB: 0 },
      currentSetScore: { teamA: 4, teamB: 3 },
      currentGameScore: { teamA: '40', teamB: '30' },
      server: 'TEAM_A',
      sets: [{ setNumber: 1, teamA: 6, teamB: 4 }],
    };
  }

  if (sport === 'BADMINTON' || sport === 'TABLE_TENNIS') {
    return {
      sport,
      gamesWon: { teamA: 1, teamB: 0 },
      currentPoints: { teamA: 18, teamB: 16 },
      servingPlayer: 'TEAM_A',
      currentGame: 2,
    };
  }

  if (sport === 'HOCKEY') {
    return {
      sport: 'HOCKEY',
      teamAScore: 3,
      teamBScore: 2,
      quarter: 4,
      clock: '54:12',
    };
  }

  // Universal Fallback / CUSTOM / SQUASH / PICKLEBALL / HANDBALL
  return {
    sport,
    teamAScore: 1,
    teamBScore: 0,
    currentScoreA: 1,
    currentScoreB: 0,
    totalPointsA: 1,
    totalPointsB: 0,
  };
}

export function getSampleEventPayload(graphicId: string, sport: SportType): BroadcastActiveEventPayload {
  const match = getSampleMatchForSport(sport);

  if (graphicId.includes('four') || graphicId === 'cricket-four') {
    return {
      type: 'FOUR',
      timestamp: new Date().toISOString(),
      durationSeconds: 4,
      data: {
        runs: 4,
        playerName: 'Joe Root',
        boundaryType: 'FOUR',
        shotZone: 'Cover Drive',
        speedKph: 138,
      },
    };
  }

  if (graphicId.includes('six') || graphicId === 'cricket-six') {
    return {
      type: 'SIX',
      timestamp: new Date().toISOString(),
      durationSeconds: 4,
      data: {
        runs: 6,
        playerName: 'Harry Brook',
        distanceMeters: 92,
        shotZone: 'Deep Mid-Wicket',
      },
    };
  }

  if (graphicId.includes('wicket') || graphicId === 'cricket-wicket') {
    return {
      type: 'WICKET',
      timestamp: new Date().toISOString(),
      durationSeconds: 5,
      data: {
        playerName: 'Ben Stokes',
        dismissalType: 'Bowled',
        bowlerName: 'Jofra Archer',
        runs: 38,
        balls: 24,
      },
    };
  }

  if (graphicId.includes('fifty') || graphicId === 'cricket-fifty') {
    return {
      type: 'FIFTY',
      timestamp: new Date().toISOString(),
      durationSeconds: 5,
      data: {
        playerName: 'Joe Root',
        runs: 50,
        balls: 34,
        fours: 5,
        sixes: 2,
      },
    };
  }

  if (graphicId.includes('century') || graphicId === 'cricket-century') {
    return {
      type: 'CENTURY',
      timestamp: new Date().toISOString(),
      durationSeconds: 6,
      data: {
        playerName: 'Joe Root',
        runs: 100,
        balls: 68,
        fours: 11,
        sixes: 4,
      },
    };
  }

  if (graphicId.includes('goal') || graphicId === 'football-goal') {
    return {
      type: 'GOAL',
      timestamp: new Date().toISOString(),
      durationSeconds: 5,
      data: {
        sport: 'FOOTBALL',
        scorerName: 'Vinicius Jr',
        assistName: 'Jude Bellingham',
        teamName: match.teamA?.name || 'Madrid Royals',
        goalType: 'OPEN_PLAY',
        matchTimeDisplay: "64'",
      },
    };
  }

  if (graphicId.includes('super-raid') || graphicId === 'kabaddi-super-raid') {
    return {
      type: 'SUPER_RAID',
      timestamp: new Date().toISOString(),
      durationSeconds: 5,
      data: {
        raiderName: 'Pawan Sehrawat',
        points: 3,
        teamName: match.teamA?.name || 'Bengaluru Panthers',
      },
    };
  }

  if (graphicId.includes('super-tackle') || graphicId === 'kabaddi-super-tackle') {
    return {
      type: 'SUPER_TACKLE',
      timestamp: new Date().toISOString(),
      durationSeconds: 5,
      data: {
        tacklerName: 'Fazel Atrachali',
        points: 2,
        teamName: match.teamA?.name || 'Bengaluru Panthers',
      },
    };
  }

  if (graphicId.includes('all-out') || graphicId === 'kabaddi-all-out') {
    return {
      type: 'ALL_OUT',
      timestamp: new Date().toISOString(),
      durationSeconds: 5,
      data: {
        teamName: match.teamB?.name || 'Patna Pirates',
        points: 2,
      },
    };
  }

  // Universal event popup fallback
  return {
    type: 'EVENT_ALERT',
    timestamp: new Date().toISOString(),
    durationSeconds: 4,
    data: {
      title: 'MATCH EVENT',
      subtitle: 'Outstanding Play in Progress',
      teamName: match.teamA?.name || 'Team A',
    },
  };
}

export function getSampleBroadcastDataContext(sport: SportType): GraphicDataContext {
  const match = getSampleMatchForSport(sport);
  const scoringState = getSampleScoringStateForSport(sport);

  const vars: Record<string, string> = {
    '{{SPORT}}': sport,
    '{{SPORT_TYPE}}': sport,
    '{{SPORT_NAME}}': sport,
    '{{TOURNAMENT_NAME}}': match.tournament?.name || 'Premier Championship',
    '{{MATCH_NAME}}': match.name || 'Team A vs Team B',
    '{{MATCH_STATUS}}': 'LIVE',
    '{{MATCH_ROUND}}': 'Finals',
    '{{VENUE}}': match.venue || 'Stadium Arena',
    '{{GROUND}}': match.ground || 'Center Arena',
    '{{TEAM_A}}': match.teamA?.name || 'Team A',
    '{{TEAM_B}}': match.teamB?.name || 'Team B',
    '{{TEAM_A_NAME}}': match.teamA?.name || 'Team A',
    '{{TEAM_B_NAME}}': match.teamB?.name || 'Team B',
    '{{TEAM_A_SHORT}}': match.teamA?.shortName || 'TMA',
    '{{TEAM_B_SHORT}}': match.teamB?.shortName || 'TMB',
    '{{TEAM_A_CODE}}': match.teamA?.code || 'TMA',
    '{{TEAM_B_CODE}}': match.teamB?.code || 'TMB',
    '{{ACTIVE_TEAM_NAME}}': match.teamA?.name || 'Team A',
    '{{OPPONENT_TEAM_NAME}}': match.teamB?.name || 'Team B',
    '{{BATTING_TEAM_NAME}}': match.teamA?.name || 'Team A',
    '{{BOWLING_TEAM_NAME}}': match.teamB?.name || 'Team B',
    '{{SCORE}}': sport === 'CRICKET' ? '125/4 (17.3 ov)' : '2 - 1',
    '{{SCORE_WITH_OVERS}}': '125/4 (17.3 ov)',
    '{{RUNS}}': '125',
    '{{WICKETS}}': '4',
    '{{OVERS}}': '17.3',
    '{{RUN_RATE}}': '7.14',
    '{{CRR}}': '7.14',
    '{{REQUIRED_RUN_RATE}}': '8.20',
    '{{RRR}}': '8.20',
    '{{TARGET}}': '165',
    '{{TARGET_RUNS}}': '165',
    '{{STRIKER}}': 'Joe Root 45 (32)',
    '{{STRIKER_NAME}}': 'Joe Root',
    '{{STRIKER_RUNS}}': '45',
    '{{STRIKER_BALLS}}': '32',
    '{{STRIKER_4S}}': '4',
    '{{STRIKER_6S}}': '2',
    '{{NON_STRIKER}}': 'Harry Brook 28 (19)',
    '{{NON_STRIKER_NAME}}': 'Harry Brook',
    '{{NON_STRIKER_RUNS}}': '28',
    '{{BOWLER}}': 'Jofra Archer 2/24 (3.3)',
    '{{BOWLER_NAME}}': 'Jofra Archer',
    '{{BOWLER_WICKETS}}': '2',
    '{{BOWLER_RUNS}}': '24',
    '{{BOWLER_OVERS}}': '3.3',
    '{{BALL_EVENT}}': '6',
    '{{MATCH_CLOCK}}': '67:40',
    '{{QUARTER}}': '4',
    '{{SET_SCORE}}': 'Sets: 2-1',
    '{{POINTS_A}}': '21',
    '{{POINTS_B}}': '18',
    '{{DEFENDERS_COUNT}}': '5',
    '{{MATCH_RESULT}}': 'London Monarchs need 40 runs in 15 balls to win',
  };

  const imageVars: Record<string, string> = {
    '{{TEAM_A_LOGO}}': DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER,
    '{{TEAM_B_LOGO}}': DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER,
    '{{TEAM_LOGO}}': DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER,
    '{{TOURNAMENT_LOGO}}': DEFAULT_FALLBACK_IMAGES.TOURNAMENT_PLACEHOLDER,
    '{{TROPHY_IMAGE}}': DEFAULT_FALLBACK_IMAGES.TROPHY_PLACEHOLDER,
  };

  return {
    sport,
    matchTitle: `${match.teamA?.name} vs ${match.teamB?.name}`,
    status: 'LIVE',
    variables: { ...vars, ...imageVars },
    imageVariables: imageVars,
    fallbackImages: DEFAULT_FALLBACK_IMAGES,
    lastUpdated: new Date().toISOString(),
  };
}

export interface BroadcastPreviewDataOptions {
  sport?: SportType;
  match?: Match | null;
  graphic?: any;
  scoringState?: any;
}

export interface BroadcastPreviewDataResult {
  sport: SportType;
  match: Match;
  scoringState: any;
  dataContext: GraphicDataContext;
  config: BroadcastConfig;
  activeEvent: BroadcastActiveEventPayload | null;
  onAirItem: any | null;
  isLive: boolean;
}

/**
 * Normalized sample-data provider for Broadcast Graphics Preview.
 * Guarantees safe defaults across all 14 execution contexts without requiring
 * live match telemetry or SSE connectivity.
 */
export function getBroadcastPreviewData(options: BroadcastPreviewDataOptions = {}): BroadcastPreviewDataResult {
  const sport: SportType = options.sport || options.match?.sport || options.graphic?.sport || 'CRICKET';
  const sampleMatch = getSampleMatchForSport(sport);
  const sampleScoring = getSampleScoringStateForSport(sport);
  const sampleContext = getSampleBroadcastDataContext(sport);

  const isLive = Boolean(options.match && options.scoringState && options.match.status !== 'CANCELLED');

  const match: Match = options.match
    ? {
        ...sampleMatch,
        ...options.match,
        teamA: { ...sampleMatch.teamA, ...(options.match.teamA || {}) },
        teamB: { ...sampleMatch.teamB, ...(options.match.teamB || {}) },
        venue: options.match.venue || sampleMatch.venue,
        tournament: options.match.tournament || sampleMatch.tournament,
      }
    : sampleMatch;

  const scoringState = isLive && options.scoringState ? options.scoringState : sampleScoring;

  const baseConfig: BroadcastConfig = {
    id: 'preview-config',
    matchId: match.id || 'preview-match',
    scoreboardVisible: false,
    sponsorVisible: false,
    playerLowerThirdVisible: false,
    enableFour: true,
    enableSix: true,
    enableWicket: true,
    enableFifty: true,
    enableCentury: true,
    enableOver: true,
    enablePartnership: true,
    enableInningsBreak: true,
    enableMatchResult: true,
    selectedTemplates: {
      scoreboard: 'MODERN_SPORTS',
      four: 'MODERN_SPORTS',
      six: 'NEON',
      wicket: 'BOLD_SPORTS',
      fifty: 'PREMIUM',
      century: 'PREMIUM',
      over: 'GLASS',
      partnership: 'MINIMAL',
      inningsBreak: 'MODERN_SPORTS',
      matchResult: 'BOLD_SPORTS',
      playerLowerThird: 'MODERN_SPORTS',
    },
    elementVisibility: {
      tournamentLogo: true,
      tournamentName: true,
      teamLogo: true,
      teamName: true,
      score: true,
      wickets: true,
      overs: true,
      runRate: true,
      target: true,
      requiredRuns: true,
      requiredRate: true,
      striker: true,
      nonStriker: true,
      batsmanRuns: true,
      batsmanBalls: true,
      bowlerName: true,
      bowlerFigures: true,
      partnership: true,
      currentOver: true,
      sponsorLogo: true,
    },
    styleConfig: {
      position: 'BOTTOM',
      shape: 'ROUNDED',
      fontStyle: 'MODERN',
      primaryColor: '#0f172a',
      secondaryColor: '#1e293b',
      accentColor: '#10b981',
      textColor: '#ffffff',
      bgOpacity: 0.9,
      showBorder: true,
      showGlow: true,
      animation: 'SLIDE_UP',
    },
    eventDurations: {
      four: 3,
      six: 3,
      wicket: 4,
      fifty: 4,
      century: 5,
      over: 4,
    },
    sponsorConfig: {
      name: 'SportsPulse Broadcast Partner',
      logoUrl: '',
      position: 'TOP_RIGHT',
      animation: 'FADE',
    },
    updatedAt: new Date().toISOString(),
  };

  const config = { ...baseConfig };
  let activeEvent: BroadcastActiveEventPayload | null = null;
  let onAirItem: any = null;

  const graphic = options.graphic;
  if (graphic) {
    if (graphic.category === 'MATCH_DATA' && (graphic.id?.includes('scorebug') || graphic.targetId?.includes('SCOREBUG'))) {
      config.scoreboardVisible = true;
    } else if (graphic.id?.includes('sponsor')) {
      config.sponsorVisible = true;
    } else if (graphic.id?.includes('player-lower-third') || graphic.category === 'PLAYER') {
      config.playerLowerThirdVisible = true;
    } else if (graphic.category === 'EVENT_POPUP') {
      activeEvent = getSampleEventPayload(graphic.id || '', sport);
    } else if (graphic.isCustomStudio && graphic.studioGraphic) {
      onAirItem = {
        id: `preview-${graphic.id}`,
        graphicId: graphic.id,
        graphicName: graphic.name,
        graphic: graphic.studioGraphic,
        durationSeconds: 0,
        isHeld: true,
      };
    } else if (graphic.isScene && graphic.scene) {
      onAirItem = {
        id: `preview-scene-${graphic.id}`,
        sceneId: graphic.id,
        sceneName: graphic.name,
        layers: graphic.scene.layers,
        durationSeconds: 0,
        isHeld: true,
      };
    } else {
      if (graphic.id?.includes('result')) {
        config.enableMatchResult = true;
      } else {
        config.scoreboardVisible = true;
      }
    }
  } else {
    config.scoreboardVisible = true;
  }

  return {
    sport,
    match,
    scoringState,
    dataContext: sampleContext,
    config,
    activeEvent,
    onAirItem,
    isLive,
  };
}

