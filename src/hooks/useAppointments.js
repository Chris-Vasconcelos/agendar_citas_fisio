import { useState, useEffect } from 'react';
import { fetchAppointments, saveAppointment as apiSaveAppointment, cancelAppointment as apiCancelAppointment } from '../services/appointmentService';
import { formatTimeShort } from '../utils/date';
import { withTimeout } from '../utils/withTimeout';

export function useAppointments(session, appendAuditLog, setBannerAlert, patientsById) {
    const [appointments, setAppointments] = useState([]);

    const [loadedFor, setLoadedFor] = useState(null);
    const [initialLoadError, setInitialLoadError] = useState('');
    useEffect(() => {
        let cancelled = false;
        const owner = session?.user?.id;
        setAppointments([]);
        setLoadedFor(null);
        setInitialLoadError('');
        if (owner) {
            withTimeout(fetchAppointments(), 15000).then((data) => {
                if (cancelled) return;
                if (Array.isArray(data)) setAppointments(data);
                else setInitialLoadError('La respuesta de citas no es válida.');
            }).catch((error) => {
                if (!cancelled) {
                    console.error('[MINA] Error al cargar citas', error);
                    setInitialLoadError('No se pudieron cargar citas. Revisa la conexión y recarga.');
                }
            }).finally(() => {
                if (!cancelled) setLoadedFor(owner);
            });
        }
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    const validateAppointmentConstraints = (startISO, endISO, requestedSlot = 'auto', ignoreAppointmentId = null, patientId = null) => {
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

        if (patientId && overlappingActive.some((a) => String(a.patient_id) === String(patientId))) {
          return {
            valid: false,
            field: 'patient_id',
            error: 'Este paciente ya tiene una cita en ese horario. Selecciona otra hora.'
          };
        }

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
          // Avoid logging identifiable patient names to the browser console.
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
          appendAuditLog('AGENDA', sqlErrorMsg);
          return {
            valid: false,
            field: 'slot_number',
            error: sqlErrorMsg,
          };
        }

        return { valid: true, assignedSlot: numericSlot };
    };

    const saveAppointment = async (payload, editingAppointmentId) => {
        try {
            const data = await apiSaveAppointment(payload, editingAppointmentId);
            if (editingAppointmentId) {
                setAppointments((prev) => prev.map((a) => (a.id === data.id ? data : a)));
            } else {
                setAppointments((prev) => [...prev, data]);
            }
            return { success: true };
        } catch (error) {
            console.error('[MINA] Error de guardado:', error);
            const errMsg = error.message;
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
        validateAppointmentConstraints,
        saveAppointment,
        cancelAppointment,
        loadedFor,
        initialLoadError
    };
}
