import { supabase } from '../lib/supabase';

export async function fetchReminderRecords() {
  if (!supabase) throw new Error('Los recordatorios requieren iniciar sesión en MINA.');
  const { data, error } = await supabase.from('appointment_reminders')
    .select('appointment_id, appointment_start_time, status, opened_at, confirmed_at');
  if (error) throw error;
  return data || [];
}

// Record the real event only: opening WhatsApp does not prove delivery.
export async function recordReminderEvent(appointmentId, startTime, userId, status) {
  if (!supabase || !userId) throw new Error('Inicia sesión antes de registrar recordatorios.');
  if (!['opened', 'confirmed_sent'].includes(status)) throw new Error('Estado no válido.');
  const timestamp = new Date().toISOString();
  const payload = {
    appointment_id: appointmentId,
    appointment_start_time: startTime,
    user_id: userId,
    status,
    ...(status === 'opened' ? { confirmed_at: null } : {}),
    ...(status === 'opened' ? { opened_at: timestamp } : { confirmed_at: timestamp })
  };
  const { data, error } = await supabase.from('appointment_reminders')
    .upsert(payload, { onConflict: 'appointment_id,user_id' })
    .select('appointment_id, appointment_start_time, status, opened_at, confirmed_at').single();
  if (error) throw error;
  return data;
}
