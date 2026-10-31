import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAppointments, saveAppointment as apiSaveAppointment, cancelAppointment as apiCancelAppointment } from '../services/appointmentService';
import { getTodayDateString, formatTimeShort } from '../utils/date';
import { DEFAULT_PROFESSIONAL } from '../utils/constants';
import { isSupabaseConfigured } from '../lib/supabase';

export function useAppointments(session, appendAuditLog, setBannerAlert, patientsById) {
    const [appointments, setAppointments] = useState(() => {
        const saved = localStorage.getItem('fisio_appointments_v3');
        if (saved) return JSON.parse(saved);
        const today = getTodayDateString();
        const s1 = new Date(`${today}T09:00:00`).toISOString();
        const e1 = new Date(`${today}T10:00:00`).toISOString();
        const s2 = new Date(`${today}T10:00:00`).toISOString();
        const e2 = new Date(`${today}T11:00:00`).toISOString();
        return [
            {
              id: 'aaaa1111-1111-4111-8111-111111111111',
              patient_id: '11111111-1111-4111-8111-111111111111',
              slot_number: 1,
              start_time: s1,
              end_time: e1,
              status: 'scheduled',
              patient_condition: 'Disminución de edema en cara medial de rodilla derecha, EVA 3/10.',
              treatment_notes:
                'Electroterapia interferencial 15 min, ejercicios isométricos de cuádriceps y crioterapia final.',
              professional_name: DEFAULT_PROFESSIONAL,
            },
            {
              id: 'bbbb2222-2222-4222-8222-222222222222',
              patient_id: '22222222-2222-4222-8222-222222222222',
              slot_number: 2,
              start_time: s1,
              end_time: e1,
              status: 'scheduled',
              patient_condition: 'Arco de movilidad en abducción de hombro a 140 grados con molestia leve.',
              treatment_notes:
                'Terapia manual escapulohumeral, ultrasonido terapéutico 1 MHz y fortalecimiento con liga.',
              professional_name: DEFAULT_PROFESSIONAL,
            },
            {
              id: 'cccc3333-3333-4333-8333-333333333333',
              patient_id: '33333333-3333-4333-8333-333333333333',
              slot_number: 1,
              start_time: s2,
              end_time: e2,
              status: 'scheduled',
              patient_condition: 'Marcha sin claudicación, estabilidad monopodal conservada.',
              treatment_notes: 'Propiocepción en disco inestable y movilización articular de tobillo.',
              professional_name: DEFAULT_PROFESSIONAL,
            },
        ];
    });

    const loadAppointments = useCallback(async () => {
        try {
            const data = await fetchAppointments();
            if (Array.isArray(data)) {
               setAppointments(data);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        if (session) {
            loadAppointments();
        } else if (isSupabaseConfigured) {
            setAppointments([]);
        }
    }, [session, loadAppointments]);

    useEffect(() => {
        if (!isSupabaseConfigured) {
          localStorage.setItem('fisio_appointments_v3', JSON.stringify(appointments));
        }
    }, [appointments]);


    const validateAppointmentConstraints = (startISO, endISO, requestedSlot = 'auto', ignoreAppointmentId = null) => {
        const startMs = new Date(startISO).getTime();
        const endMs = new Date(endISO).getTime();

        if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
          return { valid: false, error: 'Las fechas u horas seleccionadas no son válidas.' };
        }

        if (endMs <= startMs) {
          return {
            valid: false,
            field: 'endTime',
            error: 'La hora de término debe ser posterior a la hora de inicio.',
          };
        }

        const overlappingActive = appointments.filter((apt) => {
          if (apt.id === ignoreAppointmentId) return false;
          if (apt.status === 'cancelled') return false;
          const aStart = new Date(apt.start_time).getTime();
          const aEnd = new Date(apt.end_time).getTime();
          return startMs < aEnd && aStart < endMs;
        });

        const occupiedSlots = new Set(overlappingActive.map((a) => Number(a.slot_number || 1)));

        if (requestedSlot === 'auto') {
          if (!occupiedSlots.has(1)) {
            return { valid: true, assignedSlot: 1 };
          }
          if (!occupiedSlots.has(2)) {
            return { valid: true, assignedSlot: 2 };
          }
          const names = overlappingActive
            .map((a) => `${patientsById.get(a.patient_id)?.full_name || 'Paciente'} (Espacio ${a.slot_number || 1})`)
            .join(' y ');
          const sqlErrorMsg = `Horario lleno: Los Espacios 1 y 2 ya están ocupados en ese horario por ${names}. Selecciona otra hora.`;
          console.error(sqlErrorMsg);
          appendAuditLog('AGENDA', sqlErrorMsg);
          return {
            valid: false,
            field: 'startTime',
            error: sqlErrorMsg,
          };
        }

        const numericSlot = Number(requestedSlot);
        if (numericSlot !== 1 && numericSlot !== 2) {
          return {
            valid: false,
            field: 'slot_number',
            error: 'Selecciona Espacio 1 o Espacio 2.',
          };
        }

        const conflictOnSlot = overlappingActive.find((a) => Number(a.slot_number || 1) === numericSlot);
        if (conflictOnSlot) {
          const conflictPatient = patientsById.get(conflictOnSlot.patient_id)?.full_name || 'otro paciente';
          const conflictRange = `${formatTimeShort(conflictOnSlot.start_time)} - ${formatTimeShort(
            conflictOnSlot.end_time
          )}`;
          const sqlErrorMsg = `El Espacio ${numericSlot} ya está ocupado de ${conflictRange} por ${conflictPatient}.`;
          console.error(sqlErrorMsg);
          appendAuditLog('AGENDA', sqlErrorMsg);
          return {
            valid: false,
            field: 'slot_number',
            error: sqlErrorMsg,
          };
        }

        return { valid: true, assignedSlot: numericSlot };
    };


    const saveAppointment = async (payload, editingAppointmentId, assignedSlot) => {
        try {
            const data = await apiSaveAppointment(payload, editingAppointmentId, session?.user?.id);
            if (editingAppointmentId) {
                setAppointments((prev) => prev.map((a) => (a.id === data.id ? data : a)));
            } else {
                setAppointments((prev) => [...prev, data]);
            }
            return { success: true };
        } catch (error) {
            console.error('[Supabase Error]:', error);
            const errMsg = error.code === '23P01' ? `El Espacio ${assignedSlot} ya está ocupado en ese horario.` : error.message;
            return { success: false, error: errMsg };
        }
    };

    const cancelAppointment = async (apt) => {
        try {
            await apiCancelAppointment(apt.id);
            setAppointments((prev) =>
              prev.map((item) => (item.id === apt.id ? { ...item, status: 'cancelled' } : item))
            );
            appendAuditLog(
              'AGENDA',
              `Cita ${String(apt.id).slice(0, 8)} marcada como Cancelada; Espacio ${apt.slot_number || 1} liberado.`
            );
        } catch (error) {
            setBannerAlert({ type: 'error', text: error.message });
        }
    };


    return {
        appointments,
        setAppointments,
        loadAppointments,
        validateAppointmentConstraints,
        saveAppointment,
        cancelAppointment
    };
}
