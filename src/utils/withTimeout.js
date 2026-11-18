/**
 * Timeout that releases its timer on success or failure.
 * This does not abort the underlying server request; callers ignore late
 * results after effect cleanup via their cancelled flag.
 */
export function withTimeout(promise, ms = 15000) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}
