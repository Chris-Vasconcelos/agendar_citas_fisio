import { useState, useEffect, useCallback } from 'react';
import { fetchAvailability } from '../services/availabilityService';
import { INITIAL_DEMO_AVAILABILITY } from '../utils/constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { DAYS_OF_WEEK } from '../utils/constants';

export function useAvailability(session, setBannerAlert) {
    const [availability, setAvailability] = useState(() => {
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
        if (session) {
            loadAvailability();
        }
    }, [session, loadAvailability]);

    useEffect(() => {
        if (!isSupabaseConfigured) {
          localStorage.setItem('fisio_availability_v3', JSON.stringify(availability));
        }
    }, [availability]);


    const handleEnableDayNow = (dayOfWeekNumber) => {
        const dayLabel = DAYS_OF_WEEK.find((d) => d.value === dayOfWeekNumber)?.label || 'Día';
        setAvailability((prev) => {
            const exists = prev.some((item) => item.day_of_week === dayOfWeekNumber);
            if (exists) {
                return prev.map((item) =>
                  item.day_of_week === dayOfWeekNumber
                    ? {
                        ...item,
                        is_active: true,
                        start_time: item.start_time || '08:00',
                        end_time: item.end_time || '13:00',
                      }
                    : item
                );
            }
            return [
                ...prev,
                {
                  day_of_week: dayOfWeekNumber,
                  start_time: '08:00',
                  end_time: '13:00',
                  slot_duration_minutes: 60,
                  is_active: true,
                },
            ];
        });
        setBannerAlert({
            type: 'info',
            text: `${dayLabel} activado correctamente en el calendario (08:00 a 13:00). Puedes ajustar las horas en la pestaña Horarios.`,
        });
    };

    return {
        availability,
        setAvailability,
        loadAvailability,
        handleEnableDayNow
    };
}
