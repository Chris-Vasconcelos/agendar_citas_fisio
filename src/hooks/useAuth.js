import { useState, useEffect } from 'react';
import { localCurrentUser, localSessionEpoch, localSubscribe, localRestoreSession } from '../local/pocketbaseClient';

export function useAuth() {
  const [identity, setIdentity] = useState(() => ({ session: null, generation: localSessionEpoch() }));
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
        return { session: user ? { user } : null, generation: localSessionEpoch() };
      });
      setAuthInitError('');
    };
    const unsubscribe = localSubscribe(acceptUser);
    const restoreEpoch = localSessionEpoch();
    localRestoreSession().then(() => {
      acceptUser(localCurrentUser());
    }).catch((error) => {
      if (active && localSessionEpoch() === restoreEpoch) setAuthInitError(error.message);
    }).finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, []);
  return { session: identity.session, sessionGeneration: identity.generation, authLoading, authInitError };
}
