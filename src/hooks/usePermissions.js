// src/hooks/usePermissions.js
// Usage: const { canEdit } = usePermissions();
// superAdmin → canEdit = true
// admin      → canEdit = false (view only)

import { useAuth } from './useAuth';

export function usePermissions() {
  const { userProfile } = useAuth();
  const role = userProfile?.role;
  const isSuperAdmin = role === 'superAdmin';
  const isAdmin      = role === 'admin' || isSuperAdmin;

  return {
    canEdit:       isSuperAdmin,   // create / update / delete / approve
    isSuperAdmin,
    isAdmin,
    role,
  };
}