import { localSignIn, localSignOut } from '../local/pocketbaseClient';

// MINA has one data provider: the local PocketBase server. No demo/cloud fallback.
export const signInWithEmailPassword = async (email, password) =>
  ({ data: { user: await localSignIn(email, password) }, error: null });
export const signOutUser = () => localSignOut();
