import React from 'react';

export function PatientModal({
  isPatientModalOpen,
  setIsPatientModalOpen,
  editingPatientId,
  handleSavePatient,
  patientForm,
  setPatientForm,
  patientFieldErrors,
  patientFormError,
  setShowPrivacyNoticeModal,
}) {
  if (!isPatientModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-patient-title"
    >
      <div className="form-container my-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-patient-title" className="text-lg font-bold text-[#222222]">
            {editingPatientId ? 'Editar Expediente del Paciente' : 'Alta de Paciente y Expediente'}
          </h2>
          <button
            type="button"
            onClick={() => setIsPatientModalOpen(false)}
            className="secondary-button text-xs py-1 px-2.5"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSavePatient} noValidate>
          <div className="form-group">
            <label htmlFor="patient-full-name" className="form-label">
              Nombre completo <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="patient-full-name"
              type="text"
              required
              minLength={3}
              value={patientForm.full_name}
              onChange={(e) => setPatientForm((prev) => ({ ...prev, full_name: e.target.value }))}
              aria-invalid={Boolean(patientFieldErrors.full_name)}
              placeholder="Ej. Juan Carlos Morales"
              className="form-input"
            />
            <div aria-live="polite">
              {patientFieldErrors.full_name && (
                <span className="error-message active">{patientFieldErrors.full_name}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="patient-age" className="form-label">
              Edad <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="patient-age"
              type="number"
              required
              min={0}
              max={120}
              value={patientForm.age}
              onChange={(e) => setPatientForm((prev) => ({ ...prev, age: e.target.value }))}
              aria-invalid={Boolean(patientFieldErrors.age)}
              placeholder="Ej. 29"
              className="form-input"
            />
            <div aria-live="polite">
              {patientFieldErrors.age && (
                <span className="error-message active">{patientFieldErrors.age}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="patient-phone" className="form-label">
              Teléfono / WhatsApp <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="patient-phone"
              type="tel"
              required
              minLength={7}
              value={patientForm.phone}
              onChange={(e) => setPatientForm((prev) => ({ ...prev, phone: e.target.value }))}
              aria-invalid={Boolean(patientFieldErrors.phone)}
              placeholder="Ej. 5512345678"
              className="form-input"
            />
            <div aria-live="polite">
              {patientFieldErrors.phone && (
                <span className="error-message active">{patientFieldErrors.phone}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="patient-reason" className="form-label">
              Motivo de consulta <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <textarea
              id="patient-reason"
              rows={2}
              required
              value={patientForm.consultation_reason}
              onChange={(e) =>
                setPatientForm((prev) => ({ ...prev, consultation_reason: e.target.value }))
              }
              aria-invalid={Boolean(patientFieldErrors.consultation_reason)}
              placeholder="Ej. Esguince de tobillo grado II..."
              className="form-input"
            />
            <div aria-live="polite">
              {patientFieldErrors.consultation_reason && (
                <span className="error-message active">
                  {patientFieldErrors.consultation_reason}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="patient-allergies" className="form-label">
              Alergias (Destacadas en alerta visual durante la consulta)
            </label>
            <input
              id="patient-allergies"
              type="text"
              value={patientForm.allergies}
              onChange={(e) => setPatientForm((prev) => ({ ...prev, allergies: e.target.value }))}
              placeholder="Ej. Ninguna conocida, AINEs, Penicilina, Látex..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="patient-studies" className="form-label">
              Estudios previos
            </label>
            <textarea
              id="patient-studies"
              rows={2}
              value={patientForm.previous_studies}
              onChange={(e) =>
                setPatientForm((prev) => ({ ...prev, previous_studies: e.target.value }))
              }
              placeholder="Ej. Radiografía AP y lateral, resonancia magnética, ultrasonido..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="patient-family-history" className="form-label">
              Antecedentes familiares
            </label>
            <textarea
              id="patient-family-history"
              rows={2}
              value={patientForm.family_history}
              onChange={(e) =>
                setPatientForm((prev) => ({ ...prev, family_history: e.target.value }))
              }
              placeholder="Ej. Padre con diabetes tipo 2, madre con hipertensión..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="patient-email" className="form-label">
              Correo electrónico (opcional)
            </label>
            <input
              id="patient-email"
              type="email"
              value={patientForm.email}
              onChange={(e) => setPatientForm((prev) => ({ ...prev, email: e.target.value }))}
              aria-invalid={Boolean(patientFieldErrors.email)}
              placeholder="paciente@ejemplo.com"
              className="form-input"
            />
          </div>

          <fieldset className="form-fieldset">
            <legend className="form-legend">
              Consentimiento de Privacidad{' '}
              <span className="required-asterisk" aria-hidden="true">*</span>
            </legend>
            <div className="flex items-start gap-2 mt-1">
              <input
                id="patient-privacy-consent"
                type="checkbox"
                checked={patientForm.privacy_consent}
                onChange={(e) =>
                  setPatientForm((prev) => ({ ...prev, privacy_consent: e.target.checked }))
                }
                aria-invalid={Boolean(patientFieldErrors.privacy_consent)}
                className="h-4 w-4 mt-1"
              />
              <label htmlFor="patient-privacy-consent" className="text-xs text-[#222222]">
                El paciente aceptó el{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyNoticeModal(true)}
                  className="underline font-bold text-[#004070] cursor-pointer"
                >
                  Aviso de Privacidad
                </button>{' '}
                para el registro de su expediente clínico.
              </label>
            </div>
            <div aria-live="polite">
              {patientFieldErrors.privacy_consent && (
                <span className="error-message active">
                  {patientFieldErrors.privacy_consent}
                </span>
              )}
            </div>
          </fieldset>

          <div aria-live="polite" className="mb-4">
            {patientFormError && <div className="error-message active">{patientFormError}</div>}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPatientModalOpen(false)}
              className="secondary-button"
            >
              Cancelar
            </button>
            <button type="submit" className="submit-button">
              Guardar Expediente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
