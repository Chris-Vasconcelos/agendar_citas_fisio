import { localSignIn, localSignOut } from '../local/pocketbaseClient';

// MINA has one data provider: the local PocketBase server. No demo/cloud fallback.
export const signInWithEmailPassword = async (email, password, rememberDevice = false) =>
  ({ data: { user: await localSignIn(email, password, rememberDevice) }, error: null });
export const signOutUser = () => localSignOut();
