import { useState, useEffect } from 'react';
import { fetchAvailability, updateAvailability as apiUpdateAvailability } from '../services/availabilityService';
import { withTimeout } from '../utils/withTimeout';
import { DAYS_OF_WEEK } from '../utils/constants';

export function useAvailability(session, setBannerAlert) {
    const [availability, setAvailability] = useState([]);

    const [loadedFor, setLoadedFor] = useState(null);
    const [initialLoadError, setInitialLoadError] = useState('');
    useEffect(() => {
        let cancelled = false;
        const owner = session?.user?.id;
        setAvailability([]);
        setLoadedFor(null);
        setInitialLoadError('');
        if (owner) {
            withTimeout(fetchAvailability(), 15000).then((data) => {
                if (cancelled) return;
                if (Array.isArray(data)) setAvailability(data);
                else setInitialLoadError('La respuesta de horarios no es válida.');
            }).catch((error) => {
                if (!cancelled) {
                    console.error('[MINA] Error al cargar horarios', error);
                    setInitialLoadError('No se pudieron cargar horarios. Revisa la conexión y recarga.');
                }
            }).finally(() => {
                if (!cancelled) setLoadedFor(owner);
            });
        }
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    const saveAvailabilityDay = async (payload) => {
        try {
            const saved = await apiUpdateAvailability(payload);
            setAvailability((prev) => {
                const exists = prev.some((item) => item.day_of_week === payload.day_of_week);
                if (exists) {
                    return prev.map((item) => item.day_of_week === payload.day_of_week ? saved : item);
                }
                return [...prev, saved];
            });
            return { success: true };
        } catch (error) {
            console.error('[MINA] Error de guardado:', error);
            setBannerAlert({ type: 'error', text: 'No se pudo guardar la configuración de horario: ' + error.message });
            return { success: false, error: error.message };
        }
    };

    const handleEnableDayNow = async (dayOfWeekNumber) => {
        const dayLabel = DAYS_OF_WEEK.find((d) => d.value === dayOfWeekNumber)?.label || 'Día';

        const existingRule = availability.find((item) => item.day_of_week === dayOfWeekNumber);
        const payload = {
            day_of_week: dayOfWeekNumber,
            is_active: true,
            start_time: existingRule?.start_time || '08:00',
            end_time: existingRule?.end_time || '13:00',
            slot_duration_minutes: 60
        };

        const result = await saveAvailabilityDay(payload);
        if (result.success) {
            setBannerAlert({
                type: 'info',
                text: `${dayLabel} activado correctamente en el calendario (${payload.start_time} a ${payload.end_time}). Puedes ajustar las horas en la pestaña Horarios.`,
            });
        }
    };

    return {
        availability,
        handleEnableDayNow,
        saveAvailabilityDay,
        loadedFor,
        initialLoadError
    };
}
