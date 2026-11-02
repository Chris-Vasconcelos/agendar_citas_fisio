import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchPatients, savePatient as apiSavePatient, deletePatient as apiDeletePatient } from '../services/patientService';
import { INITIAL_DEMO_PATIENTS } from '../utils/constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { withTimeout } from '../utils/withTimeout';
import { readLocalJSON, writeLocalJSON } from '../utils/localJSON';

export function usePatients(session, appendAuditLog, setBannerAlert, appointmentsRef) {
    const [patients, setPatients] = useState(() => {
        if (isSupabaseConfigured) return [];
        return readLocalJSON('fisio_patients_v3', INITIAL_DEMO_PATIENTS);
    });

    const loadPatients = useCallback(async () => {
        try {
            const data = await fetchPatients();
            if (Array.isArray(data)) {
               setPatients(data);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    // Track which account finished loading; a previous account's data cannot unlock the UI.
    const [loadedFor, setLoadedFor] = useState(null);
    const [initialLoadError, setInitialLoadError] = useState('');
    useEffect(() => {
        if (!isSupabaseConfigured) return;
        let cancelled = false;
        const owner = session?.user?.id;
        setPatients([]);
        setLoadedFor(null);
        setInitialLoadError('');
        if (owner) {
            withTimeout(fetchPatients(), 15000).then((data) => {
                if (cancelled) return;
                if (Array.isArray(data)) setPatients(data);
                else setInitialLoadError('La respuesta de patients no es válida.');
            }).catch((error) => {
                if (!cancelled) {
                    console.error('[MINA] No se pudo cargar patients:', error);
                    setInitialLoadError('No se pudieron cargar patients. Revisa la conexión e inténtalo de nuevo.');
                }
            }).finally(() => {
                if (!cancelled) setLoadedFor(owner);
            });
        }
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    useEffect(() => {
        if (!isSupabaseConfigured) {
          writeLocalJSON('fisio_patients_v3', patients);
        }
    }, [patients]);

    const patientsById = useMemo(() => {
        const map = new Map();
        for (const p of patients) {
          map.set(p.id, p);
        }
        return map;
    }, [patients]);

    const savePatient = async (payload, editingPatientId) => {
        try {
            const data = await apiSavePatient(payload, editingPatientId, session?.user?.id);
            if (editingPatientId) {
                setPatients((prev) => prev.map((p) => (p.id === data.id ? data : p)));
            } else {
                setPatients((prev) => [...prev, data]);
            }
            return { success: true };
        } catch (error) {
            console.error('[Supabase Error]:', error);
            return { success: false, error: error.message };
        }
    };

    const deletePatient = async (patientId) => {
        const hasAppointments = (appointmentsRef.current || []).some((a) => a.patient_id === patientId);
        if (hasAppointments) {
          const msg = 'No se puede eliminar un paciente que ya tiene sesiones clínicas registradas en su historial.';
          setBannerAlert({ type: 'warning', text: msg });
          appendAuditLog('HISTORIAL', msg);
          return;
        }

        try {
            await apiDeletePatient(patientId);
            setPatients((prev) => prev.filter((p) => p.id !== patientId));
            appendAuditLog('PACIENTES', `Paciente sin citas (ID ${String(patientId).slice(0, 8)}) eliminado.`);
        } catch (error) {
            setBannerAlert({ type: 'error', text: error.message });
        }
    };

    return {
        patients,
        setPatients,
        patientsById,
        savePatient,
        deletePatient,
        loadPatients,
        loadedFor,
        initialLoadError
    };
}
