import React from 'react';
import { Download } from 'lucide-react';
import { getCompactDateString } from '../utils/date';
import { escapeCsvCell } from '../utils/csv';
import { DEFAULT_PROFESSIONAL } from '../utils/constants';

export function SecurityPage({
  patients,
  appointments,
  availability,
  patientsById,
  appendAuditLog,
  auditLogs,
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

  return (
    <section className="space-y-4">
      <article className="craft-card space-y-3">
        <h2 className="text-base font-bold">
          Respaldo y Exportación de Expedientes y Citas
        </h2>
        <p className="text-xs m-0">
          Exporta los datos de pacientes, citas y notas de sesión como CSV o JSON. IMPORTANTE: las fotografías de consentimientos NO se incluyen en estos archivos. La restauración JSON tampoco recupera fotografías. No uses esta exportación como único respaldo clínico.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExportJsonBackup}
            className="submit-button inline-flex items-center gap-1.5 text-xs"
          >
            <Download className="w-4 h-4" />
            Exportar datos (.JSON, sin fotografías)
          </button>

          <button
            type="button"
            onClick={handleExportCsvBackup}
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
