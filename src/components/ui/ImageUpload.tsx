import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';

export interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  helperText?: string;
  aspectRatio?: 'square' | 'wide';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select image file or paste image URL',
  helperText = 'PNG, JPG, SVG or WEBP up to 5MB',
  aspectRatio = 'square',
}) => {
  const [useUrlMode, setUseUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    onChange(urlInput.trim());
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setUseUrlMode(!useUrlMode)}
          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
        >
          {useUrlMode ? <Upload className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
          <span>{useUrlMode ? 'Upload File' : 'Paste Image URL'}</span>
        </button>
      </div>

      {value ? (
        <div className="relative group rounded-xl border border-slate-700 bg-slate-900 overflow-hidden p-2 flex items-center gap-3">
          <div
            className={`relative shrink-0 overflow-hidden rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center ${
              aspectRatio === 'square' ? 'w-14 h-14' : 'w-24 h-14'
            }`}
          >
            <img src={value} alt="Preview" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Image Attached</p>
            <p className="text-[10px] text-slate-400 truncate">{value.substring(0, 45)}...</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : useUrlMode ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.png"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Set URL
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 hover:bg-slate-900/40 rounded-xl p-4 text-center cursor-pointer transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all">
            <ImageIcon className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-200">{placeholder}</p>
          <p className="text-[10px] text-slate-500 mt-1">{helperText}</p>
        </div>
      )}
    </div>
  );
};
