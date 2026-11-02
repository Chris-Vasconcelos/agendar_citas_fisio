import React, { useState } from 'react';
import { possibleDuplicatePatients } from '../../utils/patientSearch';

export function PatientModal({
  isOpen,
  onClose,
  editingPatientId,
  patientForm,
  setPatientForm,
  patientFieldErrors,
  patientFormError,
  setPatientFormError,
  setShowPrivacyNoticeModal,
  onSave,
  patients = []
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [showClinicalDetails, setShowClinicalDetails] = useState(false);
  const allergyValue = String(patientForm.allergies || '').trim();
  const allergyMode = !allergyValue || allergyValue.toLocaleLowerCase('es-MX') === 'no preguntado'
    ? 'unknown' : allergyValue.toLocaleLowerCase('es-MX') === 'ninguna conocida' ? 'none' : 'yes';
  const setAllergies = (value) => setPatientForm((previous) => ({ ...previous, allergies: value }));
  React.useEffect(() => setShowClinicalDetails(false), [editingPatientId, isOpen]);
  const duplicates = possibleDuplicatePatients(patients, patientForm, editingPatientId);
  const [confirmedDifferentPerson, setConfirmedDifferentPerson] = useState(false);
  React.useEffect(() => setConfirmedDifferentPerson(false), [patientForm.full_name, patientForm.phone, editingPatientId]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!patientForm.consultation_reason?.trim()) setShowClinicalDetails(true);
    if (allergyValue === 'Por especificar') { setShowClinicalDetails(true); setPatientFormError('Describe las alergias antes de guardar.'); return; }
    if (duplicates.length > 0 && !confirmedDifferentPerson) {
      setPatientFormError('Confirma que no se trata de un expediente duplicado.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(patientForm, editingPatientId);
    } catch (error) {
      setPatientFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el paciente. Intenta nuevamente.'
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
      aria-labelledby="modal-patient-title"
    >
      <div className="form-container mina-patient-modal my-6 max-h-[94dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-patient-title" className="text-lg font-bold text-[#222222]">
            {editingPatientId ? 'Editar paciente' : 'Nuevo paciente'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="mina-modal-close" aria-label="Cerrar formulario"
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} noValidate>
          <div className="mina-patient-basics">
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

          {duplicates.length > 0 && <div role="alert" className="mb-3 rounded-md border border-amber-500 bg-amber-50 p-3 text-xs text-amber-950"><strong>Posible paciente duplicado; verifica antes de guardar.</strong>{duplicates.slice(0, 3).map((p) => <p key={p.id}>{p.full_name} · {p.phone || "Sin teléfono"} · ID: {p.id.slice(0, 8)}</p>)}<p>No se fusionan expedientes automáticamente.</p><label className="flex gap-2 items-center mt-2"><input type="checkbox" checked={confirmedDifferentPerson} onChange={(e) => setConfirmedDifferentPerson(e.target.checked)} />Confirmo que verifiqué y se trata de una persona distinta.</label></div>}
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
              placeholder="Ej. 551 234 5678"
              className="form-input"
            />
            <div aria-live="polite">
              {patientFieldErrors.phone && (
                <span className="error-message active">{patientFieldErrors.phone}</span>
              )}
            </div>
          </div>

          </div>

          <details className="mina-clinical-details" open={showClinicalDetails} onToggle={(e) => setShowClinicalDetails(e.currentTarget.open)}>
            <summary>Datos clínicos (motivo de consulta requerido)</summary>
            <div className="mina-clinical-details-content">
          <div className="form-group">
            <label htmlFor="patient-reason" className="form-label">
              Motivo de consulta <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <textarea
              id="patient-reason"
              rows={3}
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
              Alergias
            </label>
            <div className="mina-allergy-options" role="group" aria-label="Estado de alergias">
              <label><input type="radio" name="allergy-state" checked={allergyMode === 'unknown'}
                onChange={() => setAllergies('No preguntado')} /> No preguntado</label>
              <label><input type="radio" name="allergy-state" checked={allergyMode === 'none'}
                onChange={() => setAllergies('Ninguna conocida')} /> Ninguna conocida</label>
              <label><input type="radio" name="allergy-state" checked={allergyMode === 'yes'}
                onChange={() => setAllergies('Por especificar')} /> Sí</label>
            </div>
            {allergyMode === 'yes' && <input id="patient-allergies" type="text"
              value={allergyValue === 'Por especificar' ? '' : allergyValue}
              onChange={(e) => setAllergies(e.target.value || 'Por especificar')}
              placeholder="Ej. Penicilina, látex" className="form-input" aria-label="Descripción de alergias" />}
            <p className="mina-field-help">Las alergias registradas generan una alerta visible en la agenda.</p>
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

          </div>
          </details>

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
              Consentimiento de privacidad{' '}
              <span className="required-asterisk" aria-hidden="true">*</span>
            </legend>
            <div className="mina-consent-row">
              <input
                id="patient-privacy-consent"
                type="checkbox"
                checked={patientForm.privacy_consent}
                onChange={(e) =>
                  setPatientForm((prev) => ({ ...prev, privacy_consent: e.target.checked }))
                }
                aria-invalid={Boolean(patientFieldErrors.privacy_consent)}
                className="mina-consent-checkbox"
              />
              <label htmlFor="patient-privacy-consent" className="mina-consent-label">
                El paciente aceptó el{' '}
                <button
                  type="button"
                  onClick={(event) => { event.preventDefault(); setShowPrivacyNoticeModal(true); }}
                  className="underline font-bold text-[#004070] cursor-pointer"
                >
                  Aviso de privacidad
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

          <div className="mina-patient-footer">
            <button
              type="button"
              onClick={onClose}
              className="secondary-button"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button type="submit" className="submit-button" disabled={isSaving || !patientForm.privacy_consent}>
              {isSaving ? 'Guardando...' : 'Guardar paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
