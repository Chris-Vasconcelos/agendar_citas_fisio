// Development-only local storage. Never overwrite malformed existing data.
export function readLocalJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : fallback;
  } catch {
    console.warn('[MINA] No se pudo leer el almacenamiento local; se conserva sin modificar:', key);
    return fallback;
  }
}

export function writeLocalJSON(key, value) {
  try {
    const existing = localStorage.getItem(key);
    if (existing !== null) {
      // A malformed stored value is retained for manual recovery, not overwritten.
      const parsed = JSON.parse(existing);
      if (!Array.isArray(parsed)) return false;
    }
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    console.warn('[MINA] No se sobrescribió almacenamiento local inválido:', key);
    return false;
  }
}
