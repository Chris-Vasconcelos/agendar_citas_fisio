import { isLocalBackend } from '../lib/backendMode';
import { localCurrentUser, localSubscribe, localRestoreSession } from '../local/pocketbaseClient';
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(isLocalBackend || (isSupabaseConfigured && supabase)));
  const [authInitError, setAuthInitError] = useState('');

  useEffect(() => {
    if (isLocalBackend) {
      let active = true;
      const unsubscribe = localSubscribe((user) => {
        if (!active) return;
        setSession(user ? { user } : null);
        setAuthInitError('');
      });
      localRestoreSession().then(() => {
        if (active) setSession(localCurrentUser() ? { user: localCurrentUser() } : null);
      }).catch((error) => {
        if (active) setAuthInitError(error.message);
      }).finally(() => { if (active) setAuthLoading(false); });
      return () => { active = false; unsubscribe(); };
    }
    if (!isSupabaseConfigured || !supabase) { setAuthLoading(false); return; }
    let cancelled = false;
    let resolved = false;
    const finish = (nextSession, error = '') => {
      if (cancelled || resolved) return;
      resolved = true;
      setSession(nextSession);
      setAuthInitError(error);
      setAuthLoading(false);
    };
    const timeout = setTimeout(() => {
      finish(null, 'No se pudo comprobar la sesión. Comprueba tu conexión e inténtalo nuevamente.');
    }, 12000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      if (nextSession) setAuthInitError('');
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') finish(nextSession);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) finish(null, 'No se pudo recuperar tu sesión. Intenta iniciar sesión nuevamente.');
      else finish(data?.session ?? null);
    }).catch(() => finish(null, 'No se pudo comprobar la sesión. Comprueba tu conexión.'));
    return () => { cancelled = true; clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);
  return { session, authLoading, authInitError };
}
