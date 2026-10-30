import { supabase } from '../lib/supabase';

const BUCKET = 'patient-consents';
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function verifyImage(file) {
  if (!file || !TYPES[file.type] || file.size < 1 || file.size > MAX_BYTES) {
    throw new Error('Solo fotografías JPG, PNG o WEBP de hasta 8 MB.');
  }
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = [137,80,78,71,13,10,26,10].every((v, i) => b[i] === v);
  const webp = String.fromCharCode(...b.slice(0,4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8,12)) === 'WEBP';
  if (!(file.type === 'image/jpeg' && jpeg ||
        file.type === 'image/png' && png ||
        file.type === 'image/webp' && webp)) {
    throw new Error('El archivo no coincide con un formato de imagen permitido.');
  }
}

export async function listSignedConsents(patientId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('patient_documents')
    .select('id, patient_id, uploaded_at, content_type, file_size, storage_path')
    .eq('patient_id', patientId).eq('document_type', 'signed_consent')
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function uploadSignedConsent({ patientId, file, userId }) {
  if (!supabase || !userId || !patientId) throw new Error('Debes iniciar sesión.');
  await verifyImage(file);
  const path = `${userId}/${patientId}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '0' });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from('patient_documents').insert({
    user_id: userId,
    patient_id: patientId,
    storage_path: path,
    content_type: file.type,
    file_size: file.size,
    document_type: 'signed_consent'
  }).select('id, uploaded_at').single();
  if (error) {
    // Policy allows deleting only objects not linked to any metadata record.
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([path]);
    if (cleanupError) console.error('Unrecorded upload cleanup failed');
    throw new Error('No se pudo registrar el consentimiento. Intenta nuevamente.');
  }
  return data;
}

export async function openSignedConsent(storagePath) {
  if (!supabase) throw new Error('Debes iniciar sesión.');
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
