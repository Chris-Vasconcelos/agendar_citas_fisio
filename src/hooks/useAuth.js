import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(isSupabaseConfigured && supabase));
  const [authInitError, setAuthInitError] = useState('');

  useEffect(() => {
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
