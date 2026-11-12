import { isLocalBackend } from '../lib/backendMode';
import { localAppointmentApi } from '../local/pocketbaseClient';
import { readLocalJSON } from '../utils/localJSON';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const fetchAppointments = async () => {
  if (isLocalBackend) return localAppointmentApi.list();
  if (!isSupabaseConfigured || !supabase) {
    return readLocalJSON('fisio_appointments_v3', []);
  }
  const { data, error } = await supabase.from('appointments').select('*').order('start_time');
  if (error) throw error;
  return data;
};

export const saveAppointment = async (payload, editingAppointmentId, userId) => {
    if (isLocalBackend) return localAppointmentApi.save(payload, editingAppointmentId);
    if (isSupabaseConfigured && supabase) {
      if (!userId) {
          throw new Error('Operación no autorizada: No hay sesión activa.');
      }
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
        // Local handling solo si no está configurado Supabase
        return {
            id: editingAppointmentId || crypto.randomUUID(),
            ...payload
        }
    }
}

export const cancelAppointment = async (appointmentId) => {
    if (isLocalBackend) return localAppointmentApi.cancel(appointmentId);
    if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointmentId);
        if (error) throw error;
    }
}
