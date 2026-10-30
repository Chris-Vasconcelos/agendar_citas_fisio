import React, { useMemo } from 'react';
import { Plus, FileText, Edit3, Trash2 } from 'lucide-react';
import { matchesPatient } from '../utils/patientSearch';

export function PatientsPage({
  patients,
  appointments,
  patientSearch,
  setPatientSearch,
  openCreatePatientModal,
  openEditPatientModal,
  setSelectedPatientForRecord,
  handleDeletePatient
}) {
  const filteredPatients = useMemo(() => patients
    .filter((p) => matchesPatient(p, patientSearch))
    .sort((a, b) => String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''), 'es')),
    [patients, patientSearch]);
  const [visibleCount, setVisibleCount] = React.useState(25);
  React.useEffect(() => setVisibleCount(25), [patientSearch]);

  return (
    <section aria-labelledby="heading-patients" className="space-y-4">
      <article className="craft-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="heading-patients" className="text-sm font-bold m-0">
            Expedientes Clínicos ({patients.length})
          </h2>
          <button
            type="button"
            onClick={openCreatePatientModal}
            className="toolbar-btn-active"
          >
            <Plus className="w-3.5 h-3.5" />
            Alta de Paciente
          </button>
        </div>

        <div className="form-group mb-0">
          <label htmlFor="patient-search-input" className="sr-only">
            Buscar expediente
          </label>
          <input
            id="patient-search-input"
            type="search"
            placeholder="Buscar por nombre o teléfono..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="form-input"
          />
        </div>
      </article>

      <p className="text-xs text-slate-600" role="status">{filteredPatients.length} pacientes encontrados</p>
      {filteredPatients.length === 0 && <p className="craft-card">Sin coincidencias. Verifica los datos antes de crear otro expediente.</p>}
      <div className="space-y-4">
        {filteredPatients.slice(0, visibleCount).map((pt) => {
          const ptSessions = appointments
            .filter((a) => a.patient_id === pt.id && a.status !== 'cancelled')
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
          const hasAllergies =
            pt.allergies &&
            pt.allergies.toLowerCase() !== 'ninguna' &&
            pt.allergies.toLowerCase() !== 'ninguna conocida';

          return (
            <article
              key={pt.id}
              className="craft-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[#222222] m-0">
                      {pt.full_name} · {pt.age ?? '-'} años
                    </h3>
                    {hasAllergies && (
                      <span className="text-xs font-bold text-white bg-[#b30000] px-2 py-0.5 rounded-sm">
                        ⚠️ ALERGIA: {pt.allergies}
                      </span>
                    )}
                    {pt.privacy_consent && (
                      <span className="text-xs font-semibold text-[#137752] bg-emerald-50 border border-[#137752] px-2 py-0.5 rounded-sm">
                        ✓ Aviso de privacidad aceptado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 m-0">
                    Teléfono: <strong>{pt.phone}</strong>{' '}
                    {pt.email ? `· Correo: ${pt.email}` : ''}
                  </p>
                </div>

                <div className="card-actions-responsive">
                  <button
                    type="button"
                    onClick={() => setSelectedPatientForRecord(pt)}
                    className="toolbar-btn-active"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Ver Historial ({ptSessions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditPatientModal(pt)}
                    className="toolbar-btn"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePatient(pt.id)}
                    className="toolbar-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/85 border border-slate-300 p-3 rounded-md">
                <div>
                  <strong>Motivo de consulta:</strong> {pt.consultation_reason || '-'}
                </div>
                <div>
                  <strong>Alergias:</strong> {pt.allergies || 'Ninguna conocida'}
                </div>
                <div>
                  <strong>Estudios previos:</strong> {pt.previous_studies || '-'}
                </div>
                <div>
                  <strong>Antecedentes familiares:</strong> {pt.family_history || '-'}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {visibleCount < filteredPatients.length && <button type="button" className="toolbar-btn" onClick={() => setVisibleCount((n) => n + 25)}>Mostrar 25 pacientes más</button>}
    </section>
  );
}
