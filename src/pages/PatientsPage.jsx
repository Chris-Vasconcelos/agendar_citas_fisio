import { isLocalBackend } from '../lib/backendMode';
import React, { useMemo } from 'react';
import { Plus, FileText, Edit3, Trash2 } from 'lucide-react';
import { matchesPatient } from '../utils/patientSearch';
import { formatPatientName } from '../utils/name';

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
  const [showArchived, setShowArchived] = React.useState(false);
  const filteredPatients = useMemo(() => patients
    .filter((p) => (!isLocalBackend || showArchived || !p.archived_at) && matchesPatient(p, patientSearch))
    .sort((a, b) => String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''), 'es')),
    [patients, patientSearch, showArchived]);
  const [visibleCount, setVisibleCount] = React.useState(25);
  React.useEffect(() => setVisibleCount(25), [patientSearch]);

  return (
    <section aria-labelledby="heading-patients" className="space-y-4">
      <article className="craft-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="heading-patients" className="text-sm font-bold m-0">
            Expedientes
          </h2>
          <button
            type="button"
            onClick={openCreatePatientModal}
            className="toolbar-btn-active"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo paciente
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

      {isLocalBackend && <label className="text-sm"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Incluir expedientes archivados</label>}
      <p className="text-xs text-slate-600" role="status">{filteredPatients.length} {filteredPatients.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}</p>
      {filteredPatients.length === 0 && <p className="craft-card">Sin coincidencias. Verifica los datos antes de crear otro expediente.</p>}
      <div className="mina-patient-list">
        {filteredPatients.slice(0, visibleCount).map((pt) => {
          const ptSessions = appointments
            .filter((a) => a.patient_id === pt.id && a.status !== 'cancelled')
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
          const hasAllergies =
            pt.allergies &&
            pt.allergies.toLowerCase() !== 'ninguna' &&
            pt.allergies.toLowerCase() !== 'ninguna conocida' &&
            pt.allergies.toLowerCase() !== 'no preguntado';

          return (
            <article
              key={pt.id}
              className="mina-patient-row"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[#222222] m-0">
                      {pt.archived_at ? '[Archivado] ' : ''}{formatPatientName(pt.full_name)} · {pt.age ?? '-'} años
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
                    Teléfono: <strong>{pt.phone?.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')}</strong>{' '}
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
                    Historial ({ptSessions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditPatientModal(pt)}
                    className="toolbar-btn"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <details className="mina-patient-more">
                    <summary aria-label={`Más acciones para ${pt.full_name}`} title="Más acciones">⋯</summary>
                                      <button
                    type="button"
                    onClick={() => { if (window.confirm(isLocalBackend ? `¿Archivar el expediente de ${pt.full_name}? Se conservará su historial.` : ptSessions.length ? `El expediente de ${pt.full_name} tiene ${ptSessions.length} citas; MINA impedirá eliminarlo para proteger su historial.` : `¿Eliminar el expediente de ${pt.full_name}? No tiene citas registradas y esta acción no se puede deshacer.`)) handleDeletePatient(pt.id); }}
                    className="mina-delete-trigger"
                    disabled={isLocalBackend && Boolean(pt.archived_at)}
                    title={isLocalBackend ? "Archivar expediente" : "Eliminar expediente sin citas"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isLocalBackend ? "Archivar" : "Eliminar"}
                  </button>
                  </details>
                </div>
              </div>

              <details className="mina-patient-details">
                <summary>Más información</summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/85 border border-slate-300 p-3 rounded-md">
                <div>
                  <strong>Motivo de consulta:</strong> {pt.consultation_reason || '-'}
                </div>
                <div>
                  <strong>Alergias:</strong> {pt.allergies || 'No preguntado'}
                </div>
                <div>
                  <strong>Estudios previos:</strong> {pt.previous_studies || '-'}
                </div>
                <div>
                  <strong>Antecedentes familiares:</strong> {pt.family_history || '-'}
                </div>
              </div>
              </details>
            </article>
          );
        })}
      </div>
      {visibleCount < filteredPatients.length && <button type="button" className="toolbar-btn" onClick={() => setVisibleCount((n) => n + 25)}>Mostrar 25 pacientes más</button>}
    </section>
  );
}
