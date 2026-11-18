import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { fetchAppointments } from '../services/appointmentService';
import { fetchPatients } from '../services/patientService';
import { withTimeout } from '../utils/withTimeout';
import { fetchReminderRecords, recordReminderEvent } from '../services/reminderService';
import { formatReminderDate, normalizeMexicanWhatsApp, reminderMessage, upcomingReminders } from '../utils/reminders';

export function RemindersPage({ appointments, patientsById, session, locked = false }) {
  // Props trigger a new snapshot after edits in this window; reads always come from the server.
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [authorizations, setAuthorizations] = useState({});
  const [now, setNow] = useState(() => new Date());
  const requestId = useRef(0);
  const userId = session?.user?.id;

  const refresh = useCallback(async () => {
    if (!userId || locked) return;
    const current = ++requestId.current;
    setLoading(true);
    setBusyId('');
    setSnapshot(null);
    setAuthorizations({});
    setError('');
    try {
      const [freshAppointments, patients, records] = await withTimeout(Promise.all([
        fetchAppointments(), fetchPatients(), fetchReminderRecords(),
      ]));
      if (requestId.current !== current) return;
      setSnapshot({
        appointments: freshAppointments,
        patientsById: new Map(patients.map((p) => [p.id, p])),
        records: new Map(records.map((r) => [r.appointment_id, r])),
      });
      setNow(new Date());
    } catch {
      if (requestId.current === current) setError('No se pudieron actualizar las citas, los pacientes o el seguimiento. Comprueba que MINA esté en funcionamiento y pulsa Actualizar para reintentar.');
    } finally {
      if (requestId.current === current) setLoading(false);
    }
  }, [userId, locked]);

  useEffect(() => {
    void refresh();
    return () => { requestId.current++; };
  }, [refresh, appointments, patientsById]);

  useEffect(() => {
    if (locked) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [locked]);

  const candidates = useMemo(() => upcomingReminders(snapshot?.appointments || [], now), [snapshot, now]);
  const records = snapshot?.records || new Map();

  const updateRecord = async (aptId, status) => {
    const current = requestId.current;
    setBusyId(aptId);
    setError('');
    try {
      const apt = snapshot?.appointments.find((a) => a.id === aptId);
      if (!apt) throw new Error('Cita no disponible.');
      const saved = await recordReminderEvent(aptId, apt.start_time, userId, status);
      if (requestId.current === current) setSnapshot((prev) => prev && ({ ...prev, records: new Map(prev.records).set(aptId, saved) }));
    } catch {
      if (requestId.current === current) setError('No se pudo confirmar el estado del recordatorio. Pulsa Actualizar para comprobar lo guardado antes de reintentar.');
    } finally {
      if (requestId.current === current) setBusyId('');
    }
  };

  const openWhatsApp = (apt, phone, name) => {
    // User gesture must open the destination synchronously to avoid browser blockers.
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(reminderMessage(name, apt.start_time))}`;
    const popup = window.open(url, '_blank');
    if (popup) popup.opener = null;
    if (!popup) {
      setError('El navegador bloqueó WhatsApp. Permite ventanas emergentes para MINA.');
      return;
    }
    void updateRecord(apt.id, 'opened');
  };

  const sentCount = candidates.filter((a) => records.get(a.id)?.appointment_start_time === a.start_time && records.get(a.id)?.status === 'confirmed_sent').length;

  return (
    <section className="space-y-4" aria-label="Recordatorios de citas">
      <article className="craft-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Recordatorios de citas</h2>
          <button type="button" className="toolbar-btn" disabled={loading || Boolean(busyId)} onClick={refresh}>
            <RefreshCcw className="w-4 h-4" /> Actualizar
          </button>
        </div>
        {!loading && !error && snapshot && <p className="text-sm text-slate-700">
          Citas programadas de los próximos 7 días: <strong>{candidates.length}</strong> ·
          Envíos confirmados por el consultorio: <strong>{sentCount}</strong>.
        </p>}
        <p className="text-xs text-slate-600">
          Se muestran citas programadas desde este momento hasta los próximos siete días; las pasadas, completadas y canceladas no aparecen.
          WhatsApp se abre con un mensaje preparado, pero debes presionar Enviar dentro de WhatsApp.
          MINA no confirma entregas automáticamente. Confirma el envío aquí después de hacerlo.
          Solicita previamente autorización expresa para enviar mensajes al teléfono del paciente.
          No incluyas diagnósticos ni otros datos clínicos.
        </p>
        {loading && <p role="status" className="text-sm">Actualizando citas y seguimiento…</p>}
        {error && <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      </article>
      {!loading && !error && snapshot && candidates.length === 0 && (
        <article className="craft-card"><p className="text-sm text-slate-700">No hay citas programadas para los próximos 7 días.</p></article>
      )}
      {!loading && !error && snapshot && candidates.map((apt) => {
        const patient = snapshot.patientsById.get(apt.patient_id);
        const phone = normalizeMexicanWhatsApp(patient?.phone);
        const savedRecord = records.get(apt.id);
        const record = savedRecord?.appointment_start_time === apt.start_time ? savedRecord : null;
        const confirmed = record?.status === 'confirmed_sent';
        const approved = Boolean(authorizations[apt.id]);
        return (
          <article key={apt.id} className="craft-card space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-bold">{patient?.full_name || 'Paciente sin nombre'}</h3>
                <p className="text-xs text-slate-700">{formatReminderDate(apt.start_time)} · Espacio {apt.slot_number || 1}</p>
              </div>
              <span className={confirmed ? 'text-xs font-semibold text-emerald-800' : 'text-xs text-slate-600'}>
                {confirmed ? 'Envío confirmado manualmente' : record?.status === 'opened' ? 'WhatsApp abierto; envío sin confirmar' : 'Pendiente'}
              </span>
            </div>
            {!phone && <p className="text-xs text-amber-900">El paciente no tiene un teléfono mexicano válido de 10 dígitos.</p>}
            {!confirmed && phone && (
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={approved} onChange={(e) => setAuthorizations((prev) => ({ ...prev, [apt.id]: e.target.checked }))} />
                Confirmo que el paciente autorizó recibir este recordatorio por WhatsApp.
              </label>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {!confirmed && (
                <button type="button" className="submit-button inline-flex items-center gap-2 text-xs"
                  disabled={!phone || !approved || Boolean(busyId)}
                  onClick={() => openWhatsApp(apt, phone, patient?.full_name || 'paciente')}>
                  <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
                </button>
              )}
              {record?.status === 'opened' && (
                <button type="button" className="toolbar-btn inline-flex items-center gap-2"
                  disabled={Boolean(busyId)}
                  onClick={() => updateRecord(apt.id, 'confirmed_sent')}>
                  <CheckCircle2 className="w-4 h-4" /> Ya lo envié
                </button>
              )}
              {confirmed && <span className="text-xs text-slate-600">Este recordatorio ya está marcado como enviado para esta cita.</span>}
            </div>
          </article>
        );
      })}
    </section>
  );
}
