import React, { useState } from 'react';
import { fetchPatients } from '../services/patientService';
import { fetchAppointments } from '../services/appointmentService';
import { fetchAvailability } from '../services/availabilityService';
import { withTimeout } from '../utils/withTimeout';
import { Download } from 'lucide-react';
import { getCompactDateString } from '../utils/date';
import { escapeCsvCell } from '../utils/csv';
import { DEFAULT_PROFESSIONAL } from '../utils/constants';

export function SecurityPage({
  appendAuditLog,
  auditLogs,
}) {

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const exportFresh = async (format) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const [patients, appointments, availability] = await withTimeout(Promise.all([
        fetchPatients(), fetchAppointments(), fetchAvailability(),
      ]));
      if (format === 'json') exportJson(patients, appointments, availability);
      else exportCsv(appointments, new Map(patients.map((patient) => [patient.id, patient])));
    } catch { setError('No se pudo preparar la exportación con datos actuales del servidor. No se ha generado el archivo. Comprueba la conexión y reintenta.'); }
    finally { setBusy(false); }
  };
  const exportJson = (patients, appointments, availability) => {
    const backupPayload = {
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      counts: {
        patients: patients.length,
        appointments: appointments.length,
        availability: availability.length,
      },
      patients,
      appointments,
      availability,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = `backup_fisio_${getCompactDateString()}.json`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const logMsg = `Exportación JSON preparada (${filename}): ${patients.length} pacientes y ${appointments.length} citas.`;
    appendAuditLog('EXPORTACIÓN JSON', logMsg);
  };

  const exportCsv = (appointments, patientsById) => {
    const headers = [
      'ID Cita',
      'Fecha y Hora Inicio',
      'Fecha y Hora Fin',
      'Espacio',
      'Estado Cita',
      'Nombre Completo Paciente',
      'Edad',
      'Teléfono',
      'Alergias',
      'Estudios Previos',
      'Antecedentes Familiares',
      'Motivo de Consulta',
      'Estado del Paciente',
      'Descripción de lo que se le hizo',
      'Fisioterapeuta',
    ];

    const rows = appointments.map((apt) => {
      const pt = patientsById.get(apt.patient_id) || {};
      return [
        apt.id,
        apt.start_time,
        apt.end_time,
        `Espacio ${apt.slot_number || 1}`,
        apt.status,
        pt.full_name || '',
        pt.age ?? '',
        pt.phone || '',
        pt.allergies || '',
        pt.previous_studies || '',
        pt.family_history || '',
        pt.consultation_reason || '',
        apt.patient_condition || '',
        apt.treatment_notes || '',
        apt.professional_name || DEFAULT_PROFESSIONAL,
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = `backup_fisio_${getCompactDateString()}.csv`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    appendAuditLog('EXPORTACIÓN EXCEL', `Archivo CSV generado para Excel (${filename}).`);
  };

  return (
    <section className="space-y-4">
      <article className="craft-card space-y-3">
        <h2 className="text-base font-bold">
          Respaldo y Exportación de Expedientes y Citas
        </h2>
        <p className="text-xs m-0">
          Exporta los datos de pacientes, citas y notas de sesión como CSV o JSON. IMPORTANTE: las fotografías de consentimientos NO se incluyen en estos archivos. Esta versión no admite restaurar archivos JSON. No uses esta exportación como único respaldo clínico.
        </p>

        {busy && <p role="status">Consultando datos actuales para la exportación…</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => exportFresh('json')}
            disabled={busy}
            className="submit-button inline-flex items-center gap-1.5 text-xs"
          >
            <Download className="w-4 h-4" />
            Exportar datos (.JSON, sin fotografías)
          </button>

          <button
            type="button"
            onClick={() => exportFresh('csv')}
            disabled={busy}
            className="secondary-button inline-flex items-center gap-1.5 text-xs"
          >
            <Download className="w-4 h-4" />
            Exportar a Excel (.CSV)
          </button>
        </div>

        <p className="text-sm">Los archivos exportados no son un respaldo completo. La recuperación local debe incluir la base y las fotografías del servidor; no se admite importar JSON en esta versión.</p>
        <p className="text-sm">Para crear una copia completa cifrada, conecta el disco externo y ejecuta Crear-respaldo.ps1 desde la carpeta de MINA en la PC. Sigue la guía incluida en LEEME.md y comprueba regularmente la recuperación en otra carpeta o equipo.</p>
        {auditLogs.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <h3 className="text-xs font-bold">
              Actividad reciente:
            </h3>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="text-xs font-mono bg-white/90 text-[#111827] border border-slate-400 p-2 rounded-sm"
              >
                <strong>[{log.code}]</strong> {log.detail}
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
