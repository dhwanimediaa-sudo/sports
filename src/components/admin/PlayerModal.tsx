import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ImageUpload } from '../ui/ImageUpload';
import { Player, SportType, PlayerRecords } from '../../types';
import { SPORTS_MASTER } from '../../constants/sports';
import { api } from '../../services/api';
import {
  User,
  Hash,
  Shield,
  Award,
  Activity,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Phone,
  Globe,
} from 'lucide-react';

export interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  tournamentId?: string;
  groupId?: string;
  sport?: SportType;
  player?: Player | null;
  onSuccess: (savedPlayer: Player, isEdit: boolean) => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  isOpen,
  onClose,
  teamId,
  tournamentId,
  groupId,
  sport = 'CRICKET',
  player,
  onSuccess,
}) => {
  const isEdit = Boolean(player?.id);
  const sportConfig = SPORTS_MASTER[sport] || SPORTS_MASTER.OTHER;

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [dob, setDob] = useState('');
  const [role, setRole] = useState(sportConfig.roles[0] || 'Player');
  const [battingStyle, setBattingStyle] = useState('Right-hand Bat');
  const [bowlingStyle, setBowlingStyle] = useState('Right-arm Fast');
  const [bowlingType, setBowlingType] = useState('Pacer');
  const [playingPosition, setPlayingPosition] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isViceCaptain, setIsViceCaptain] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [countryState, setCountryState] = useState('');
  const [contact, setContact] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'INJURED'>('ACTIVE');

  // Stats Foundation
  const [matchesPlayed, setMatchesPlayed] = useState('');
  const [runsScored, setRunsScored] = useState('');
  const [wicketsTaken, setWicketsTaken] = useState('');
  const [goalsScored, setGoalsScored] = useState('');
  const [pointsScored, setPointsScored] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setName(player.name || '');
      setDisplayName(player.displayName || player.name || '');
      setPhotoUrl(player.photoUrl || '');
      setJerseyNumber(player.jerseyNumber?.toString() || '');
      setPlayerId(player.playerId || '');
      setDob(player.dob || '');
      setRole(player.role || sportConfig.roles[0] || 'Player');
      setBattingStyle(player.battingStyle || 'Right-hand Bat');
      setBowlingStyle(player.bowlingStyle || 'Right-arm Fast');
      setBowlingType(player.bowlingType || 'Pacer');
      setPlayingPosition(player.playingPosition || '');
      setIsCaptain(Boolean(player.isCaptain));
      setIsViceCaptain(Boolean(player.isViceCaptain));
      setHeight(player.height || '');
      setWeight(player.weight || '');
      setCountryState(player.countryState || '');
      setContact(player.contact || '');
      setBio(player.bio || '');
      setStatus(player.status || 'ACTIVE');

      const recs = player.records || {};
      setMatchesPlayed(recs.matchesPlayed?.toString() || '');
      setRunsScored(recs.runsScored?.toString() || '');
      setWicketsTaken(recs.wicketsTaken?.toString() || '');
      setGoalsScored(recs.goalsScored?.toString() || '');
      setPointsScored(recs.pointsScored?.toString() || '');
    } else {
      setName('');
      setDisplayName('');
      setPhotoUrl('');
      setJerseyNumber('');
      setPlayerId('');
      setDob('');
      setRole(sportConfig.roles[0] || 'Player');
      setBattingStyle(sportConfig.battingStyles?.[0] || 'Right-hand Bat');
      setBowlingStyle(sportConfig.bowlingStyles?.[0] || 'Right-arm Fast');
      setBowlingType(sportConfig.bowlingTypes?.[0] || 'Pacer');
      setPlayingPosition(sportConfig.positions?.[0] || '');
      setIsCaptain(false);
      setIsViceCaptain(false);
      setHeight('');
      setWeight('');
      setCountryState('');
      setContact('');
      setBio('');
      setStatus('ACTIVE');

      setMatchesPlayed('');
      setRunsScored('');
      setWicketsTaken('');
      setGoalsScored('');
      setPointsScored('');
    }
    setError(null);
  }, [player, sport, isOpen]);

  const handleRequestClose = () => {
    const isDirty = isEdit
      ? name !== (player?.name || '') ||
        jerseyNumber !== (player?.jerseyNumber?.toString() || '') ||
        role !== (player?.role || '')
      : Boolean(name.trim() || jerseyNumber.trim() || photoUrl.trim());

    if (isDirty) {
      if (window.confirm('You have unsaved changes in this player profile. Discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Player Name is required.');
      return;
    }

    try {
      setLoading(true);

      const recordsPayload: PlayerRecords = {
        matchesPlayed: matchesPlayed ? Number(matchesPlayed) : undefined,
        runsScored: runsScored ? Number(runsScored) : undefined,
        wicketsTaken: wicketsTaken ? Number(wicketsTaken) : undefined,
        goalsScored: goalsScored ? Number(goalsScored) : undefined,
        pointsScored: pointsScored ? Number(pointsScored) : undefined,
      };

      const payload: Partial<Player> = {
        teamId,
        tournamentId,
        groupId,
        name: name.trim(),
        displayName: displayName.trim() || name.trim(),
        photoUrl,
        jerseyNumber: jerseyNumber !== '' ? Number(jerseyNumber) || jerseyNumber : '',
        playerId: playerId.trim(),
        dob,
        role: role.trim(),
        battingStyle: sport === 'CRICKET' ? battingStyle : undefined,
        bowlingStyle: sport === 'CRICKET' ? bowlingStyle : undefined,
        bowlingType: sport === 'CRICKET' ? bowlingType : undefined,
        playingPosition: playingPosition || role,
        isCaptain,
        isViceCaptain,
        height: height.trim(),
        weight: weight.trim(),
        countryState: countryState.trim(),
        contact: contact.trim(),
        bio: bio.trim(),
        status,
        records: recordsPayload,
      };

      if (isEdit && player) {
        const res = await api.updatePlayer(player.id, payload);
        onSuccess(res.player, true);
      } else {
        const res = await api.createPlayer(payload);
        onSuccess(res.player, false);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save player.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleRequestClose}
      title={isEdit ? `EDIT PLAYER (${sportConfig.name})` : `ADD PLAYER (${sportConfig.name})`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span>{sportConfig.icon}</span>
          <span>Adaptive Form for {sportConfig.name} Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Player Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            icon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Display / Jersey Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. R. Sharma"
            icon={<User className="w-4 h-4" />}
          />

          <Input
            label="Jersey Number"
            type="number"
            min="0"
            max="999"
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            placeholder="e.g. 18"
            icon={<Hash className="w-4 h-4" />}
          />

          <Input
            label="Player License / ID Code"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            placeholder="e.g. IND-2026-904"
            icon={<Shield className="w-4 h-4" />}
          />

          {/* Dynamic Sport-Specific Roles */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {sportConfig.name} Playing Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {sportConfig.roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Cricket Specific Fields */}
          {sport === 'CRICKET' && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Batting Style
                </label>
                <select
                  value={battingStyle}
                  onChange={(e) => setBattingStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {sportConfig.battingStyles?.map((bs) => (
                    <option key={bs} value={bs}>
                      {bs}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Bowling Style
                </label>
                <select
                  value={bowlingStyle}
                  onChange={(e) => setBowlingStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {sportConfig.bowlingStyles?.map((bw) => (
                    <option key={bw} value={bw}>
                      {bw}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Dynamic Playing Position for other sports */}
          {sport !== 'CRICKET' && sportConfig.positions && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Court / Pitch Position
              </label>
              <select
                value={playingPosition}
                onChange={(e) => setPlayingPosition(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                {sportConfig.positions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Date of Birth"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />

          <Input
            label="State / Country"
            value={countryState}
            onChange={(e) => setCountryState(e.target.value)}
            placeholder="e.g. Kerala, India"
            icon={<Globe className="w-4 h-4" />}
          />

          <Input
            label="Contact Phone"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="+91 9876543210"
            icon={<Phone className="w-4 h-4" />}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Player Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ACTIVE">ACTIVE (Available)</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="INJURED">INJURED (Medical Bench)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <ImageUpload
            label="Player Photo"
            value={photoUrl}
            onChange={setPhotoUrl}
            placeholder="Upload headshot portrait"
          />

          <div className="space-y-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Leadership Designations
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={isCaptain}
                onChange={(e) => {
                  setIsCaptain(e.target.checked);
                  if (e.target.checked) setIsViceCaptain(false);
                }}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <Award className="w-4 h-4 text-amber-400" />
              <span>Designate as Team Captain (C)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={isViceCaptain}
                onChange={(e) => {
                  setIsViceCaptain(e.target.checked);
                  if (e.target.checked) setIsCaptain(false);
                }}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <Award className="w-4 h-4 text-blue-400" />
              <span>Designate as Vice Captain (VC)</span>
            </label>
          </div>
        </div>

        {/* Optional Records / Career Stats Foundation */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Optional Career Records / Stats Foundation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Matches Played"
              type="number"
              value={matchesPlayed}
              onChange={(e) => setMatchesPlayed(e.target.value)}
              placeholder="0"
            />
            {sport === 'CRICKET' ? (
              <>
                <Input
                  label="Career Runs"
                  type="number"
                  value={runsScored}
                  onChange={(e) => setRunsScored(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Wickets Taken"
                  type="number"
                  value={wicketsTaken}
                  onChange={(e) => setWicketsTaken(e.target.value)}
                  placeholder="0"
                />
              </>
            ) : sport === 'FOOTBALL' || sport === 'HOCKEY' ? (
              <Input
                label="Career Goals"
                type="number"
                value={goalsScored}
                onChange={(e) => setGoalsScored(e.target.value)}
                placeholder="0"
              />
            ) : (
              <Input
                label="Total Points"
                type="number"
                value={pointsScored}
                onChange={(e) => setPointsScored(e.target.value)}
                placeholder="0"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={handleRequestClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="emerald"
            size="sm"
            type="submit"
            loading={loading}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isEdit ? 'SAVE CHANGES' : 'SAVE PLAYER'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
