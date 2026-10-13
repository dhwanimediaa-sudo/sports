import React, { useState, useEffect } from 'react';
import { StudioGraphic, SportType } from '../../../types';
import { api } from '../../../services/api';
import { GraphicsLibrary } from './GraphicsLibrary';
import { GraphicEditor } from './GraphicEditor';
import { RefreshCw } from 'lucide-react';

export const GraphicsStudio: React.FC = () => {
  const [graphics, setGraphics] = useState<StudioGraphic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingGraphic, setEditingGraphic] = useState<StudioGraphic | null>(null);

  const loadGraphics = async () => {
    try {
      setLoading(true);
      const res = await api.getStudioGraphics();
      setGraphics(res.graphics || []);
    } catch (err) {
      console.error('Failed to load studio graphics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphics();
  }, []);

  const handleCreateNew = () => {
    const newBlankGraphic: StudioGraphic = {
      id: `graphic-${Date.now().toString(36)}`,
      name: 'New Custom Overlay',
      sport: 'CRICKET',
      category: 'Scorebug',
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: 'transparent',
      },
      positionPreset: 'BOTTOM_CENTER',
      animation: 'SLIDE_UP',
      transition: 'FADE_IN',
      animationDuration: 0.5,
      transitionDuration: 0.3,
      displayDuration: 0,
      status: 'ACTIVE',
      dynamicFields: [],
      elements: [
        {
          id: `el-${Date.now().toString(36)}-bg`,
          name: 'Main Backdrop',
          type: 'ROUNDED_RECTANGLE',
          x: 460,
          y: 840,
          width: 1000,
          height: 140,
          zIndex: 1,
          visible: true,
          locked: false,
          fillColor: '#0f172a',
          gradient: {
            enabled: true,
            type: 'linear',
            direction: 'to right',
            startColor: '#1e293b',
            endColor: '#0f172a',
          },
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: 20,
          boxShadow: { enabled: true, color: 'rgba(0,0,0,0.6)', blur: 20, spread: 2, x: 0, y: 8 },
        },
        {
          id: `el-${Date.now().toString(36)}-txt`,
          name: 'Title Text',
          type: 'TEXT',
          x: 480,
          y: 870,
          width: 960,
          height: 80,
          zIndex: 2,
          visible: true,
          locked: false,
          text: '{{MATCH_NAME}} • {{SCORE}}',
          fontFamily: 'Montserrat',
          fontSize: 36,
          fontWeight: '900',
          textColor: '#ffffff',
          textAlign: 'center',
          textShadow: { enabled: true, color: 'rgba(0,0,0,0.8)', blur: 8, x: 2, y: 2 },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingGraphic(newBlankGraphic);
  };

  if (editingGraphic) {
    return (
      <GraphicEditor
        initialGraphic={editingGraphic}
        allGraphics={graphics}
        onCreateNew={handleCreateNew}
        onBack={() => {
          setEditingGraphic(null);
          loadGraphics();
        }}
        onSaveSuccess={(saved) => {
          setEditingGraphic(saved);
          loadGraphics();
        }}
      />
    );
  }

  return (
    <GraphicsLibrary
      graphics={graphics}
      loading={loading}
      onRefresh={loadGraphics}
      onOpenEditor={(g) => setEditingGraphic(g)}
      onCreateNew={handleCreateNew}
    />
  );
};
export default GraphicsStudio;
