import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const fetchPatients = async () => {
  if (!isSupabaseConfigured || !supabase) {
    const saved = localStorage.getItem('fisio_patients_v3');
    return saved ? JSON.parse(saved) : [];
  }
  const { data, error } = await supabase.from('patients').select('*').order('full_name');
  if (error) throw error;
  return data;
};

export const savePatient = async (payload, editingPatientId, userId) => {
  if (isSupabaseConfigured && supabase) {
    if (!userId) {
      throw new Error('Operación no autorizada: No hay sesión activa.');
    }
    if (editingPatientId) {
      const { data, error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', editingPatientId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('patients')
        .insert({ user_id: userId, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  } else {
    // Local return solo si no hay Supabase configurado
    return {
      id: editingPatientId || crypto.randomUUID(),
      ...payload
    }
  }
};

export const deletePatient = async (patientId) => {
    if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('patients').delete().eq('id', patientId);
        if (error) throw error;
    }
}
