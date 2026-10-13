import { Match, Tournament } from '../types';

export interface CricketFormatPreset {
  label: string;
  value: string;
  overs: number;
}

export const CRICKET_FORMAT_PRESETS: CricketFormatPreset[] = [
  { label: 'T20 (20 Overs)', value: 'T20', overs: 20 },
  { label: 'T10 (10 Overs)', value: 'T10', overs: 10 },
  { label: 'T5 (5 Overs)', value: 'T5', overs: 5 },
  { label: 'T30 (30 Overs)', value: 'T30', overs: 30 },
  { label: 'ODI / T50 (50 Overs)', value: 'T50', overs: 50 },
  { label: 'Custom Overs', value: 'CUSTOM', overs: 20 },
];

export const CRICKET_OVER_PRESETS = [5, 10, 12, 15, 20, 25, 30, 40, 50];

/**
 * Resolves the effective number of overs for a cricket match.
 * Priority:
 * 1. Match-level explicit cricketConfig.overs (if > 0)
 * 2. Match-level matchOvers / oversOverride (if > 0)
 * 3. Tournament-level cricketDefaultOvers (if > 0)
 * 4. Tournament-level formatConfig.defaultMatchConfig.overs (if > 0)
 * 5. Default fallback (20 overs)
 */
export function getEffectiveMatchOvers(
  match?: Partial<Match> | null,
  tournament?: Partial<Tournament> | null
): number {
  if (match?.cricketConfig?.overs && Number(match.cricketConfig.overs) > 0) {
    return Math.floor(Number(match.cricketConfig.overs));
  }

  const cfg = match?.cricketConfig as any;
  if (cfg?.matchOvers && Number(cfg.matchOvers) > 0) {
    return Math.floor(Number(cfg.matchOvers));
  }
  if (cfg?.oversOverride && Number(cfg.oversOverride) > 0) {
    return Math.floor(Number(cfg.oversOverride));
  }

  const matchAny = match as any;
  if (matchAny?.matchOvers && Number(matchAny.matchOvers) > 0) {
    return Math.floor(Number(matchAny.matchOvers));
  }

  if (tournament?.cricketDefaultOvers && Number(tournament.cricketDefaultOvers) > 0) {
    return Math.floor(Number(tournament.cricketDefaultOvers));
  }

  if (tournament?.formatConfig?.defaultMatchConfig?.overs && Number(tournament.formatConfig.defaultMatchConfig.overs) > 0) {
    return Math.floor(Number(tournament.formatConfig.defaultMatchConfig.overs));
  }

  if (match?.tournament?.cricketDefaultOvers && Number(match.tournament.cricketDefaultOvers) > 0) {
    return Math.floor(Number(match.tournament.cricketDefaultOvers));
  }

  return 20;
}

/**
 * Returns formatted overs display string, e.g. "20 Ov" or "T20 (20 Overs)"
 */
export function getEffectiveMatchOversDisplay(
  match?: Partial<Match> | null,
  tournament?: Partial<Tournament> | null
): string {
  const overs = getEffectiveMatchOvers(match, tournament);
  return `${overs} Ov`;
}
