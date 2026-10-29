import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchPatients, savePatient as apiSavePatient, deletePatient as apiDeletePatient } from '../services/patientService';
import { INITIAL_DEMO_PATIENTS } from '../utils/constants';
import { isSupabaseConfigured } from '../lib/supabase';

export function usePatients(session, appendAuditLog, setBannerAlert, appointments) {
    const [patients, setPatients] = useState(() => {
        const saved = localStorage.getItem('fisio_patients_v3');
        return saved ? JSON.parse(saved) : INITIAL_DEMO_PATIENTS;
    });

    const loadPatients = useCallback(async () => {
        try {
            const data = await fetchPatients();
            if (data && data.length > 0) {
               setPatients(data);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        if (session) {
            loadPatients();
        }
    }, [session, loadPatients]);

    useEffect(() => {
        if (!isSupabaseConfigured) {
          localStorage.setItem('fisio_patients_v3', JSON.stringify(patients));
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
        const hasAppointments = appointments.some((a) => a.patient_id === patientId);
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
        loadPatients
    };
}
