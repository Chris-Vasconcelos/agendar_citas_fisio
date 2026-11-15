import { localPatientApi } from '../local/pocketbaseClient';

export const fetchPatients = () => localPatientApi.list();
export const savePatient = (payload, editingPatientId) => localPatientApi.save(payload, editingPatientId);
// Clinical history is retained: this action archives, never deletes the record.
export const deletePatient = (patient) => localPatientApi.archive(patient.id, true, patient.write_version);
