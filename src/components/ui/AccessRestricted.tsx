import React from 'react';
import { ShieldAlert, ArrowLeft, Swords, LayoutDashboard, Lock } from 'lucide-react';
import { Button } from './Button';

export interface AccessRestrictedProps {
  title?: string;
  reason?: string;
  actionRequired?: string;
  onGoBack?: () => void;
  onGoDashboard?: () => void;
  onGoMyMatches?: () => void;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  title = 'Access Restricted',
  reason = "You don't have permission to perform this action or access this resource.",
  actionRequired,
  onGoBack,
  onGoDashboard,
  onGoMyMatches,
}) => {
  return (
    <div className="min-h-[420px] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            403 Authorization Required
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            {reason}
          </p>
          {actionRequired && (
            <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 font-medium">
              {actionRequired}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {onGoBack && (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={onGoBack}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
          )}
          {onGoMyMatches && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Swords className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={onGoMyMatches}
              className="w-full sm:w-auto"
            >
              My Matches
            </Button>
          )}
          {onGoDashboard && (
            <Button
              variant="primary"
              size="sm"
              icon={<LayoutDashboard className="w-3.5 h-3.5 text-slate-950" />}
              onClick={onGoDashboard}
              className="w-full sm:w-auto"
            >
              Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
