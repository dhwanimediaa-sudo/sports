import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Player, Team, Tournament } from '../../types';
import { SPORTS_MASTER } from '../../constants/sports';
import { User, Shield, Hash, Award, MapPin, Calendar, Activity, Edit3, Trash2 } from 'lucide-react';

export interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  team?: Team | null;
  tournament?: Tournament | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  isOpen,
  onClose,
  player,
  team,
  tournament,
  onEdit,
  onDelete,
}) => {
  if (!player) return null;

  const sportConfig = tournament?.sport ? SPORTS_MASTER[tournament.sport] : SPORTS_MASTER.CRICKET;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="PLAYER PROFILE" maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Header Card */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="w-20 h-20 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-500">
            {player.photoUrl ? (
              <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-slate-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="text-lg font-black text-white tracking-tight">{player.name}</h3>
              {player.isCaptain && <Badge variant="amber">Captain (C)</Badge>}
              {player.isViceCaptain && <Badge variant="blue">Vice Captain (VC)</Badge>}
            </div>

            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span>{sportConfig?.icon || '🥇'}</span>
              <span>{player.role || 'Player'}</span>
              {player.jerseyNumber && (
                <span className="font-mono text-slate-400">· Jersey #{player.jerseyNumber}</span>
              )}
            </p>

            {team && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>{team.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Detailed Attribute Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Playing Style</span>
            <p className="font-semibold text-slate-200 mt-0.5">{player.battingStyle || player.playingPosition || 'Standard'}</p>
          </div>

          {player.bowlingStyle && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Bowling Style</span>
              <p className="font-semibold text-slate-200 mt-0.5">{player.bowlingStyle}</p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Status</span>
            <p className="font-semibold text-emerald-400 mt-0.5">{player.status || 'ACTIVE'}</p>
          </div>

          {player.countryState && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Region</span>
              <p className="font-semibold text-slate-200 mt-0.5">{player.countryState}</p>
            </div>
          )}

          {player.dob && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase">DOB</span>
              <p className="font-semibold text-slate-200 mt-0.5">{player.dob}</p>
            </div>
          )}

          {player.playerId && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Player ID</span>
              <p className="font-mono text-slate-200 mt-0.5">{player.playerId}</p>
            </div>
          )}
        </div>

        {/* Career Stats Foundation */}
        {player.records && Object.keys(player.records).length > 0 && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Career Records
            </h4>
            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              {player.records.matchesPlayed !== undefined && (
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-base font-bold text-white">{player.records.matchesPlayed}</div>
                  <div className="text-[10px] text-slate-500">Matches</div>
                </div>
              )}
              {player.records.runsScored !== undefined && (
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-base font-bold text-emerald-400">{player.records.runsScored}</div>
                  <div className="text-[10px] text-slate-500">Runs</div>
                </div>
              )}
              {player.records.wicketsTaken !== undefined && (
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-base font-bold text-purple-400">{player.records.wicketsTaken}</div>
                  <div className="text-[10px] text-slate-500">Wickets</div>
                </div>
              )}
              {player.records.goalsScored !== undefined && (
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-base font-bold text-emerald-400">{player.records.goalsScored}</div>
                  <div className="text-[10px] text-slate-500">Goals</div>
                </div>
              )}
              {player.records.pointsScored !== undefined && (
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-base font-bold text-amber-400">{player.records.pointsScored}</div>
                  <div className="text-[10px] text-slate-500">Points</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete
              </Button>
            )}

            {onEdit && (
              <Button
                variant="emerald"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                icon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Edit Player
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
