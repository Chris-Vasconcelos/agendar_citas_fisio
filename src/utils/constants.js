export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export const DEFAULT_PROFESSIONAL = 'Lic. Ft. Eduardo — Fisioterapia Deportiva';

export const INITIAL_DEMO_PATIENTS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    full_name: 'María Fernanda López',
    age: 29,
    phone: '5512345678',
    email: 'mfernanda@ejemplo.com',
    allergies: 'AINEs (Ketorolaco)',
    previous_studies: 'Resonancia magnética de rodilla derecha (hace 2 meses)',
    family_history: 'Madre con hipertensión arterial',
    consultation_reason: 'Esguince de ligamento colateral medial grado II practicando fútbol',
    privacy_consent: true,
    privacy_consent_at: '2026-10-20T15:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    full_name: 'Carlos Eduardo Ramírez',
    age: 34,
    phone: '5587654321',
    email: 'cramirez@ejemplo.com',
    allergies: 'Ninguna conocida',
    previous_studies: 'Ultrasonido de hombro derecho',
    family_history: 'Sin antecedentes familiares registrados',
    consultation_reason: 'Tendinopatía del manguito rotador por entrenamiento de natación',
    privacy_consent: true,
    privacy_consent_at: '2026-10-21T16:00:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    full_name: 'Ana Sofía Hernández',
    age: 24,
    phone: '5544332211',
    email: null,
    allergies: 'Látex',
    previous_studies: 'Radiografía AP y lateral de tobillo izquierdo (sin fractura)',
    family_history: 'Padre con diabetes mellitus tipo 2',
    consultation_reason: 'Rehabilitación post-esguince de tobillo izquierdo grado I',
    privacy_consent: true,
    privacy_consent_at: '2026-10-22T17:00:00.000Z',
  },
];

export const INITIAL_DEMO_AVAILABILITY = [
  { day_of_week: 1, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 2, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 3, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 4, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 5, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 6, start_time: '08:00', end_time: '13:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 0, start_time: '08:00', end_time: '13:00', slot_duration_minutes: 60, is_active: false },
];
