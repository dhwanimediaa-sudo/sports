import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { Trophy, User, LogOut, Key, ShieldCheck, Menu, X, Activity } from 'lucide-react';

export interface HeaderProps {
  onOpenProfile: () => void;
  onOpenChangePassword: () => void;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProfile,
  onOpenChangePassword,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
            <Trophy className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">SportsPulse</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Tournament Management & Broadcast Graphics</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>System Engine: <strong className="text-emerald-400">Online</strong></span>
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-100">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
                {user.name.slice(0, 2)}
              </div>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 overflow-hidden py-2 animate-fade-in">
                  <div className="px-4 py-3 border-b border-slate-800/80">
                    <p className="text-xs font-bold text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate font-mono mt-0.5">{user.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2 transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-emerald-400" />
                      Admin Profile
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenChangePassword();
                      }}
                      className="w-full px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2 transition-colors text-left"
                    >
                      <Key className="w-4 h-4 text-amber-400" />
                      Change Password
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
