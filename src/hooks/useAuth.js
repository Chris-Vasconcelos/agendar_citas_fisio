import { useState, useEffect } from 'react';
import { localCurrentUser, localSessionEpoch, localSubscribe, localRestoreSession, localSessionState, localCheckSession, localTouchSession, localStorageChanged } from '../local/pocketbaseClient';

export function useAuth() {
  const [identity, setIdentity] = useState(() => ({ session: null, generation: localSessionEpoch(), locked: false }));
  const [authLoading, setAuthLoading] = useState(true);
  const [authInitError, setAuthInitError] = useState('');

  useEffect(() => {
    let active = true;
    const acceptUser = (user) => {
      if (!active) return;
      setIdentity((previous) => {
        // A sign-in attempt clears the client while it is already signed out.
        // Keep that form mounted so a rejected password can still show its error.
        if (!user && !previous.session) return previous;
        return { session: user ? { user } : null, generation: localSessionEpoch(), ...localSessionState() };
      });
      setAuthInitError('');
    };
    const unsubscribe = localSubscribe(acceptUser);
    const touch = () => localTouchSession();
    const check = () => localCheckSession();
    const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((name) => window.addEventListener(name, touch, { passive: true }));
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('storage', localStorageChanged);
    const idleTimer = setInterval(check, 15000);
    const restoreEpoch = localSessionEpoch();
    localRestoreSession().then(() => {
      acceptUser(localCurrentUser());
    }).catch((error) => {
      if (active && localSessionEpoch() === restoreEpoch) setAuthInitError(error.message);
    }).finally(() => { if (active) setAuthLoading(false); });
    return () => {
      active = false; unsubscribe(); clearInterval(idleTimer);
      activityEvents.forEach((name) => window.removeEventListener(name, touch));
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('storage', localStorageChanged);
    };
  }, []);
  return { session: identity.session, sessionGeneration: identity.generation, authLoading, authInitError, locked: identity.locked };
}
