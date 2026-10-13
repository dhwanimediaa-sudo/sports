import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import {
  Team,
  Group,
  Tournament,
  ScannedPlayerItem,
  ScannedTeamInfo,
  SampleTeamSheetTemplate,
} from '../../../types';
import { api } from '../../../services/api';
import {
  Camera,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Plus,
  Trash2,
  Shield,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Phone,
  MapPin,
  ArrowRight,
  Info,
  Check,
  SwitchCamera,
  Eye,
  Edit2,
  Wand2,
} from 'lucide-react';

export interface TeamSheetScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentName?: string;
  sportHint?: string;
  defaultGroupId?: string;
  targetGroupId?: string;
  targetTeamId?: string;
  groups?: Group[];
  targetTeam?: Team | null; // If scanning for an existing team
  onImportSuccess: (result: { team: Team; playersCount: number }) => void;
}

type ScanMode = 'CAMERA' | 'UPLOAD' | 'SAMPLES';
type ImageFilter = 'NORMAL' | 'CONTRAST' | 'BW';

export const TeamSheetScannerModal: React.FC<TeamSheetScannerModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentName,
  sportHint = 'CRICKET',
  defaultGroupId,
  groups = [],
  targetTeam = null,
  onImportSuccess,
}) => {
  // Wizard Step: 1 = Image Capture / Upload, 2 = Review & Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Scan Mode
  const [scanMode, setScanMode] = useState<ScanMode>('UPLOAD');

  // Image & Camera State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imageFilter, setImageFilter] = useState<ImageFilter>('NORMAL');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Sample Sheets state
  const [sampleTemplates, setSampleTemplates] = useState<SampleTeamSheetTemplate[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  // OCR Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  // Extracted Data State (Step 2)
  const [importAsNewTeam, setImportAsNewTeam] = useState<boolean>(!targetTeam);
  const [assignedGroupId, setAssignedGroupId] = useState<string>(defaultGroupId || targetTeam?.groupId || '');
  const [teamInfo, setTeamInfo] = useState<ScannedTeamInfo>({
    name: targetTeam?.name || '',
    shortName: targetTeam?.shortName || '',
    code: targetTeam?.code || '',
    manager: targetTeam?.manager || '',
    captain: targetTeam?.captain || '',
    viceCaptain: targetTeam?.viceCaptain || '',
    homeLocation: targetTeam?.homeLocation || '',
    contact: targetTeam?.contact || '',
    teamColor: targetTeam?.teamColor || '#10b981',
    description: targetTeam?.description || '',
  });

  const [extractedPlayers, setExtractedPlayers] = useState<ScannedPlayerItem[]>([]);
  const [ocrProvider, setOcrProvider] = useState<string>('GEMINI_AI');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load sample templates on mount
  useEffect(() => {
    if (isOpen) {
      api
        .getSampleTeamSheets()
        .then((res) => {
          if (res.samples && res.samples.length > 0) {
            setSampleTemplates(res.samples);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setScanMode(targetTeam ? 'UPLOAD' : 'UPLOAD');
      setImagePreview(null);
      setImageRotation(0);
      setImageZoom(1);
      setImageFilter('NORMAL');
      setIsProcessing(false);
      setScanError(null);
      setSaveSuccessMessage(null);
      setImportAsNewTeam(!targetTeam);
      setAssignedGroupId(defaultGroupId || targetTeam?.groupId || '');
      setTeamInfo({
        name: targetTeam?.name || '',
        shortName: targetTeam?.shortName || '',
        code: targetTeam?.code || '',
        manager: targetTeam?.manager || '',
        captain: targetTeam?.captain || '',
        viceCaptain: targetTeam?.viceCaptain || '',
        homeLocation: targetTeam?.homeLocation || '',
        contact: targetTeam?.contact || '',
        teamColor: targetTeam?.teamColor || '#10b981',
        description: targetTeam?.description || '',
      });
      setExtractedPlayers([]);
    } else {
      stopCamera();
    }
  }, [isOpen, targetTeam, defaultGroupId]);

  // Camera start / stop management
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Live camera access is not supported by your browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);

      // Check available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoInputs);
    } catch (err: any) {
      console.error('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Unable to start camera stream. You can upload an image file instead.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Toggle camera active when mode changes
  useEffect(() => {
    if (isOpen && step === 1 && scanMode === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, step, scanMode, cameraFacingMode]);

  // Capture snapshot from live camera
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setImagePreview(dataUrl);
    stopCamera();
  };

  // Switch camera front/back
  const handleSwitchCamera = () => {
    setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImagePreview(event.target.result);
        setSelectedSampleId(null);
        setScanError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Select sample sheet
  const handleSelectSample = (sample: SampleTeamSheetTemplate) => {
    setSelectedSampleId(sample.id);
    setImagePreview(sample.previewUrl);
    setScanError(null);
  };

  // Trigger OCR scan
  const handleProcessScan = async () => {
    if (!imagePreview && !selectedSampleId) {
      setScanError('Please capture a photo, upload an image, or select a sample sheet first.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingProgress(25);
      setScanError(null);

      // Simulate step progress for visual polish
      const progressTimer = setInterval(() => {
        setProcessingProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 400);

      const res = await api.scanTeamSheet({
        imageBase64: selectedSampleId ? undefined : imagePreview || undefined,
        mimeType: 'image/jpeg',
        sportHint,
        sampleId: selectedSampleId || undefined,
        tournamentId,
        teamId: targetTeam?.id,
      });

      clearInterval(progressTimer);
      setProcessingProgress(100);

      // Populate extracted team info
      if (!targetTeam || importAsNewTeam) {
        setTeamInfo({
          name: res.teamInfo.name || '',
          shortName: res.teamInfo.shortName || '',
          code: res.teamInfo.code || res.teamInfo.shortName || '',
          manager: res.teamInfo.manager || '',
          captain: res.teamInfo.captain || '',
          viceCaptain: res.teamInfo.viceCaptain || '',
          homeLocation: res.teamInfo.homeLocation || '',
          contact: res.teamInfo.contact || '',
          teamColor: res.teamInfo.teamColor || '#10b981',
          description: res.teamInfo.description || 'Imported via Team Sheet Scan',
        });
      }

      setExtractedPlayers(
        res.players.map((p) => ({
          ...p,
          isSelected: true,
        }))
      );

      setOcrProvider(res.ocrProvider || 'GEMINI_AI');
      setWarnings(res.warnings || []);
      setStep(2);
    } catch (err: any) {
      console.error('Scan processing failed:', err);
      setScanError(err.message || 'Failed to analyze team sheet image. Please retry with a clearer photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Player row editing handlers
  const handleUpdatePlayer = (tempId: string, field: keyof ScannedPlayerItem, value: any) => {
    setExtractedPlayers((prev) =>
      prev.map((p) => {
        if (p.tempId !== tempId) return p;

        const updated = { ...p, [field]: value };

        // If toggling captain
        if (field === 'isCaptain' && value === true) {
          setTeamInfo((prevTeam) => ({ ...prevTeam, captain: updated.name }));
        }
        // If toggling vice captain
        if (field === 'isViceCaptain' && value === true) {
          setTeamInfo((prevTeam) => ({ ...prevTeam, viceCaptain: updated.name }));
        }

        return updated;
      })
    );
  };

  // Add new player row manually
  const handleAddManualPlayer = () => {
    const newJersey =
      extractedPlayers.length > 0
        ? Math.max(...extractedPlayers.map((p) => Number(p.jerseyNumber) || 0)) + 1
        : 1;

    const newPlayer: ScannedPlayerItem = {
      tempId: `manual-${Date.now()}`,
      jerseyNumber: newJersey,
      name: '',
      displayName: '',
      role: sportHint === 'CRICKET' ? 'Batsman' : sportHint === 'FOOTBALL' ? 'Forward' : 'Player',
      battingStyle: '',
      bowlingStyle: '',
      playingPosition: '',
      isCaptain: false,
      isViceCaptain: false,
      confidence: 'HIGH',
      confidenceScore: 1.0,
      isSelected: true,
      notes: 'Manually added',
    };

    setExtractedPlayers((prev) => [...prev, newPlayer]);
  };

  // Delete player row
  const handleDeletePlayer = (tempId: string) => {
    setExtractedPlayers((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  // Move player row up / down
  const handleMovePlayer = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= extractedPlayers.length) return;

    const updated = [...extractedPlayers];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setExtractedPlayers(updated);
  };

  // Auto-number missing jerseys
  const handleAutoNumberJerseys = () => {
    let nextNum = 1;
    const used = new Set(
      extractedPlayers
        .map((p) => Number(p.jerseyNumber))
        .filter((n) => !isNaN(n) && n > 0)
    );

    setExtractedPlayers((prev) =>
      prev.map((p) => {
        if (p.jerseyNumber && String(p.jerseyNumber).trim() !== '') return p;
        while (used.has(nextNum)) {
          nextNum++;
        }
        used.add(nextNum);
        return { ...p, jerseyNumber: nextNum };
      })
    );
  };

  // Toggle selection for all players
  const handleToggleSelectAll = (select: boolean) => {
    setExtractedPlayers((prev) => prev.map((p) => ({ ...p, isSelected: select })));
  };

  // Save & Confirm Import
  const handleConfirmImport = async () => {
    const selectedPlayers = extractedPlayers.filter((p) => p.isSelected && p.name.trim() !== '');

    if (selectedPlayers.length === 0) {
      setScanError('Please select at least one player with a valid name to import.');
      return;
    }

    if (importAsNewTeam && !teamInfo.name.trim()) {
      setScanError('Team Name is required.');
      return;
    }

    try {
      setIsSaving(true);
      setScanError(null);

      const payload = {
        tournamentId,
        groupId: assignedGroupId || undefined,
        teamId: importAsNewTeam ? undefined : targetTeam?.id,
        createNewTeam: importAsNewTeam,
        teamData: {
          name: teamInfo.name.trim(),
          shortName: teamInfo.shortName?.trim() || undefined,
          code: teamInfo.code?.trim() || undefined,
          manager: teamInfo.manager?.trim() || '',
          captain: teamInfo.captain?.trim() || '',
          viceCaptain: teamInfo.viceCaptain?.trim() || '',
          homeLocation: teamInfo.homeLocation?.trim() || '',
          contact: teamInfo.contact?.trim() || '',
          teamColor: teamInfo.teamColor || '#10b981',
          description: teamInfo.description?.trim() || 'Imported via Team Sheet Scan',
          groupId: assignedGroupId || undefined,
        },
        players: selectedPlayers.map((p) => ({
          name: p.name.trim(),
          displayName: p.displayName?.trim() || p.name.trim(),
          jerseyNumber: p.jerseyNumber !== undefined ? p.jerseyNumber : '',
          role: p.role?.trim() || 'Player',
          battingStyle: p.battingStyle?.trim() || '',
          bowlingStyle: p.bowlingStyle?.trim() || '',
          playingPosition: p.playingPosition?.trim() || '',
          isCaptain: Boolean(p.isCaptain),
          isViceCaptain: Boolean(p.isViceCaptain),
        })),
        updateExistingPlayers: true,
      };

      const res = await api.importTeamSheet(payload);

      setSaveSuccessMessage(`Successfully imported ${res.importedCount} players into ${res.team.name}!`);

      setTimeout(() => {
        onImportSuccess({ team: res.team, playersCount: res.importedCount });
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to import team sheet roster:', err);
      setScanError(err.message || 'Failed to save imported roster. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Sport-specific role presets
  const getRoleOptions = () => {
    switch (sportHint) {
      case 'FOOTBALL':
        return ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Striker', 'Winger', 'Substitute'];
      case 'VOLLEYBALL':
        return ['Setter', 'Attacker', 'Libero', 'Middle Blocker', 'Opposite Spiker', 'Outside Hitter', 'Universal'];
      case 'KABADDI':
        return ['Raider', 'Defender', 'All-Rounder', 'Right Corner', 'Left Corner', 'Cover'];
      case 'HOCKEY':
        return ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Fullback', 'Halfback'];
      case 'BASKETBALL':
        return ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'];
      case 'CRICKET':
      default:
        return ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper', 'Opening Batter', 'Pace Bowler', 'Spinner', 'Player'];
    }
  };

  // Filtered players in review step
  const filteredPlayers = extractedPlayers.filter((p) => {
    const matchesSearch =
      !searchFilter ||
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.displayName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      String(p.jerseyNumber || '').includes(searchFilter) ||
      p.role?.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const selectedCount = extractedPlayers.filter((p) => p.isSelected).length;
  const conflictCount = extractedPlayers.filter((p) => p.conflictType && p.conflictType !== 'NONE').length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">
              TEAM SHEET / PLAYER LIST IMAGE SCAN & AUTO IMPORT
            </h2>
            <p className="text-[11px] font-normal text-slate-400">
              {step === 1
                ? 'Capture a photo or upload a printed/handwritten team roster to extract squad data'
                : `Review & verify extracted roster for ${tournamentName || 'Tournament'}`}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-6xl"
    >
      <div className="space-y-5">
        {/* Step Progress Bar */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <div
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              step === 1 ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-900/60 flex items-center justify-center text-[11px]">
              1
            </span>
            <span>CAPTURE / UPLOAD IMAGE</span>
          </div>

          <div
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              step === 2 ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-900/60 flex items-center justify-center text-[11px]">
              2
            </span>
            <span>REVIEW & CONFIRM IMPORT</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {scanError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Scan Notice:</span>
              <p>{scanError}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {saveSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold text-sm">{saveSuccessMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: CAPTURE / UPLOAD / SAMPLE SELECTION */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setScanMode('UPLOAD');
                  setSelectedSampleId(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  scanMode === 'UPLOAD'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>UPLOAD IMAGE FILE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScanMode('CAMERA');
                  setSelectedSampleId(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  scanMode === 'CAMERA'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>TAKE CAMERA PHOTO</span>
              </button>

              <button
                type="button"
                onClick={() => setScanMode('SAMPLES')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  scanMode === 'SAMPLES'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>DEMO SAMPLES (1-CLICK)</span>
              </button>
            </div>

            {/* Sub-mode 1: File Upload */}
            {scanMode === 'UPLOAD' && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />

                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-10 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 hover:bg-slate-900/60 transition-all cursor-pointer text-center space-y-3 group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 group-hover:scale-105 group-hover:border-emerald-500/40 transition-transform">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        Click to select or drag & drop team sheet image
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                        Supports printed match protocol sheets, official squad rosters, or clear handwritten team lists (PNG, JPG, WEBP up to 10MB).
                      </p>
                    </div>
                    <Button variant="outline" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>
                      SELECT LOCAL FILE
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Image Ready for OCR Scan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                          icon={<RotateCw className="w-3.5 h-3.5" />}
                          title="Rotate 90 degrees"
                        >
                          Rotate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          icon={<Upload className="w-3.5 h-3.5" />}
                        >
                          Replace
                        </Button>
                      </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-[380px] flex items-center justify-center p-2">
                      <img
                        src={imagePreview}
                        alt="Team Sheet Preview"
                        style={{
                          transform: `rotate(${imageRotation}deg) scale(${imageZoom})`,
                          filter:
                            imageFilter === 'CONTRAST'
                              ? 'contrast(1.5) brightness(0.95)'
                              : imageFilter === 'BW'
                              ? 'grayscale(1) contrast(2)'
                              : 'none',
                        }}
                        className="max-h-[340px] max-w-full object-contain rounded transition-transform"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-mode 2: Live Camera */}
            {scanMode === 'CAMERA' && (
              <div className="space-y-4">
                {cameraError ? (
                  <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                    <h4 className="text-sm font-bold text-rose-200">{cameraError}</h4>
                    <p className="text-xs text-rose-300/80">
                      Switch to File Upload or select a Sample Sheet to test OCR extraction.
                    </p>
                    <Button variant="emerald" size="sm" onClick={() => setScanMode('UPLOAD')}>
                      SWITCH TO FILE UPLOAD
                    </Button>
                  </div>
                ) : !imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video max-h-[400px] flex items-center justify-center group">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder Alignment Grid */}
                    <div className="absolute inset-4 border-2 border-emerald-500/40 rounded-xl pointer-events-none grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-emerald-500/20" />
                      <div className="border-r border-b border-emerald-500/20" />
                      <div className="border-b border-emerald-500/20" />
                      <div className="border-r border-b border-emerald-500/20" />
                      <div className="border-r border-b border-emerald-500/20" />
                      <div className="border-b border-emerald-500/20" />
                      <div className="border-r border-emerald-500/20" />
                      <div className="border-r border-emerald-500/20" />
                      <div />
                    </div>

                    {/* Top Controls Overlay */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      {cameraDevices.length > 1 && (
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 backdrop-blur transition-all"
                          title="Switch Camera"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Bottom Shutter Overlay */}
                    <div className="absolute bottom-5 inset-x-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="w-16 h-16 rounded-full bg-white hover:bg-emerald-400 p-1.5 shadow-2xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center group"
                      >
                        <div className="w-full h-full rounded-full border-2 border-slate-900 bg-white group-hover:bg-emerald-400 transition-colors flex items-center justify-center">
                          <Camera className="w-6 h-6 text-slate-900" />
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Camera Photo Captured</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImagePreview(null);
                          startCamera();
                        }}
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Retake Photo
                      </Button>
                    </div>

                    <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-[380px] flex items-center justify-center p-2">
                      <img
                        src={imagePreview}
                        alt="Captured Team Sheet"
                        className="max-h-[340px] max-w-full object-contain rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-mode 3: Sample Templates */}
            {scanMode === 'SAMPLES' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Select a pre-configured official match sheet to test the automated optical recognition engine instantly:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {sampleTemplates.map((sample) => (
                    <div
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3.5 ${
                        selectedSampleId === sample.id
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-16 h-20 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                        <img
                          src={sample.previewUrl}
                          alt={sample.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-emerald-400">
                            {sample.sport} • {sample.sheetType}
                          </span>
                          {selectedSampleId === sample.id && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white line-clamp-1">{sample.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{sample.description}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Team: <strong className="text-slate-300">{sample.teamInfo.name}</strong> ({sample.players.length} players)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scanning Action Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>

              <Button
                variant="emerald"
                size="md"
                onClick={handleProcessScan}
                loading={isProcessing}
                disabled={!imagePreview && !selectedSampleId}
                icon={<Wand2 className="w-4 h-4" />}
                className="px-6"
              >
                {isProcessing
                  ? `ANALYZING SHEET (${processingProgress}%)...`
                  : 'SCAN & EXTRACT ROSTER'}
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: REVIEW, VERIFICATION & CONFLICT RESOLUTION */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Top OCR Quality & Conflict Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      Extracted {extractedPlayers.length} Players Successfully
                    </h3>
                    <Badge variant={ocrProvider === 'GEMINI_AI' ? 'emerald' : 'amber'}>
                      {ocrProvider === 'GEMINI_AI' ? 'Gemini 3.7 Vision OCR' : 'Optical Layout Engine'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Review and verify names, jersey numbers, and captaincy roles before saving to database.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  RE-SCAN IMAGE
                </Button>
              </div>
            </div>

            {/* Warnings Box if any */}
            {warnings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>OCR Accuracy Notices:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1 text-[11px]">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target Team & Metadata Section */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>TARGET TEAM SPECIFICATIONS</span>
                </div>

                {targetTeam && (
                  <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="teamMode"
                        checked={!importAsNewTeam}
                        onChange={() => setImportAsNewTeam(false)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Update Selected Team ({targetTeam.name})</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="teamMode"
                        checked={importAsNewTeam}
                        onChange={() => setImportAsNewTeam(true)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Create as New Franchise Team</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <Input
                  label="Team Name *"
                  value={teamInfo.name}
                  onChange={(e) => setTeamInfo({ ...teamInfo, name: e.target.value })}
                  placeholder="e.g. Kerala Warriors"
                  required
                />

                <Input
                  label="Short Name / Tag (3-4 Chars)"
                  value={teamInfo.shortName || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, shortName: e.target.value.toUpperCase() })}
                  placeholder="e.g. KWA"
                />

                <Input
                  label="Team Captain (C)"
                  value={teamInfo.captain || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, captain: e.target.value })}
                  placeholder="e.g. Sanju Samson"
                />

                <Input
                  label="Vice Captain (VC)"
                  value={teamInfo.viceCaptain || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, viceCaptain: e.target.value })}
                  placeholder="e.g. Sachin Baby"
                />

                <Input
                  label="Manager / Head Coach"
                  value={teamInfo.manager || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, manager: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                />

                <Input
                  label="Home Ground / City"
                  value={teamInfo.homeLocation || ''}
                  onChange={(e) => setTeamInfo({ ...teamInfo, homeLocation: e.target.value })}
                  placeholder="e.g. Kochi Stadium"
                />

                {groups.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Tournament Group
                    </label>
                    <select
                      value={assignedGroupId}
                      onChange={(e) => setAssignedGroupId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Unassigned Pool</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Franchise Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={teamInfo.teamColor || '#10b981'}
                      onChange={(e) => setTeamInfo({ ...teamInfo, teamColor: e.target.value })}
                      className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-1"
                    />
                    <span className="font-mono text-xs text-slate-300">{teamInfo.teamColor || '#10b981'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Players Review Table & Toolbar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    SQUAD PLAYERS VERIFICATION ({selectedCount} of {extractedPlayers.length} Selected)
                  </h3>
                </div>

                {/* Batch Tools */}
                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleSelectAll(selectedCount !== extractedPlayers.length)}
                    className="text-[11px]"
                  >
                    {selectedCount === extractedPlayers.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoNumberJerseys}
                    icon={<Wand2 className="w-3 h-3 text-emerald-400" />}
                    className="text-[11px]"
                  >
                    Auto-Fill Jerseys
                  </Button>
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={handleAddManualPlayer}
                    icon={<Plus className="w-3.5 h-3.5" />}
                    className="text-[11px]"
                  >
                    Add Player Row
                  </Button>
                </div>
              </div>

              {/* Table Filtering toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter extracted players by name, jersey, or role..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Roles</option>
                  {getRoleOptions().map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <div className="flex items-center justify-end gap-2 text-xs text-slate-400 font-mono">
                  <span>Confidence:</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> High
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Med
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Low
                  </span>
                </div>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Import</th>
                      <th className="py-2.5 px-2 w-14 text-center">Conf.</th>
                      <th className="py-2.5 px-2 w-16 text-center">Jersey</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Player Full Name *</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Playing Role</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Style / Position</th>
                      <th className="py-2.5 px-2 w-12 text-center">Capt (C)</th>
                      <th className="py-2.5 px-2 w-12 text-center">Vice (VC)</th>
                      <th className="py-2.5 px-2 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                          No players matching search filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((player, idx) => {
                        const isConflict = player.conflictType && player.conflictType !== 'NONE';

                        return (
                          <tr
                            key={player.tempId}
                            className={`hover:bg-slate-900/50 transition-colors ${
                              !player.isSelected ? 'opacity-40' : ''
                            } ${isConflict ? 'bg-amber-500/5' : ''}`}
                          >
                            {/* Checkbox */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(player.isSelected)}
                                onChange={(e) =>
                                  handleUpdatePlayer(player.tempId, 'isSelected', e.target.checked)
                                }
                                className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                              />
                            </td>

                            {/* Confidence Badge */}
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                  player.confidence === 'HIGH'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : player.confidence === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                                title={player.notes || `OCR Confidence: ${Math.round((player.confidenceScore || 0.8) * 100)}%`}
                              >
                                {player.confidence === 'HIGH' ? '98%' : player.confidence === 'MEDIUM' ? '85%' : '60%'}
                              </span>
                            </td>

                            {/* Jersey Number */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="text"
                                value={player.jerseyNumber !== undefined ? player.jerseyNumber : ''}
                                onChange={(e) =>
                                  handleUpdatePlayer(player.tempId, 'jerseyNumber', e.target.value)
                                }
                                placeholder="#"
                                className="w-12 text-center px-1 py-1 bg-slate-900 border border-slate-800 rounded font-mono font-bold text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                              />
                            </td>

                            {/* Full Name */}
                            <td className="py-2 px-3">
                              <div className="space-y-0.5">
                                <input
                                  type="text"
                                  value={player.name}
                                  onChange={(e) =>
                                    handleUpdatePlayer(player.tempId, 'name', e.target.value)
                                  }
                                  placeholder="Player Name"
                                  className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-semibold text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                                {player.notes && (
                                  <p className="text-[10px] text-amber-400/90 font-mono truncate max-w-xs">
                                    {player.notes}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Role Dropdown */}
                            <td className="py-2 px-3">
                              <select
                                value={player.role || 'Player'}
                                onChange={(e) =>
                                  handleUpdatePlayer(player.tempId, 'role', e.target.value)
                                }
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                              >
                                {getRoleOptions().map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Style / Position */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={player.battingStyle || player.playingPosition || ''}
                                onChange={(e) => {
                                  handleUpdatePlayer(player.tempId, 'battingStyle', e.target.value);
                                  handleUpdatePlayer(player.tempId, 'playingPosition', e.target.value);
                                }}
                                placeholder="Style / Position"
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                              />
                            </td>

                            {/* Captain (C) */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(player.isCaptain)}
                                onChange={(e) =>
                                  handleUpdatePlayer(player.tempId, 'isCaptain', e.target.checked)
                                }
                                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                              />
                            </td>

                            {/* Vice Captain (VC) */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(player.isViceCaptain)}
                                onChange={(e) =>
                                  handleUpdatePlayer(player.tempId, 'isViceCaptain', e.target.checked)
                                }
                                className="w-4 h-4 rounded text-blue-500 bg-slate-900 border-slate-700 focus:ring-blue-500"
                              />
                            </td>

                            {/* Row Actions */}
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMovePlayer(idx, 'UP')}
                                  disabled={idx === 0}
                                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMovePlayer(idx, 'DOWN')}
                                  disabled={idx === extractedPlayers.length - 1}
                                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePlayer(player.tempId)}
                                  className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                  title="Delete Player"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confirmation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setStep(1)} disabled={isSaving}>
                Back to Image
              </Button>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>

                <Button
                  variant="emerald"
                  size="md"
                  onClick={handleConfirmImport}
                  loading={isSaving}
                  disabled={selectedCount === 0}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  CONFIRM & IMPORT ({selectedCount} PLAYERS)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
