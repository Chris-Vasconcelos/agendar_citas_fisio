import React, { useState } from 'react';
import { addMinutesToTimeStr } from '../../utils/date';
import { DEFAULT_PROFESSIONAL } from '../../utils/constants';
import { normalizePatientText } from '../../utils/patientSearch';

export function AppointmentModal({
  isOpen,
  onClose,
  editingAppointmentId,
  aptForm,
  setAptForm,
  aptFieldErrors,
  setAptFieldErrors,
  aptFormError,
  setAptFormError,
  patients,
  onSave
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const query = normalizePatientText(patientQuery);
  const matches = patients.filter((p) => normalizePatientText(p.full_name).includes(query) || String(p.phone ?? '').replace(/\D/g, '').includes(query.replace(/\D/g, '')) && /\d/.test(query)).slice(0, 100);
  const selected = patients.find((p) => p.id === aptForm.patient_id);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(aptForm, editingAppointmentId);
    } catch (error) {
      setAptFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar. Intenta nuevamente.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-apt-title"
    >
      <div className="form-container my-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-apt-title" className="text-lg font-bold text-[#222222]">
            {editingAppointmentId
              ? 'Atender Cita / Nota de Sesión'
              : 'Agendar Cita (Bloque de 60 min)'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="secondary-button text-xs py-1 px-2.5"
            disabled={isSaving}
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSave} noValidate>
          <div className="form-group">
            <label htmlFor="apt-patient-select" className="form-label">
              Paciente <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input type="search" className="form-input mb-2" aria-label="Buscar paciente" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder="Buscar paciente por nombre o teléfono" disabled={isSaving} />
            <select
              id="apt-patient-select"
              value={aptForm.patient_id}
              onChange={(e) => setAptForm((prev) => ({ ...prev, patient_id: e.target.value }))}
              aria-invalid={Boolean(aptFieldErrors.patient_id)}
              className="form-input"
              required
            >
              <option value="">-- Selecciona un paciente --</option>
              {selected && !matches.some((p) => p.id === selected.id) && <option value={selected.id}>{selected.full_name} · Tel: {selected.phone ?? '-'}</option>}
              {matches.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.age ?? '-'} años · Tel: {p.phone})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600">Verifica nombre, edad y teléfono. Máximo 100 resultados por búsqueda.</p>
            {selected && <p className="text-xs font-semibold text-[#004070]">Paciente seleccionado: {selected.full_name} · {selected.age ?? '-'} años · Tel: {selected.phone ?? '-'}</p>}
            <div aria-live="polite">
              {aptFieldErrors.patient_id && (
                <span className="error-message active">{aptFieldErrors.patient_id}</span>
              )}
            </div>
          </div>

          <fieldset className="form-fieldset">
            <legend className="form-legend">
              Espacio de atención (máx. 2 pacientes por hora){' '}
              <span className="required-asterisk" aria-hidden="true">*</span>
            </legend>
            <div className="space-y-2 mt-1">
              <div className="flex items-center gap-2">
                <input
                  id="slot-option-auto"
                  type="radio"
                  name="slot_number"
                  value="auto"
                  checked={aptForm.slot_number === 'auto'}
                  onChange={(e) => setAptForm((prev) => ({ ...prev, slot_number: e.target.value }))}
                  className="radio-input h-4 w-4"
                />
                <label htmlFor="slot-option-auto" className="text-sm font-medium text-[#222222]">
                  Automático (Asignar Espacio 1 o 2 libre)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="slot-option-1"
                  type="radio"
                  name="slot_number"
                  value="1"
                  checked={aptForm.slot_number === '1'}
                  onChange={(e) => setAptForm((prev) => ({ ...prev, slot_number: e.target.value }))}
                  className="radio-input h-4 w-4"
                />
                <label htmlFor="slot-option-1" className="text-sm font-medium text-[#222222]">
                  Espacio 1
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="slot-option-2"
                  type="radio"
                  name="slot_number"
                  value="2"
                  checked={aptForm.slot_number === '2'}
                  onChange={(e) => setAptForm((prev) => ({ ...prev, slot_number: e.target.value }))}
                  className="radio-input h-4 w-4"
                />
                <label htmlFor="slot-option-2" className="text-sm font-medium text-[#222222]">
                  Espacio 2
                </label>
              </div>
            </div>
            <div aria-live="polite">
              {aptFieldErrors.slot_number && (
                <span className="error-message active">{aptFieldErrors.slot_number}</span>
              )}
            </div>
          </fieldset>

          <div className="form-group">
            <label htmlFor="apt-date-input" className="form-label">
              Fecha de la atención <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="apt-date-input"
              type="date"
              value={aptForm.date}
              onChange={(e) => setAptForm((prev) => ({ ...prev, date: e.target.value }))}
              aria-invalid={Boolean(aptFieldErrors.date)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="apt-start-time" className="form-label">
              Hora de inicio <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="apt-start-time"
              type="time"
              value={aptForm.startTime}
              onChange={(e) => {
                const newStart = e.target.value;
                setAptForm((prev) => ({
                  ...prev,
                  startTime: newStart,
                  endTime: addMinutesToTimeStr(newStart, 60),
                }));
              }}
              aria-invalid={Boolean(aptFieldErrors.startTime)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="apt-end-time" className="form-label">
              Hora de término <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="apt-end-time"
              type="time"
              value={aptForm.endTime}
              onChange={(e) => setAptForm((prev) => ({ ...prev, endTime: e.target.value }))}
              aria-invalid={Boolean(aptFieldErrors.endTime)}
              className="form-input"
              required
            />
            <div aria-live="polite">
              {aptFieldErrors.endTime && (
                <span className="error-message active">{aptFieldErrors.endTime}</span>
              )}
            </div>
          </div>

          {editingAppointmentId && (
            <>
              <div className="form-group">
                <label htmlFor="apt-status-select" className="form-label">
                  Estado de la sesión
                </label>
                <select
                  id="apt-status-select"
                  value={aptForm.status}
                  onChange={(e) => setAptForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="form-input"
                >
                  <option value="scheduled">Programada</option>
                  <option value="completed">Completada (Asistió)</option>
                  <option value="no_show">No asistió</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="apt-patient-condition" className="form-label">
                  Estado o evolución del paciente en la sesión
                </label>
                <textarea
                  id="apt-patient-condition"
                  rows={2}
                  value={aptForm.patient_condition}
                  onChange={(e) =>
                    setAptForm((prev) => ({ ...prev, patient_condition: e.target.value }))
                  }
                  placeholder="Ej. Disminución de dolor a la palpación (EVA 2/10), mejoría en rango articular..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="apt-treatment-notes" className="form-label">
                  Descripción de lo que se le hizo en la sesión
                </label>
                <textarea
                  id="apt-treatment-notes"
                  rows={3}
                  value={aptForm.treatment_notes}
                  onChange={(e) =>
                    setAptForm((prev) => ({
                      ...prev,
                      treatment_notes: e.target.value,
                      status:
                        prev.status === 'scheduled' && e.target.value.trim().length > 0
                          ? 'completed'
                          : prev.status,
                    }))
                  }
                  placeholder="Ej. Electroterapia 15 min, liberación miofascial, ejercicios excéntricos..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="apt-professional-name" className="form-label">
                  Fisioterapeuta que atendió{' '}
                  <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="apt-professional-name"
                  type="text"
                  required
                  value={aptForm.professional_name}
                  onChange={(e) =>
                    setAptForm((prev) => ({ ...prev, professional_name: e.target.value }))
                  }
                  aria-invalid={Boolean(aptFieldErrors.professional_name)}
                  className="form-input"
                />
              </div>
            </>
          )}

          <div aria-live="polite" className="mb-4">
            {aptFormError && <div className="error-message active">{aptFormError}</div>}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="secondary-button"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button type="submit" className="submit-button" disabled={isSaving}>
              {isSaving ? 'Guardando...' : (editingAppointmentId ? 'Guardar Nota de Sesión y Cambios' : 'Confirmar y Agendar Cita')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
