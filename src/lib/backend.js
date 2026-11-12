import { isLocalBackend } from './backendMode';
import { isSupabaseConfigured, supabase, signInWithEmailPassword as cloudSignIn, signOutUser as cloudSignOut } from './supabase';
import { localSignIn, localSignOut } from '../local/pocketbaseClient';
export { isLocalBackend };
export const requiresServer = isLocalBackend || isSupabaseConfigured;
export const missingBackendConfig = import.meta.env.PROD && !requiresServer;
export const signInWithEmailPassword = async (email, password) => isLocalBackend
  ? { data: { user: await localSignIn(email, password) }, error: null }
  : cloudSignIn(email, password);
export const signOutUser = () => isLocalBackend ? localSignOut() : cloudSignOut();
export { supabase };
