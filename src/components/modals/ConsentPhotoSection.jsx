import React, { useCallback, useEffect, useState, useRef } from 'react';
import { localSubscribe, localSessionState } from '../../local/pocketbaseClient';
import { withTimeout } from '../../utils/withTimeout';
import { listSignedConsents, uploadSignedConsent, openSignedConsent } from '../../services/consentService';

export function ConsentPhotoSection({ patient, userId, onPendingChange, onBusyChange }) {
  const popups = useRef([]);
  useEffect(() => {
    const close = () => { popups.current.forEach((popup) => { try { popup.close(); } catch {} }); popups.current = []; };
    const unsubscribe = localSubscribe((user) => { if (!user || localSessionState().locked) close(); });
    return () => { unsubscribe(); close(); };
  }, []);
  const generation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  useEffect(() => {
    onPendingChange?.(Boolean(file) || busy);
    return () => onPendingChange?.(false);
  }, [file, busy, onPendingChange]);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const loadPhotos = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setItems([]);
    setError('');
    try {
      const data = await withTimeout(listSignedConsents(patient.id));
      if (generation.current === current) setItems(data);
    } catch {
      if (generation.current === current) setError('No se pudieron consultar los consentimientos. Vuelve a consultar antes de asumir que no hay fotografías.');
    } finally { if (generation.current === current) setLoading(false); }
  }, [patient?.id, userId]);
  useEffect(() => {
    setFile(null);
    setConfirm(false);
    if (patient?.id && userId) void loadPhotos();
    return () => { generation.current++; };
  }, [loadPhotos]);

  if (!patient || !userId) return null;

  async function upload() {
    if (!file || !confirm || busy) return;
    const current = ++generation.current;
    setBusy(true);
    setError('');
    try {
      await uploadSignedConsent({ patientId: patient.id, file, userId });
      const data = await listSignedConsents(patient.id);
      if (generation.current !== current) return;
      setItems(data);
      setFile(null);
      setConfirm(false);
    } catch (err) {
      if (generation.current === current) setError(err?.message || 'No se pudo guardar la fotografía.');
    } finally {
      if (generation.current === current) setBusy(false);
    }
  }

  async function view(path) {
    const popup = window.open('', '_blank');
    if (popup) { popup.opener = null; popups.current.push(popup); }
    try {
      const url = await openSignedConsent(path);
      if (localSessionState().locked || popup?.closed) return;
      if (popup) popup.location.replace(url);
      else setError('El navegador bloqueó la ventana. Permite ventanas emergentes para visualizarla.');
    } catch {
      if (popup) popup.close();
      setError('No se pudo abrir la imagen. Comprueba tu sesión.');
    }
  }

  return (
    <section className="space-y-3 border-t border-slate-300 pt-3" aria-label="Consentimientos firmados">
      <h3 className="text-sm font-bold">Fotografía del consentimiento firmado</h3>
      <p className="text-xs text-slate-600">Copia digital de consulta. Conserva el documento original firmado según las indicaciones del responsable.</p>
      <p className="text-xs text-slate-600">
        Paciente: <strong>{patient.full_name}</strong> · Tel: {patient.phone || 'Sin teléfono'}
        <br />ID del expediente: {patient.id.slice(0, 8)}
      </p>
      <div className="form-group">
        <label htmlFor="signed-consent-photo" className="form-label">Tomar foto o elegir imagen (máx. 8 MB)</label>
        <input id="signed-consent-photo" type="file" accept="image/jpeg,image/png,image/webp"
          disabled={busy || loading} className="form-input"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setConfirm(false); e.target.value = ''; }} />
      </div>
      {file && (
        <div className="rounded border border-slate-300 p-2 text-xs space-y-2">
          <p>Imagen seleccionada: {file.name} ({Math.ceil(file.size / 1024)} KB)</p>
          {previewUrl && <img src={previewUrl} alt="Vista previa del consentimiento seleccionado" className="max-h-72 w-full rounded border border-slate-200 bg-white object-contain" />}
          <p className="text-slate-600">Revisa que nombre, fecha, texto y firma sean legibles antes de guardar. La imagen se almacenará sin compresión adicional.</p>
          <label className="flex gap-2 items-start">
            <input type="checkbox" checked={confirm} disabled={busy}
              onChange={(e) => setConfirm(e.target.checked)} />
            Confirmo que la fotografía corresponde al expediente de {patient.full_name} y que se leen el nombre, la fecha y la firma.
          </label>
          <button type="button" disabled={!confirm || busy} className="submit-button"
            onClick={upload}>{busy ? 'Subiendo...' : 'Guardar fotografía privada'}</button>
        </div>
      )}
      {loading && <p role="status" className="text-xs">Consultando fotografías…</p>}
      {error && <div><p role="alert" className="text-red-700 text-xs">{error}</p>
        <button type="button" className="toolbar-btn" disabled={busy || loading} onClick={loadPhotos}>Volver a consultar fotografías</button></div>}
      <div className="space-y-2">
        {!loading && !error && items.length === 0 && <p className="text-xs text-slate-600">Sin fotografías registradas.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center gap-2 border border-slate-300 p-2 rounded">
            <span className="text-xs">{new Date(item.uploaded_at).toLocaleString('es-MX')}</span>
            <button type="button" className="toolbar-btn" onClick={() => view(item.storage_path)}>
              Ver fotografía
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
