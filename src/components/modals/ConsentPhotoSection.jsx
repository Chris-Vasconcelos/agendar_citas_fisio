import React, { useEffect, useState } from 'react';
import { listSignedConsents, uploadSignedConsent, openSignedConsent } from '../../services/consentService';

export function ConsentPhotoSection({ patient, userId }) {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    setFile(null);
    setConfirm(false);
    setItems([]);
    setError('');
    if (patient?.id && userId) {
      listSignedConsents(patient.id).then((data) => {
        if (alive) setItems(data);
      }).catch(() => {
        if (alive) setError('No se pudieron consultar los consentimientos.');
      });
    }
    return () => { alive = false; };
  }, [patient?.id, userId]);

  if (!patient || !userId) return null;

  async function upload() {
    if (!file || !confirm || busy) return;
    setBusy(true);
    setError('');
    try {
      await uploadSignedConsent({ patientId: patient.id, file, userId });
      const data = await listSignedConsents(patient.id);
      setItems(data);
      setFile(null);
      setConfirm(false);
    } catch (err) {
      setError(err?.message || 'No se pudo guardar la fotografía.');
    } finally {
      setBusy(false);
    }
  }

  async function view(path) {
    const popup = window.open('', '_blank');
    if (popup) popup.opener = null;
    try {
      const url = await openSignedConsent(path);
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
      <p className="text-xs text-slate-600">
        Paciente: <strong>{patient.full_name}</strong> · Tel: {patient.phone || 'Sin teléfono'}
        <br />ID del expediente: {patient.id.slice(0, 8)}
      </p>
      <div className="form-group">
        <label htmlFor="signed-consent-photo" className="form-label">Tomar foto o elegir imagen (máx. 8 MB)</label>
        <input id="signed-consent-photo" type="file" accept="image/jpeg,image/png,image/webp"
          disabled={busy} className="form-input"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setConfirm(false); e.target.value = ''; }} />
      </div>
      {file && (
        <div className="rounded border border-slate-300 p-2 text-xs space-y-2">
          <p>Imagen seleccionada: {file.name} ({Math.ceil(file.size / 1024)} KB)</p>
          <label className="flex gap-2 items-start">
            <input type="checkbox" checked={confirm} disabled={busy}
              onChange={(e) => setConfirm(e.target.checked)} />
            Confirmo que la fotografía corresponde al expediente de {patient.full_name}.
          </label>
          <button type="button" disabled={!confirm || busy} className="submit-button"
            onClick={upload}>{busy ? 'Subiendo...' : 'Guardar fotografía privada'}</button>
        </div>
      )}
      {error && <p role="alert" className="text-red-700 text-xs">{error}</p>}
      <div className="space-y-2">
        {items.length === 0 && <p className="text-xs text-slate-600">Sin fotografías registradas.</p>}
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
