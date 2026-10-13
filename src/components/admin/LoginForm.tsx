import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { Trophy, Mail, Lock, Eye, EyeOff, ShieldCheck, Info, AlertTriangle } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const LoginForm: React.FC = () => {
  const { login, loading, error, clearError } = useAuth();
  const [username, setUsername] = useState('admin@sportspulse.com');
  const [password, setPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username.trim() || !password.trim()) {
      setLocalError('Please enter both Username/Email and Password.');
      return;
    }

    try {
      await login(username.trim(), password);
    } catch {
      // Error handled by AuthContext
    }
  };

  const handleFillDemo = () => {
    setUsername('admin@sportspulse.com');
    setPassword('Admin@123456');
    setLocalError(null);
    clearError();
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-950/60 border border-emerald-400/30 mb-4">
            <Trophy className="w-7 h-7 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SportsPulse Admin</h1>
          <p className="text-xs text-slate-400 mt-1">Tournament Management & Broadcast Graphics Control</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">System Sign In</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Admin Gateway
            </span>
          </div>

          {activeError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{activeError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username / Email"
              type="text"
              placeholder="admin@sportspulse.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="username"
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-white p-1 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="emerald"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              Sign In to Admin Console
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 bg-slate-950/50 -mx-6 -mb-6 p-4 rounded-b-2xl">
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Initial System Setup Seed</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Username: <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">admin@sportspulse.com</code>
                  <br />
                  Password: <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">Admin@123456</code>
                </p>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="mt-2 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  Auto-fill seed credentials
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6">
          SportsPulse Platform Engine &copy; 2026. VPS & Broadcast Domain Ready.
        </p>
      </div>
    </div>
  );
};
