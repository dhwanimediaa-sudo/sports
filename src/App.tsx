/**
 * SportsPulse - Main Application Container
 */
import React from 'react';
import { AuthProvider, useAuth } from './services/authContext';
import { LoginForm } from './components/admin/LoginForm';
import { Layout } from './components/layout/Layout';
import { FullPageSpinner } from './components/ui/LoadingState';
import { BroadcastCanvas } from './components/broadcast/BroadcastCanvas';
import { TournamentBroadcastCanvas } from './components/broadcast/TournamentBroadcastCanvas';
import { PublicTournamentLiveView } from './components/broadcast/PublicTournamentLiveView';
import { PublicAuctionLiveView } from './components/admin/auction/PublicAuctionLiveView';

const AppContent: React.FC = () => {
  // Check if current URL is a standalone broadcast canvas output URL or public auction stream
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  if (pathname.startsWith('/broadcast/match/')) {
    const matchId = pathname.split('/broadcast/match/')[1]?.split('?')[0]?.split('/')[0];
    return <BroadcastCanvas matchId={matchId} />;
  }

  if (pathname.startsWith('/overlay/') || pathname.startsWith('/broadcast-view/')) {
    if (pathname.includes('/tournament/')) {
      const tournamentId = pathname.split('/tournament/')[1]?.split('?')[0]?.split('/')[0];
      return <TournamentBroadcastCanvas tournamentId={tournamentId} />;
    }
    const matchId = pathname.split(/\/overlay\/|\/broadcast-view\//)[1]?.replace(/^match\//, '')?.split('?')[0]?.split('/')[0];
    return <BroadcastCanvas matchId={matchId} />;
  }

  if (pathname.startsWith('/broadcast/tournament/')) {
    const tournamentId = pathname.split('/broadcast/tournament/')[1]?.split('?')[0]?.split('/')[0];
    return <TournamentBroadcastCanvas tournamentId={tournamentId} />;
  }

  if (pathname.startsWith('/tournament-live')) {
    return <PublicTournamentLiveView />;
  }

  if (pathname.startsWith('/auction-live')) {
    return <PublicAuctionLiveView />;
  }

  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner label="Connecting to SportsPulse Engine..." />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return <Layout />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
