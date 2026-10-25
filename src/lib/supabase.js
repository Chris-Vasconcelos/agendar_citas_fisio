import { createClient } from '@supabase/supabase-js';

// REQ-SEC-05: El cliente navegador únicamente utiliza la clave pública anon_key
// respetando las políticas Row Level Security (RLS: auth.uid() = user_id).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('tu-proyecto.supabase.co') &&
    !supabaseAnonKey.includes('tu-anon-key-publica')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Autenticación mediante correo y contraseña en Supabase Auth (Sección 8, Paso 3).
 * Prescinde de integraciones externas como Google Calendar para evitar fuga de datos sensibles.
 */
export async function signInWithEmailPassword(email, password) {
  if (!supabase) {
    throw new Error('Supabase no está configurado en el archivo .env');
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmailPassword(email, password) {
  if (!supabase) {
    throw new Error('Supabase no está configurado en el archivo .env');
  }
  return supabase.auth.signUp({ email, password });
}

export async function signOutUser() {
  if (!supabase) return;
  return supabase.auth.signOut();
}
