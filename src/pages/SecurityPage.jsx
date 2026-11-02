import React from 'react';
import { Download, Upload, CheckCircle2 } from 'lucide-react';
import { getCompactDateString } from '../utils/date';
import { escapeCsvCell } from '../utils/csv';
import { DEFAULT_PROFESSIONAL } from '../utils/constants';

export function SecurityPage({
  patients,
  appointments,
  availability,
  patientsById,
  appendAuditLog,
  restoreReport,
  setRestoreReport,
  auditLogs,
  setBannerAlert,
  setPatients,
  setAppointments,
  setAvailability,
  session,
  supabase,
  isSupabaseConfigured
}) {

  const handleExportJsonBackup = () => {
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

    const logMsg = `Respaldo JSON descargado (${filename}): ${patients.length} pacientes y ${appointments.length} citas.`;
    appendAuditLog('RESPALDO JSON', logMsg);
  };

  const handleExportCsvBackup = () => {
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

  const handleImportJsonBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        if (!Array.isArray(parsed.patients) || !Array.isArray(parsed.appointments)) {
          setBannerAlert({
            type: 'error',
            text: 'El archivo seleccionado no tiene un formato válido de respaldo (.json).',
          });
          return;
        }

        const restoredPatients = parsed.patients;
        const validPatientIds = new Set(restoredPatients.map((p) => p.id));
        const restoredAppointments = parsed.appointments.filter((a) =>
          validPatientIds.has(a.patient_id)
        );

        if (restoredAppointments.length !== parsed.appointments.length) {
          throw new Error('El respaldo contiene citas con pacientes ausentes. No se restauró ningún registro.');
        }
        if (isSupabaseConfigured && supabase) {
          if (!session?.user?.id) throw new Error('La sesión no está activa.');
          const { error } = await supabase.rpc('restore_clinical_backup', {
            backup: {
              patients: restoredPatients,
              appointments: restoredAppointments,
              availability: Array.isArray(parsed.availability) ? parsed.availability : []
            }
          });
          if (error) throw error;
        }

        setPatients(restoredPatients);
        setAppointments(restoredAppointments);
        if (Array.isArray(parsed.availability) && parsed.availability.length > 0) {
          setAvailability(parsed.availability);
        }

        const report = {
          fileName: file.name,
          restoredAt: new Date().toLocaleString('es-MX'),
          expectedPatients: parsed.patients.length,
          restoredPatientsCount: restoredPatients.length,
          expectedAppointments: parsed.appointments.length,
          restoredAppointmentsCount: restoredAppointments.length,
          integrityMatch:
            parsed.patients.length === restoredPatients.length &&
            parsed.appointments.length === restoredAppointments.length,
        };

        setRestoreReport(report);
        const msg = `Respaldo ${file.name} importado. Pacientes restaurados: ${report.restoredPatientsCount}/${report.expectedPatients}. Citas restauradas: ${report.restoredAppointmentsCount}/${report.expectedAppointments}.`;
        appendAuditLog('RESTAURACIÓN', msg);
      } catch (err) {
        setBannerAlert({
          type: 'error',
          text: `Error al leer el archivo de respaldo: ${err?.message || 'JSON inválido'}`,
        });
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="space-y-4">
      <article className="craft-card space-y-3">
        <h2 className="text-base font-bold">
          Respaldo y Exportación de Expedientes y Citas
        </h2>
        <p className="text-xs m-0">
          Descarga una copia completa de tus pacientes, citas y notas de sesión en formato Excel (CSV) o JSON, o restaura un respaldo previo cuando cambies de equipo.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExportJsonBackup}
            className="submit-button inline-flex items-center gap-1.5 text-xs"
          >
            <Download className="w-4 h-4" />
            Descargar Respaldo Completo (.JSON)
          </button>

          <button
            type="button"
            onClick={handleExportCsvBackup}
            className="secondary-button inline-flex items-center gap-1.5 text-xs"
          >
            <Download className="w-4 h-4" />
            Exportar a Excel (.CSV)
          </button>

          <div>
            <label htmlFor="restore-json-input" className="secondary-button inline-flex items-center gap-1.5 text-xs cursor-pointer">
              <Upload className="w-4 h-4" />
              Importar / Restaurar Respaldo (.JSON)
            </label>
            <input
              id="restore-json-input"
              type="file"
              accept=".json,application/json"
              onChange={handleImportJsonBackup}
              className="sr-only"
            />
          </div>
        </div>

        {restoreReport && (
          <div className="rounded-md border-2 border-[#137752] bg-emerald-50 p-3 text-xs space-y-1 text-[#111827]">
            <p className="font-bold text-[#137752] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Respaldo restaurado correctamente
            </p>
            <p>
              <strong>Archivo:</strong> {restoreReport.fileName} ·{' '}
              <strong>Fecha:</strong> {restoreReport.restoredAt}
            </p>
            <p>
              <strong>Pacientes restaurados:</strong> {restoreReport.restoredPatientsCount} de{' '}
              {restoreReport.expectedPatients} ·{' '}
              <strong>Citas restauradas:</strong> {restoreReport.restoredAppointmentsCount} de{' '}
              {restoreReport.expectedAppointments}
            </p>
          </div>
        )}

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
