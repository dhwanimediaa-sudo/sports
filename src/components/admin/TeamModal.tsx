import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ImageUpload } from '../ui/ImageUpload';
import { Team, Group, Player } from '../../types';
import { api } from '../../services/api';
import { Users, User, Shield, MapPin, Phone, CheckCircle2, AlertCircle, Camera, Sparkles, Plus, Trash2, Crown, Star } from 'lucide-react';

export interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  defaultGroupId?: string;
  groups?: Group[];
  team?: Team | null;
  onSuccess: (savedTeam: Team, isEdit: boolean) => void;
  onOpenScanner?: () => void;
  onAddPlayerToTeam?: (teamId: string) => void;
  onOpenTeamDetail?: (teamId: string) => void;
}

interface DraftPlayerItem {
  id?: string;
  name: string;
  jerseyNumber: string;
  role: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  defaultGroupId,
  groups = [],
  team,
  onSuccess,
  onOpenScanner,
  onAddPlayerToTeam,
  onOpenTeamDetail,
}) => {
  const isEdit = Boolean(team?.id);
  const [createdTeamData, setCreatedTeamData] = useState<Team | null>(null);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [groupId, setGroupId] = useState(defaultGroupId || '');
  const [logoUrl, setLogoUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [manager, setManager] = useState('');
  const [captain, setCaptain] = useState('');
  const [viceCaptain, setViceCaptain] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#10b981');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Inline Player Roster
  const [rosterPlayers, setRosterPlayers] = useState<DraftPlayerItem[]>([]);
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [batchPlayerText, setBatchPlayerText] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setShortName(team.shortName || '');
      setGroupId(team.groupId || defaultGroupId || '');
      setLogoUrl(team.logoUrl || '');
      setPhotoUrl(team.photoUrl || '');
      setManager(team.manager || '');
      setCaptain(team.captain || '');
      setViceCaptain(team.viceCaptain || '');
      setHomeLocation(team.homeLocation || '');
      setContact(team.contact || '');
      setDescription(team.description || '');
      setTeamColor(team.teamColor || '#10b981');
      setStatus(team.status || 'ACTIVE');
      setRosterPlayers([]);
    } else {
      setName('');
      setShortName('');
      setGroupId(defaultGroupId || '');
      setLogoUrl('');
      setPhotoUrl('');
      setManager('');
      setCaptain('');
      setViceCaptain('');
      setHomeLocation('');
      setContact('');
      setDescription('');
      setTeamColor('#10b981');
      setStatus('ACTIVE');
      setRosterPlayers([
        { name: '', jerseyNumber: '1', role: 'Player', isCaptain: true, isViceCaptain: false },
        { name: '', jerseyNumber: '2', role: 'Player', isCaptain: false, isViceCaptain: true },
      ]);
    }
    setShowBatchInput(false);
    setBatchPlayerText('');
    setCreatedTeamData(null);
    setError(null);
  }, [team, defaultGroupId, isOpen]);

  const handleAddPlayerRow = () => {
    const nextNum = rosterPlayers.length + 1;
    setRosterPlayers((prev) => [
      ...prev,
      { name: '', jerseyNumber: String(nextNum), role: 'Player', isCaptain: false, isViceCaptain: false },
    ]);
  };

  const handleRemovePlayerRow = (index: number) => {
    setRosterPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePlayerChange = (index: number, field: keyof DraftPlayerItem, value: any) => {
    setRosterPlayers((prev) => {
      const updated = [...prev];
      if (field === 'isCaptain' && value === true) {
        // Unset other captains
        updated.forEach((p, i) => {
          if (i !== index) p.isCaptain = false;
        });
        if (updated[index].name) setCaptain(updated[index].name);
      }
      if (field === 'isViceCaptain' && value === true) {
        // Unset other vice captains
        updated.forEach((p, i) => {
          if (i !== index) p.isViceCaptain = false;
        });
        if (updated[index].name) setViceCaptain(updated[index].name);
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleApplyBatchText = () => {
    if (!batchPlayerText.trim()) return;
    const lines = batchPlayerText.split('\n').filter((l) => l.trim().length > 0);
    const newItems: DraftPlayerItem[] = [];

    lines.forEach((line, idx) => {
      // Check pattern: "Virat Kohli #18 - Batsman" or "Rohit Sharma, 45"
      const matchJersey = line.match(/#?(\d+)/);
      const jersey = matchJersey ? matchJersey[1] : String(rosterPlayers.length + idx + 1);
      const cleanName = line.replace(/#?\d+/, '').replace(/[-–—,]/g, ' ').trim();

      if (cleanName) {
        newItems.push({
          name: cleanName,
          jerseyNumber: jersey,
          role: 'Player',
          isCaptain: idx === 0 && rosterPlayers.length === 0,
          isViceCaptain: idx === 1 && rosterPlayers.length === 0,
        });
      }
    });

    if (newItems.length > 0) {
      setRosterPlayers((prev) => [...prev.filter((p) => p.name.trim().length > 0), ...newItems]);
      setBatchPlayerText('');
      setShowBatchInput(false);
    }
  };

  const handleRequestClose = () => {
    if (createdTeamData) {
      setCreatedTeamData(null);
      onClose();
      return;
    }
    const isDirty = isEdit
      ? name !== (team?.name || '') ||
        shortName !== (team?.shortName || '') ||
        manager !== (team?.manager || '') ||
        captain !== (team?.captain || '')
      : Boolean(name.trim() || shortName.trim() || manager.trim() || rosterPlayers.length > 0);

    if (isDirty) {
      if (window.confirm('You have unsaved changes in this team form. Discard them?')) {
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
      setError('Team Name is required.');
      return;
    }

    try {
      setLoading(true);

      const validPlayers = rosterPlayers
        .filter((p) => p.name.trim().length > 0)
        .map((p) => ({
          name: p.name.trim(),
          jerseyNumber: p.jerseyNumber,
          role: p.role,
          isCaptain: p.isCaptain,
          isViceCaptain: p.isViceCaptain,
        }));

      const payload: Partial<Team> & { players?: any[] } = {
        tournamentId,
        groupId: groupId || undefined,
        name: name.trim(),
        shortName: shortName.trim(),
        logoUrl,
        photoUrl,
        manager: manager.trim(),
        captain: captain.trim(),
        viceCaptain: viceCaptain.trim(),
        homeLocation: homeLocation.trim(),
        contact: contact.trim(),
        description: description.trim(),
        teamColor,
        status,
        players: validPlayers.length > 0 ? (validPlayers as any) : undefined,
      };

      if (isEdit && team) {
        const res = await api.updateTeam(team.id, payload as any);
        onSuccess(res.team, true);
        onClose();
      } else {
        const res = await api.createTeam(payload as any);
        onSuccess(res.team, false);
        setCreatedTeamData(res.team);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save team.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleRequestClose}
      title={createdTeamData ? 'TEAM CREATED' : isEdit ? 'EDIT TEAM' : 'CREATE TEAM & ROSTER'}
      maxWidth="max-w-3xl"
    >
      {createdTeamData ? (
        <div className="text-center py-6 px-2 space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Team Created Successfully
            </span>
            <h2 className="text-2xl font-black text-white mt-2">
              {createdTeamData.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              The team has been added to your tournament. What would you like to do next?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => {
                const teamId = createdTeamData.id;
                setCreatedTeamData(null);
                onClose();
                if (onAddPlayerToTeam) onAddPlayerToTeam(teamId);
              }}
              className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex flex-col items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer group"
            >
              <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>+ ADD PLAYER</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCreatedTeamData(null);
                onClose();
                if (onOpenScanner) onOpenScanner();
              }}
              className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex flex-col items-center justify-center gap-2 shadow cursor-pointer group"
            >
              <Camera className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>SCAN TEAM SHEET</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const teamId = createdTeamData.id;
                setCreatedTeamData(null);
                onClose();
                if (onOpenTeamDetail) onOpenTeamDetail(teamId);
              }}
              className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex flex-col items-center justify-center gap-2 shadow cursor-pointer group"
            >
              <Users className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span>OPEN TEAM</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setCreatedTeamData(null);
                onClose();
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-400 underline transition-colors"
            >
              Done & Return to Tournament
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* Quick OCR Scan Shortcut Banner when creating new team */}
        {!isEdit && onOpenScanner && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Have a printed or handwritten team sheet?</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </p>
                <p className="text-[11px] text-slate-400">
                  Scan camera photo or upload image to auto-populate team & players with AI OCR.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap transition-colors shadow-sm shrink-0"
            >
              SCAN IMAGE
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Team Essentials */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Team Profile & Identity
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Team Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kerala Warriors"
              icon={<Users className="w-4 h-4" />}
              required
            />

            <Input
              label="Short Name / Tag (e.g. KWA)"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. KWA"
              icon={<Shield className="w-4 h-4" />}
            />

            {groups.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Assigned Group
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Unassigned / Main Pool</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code || 'Group'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              label="Manager / Head Coach"
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              icon={<User className="w-4 h-4" />}
            />

            <Input
              label="Team Captain"
              value={captain}
              onChange={(e) => setCaptain(e.target.value)}
              placeholder="e.g. Sanju Samson"
              icon={<User className="w-4 h-4" />}
            />

            <Input
              label="Vice Captain"
              value={viceCaptain}
              onChange={(e) => setViceCaptain(e.target.value)}
              placeholder="e.g. Sachin Baby"
              icon={<User className="w-4 h-4" />}
            />

            <Input
              label="Home City / Ground"
              value={homeLocation}
              onChange={(e) => setHomeLocation(e.target.value)}
              placeholder="e.g. Kochi Stadium"
              icon={<MapPin className="w-4 h-4" />}
            />

            <Input
              label="Manager Contact Phone"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="+91 9876543210"
              icon={<Phone className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUpload
              label="Team Logo"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="Upload emblem / logo"
            />

            <ImageUpload
              label="Squad Team Photo"
              value={photoUrl}
              onChange={setPhotoUrl}
              placeholder="Upload team group photo"
              aspectRatio="wide"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={teamColor}
                  onChange={(e) => setTeamColor(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-1"
                />
                <span className="font-mono text-xs text-slate-300">{teamColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Team Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ACTIVE">ACTIVE (In Tournament)</option>
                <option value="INACTIVE">INACTIVE / WITHDRAWN</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Team Description / Profile Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Franchise history, achievements, or squad summary..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Section 2: Immediate Squad / Player Addition */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> Add Squad Players (Immediate Roster)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Quickly add player names and jersey numbers during team creation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBatchInput(!showBatchInput)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
              >
                {showBatchInput ? 'Hide Bulk Paste' : 'Bulk Paste'}
              </button>
              <button
                type="button"
                onClick={handleAddPlayerRow}
                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-lg transition-colors border border-emerald-500/40 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Player
              </button>
            </div>
          </div>

          {/* Bulk Paste Box */}
          {showBatchInput && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 animate-in fade-in">
              <p className="text-[11px] text-slate-400">
                Paste one player per line (e.g. <code>Virat Kohli #18</code> or <code>Rohit Sharma</code>):
              </p>
              <textarea
                value={batchPlayerText}
                onChange={(e) => setBatchPlayerText(e.target.value)}
                rows={4}
                placeholder="Rohit Sharma #45&#10;Virat Kohli #18&#10;Jasprit Bumrah #93"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchInput(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchText}
                  className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
                >
                  Add Lines to Squad
                </button>
              </div>
            </div>
          )}

          {/* Player Rows */}
          {rosterPlayers.length === 0 ? (
            <div className="text-center py-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500">
              No players added yet. Click "+ Add Player" or "Bulk Paste" to add squad members now.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {rosterPlayers.map((player, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <span className="text-[11px] font-mono text-slate-500 w-5 text-center shrink-0">
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    placeholder="Player Name"
                    value={player.name}
                    onChange={(e) => handlePlayerChange(idx, 'name', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />

                  <input
                    type="text"
                    placeholder="#"
                    value={player.jerseyNumber}
                    onChange={(e) => handlePlayerChange(idx, 'jerseyNumber', e.target.value)}
                    className="w-14 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-center text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 shrink-0"
                  />

                  <select
                    value={player.role}
                    onChange={(e) => handlePlayerChange(idx, 'role', e.target.value)}
                    className="w-28 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 shrink-0"
                  >
                    <option value="Player">Player</option>
                    <option value="Captain">Captain</option>
                    <option value="Vice Captain">Vice Captain</option>
                    <option value="Wicket Keeper">Wicket Keeper</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="Raider">Raider</option>
                    <option value="Defender">Defender</option>
                    <option value="Forward">Forward</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Setter">Setter</option>
                    <option value="Libero">Libero</option>
                    <option value="Guard">Guard</option>
                  </select>

                  <button
                    type="button"
                    title={player.isCaptain ? 'Captain' : 'Make Captain'}
                    onClick={() => handlePlayerChange(idx, 'isCaptain', !player.isCaptain)}
                    className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                      player.isCaptain
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-500 hover:text-amber-400 bg-slate-900'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    title={player.isViceCaptain ? 'Vice Captain' : 'Make Vice Captain'}
                    onClick={() => handlePlayerChange(idx, 'isViceCaptain', !player.isViceCaptain)}
                    className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                      player.isViceCaptain
                        ? 'bg-blue-500 text-white font-bold'
                        : 'text-slate-500 hover:text-blue-400 bg-slate-900'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemovePlayerRow(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-900 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            {isEdit ? 'SAVE CHANGES' : 'SAVE TEAM & SQUAD'}
          </Button>
        </div>
      </form>
      )}
    </Dialog>
  );
};
