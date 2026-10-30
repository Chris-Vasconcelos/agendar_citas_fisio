import { useState, useEffect, useCallback } from 'react';
import { fetchAvailability, updateAvailability as apiUpdateAvailability } from '../services/availabilityService';
import { INITIAL_DEMO_AVAILABILITY } from '../utils/constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { DAYS_OF_WEEK } from '../utils/constants';

export function useAvailability(session, setBannerAlert) {
    const [availability, setAvailability] = useState(() => {
        if (isSupabaseConfigured) return [];
        const saved = localStorage.getItem('fisio_availability_v3');
        return saved ? JSON.parse(saved) : INITIAL_DEMO_AVAILABILITY;
    });

    const loadAvailability = useCallback(async () => {
        try {
            const data = await fetchAvailability();
            if (Array.isArray(data)) {
               setAvailability(data);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        if (!isSupabaseConfigured) return;

        // Invalidate the previous user's data and any outstanding request.
        let cancelled = false;
        setAvailability([]);
        if (session?.user?.id) {
            fetchAvailability().then((data) => {
                if (!cancelled && Array.isArray(data)) setAvailability(data);
            }).catch((error) => {
                if (!cancelled) console.error('[Supabase load error]:', error);
            });
        }
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    useEffect(() => {
        if (!isSupabaseConfigured) {
          localStorage.setItem('fisio_availability_v3', JSON.stringify(availability));
        }
    }, [availability]);


    const saveAvailabilityDay = async (payload) => {
        try {
            const saved = await apiUpdateAvailability(payload, session?.user?.id);
            setAvailability((prev) => {
                const exists = prev.some((item) => item.day_of_week === payload.day_of_week);
                if (exists) {
                    return prev.map((item) => item.day_of_week === payload.day_of_week ? saved : item);
                }
                return [...prev, saved];
            });
            return { success: true };
        } catch (error) {
            console.error('[Supabase Error]:', error);
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
        setAvailability,
        loadAvailability,
        handleEnableDayNow,
        saveAvailabilityDay
    };
}
