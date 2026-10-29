import React from 'react';
import { Download, Upload, CheckCircle2 } from 'lucide-react';

export function Security({
  handleExportJsonBackup,
  handleExportCsvBackup,
  handleImportJsonBackup,
  restoreReport,
  auditLogs,
}) {
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
