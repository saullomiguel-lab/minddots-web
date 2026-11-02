import React from 'react';
import AuthModal from './AuthModal';
import ForcePasswordChangeModal from './ForcePasswordChangeModal';
import AdminPanel from './AdminPanel';
import TeamPanel from './TeamPanel';
import MapsManagerModal from './MapsManagerModal';

export default function AppModals({
  user,
  profile,
  isAuthOpen,
  setIsAuthOpen,
  isAdminOpen,
  setIsAdminOpen,
  isTeamOpen,
  setIsTeamOpen,
  isMapsOpen,
  setIsMapsOpen,
  onSelectMap,
  loadUserProfile
}) {
  return (
    <>
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => user && setIsAuthOpen(false)}
        onAuthSuccess={() => setIsAuthOpen(false)}
      />

      <ForcePasswordChangeModal
        isOpen={Boolean(profile?.must_change_password)}
        userId={user?.id}
        onSuccess={() => loadUserProfile(user?.id)}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onSelectMap={onSelectMap}
      />

      <TeamPanel
        isOpen={isTeamOpen}
        onClose={() => setIsTeamOpen(false)}
        profile={profile}
        onProfileUpdate={() => loadUserProfile(user?.id)}
      />

      <MapsManagerModal
        isOpen={isMapsOpen}
        onClose={() => setIsMapsOpen(false)}
        onSelectMap={onSelectMap}
        userId={user?.id}
      />
    </>
  );
}
