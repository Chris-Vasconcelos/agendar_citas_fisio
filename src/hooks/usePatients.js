import { useState, useEffect, useMemo } from 'react';
import { fetchPatients, savePatient as apiSavePatient, deletePatient as apiDeletePatient } from '../services/patientService';
import { withTimeout } from '../utils/withTimeout';

export function usePatients(session, appendAuditLog, setBannerAlert, locked = false) {
    const [patients, setPatients] = useState([]);

    const [loadedFor, setLoadedFor] = useState(null);
    const [initialLoadError, setInitialLoadError] = useState('');
    useEffect(() => {
        if (locked) return;
        let cancelled = false;
        const owner = session?.user?.id;
        setPatients([]);
        setLoadedFor(null);
        setInitialLoadError('');
        if (owner) {
            withTimeout(fetchPatients(), 15000).then((data) => {
                if (cancelled) return;
                if (Array.isArray(data)) setPatients(data);
                else setInitialLoadError('La respuesta de pacientes no es válida.');
            }).catch((error) => {
                if (!cancelled) {
                    console.error('[MINA] No se pudo cargar pacientes:', error);
                    setInitialLoadError('No se pudieron cargar pacientes. Revisa la conexión e inténtalo de nuevo.');
                }
            }).finally(() => {
                if (!cancelled) setLoadedFor(owner);
            });
        }
        return () => { cancelled = true; };
    }, [session?.user?.id, locked]);

    const patientsById = useMemo(() => {
        const map = new Map();
        for (const p of patients) {
          map.set(p.id, p);
        }
        return map;
    }, [patients]);

    const savePatient = async (payload, editingPatientId) => {
        try {
            const data = await apiSavePatient(payload, editingPatientId);
            if (editingPatientId) {
                setPatients((prev) => prev.map((p) => (p.id === data.id ? data : p)));
            } else {
                setPatients((prev) => [...prev, data]);
            }
            return { success: true };
        } catch (error) {
            console.error('[MINA] Error de guardado:', error);
            return { success: false, error: error.message };
        }
    };

    const deletePatient = async (patientId) => {
        try {
            const saved = await apiDeletePatient(patientId);
            setPatients((prev) => prev.map((p) => p.id === patientId ? saved : p));
            appendAuditLog('PACIENTES', 'Expediente archivado; se conserva su historial.');
        } catch (error) {
            setBannerAlert({ type: 'error', text: error.message });
        }
    };

    return {
        patients,
        patientsById,
        savePatient,
        deletePatient,
        loadedFor,
        initialLoadError
    };
}
