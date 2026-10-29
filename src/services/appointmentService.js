import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const fetchAppointments = async () => {
  if (!isSupabaseConfigured || !supabase) {
    const saved = localStorage.getItem('fisio_appointments_v3');
    return saved ? JSON.parse(saved) : null;
  }
  const { data, error } = await supabase.from('appointments').select('*').order('start_time');
  if (error) throw error;
  return data;
};

export const saveAppointment = async (payload, editingAppointmentId, userId) => {
    if (isSupabaseConfigured && supabase && userId) {
      if (editingAppointmentId) {
        const { data, error } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', editingAppointmentId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .insert({ user_id: userId, ...payload })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    } else {
        // Local handling
        return {
            id: editingAppointmentId || crypto.randomUUID(),
            ...payload
        }
    }
}

export const cancelAppointment = async (appointmentId) => {
    if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointmentId);
        if (error) throw error;
    }
}
