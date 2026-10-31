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

export const updateAvailability = async (payload, userId) => {
    if (isSupabaseConfigured && supabase) {
        if (!userId) {
            throw new Error('Operación no autorizada: No hay sesión activa.');
        }

        const { data, error } = await supabase
            .from('availability')
            .upsert({ user_id: userId, ...payload }, { onConflict: 'day_of_week' })
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        return payload;
    }
}
