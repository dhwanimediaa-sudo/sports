import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Loader2 className={`${sizes[size]} text-emerald-500 animate-spin`} />
    </div>
  );
};

export const FullPageSpinner: React.FC<{ label?: string }> = ({ label = 'Loading SportsPulse Engine...' }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
        <div className="absolute w-8 h-8 rounded-full bg-emerald-500/20 blur-sm" />
      </div>
      <h2 className="text-lg font-semibold text-slate-100 tracking-tight">{label}</h2>
      <p className="text-xs text-slate-400 mt-1">Initializing secure database & sports platform foundation</p>
    </div>
  );
};
