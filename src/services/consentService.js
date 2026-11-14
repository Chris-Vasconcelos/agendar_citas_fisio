import { localConsentApi } from '../local/pocketbaseClient';

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

export const listSignedConsents = (patientId) => localConsentApi.list(patientId);
export async function uploadSignedConsent({ patientId, file }) {
  await verifyImage(file);
  return localConsentApi.upload({ patientId, file });
}
export const openSignedConsent = (storagePath) => localConsentApi.open(storagePath);
