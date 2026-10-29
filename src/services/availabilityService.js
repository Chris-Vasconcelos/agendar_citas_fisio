import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const fetchAvailability = async () => {
  if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem('fisio_availability_v3');
      return saved ? JSON.parse(saved) : [];
  }
  const { data, error } = await supabase.from('availability').select('*').order('day_of_week');
  if (error) throw error;
  return data;
};

export const updateAvailability = async (payload) => {
    // Currently, App.jsx seems to update it in memory/localStorage.
    // Ideally this goes to DB, but for now we'll match existing behaviour where it's saved locally or via DB upsert if implemented.
    if (isSupabaseConfigured && supabase) {
        // Implement upsert here when needed. Currently not fully saving to DB in App.jsx.
    }
}
