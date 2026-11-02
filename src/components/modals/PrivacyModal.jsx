import React from 'react';

export function PrivacyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-privacy-title"
    >
      <div className="form-container my-6 max-h-[92vh] overflow-y-auto space-y-3 text-xs text-[#222222]">
        <div className="flex items-center justify-between border-b-2 border-[#595959] pb-2">
          <h2 id="modal-privacy-title" className="text-base font-bold">
            Aviso de Privacidad del Consultorio
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="secondary-button text-xs py-1 px-2.5"
          >
            Cerrar
          </button>
        </div>
        <p>
          <strong>Responsable:</strong> Consultorio de Fisioterapia Deportiva (Lic. Ft. Eduardo).
        </p>
        <p>
          <strong>Datos recabados:</strong> Nombre completo, edad, teléfono, correo electrónico, alergias, estudios previos, antecedentes familiares, motivo de consulta y notas de evolución fisioterapéutica.
        </p>
        <p>
          <strong>Finalidades:</strong> Integración y resguardo del expediente clínico del paciente, programación de sesiones de rehabilitación, prevención de riesgos por alergias y seguimiento de tratamientos.
        </p>
        <p>
          <strong>Confidencialidad:</strong> Los datos clínicos se resguardan de forma privada y <strong>no se comparten ni sincronizan con calendarios externos ni servicios de terceros</strong>.
        </p>
        <p>
          <strong>Acceso y actualización:</strong> El paciente puede solicitar en cualquier momento copia de su historial de sesiones o la actualización de sus datos directamente en el consultorio.
        </p>
      </div>
    </div>
  );
}
