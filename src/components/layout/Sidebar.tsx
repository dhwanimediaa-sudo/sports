import React from 'react';
import { useAuth } from '../../services/authContext';
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCheck,
  Swords,
  Radio,
  FileBarChart,
  Palette,
  Tv,
  UserCog,
  Settings,
  ChevronRight,
  Lock,
  Sparkles,
  Gavel,
  Shield,
} from 'lucide-react';

export interface SidebarProps {
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: isAdmin ? 'ADMIN DASHBOARD' : 'MY DASHBOARD',
      icon: <LayoutDashboard className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'tournaments',
      label: isAdmin ? 'ALL TOURNAMENTS' : 'MY TOURNAMENTS',
      icon: <Trophy className="w-4 h-4 text-amber-400" />,
      enabled: true,
    },
    {
      id: 'matches',
      label: isAdmin ? 'ALL MATCHES' : 'MY MATCHES & ASSIGNMENTS',
      icon: <Swords className="w-4 h-4 text-emerald-400" />,
      enabled: true,
    },
    {
      id: 'auction-center',
      label: 'AUCTION CENTER',
      icon: <Gavel className="w-4 h-4 text-emerald-400" />,
      enabled: true,
      badge: 'PRO',
    },
    {
      id: 'teams',
      label: 'TEAMS',
      icon: <Users className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'players',
      label: 'PLAYERS',
      icon: <UserCheck className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'graphics-studio',
      label: 'GRAPHICS STUDIO',
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
      enabled: true,
      badge: 'PRO',
    },
    {
      id: 'graphics',
      label: 'GRAPHICS & OVERLAYS',
      icon: <Palette className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'broadcast',
      label: 'BROADCAST ENGINE',
      icon: <Tv className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'reports',
      label: 'REPORTS & SCORECARDS',
      icon: <FileBarChart className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'users',
      label: 'USERS MANAGEMENT',
      icon: <UserCog className="w-4 h-4" />,
      enabled: isAdmin,
      badge: !isAdmin ? 'Admin Only' : undefined,
    },
    {
      id: 'settings',
      label: 'SETTINGS',
      icon: <Settings className="w-4 h-4" />,
      enabled: false,
      badge: 'Next Module',
    },
  ];

  const handleNavClick = (item: NavItem) => {
    if (!item.enabled) return;
    onSelectSection(item.id);
    onCloseMobile();
  };

  const content = (
    <div className="h-full flex flex-col justify-between bg-slate-950 border-r border-slate-800/80 w-64 p-4 text-slate-300 select-none">
      <div>
        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          Platform Navigation
        </div>
        <nav className="space-y-1">
          {navItems
            .filter((item) => (item.id === 'users' ? isAdmin : true))
            .map((item) => {
              const isActive = activeSection === item.id;
              return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                disabled={!item.enabled}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/20'
                    : item.enabled
                    ? 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                    : 'text-slate-600 cursor-not-allowed opacity-60 bg-slate-900/30 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-emerald-400' : item.enabled ? 'text-slate-400' : 'text-slate-600'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.enabled ? (
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'rotate-90 text-emerald-400' : 'text-slate-600'}`} />
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-md bg-slate-900 text-slate-500 border border-slate-800">
                    <Lock className="w-2.5 h-2.5" />
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl mt-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200 truncate">{user?.name || 'Authorized User'}</span>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            {user?.role || 'USER'}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 truncate font-mono">
          {user?.email}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden lg:block shrink-0 h-[calc(100vh-61px)] sticky top-[61px]">{content}</aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative z-10 w-64 h-full animate-slide-right">{content}</div>
        </div>
      )}
    </>
  );
};
