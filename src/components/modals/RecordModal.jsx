import React from 'react';
import { formatTimeShort } from '../../utils/date';
import { DEFAULT_PROFESSIONAL } from '../../utils/constants';
import { ConsentPhotoSection } from './ConsentPhotoSection';

export function RecordModal({
  selectedPatientForRecord,
  setSelectedPatientForRecord,
  appointments,
  openEditAppointmentModal,
  userId
}) {
  if (!selectedPatientForRecord) return null;

  return (
    <div
      className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-record-title"
    >
      <div className="form-container my-6 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-start justify-between gap-2 border-b-2 border-[#595959] pb-3">
          <div>
            <h2 id="modal-record-title" className="text-lg font-bold text-[#222222]">
              Expediente Clínico: {selectedPatientForRecord.full_name} (
              {selectedPatientForRecord.age ?? '-'} años)
            </h2>
            <p className="text-xs text-slate-700">
              Tel: {selectedPatientForRecord.phone} · Historial clínico del paciente
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPatientForRecord(null)}
            className="secondary-button text-xs py-1 px-2.5"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="p-2.5 rounded-sm bg-[#fff0f0] border-2 border-[#990000] font-bold text-[#990000]">
            ⚠️ Alergias: {selectedPatientForRecord.allergies || 'Ninguna conocida'}
          </div>
          <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-300">
            <strong>Motivo de consulta:</strong>{' '}
            {selectedPatientForRecord.consultation_reason || '-'}
          </div>
          <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-300">
            <strong>Estudios previos:</strong>{' '}
            {selectedPatientForRecord.previous_studies || '-'}
          </div>
          <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-300">
            <strong>Antecedentes familiares:</strong>{' '}
            {selectedPatientForRecord.family_history || '-'}
          </div>
        </div>

        <ConsentPhotoSection patient={selectedPatientForRecord} userId={userId} />
        <div className="space-y-2 border-t-2 border-[#595959] pt-3">
          <h3 className="text-sm font-bold text-[#222222]">
            Historial de Sesiones y Tratamientos
          </h3>
          {appointments
            .filter((a) => a.patient_id === selectedPatientForRecord.id)
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
            .map((ses) => (
              <div
                key={ses.id}
                className="rounded-sm border border-[#595959] p-3 bg-white text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-[#004070]">
                  <span>
                    {new Date(ses.start_time).toLocaleDateString('es-MX')} ·{' '}
                    {formatTimeShort(ses.start_time)} - {formatTimeShort(ses.end_time)} (Espacio{' '}
                    {ses.slot_number || 1})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatientForRecord(null);
                      openEditAppointmentModal(ses);
                    }}
                    className="underline text-[#004070] cursor-pointer"
                  >
                    Editar nota
                  </button>
                </div>
                {ses.patient_condition && (
                  <p className="text-[#222222]">
                    <strong>Estado del paciente:</strong> {ses.patient_condition}
                  </p>
                )}
                <p className="text-[#222222]">
                  <strong>Lo que se le hizo (Tratamiento):</strong>{' '}
                  {ses.treatment_notes || 'Sin nota registrada.'}
                </p>
                <p className="text-[11px] text-slate-600">
                  <strong>Fisioterapeuta:</strong> {ses.professional_name || DEFAULT_PROFESSIONAL}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
