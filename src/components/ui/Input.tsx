import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  icon,
  className = '',
  id,
  ...props
}) => {
  const effectiveLeftIcon = leftIcon || icon;
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {effectiveLeftIcon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
            {effectiveLeftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-slate-900/90 border ${
            error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700/80 focus:border-emerald-500 focus:ring-emerald-500/20'
          } rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
            effectiveLeftIcon ? 'pl-10' : ''
          } ${rightIcon ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-rose-400 font-medium flex items-center gap-1 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
