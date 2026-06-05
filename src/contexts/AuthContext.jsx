// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/config';

const AuthContext = createContext({});
export { AuthContext };

/* ── snake_case DB row → camelCase profile ── */
function normalizeProfile(row) {
  if (!row) return null;
  return {
    uid: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    profileImage: row.profile_image ?? null,
    createdAt: row.created_at,
  };
}

function normalizeUser(user) {
  if (!user) return null;
  return { ...user, uid: user.id };
}

function authErrorMessage(error) {
  const msg = error?.message?.toLowerCase() ?? '';
  if (msg.includes('invalid login') || msg.includes('invalid email or password'))
    return { code: 'auth/invalid-credential' };
  if (msg.includes('already registered') || msg.includes('already in use'))
    return { code: 'auth/email-already-in-use' };
  if (msg.includes('password'))
    return { code: 'auth/weak-password' };
  if (msg.includes('rate limit') || msg.includes('too many'))
    return { code: 'auth/too-many-requests' };
  return { code: 'auth/unknown', message: error?.message ?? 'Something went wrong.' };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(uid) {
    try {
      const { data, error } = await supabase
        .from('users').select('*').eq('id', uid).single();
      if (error) throw error;
      const profile = normalizeProfile(data);
      setUserProfile(profile);
      return profile;
    } catch (err) {
      console.error('fetchUserProfile:', err.message);
      return null;
    }
  }

  async function register(email, password, fullName, phone) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      const mapped = authErrorMessage(error);
      throw { code: mapped.code, message: mapped.message ?? error.message };
    }
    return data;
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const mapped = authErrorMessage(error);
      throw { code: mapped.code, message: mapped.message ?? error.message };
    }
    return data;
  }

  async function logout() {
    setUserProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const user = session?.user ?? null;
        setCurrentUser(normalizeUser(user));
        if (!user) setUserProfile(null);
        if (user) fetchUserProfile(user.id).catch(console.error);
      } catch (err) {
        console.error('initializeAuth:', err?.message || err);
        if (!mounted) return;
        setCurrentUser(null);
        setUserProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        try {
          const user = session?.user ?? null;
          setCurrentUser(normalizeUser(user));
          if (user) {
            fetchUserProfile(user.id).catch(console.error);
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error('onAuthStateChange:', err?.message || err);
          setUserProfile(null);
        }
      }
    );

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Simplified: only admin vs user distinction
  const isAdmin = userProfile?.role === 'admin';
  const isUser = userProfile?.role === 'user';

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, loading,
      isAdmin, isUser,
      register, login, logout, resetPassword, fetchUserProfile,
    }}>
      {loading ? (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <span>Loading...</span>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}