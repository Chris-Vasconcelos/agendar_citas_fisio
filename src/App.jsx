import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
  MessageCircle,
  Shield,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  FileText,
  Download,
  Upload,
  ClipboardList,
  Lock,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOutUser,
} from './lib/supabase';
import { TopNav } from './components/TopNav';
import { BottomNav } from './components/BottomNav';
import { Agenda } from './pages/Agenda';
import { Patients } from './pages/Patients';
import { Availability } from './pages/Availability';
import { Security } from './pages/Security';





const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const DEFAULT_PROFESSIONAL = 'Lic. Ft. Eduardo — Fisioterapia Deportiva';

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCompactDateString() {
  return getTodayDateString().replace(/-/g, '');
}

function addMinutesToTimeStr(timeStr, minutesToAdd) {
  const [hh, mm] = timeStr.split(':').map(Number);
  const total = hh * 60 + mm + Number(minutesToAdd);
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function formatTimeShort(isoString) {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Mexico_City',
    }).format(new Date(isoString));
  } catch {
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

function formatDateHuman(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

function escapeCsvCell(val) {
  const str = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const INITIAL_DEMO_PATIENTS = [
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

// Horario real de Eduardo: Lunes a Viernes de 08:00 a 19:00, Sábado de 08:00 a 13:00 (bloques de 60 min)
const INITIAL_DEMO_AVAILABILITY = [
  { day_of_week: 1, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 2, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 3, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 4, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 5, start_time: '08:00', end_time: '19:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 6, start_time: '08:00', end_time: '13:00', slot_duration_minutes: 60, is_active: true },
  { day_of_week: 0, start_time: '08:00', end_time: '13:00', slot_duration_minutes: 60, is_active: false },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('agenda');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [calendarViewMode, setCalendarViewMode] = useState('week');
  const [designSkill, setDesignSkill] = useState(
    () => localStorage.getItem('fisio_typeui_skill_v2') || 'craft'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', designSkill);
    localStorage.setItem('fisio_typeui_skill_v2', designSkill);
  }, [designSkill]);

  // Autenticación Supabase (Paso 3 de Sección 8)
  const [session, setSession] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Modal de Aviso de Privacidad Integral (LFPDPPP Arts. 8, 9, 15, 16, 17 y 21)
  const [showPrivacyNoticeModal, setShowPrivacyNoticeModal] = useState(false);

  // Datos principales (100% desacoplados de Google Calendar para cumplir prevención de fuga de datos)
  const [patients, setPatients] = useState(() => {
    const saved = localStorage.getItem('fisio_patients_v3');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_PATIENTS;
  });

  const [availability, setAvailability] = useState(() => {
    const saved = localStorage.getItem('fisio_availability_v3');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_AVAILABILITY;
  });

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

  // Alertas y evidencias de auditoría (TEST-01 a TEST-04)
  const [bannerAlert, setBannerAlert] = useState(null);
  const [restoreReport, setRestoreReport] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modal de Cita y Nota de Evolución NOM-004 (Columna única WCAG 2.2 AA)
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [aptForm, setAptForm] = useState({
    patient_id: '',
    slot_number: 'auto',
    date: getTodayDateString(),
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    patient_condition: '',
    treatment_notes: '',
    professional_name: DEFAULT_PROFESSIONAL,
  });
  const [aptFieldErrors, setAptFieldErrors] = useState({});
  const [aptFormError, setAptFormError] = useState('');

  // Modal de Alta / Edición de Paciente (Columna única WCAG 2.2 AA + privacy_consent REQ-SEC-03)
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [selectedPatientForRecord, setSelectedPatientForRecord] = useState(null);
  const [patientForm, setPatientForm] = useState({
    full_name: '',
    age: '',
    phone: '',
    email: '',
    allergies: '',
    previous_studies: '',
    family_history: '',
    consultation_reason: '',
    privacy_consent: false,
  });
  const [patientFieldErrors, setPatientFieldErrors] = useState({});
  const [patientFormError, setPatientFormError] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Persistencia local cuando Supabase no está configurado aún
  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('fisio_patients_v3', JSON.stringify(patients));
      localStorage.setItem('fisio_availability_v3', JSON.stringify(availability));
      localStorage.setItem('fisio_appointments_v3', JSON.stringify(appointments));
    }
  }, [patients, availability, appointments]);

  const appendAuditLog = useCallback((code, detail) => {
    const entry = {
      id: crypto.randomUUID(),
      code,
      detail,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [entry, ...prev.slice(0, 29)]);
  }, []);

  const loadSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const [{ data: pts }, { data: avs }, { data: apts }] = await Promise.all([
      supabase.from('patients').select('*').order('full_name'),
      supabase.from('availability').select('*').order('day_of_week'),
      supabase.from('appointments').select('*').order('start_time'),
    ]);
    if (pts) setPatients(pts);
    if (avs && avs.length > 0) setAvailability(avs);
    if (apts) setAppointments(apts);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        loadSupabaseData();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadSupabaseData();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadSupabaseData]);

  const patientsById = useMemo(() => {
    const map = new Map();
    for (const p of patients) {
      map.set(p.id, p);
    }
    return map;
  }, [patients]);

  const appointmentsForSelectedDate = useMemo(() => {
    return appointments
      .filter((a) => {
        const d = new Date(a.start_time);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === selectedDate;
      })
      .sort((a, b) => {
        const diff = new Date(a.start_time) - new Date(b.start_time);
        if (diff !== 0) return diff;
        return Number(a.slot_number || 1) - Number(b.slot_number || 1);
      });
  }, [appointments, selectedDate]);

  /**
   * Restricción de concurrencia de espacios (Espacio 1 y Espacio 2 por hora)
   */
  const validateAppointmentConstraints = (
    startISO,
    endISO,
    requestedSlot = 'auto',
    ignoreAppointmentId = null
  ) => {
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

  // Guardar o actualizar cita y nota de sesión
  const handleSaveAppointment = async (e) => {
    e.preventDefault();
    setAptFormError('');
    setAptFieldErrors({});

    const errors = {};
    if (!aptForm.patient_id) {
      errors.patient_id = 'Selecciona un paciente para agendar la cita.';
    }
    if (!aptForm.date) {
      errors.date = 'Selecciona la fecha de la cita.';
    }
    if (!aptForm.startTime) {
      errors.startTime = 'Ingresa la hora de inicio.';
    }
    if (!aptForm.endTime) {
      errors.endTime = 'Ingresa la hora de término.';
    }
    if (!aptForm.professional_name || aptForm.professional_name.trim().length < 3) {
      errors.professional_name = 'Ingresa el nombre del fisioterapeuta que atendió la sesión.';
    }

    if (Object.keys(errors).length > 0) {
      setAptFieldErrors(errors);
      setAptFormError('Corrige los campos obligatorios marcados antes de guardar.');
      return;
    }

    const startISO = new Date(`${aptForm.date}T${aptForm.startTime}:00`).toISOString();
    const endISO = new Date(`${aptForm.date}T${aptForm.endTime}:00`).toISOString();

    const validation = validateAppointmentConstraints(
      startISO,
      endISO,
      aptForm.slot_number,
      editingAppointmentId
    );
    if (!validation.valid) {
      if (validation.field) {
        setAptFieldErrors({ [validation.field]: validation.error });
      }
      setAptFormError(validation.error);
      return;
    }

    const assignedSlot = validation.assignedSlot || 1;
    const payload = {
      patient_id: aptForm.patient_id,
      slot_number: assignedSlot,
      start_time: startISO,
      end_time: endISO,
      status: aptForm.status || 'scheduled',
      patient_condition: (aptForm.patient_condition || '').trim(),
      treatment_notes: (aptForm.treatment_notes || '').trim(),
      professional_name: (aptForm.professional_name || DEFAULT_PROFESSIONAL).trim(),
    };

    if (isSupabaseConfigured && supabase && session?.user) {
      if (editingAppointmentId) {
        const { data, error } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', editingAppointmentId)
          .select()
          .single();

        if (error) {
          console.error('[Supabase Error]:', error);
          setAptFormError(
            error.code === '23P01'
              ? `El Espacio ${assignedSlot} ya está ocupado en ese horario.`
              : error.message
          );
          return;
        }
        setAppointments((prev) => prev.map((a) => (a.id === data.id ? data : a)));
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .insert({ user_id: session.user.id, ...payload })
          .select()
          .single();

        if (error) {
          console.error('[Supabase Error]:', error);
          setAptFormError(
            error.code === '23P01'
              ? `El Espacio ${assignedSlot} ya está ocupado en ese horario.`
              : error.message
          );
          return;
        }
        setAppointments((prev) => [...prev, data]);
      }
      setIsAppointmentModalOpen(false);
      return;
    }

    if (editingAppointmentId) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === editingAppointmentId ? { ...a, ...payload } : a))
      );
    } else {
      const newApt = {
        id: crypto.randomUUID(),
        ...payload,
      };
      setAppointments((prev) => [...prev, newApt]);
    }
    setIsAppointmentModalOpen(false);
  };

  const handleCancelAppointment = async (apt) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', apt.id);
      if (error) {
        setBannerAlert({ type: 'error', text: error.message });
        return;
      }
    }

    setAppointments((prev) =>
      prev.map((item) => (item.id === apt.id ? { ...item, status: 'cancelled' } : item))
    );
    appendAuditLog(
      'AGENDA',
      `Cita ${String(apt.id).slice(0, 8)} marcada como Cancelada; Espacio ${apt.slot_number || 1} liberado.`
    );
  };

  /**
   * Activar un día cerrado en 1 clic directamente desde la Agenda
   */
  const handleEnableDayNow = (dayOfWeekNumber) => {
    const dayLabel =
      DAYS_OF_WEEK.find((d) => d.value === dayOfWeekNumber)?.label || 'Día';
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

  /**
   * Guardar Ficha Clínica del Paciente
   */
  const handleSavePatient = async (e) => {
    e.preventDefault();
    setPatientFormError('');
    setPatientFieldErrors({});

    const cleanName = patientForm.full_name.trim();
    const cleanPhone = patientForm.phone.trim();
    const cleanEmail = patientForm.email.trim() || null;
    const numericAge = patientForm.age !== '' ? Number(patientForm.age) : null;
    const cleanReason = patientForm.consultation_reason.trim();

    const fieldErrors = {};
    if (cleanName.length < 3) {
      fieldErrors.full_name = 'El nombre completo debe contener al menos 3 caracteres.';
    }
    if (numericAge === null || Number.isNaN(numericAge) || numericAge < 0 || numericAge > 120) {
      fieldErrors.age = 'La edad debe ser un número válido entre 0 y 120 años.';
    }
    if (cleanPhone.length < 7) {
      fieldErrors.phone = 'Ingresa un teléfono válido de al menos 7 dígitos.';
    }
    if (cleanEmail && (!cleanEmail.includes('@') || cleanEmail.length < 6)) {
      fieldErrors.email = 'Ingresa un correo electrónico válido o déjalo vacío.';
    }
    if (cleanReason.length < 3) {
      fieldErrors.consultation_reason = 'Ingresa el motivo de consulta del paciente.';
    }
    if (!patientForm.privacy_consent) {
      const consentMsg =
        'Es obligatorio confirmar que el paciente aceptó el Aviso de Privacidad antes de guardar su expediente.';
      fieldErrors.privacy_consent = consentMsg;
      console.error(consentMsg);
      appendAuditLog('PACIENTES', consentMsg);
    }

    if (Object.keys(fieldErrors).length > 0) {
      setPatientFieldErrors(fieldErrors);
      setPatientFormError(
        'Revisa los campos obligatorios marcados antes de guardar el expediente.'
      );
      return;
    }

    const payload = {
      full_name: cleanName,
      age: numericAge,
      phone: cleanPhone,
      email: cleanEmail,
      allergies: patientForm.allergies.trim() || 'Ninguna conocida',
      previous_studies: patientForm.previous_studies.trim() || 'Sin estudios previos',
      family_history:
        patientForm.family_history.trim() || 'Sin antecedentes familiares registrados',
      consultation_reason: cleanReason,
      privacy_consent: true,
      privacy_consent_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && session?.user) {
      if (editingPatientId) {
        const { data, error } = await supabase
          .from('patients')
          .update(payload)
          .eq('id', editingPatientId)
          .select()
          .single();

        if (error) {
          setPatientFormError(error.message);
          return;
        }
        setPatients((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      } else {
        const { data, error } = await supabase
          .from('patients')
          .insert({ user_id: session.user.id, ...payload })
          .select()
          .single();

        if (error) {
          setPatientFormError(error.message);
          return;
        }
        setPatients((prev) => [...prev, data]);
      }
    } else {
      if (editingPatientId) {
        setPatients((prev) =>
          prev.map((p) => (p.id === editingPatientId ? { ...p, ...payload } : p))
        );
      } else {
        const newPt = {
          id: crypto.randomUUID(),
          ...payload,
        };
        setPatients((prev) => [...prev, newPt]);
      }
    }

    setIsPatientModalOpen(false);
    setEditingPatientId(null);
  };

  const openCreatePatientModal = () => {
    setEditingPatientId(null);
    setPatientFieldErrors({});
    setPatientFormError('');
    setPatientForm({
      full_name: '',
      age: '',
      phone: '',
      email: '',
      allergies: '',
      previous_studies: '',
      family_history: '',
      consultation_reason: '',
      privacy_consent: false,
    });
    setIsPatientModalOpen(true);
  };

  const openEditPatientModal = (pt) => {
    setEditingPatientId(pt.id);
    setPatientFieldErrors({});
    setPatientFormError('');
    setPatientForm({
      full_name: pt.full_name || '',
      age: pt.age !== null && pt.age !== undefined ? String(pt.age) : '',
      phone: pt.phone || '',
      email: pt.email || '',
      allergies: pt.allergies || '',
      previous_studies: pt.previous_studies || '',
      family_history: pt.family_history || '',
      consultation_reason: pt.consultation_reason || '',
      privacy_consent: Boolean(pt.privacy_consent),
    });
    setIsPatientModalOpen(true);
  };

  const handleDeletePatient = async (patientId) => {
    const hasAppointments = appointments.some((a) => a.patient_id === patientId);
    if (hasAppointments) {
      const msg =
        'No se puede eliminar un paciente que ya tiene sesiones clínicas registradas en su historial.';
      setBannerAlert({ type: 'warning', text: msg });
      appendAuditLog('HISTORIAL', msg);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('patients').delete().eq('id', patientId);
      if (error) {
        setBannerAlert({ type: 'error', text: error.message });
        return;
      }
    }

    setPatients((prev) => prev.filter((p) => p.id !== patientId));
    appendAuditLog('PACIENTES', `Paciente sin citas (ID ${String(patientId).slice(0, 8)}) eliminado.`);
  };

  const openCreateAppointmentModal = (
    defaultStart = '09:00',
    defaultSlot = 'auto',
    customDate = selectedDate
  ) => {
    const targetDate = customDate || selectedDate;
    setSelectedDate(targetDate);
    setEditingAppointmentId(null);
    setAptFieldErrors({});
    setAptFormError('');
    setAptForm({
      patient_id: patients[0]?.id || '',
      slot_number: defaultSlot,
      date: targetDate,
      startTime: defaultStart,
      endTime: addMinutesToTimeStr(defaultStart, 60),
      status: 'scheduled',
      patient_condition: '',
      treatment_notes: '',
      professional_name: DEFAULT_PROFESSIONAL,
    });
    setIsAppointmentModalOpen(true);
  };

  const openEditAppointmentModal = (apt) => {
    const d = new Date(apt.start_time);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setEditingAppointmentId(apt.id);
    setAptFieldErrors({});
    setAptFormError('');
    setAptForm({
      patient_id: apt.patient_id,
      slot_number: String(apt.slot_number || 1),
      date: `${y}-${m}-${day}`,
      startTime: formatTimeShort(apt.start_time),
      endTime: formatTimeShort(apt.end_time),
      status: apt.status || 'scheduled',
      patient_condition: apt.patient_condition || '',
      treatment_notes: apt.treatment_notes || '',
      professional_name: apt.professional_name || DEFAULT_PROFESSIONAL,
    });
    setIsAppointmentModalOpen(true);
  };

  /**
   * Exportación Local en formato JSON (backup_fisio_YYYYMMDD.json)
   */
  const handleExportJsonBackup = () => {
    const backupPayload = {
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      counts: {
        patients: patients.length,
        appointments: appointments.length,
        availability: availability.length,
      },
      patients,
      appointments,
      availability,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = `backup_fisio_${getCompactDateString()}.json`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const logMsg = `Respaldo JSON descargado (${filename}): ${patients.length} pacientes y ${appointments.length} citas.`;
    appendAuditLog('RESPALDO JSON', logMsg);
  };

  /**
   * Exportación a CSV con UTF-8 y Byte Order Mark (BOM: \uFEFF) para Excel
   */
  const handleExportCsvBackup = () => {
    const headers = [
      'ID Cita',
      'Fecha y Hora Inicio',
      'Fecha y Hora Fin',
      'Espacio',
      'Estado Cita',
      'Nombre Completo Paciente',
      'Edad',
      'Teléfono',
      'Alergias',
      'Estudios Previos',
      'Antecedentes Familiares',
      'Motivo de Consulta',
      'Estado del Paciente',
      'Descripción de lo que se le hizo',
      'Fisioterapeuta',
    ];

    const rows = appointments.map((apt) => {
      const pt = patientsById.get(apt.patient_id) || {};
      return [
        apt.id,
        apt.start_time,
        apt.end_time,
        `Espacio ${apt.slot_number || 1}`,
        apt.status,
        pt.full_name || '',
        pt.age ?? '',
        pt.phone || '',
        pt.allergies || '',
        pt.previous_studies || '',
        pt.family_history || '',
        pt.consultation_reason || '',
        apt.patient_condition || '',
        apt.treatment_notes || '',
        apt.professional_name || DEFAULT_PROFESSIONAL,
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = `backup_fisio_${getCompactDateString()}.csv`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    appendAuditLog('EXPORTACIÓN EXCEL', `Archivo CSV generado para Excel (${filename}).`);
  };

  /**
   * Restauración de Respaldo JSON
   */
  const handleImportJsonBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        if (!Array.isArray(parsed.patients) || !Array.isArray(parsed.appointments)) {
          setBannerAlert({
            type: 'error',
            text: 'El archivo seleccionado no tiene un formato válido de respaldo (.json).',
          });
          return;
        }

        const restoredPatients = parsed.patients;
        const validPatientIds = new Set(restoredPatients.map((p) => p.id));
        const restoredAppointments = parsed.appointments.filter((a) =>
          validPatientIds.has(a.patient_id)
        );

        if (isSupabaseConfigured && supabase && session?.user) {
          await supabase.from('patients').upsert(
            restoredPatients.map((p) => ({ ...p, user_id: session.user.id })),
            { onConflict: 'id' }
          );
          await supabase.from('appointments').upsert(
            restoredAppointments.map((a) => ({ ...a, user_id: session.user.id })),
            { onConflict: 'id' }
          );
        }

        setPatients(restoredPatients);
        setAppointments(restoredAppointments);
        if (Array.isArray(parsed.availability) && parsed.availability.length > 0) {
          setAvailability(parsed.availability);
        }

        const report = {
          fileName: file.name,
          restoredAt: new Date().toLocaleString('es-MX'),
          expectedPatients: parsed.patients.length,
          restoredPatientsCount: restoredPatients.length,
          expectedAppointments: parsed.appointments.length,
          restoredAppointmentsCount: restoredAppointments.length,
          integrityMatch:
            parsed.patients.length === restoredPatients.length &&
            parsed.appointments.length === restoredAppointments.length,
        };

        setRestoreReport(report);
        const msg = `Respaldo ${file.name} importado. Pacientes restaurados: ${report.restoredPatientsCount}/${report.expectedPatients}. Citas restauradas: ${report.restoredAppointmentsCount}/${report.expectedAppointments}.`;
        appendAuditLog('RESTAURACIÓN', msg);
      } catch (err) {
        setBannerAlert({
          type: 'error',
          text: `Error al leer el archivo de respaldo: ${err?.message || 'JSON inválido'}`,
        });
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Manejo de Login con Correo y Contraseña (Sección 8, Paso 3)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanEmail = authForm.email.trim();
    const cleanPass = authForm.password;

    if (!cleanEmail.includes('@') || cleanPass.length < 6) {
      setAuthError('Ingresa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }

    if (!isSupabaseConfigured) {
      setAuthSuccess(
        'Modo local activo: Para autenticar contra la nube, coloca VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.'
      );
      return;
    }

    try {
      if (authMode === 'login') {
        const { error } = await signInWithEmailPassword(cleanEmail, cleanPass);
        if (error) {
          setAuthError(error.message);
          return;
        }
        setShowAuthModal(false);
      } else {
        const { error } = await signUpWithEmailPassword(cleanEmail, cleanPass);
        if (error) {
          setAuthError(error.message);
          return;
        }
        setAuthSuccess('Cuenta registrada. Verifica tu correo o inicia sesión.');
      }
    } catch (err) {
      setAuthError(err?.message || 'Error de autenticación.');
    }
  };

  const changeSelectedDateByDays = (delta) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + delta);
    const ny = next.getFullYear();
    const nm = String(next.getMonth() + 1).padStart(2, '0');
    const nd = String(next.getDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        (p.consultation_reason || '').toLowerCase().includes(q) ||
        (p.allergies || '').toLowerCase().includes(q)
    );
  }, [patients, patientSearch]);

  const weekDays = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    const dayOfWeek = current.getDay(); // 0 = Dom, 1 = Lun ... 6 = Sáb
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(y, m - 1, d + diffToMonday);

    const shortNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const fullNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return Array.from({ length: 7 }, (_, idx) => {
      const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
      const dy = dt.getFullYear();
      const dm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const dateStr = `${dy}-${dm}-${dd}`;
      const dow = dt.getDay();
      const rule = availability.find((a) => Number(a.day_of_week) === dow);
      const monthShort = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(dt);

      const dayAppointments = appointments.filter((a) => {
        if (a.status === 'cancelled') return false;
        const ad = new Date(a.start_time);
        const ay = ad.getFullYear();
        const am = String(ad.getMonth() + 1).padStart(2, '0');
        const aday = String(ad.getDate()).padStart(2, '0');
        return `${ay}-${am}-${aday}` === dateStr;
      });

      return {
        dateStr,
        dayOfWeek: dow,
        shortName: shortNames[dow],
        fullName: fullNames[dow],
        dayNumber: dd,
        monthShort,
        rule,
        isActive: Boolean(rule && rule.is_active),
        activeCount: dayAppointments.length,
        appointments: dayAppointments,
      };
    });
  }, [selectedDate, availability, appointments]);

  const weeklyHourRange = useMemo(() => {
    let minH = 8;
    let maxH = 19;
    const activeRules = availability.filter((a) => a.is_active);
    if (activeRules.length > 0) {
      minH = Math.min(...activeRules.map((r) => Number(r.start_time.split(':')[0])));
      maxH = Math.max(...activeRules.map((r) => Number(r.end_time.split(':')[0])));
    }
    const hours = [];
    for (let h = minH; h < maxH; h += 1) {
      hours.push(`${String(h).padStart(2, '0')}:00`);
    }
    return hours;
  }, [availability]);

  const dailyHourlySlots = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const rule = availability.find((a) => Number(a.day_of_week) === dayOfWeek);
    if (!rule || !rule.is_active) return [];

    const [startH] = rule.start_time.split(':').map(Number);
    const [endH] = rule.end_time.split(':').map(Number);
    const hours = [];
    for (let h = startH; h < endH; h += 1) {
      hours.push(`${String(h).padStart(2, '0')}:00`);
    }
    return hours;
  }, [availability, selectedDate]);

  const activeDayAppointments = appointmentsForSelectedDate.filter(
    (a) => a.status !== 'cancelled'
  );
  const weeklyTotalActive = weekDays.reduce((acc, wd) => acc + wd.activeCount, 0);
  const allergyAlertsTodayCount = activeDayAppointments.filter((a) => {
    const pt = patientsById.get(a.patient_id);
    return (
      pt?.allergies &&
      pt.allergies.toLowerCase() !== 'ninguna' &&
      pt.allergies.toLowerCase() !== 'ninguna conocida'
    );
  }).length;
  const completedNotesTodayCount = activeDayAppointments.filter(
    (a) => a.treatment_notes && a.treatment_notes.trim().length > 0
  ).length;

  return (
    <div className="dash-main pb-24" data-theme={designSkill}>
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        designSkill={designSkill}
        setDesignSkill={setDesignSkill}
        patientsCount={patients.length}
        session={session}
        setShowPrivacyNoticeModal={setShowPrivacyNoticeModal}
        signOutUser={signOutUser}
        setShowAuthModal={() => {
          setAuthError('');
          setAuthSuccess('');
          setShowAuthModal(true);
        }}
        openCreateAppointmentModal={openCreateAppointmentModal}
        selectedDate={selectedDate}
      />

      <main id="main-content" className="space-y-6">
        {/* Región dinámica accesible para avisos globales (WCAG aria-live="polite") */}
        <div aria-live="polite">
          {bannerAlert && (
            <article className="craft-card flex-row items-center justify-between gap-2 text-sm font-semibold">
              <span>{bannerAlert.text}</span>
              <button
                type="button"
                onClick={() => setBannerAlert(null)}
                className="secondary-button text-xs"
              >
                Cerrar
              </button>
            </article>
          )}
        </div>

        {activeTab === 'agenda' && (
          <Agenda
            activeDayAppointments={activeDayAppointments}
            dailyHourlySlots={dailyHourlySlots}
            weeklyTotalActive={weeklyTotalActive}
            weekDays={weekDays}
            allergyAlertsTodayCount={allergyAlertsTodayCount}
            completedNotesTodayCount={completedNotesTodayCount}
            changeSelectedDateByDays={changeSelectedDateByDays}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            getTodayDateString={getTodayDateString}
            calendarViewMode={calendarViewMode}
            setCalendarViewMode={setCalendarViewMode}
            formatDateHuman={formatDateHuman}
            handleEnableDayNow={handleEnableDayNow}
            setActiveTab={setActiveTab}
            weeklyHourRange={weeklyHourRange}
            addMinutesToTimeStr={addMinutesToTimeStr}
            appointmentsForSelectedDate={appointmentsForSelectedDate}
            patientsById={patientsById}
            openEditAppointmentModal={openEditAppointmentModal}
            setSelectedPatientForRecord={setSelectedPatientForRecord}
            openCreateAppointmentModal={openCreateAppointmentModal}
            handleCancelAppointment={handleCancelAppointment}
            DEFAULT_PROFESSIONAL={DEFAULT_PROFESSIONAL}
          />
        )}

        {/* VISTA 2: EXPEDIENTES CLÍNICOS */}
        {activeTab === 'patients' && (
          <Patients
            patients={patients}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            filteredPatients={filteredPatients}
            appointments={appointments}
            setSelectedPatientForRecord={setSelectedPatientForRecord}
            openEditPatientModal={openEditPatientModal}
            handleDeletePatient={handleDeletePatient}
            openCreatePatientModal={openCreatePatientModal}
          />
        )}

        {/* VISTA 3: HORARIOS DE CONSULTA (Cuadrícula Responsiva Mobile-First: 1 col móvil -> 2 tablet -> 4 laptop -> 7 escritorio) */}
        {activeTab === 'availability' && (
          <Availability
            DAYS_OF_WEEK={DAYS_OF_WEEK}
            availability={availability}
            setAvailability={setAvailability}
            setActiveTab={setActiveTab}
          />
        )}

        {/* VISTA 4: RESPALDOS Y EXPORTACIÓN DE DATOS */}
        {activeTab === 'security' && (
          <Security
            handleExportJsonBackup={handleExportJsonBackup}
            handleExportCsvBackup={handleExportCsvBackup}
            handleImportJsonBackup={handleImportJsonBackup}
            restoreReport={restoreReport}
            auditLogs={auditLogs}
          />
        )}
      </main>

      {/* MODAL 1: AGENDAR / ATENDER CITA Y NOTA DE SESIÓN */}
      {isAppointmentModalOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-apt-title"
        >
          <div className="form-container my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 id="modal-apt-title" className="text-lg font-bold text-[#222222]">
                {editingAppointmentId
                  ? 'Atender Cita / Nota de Sesión'
                  : 'Agendar Cita (Bloque de 60 min)'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAppointmentModalOpen(false)}
                className="secondary-button text-xs py-1 px-2.5"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} noValidate>
              <div className="form-group">
                <label htmlFor="apt-patient-select" className="form-label">
                  Paciente <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <select
                  id="apt-patient-select"
                  value={aptForm.patient_id}
                  onChange={(e) => setAptForm((prev) => ({ ...prev, patient_id: e.target.value }))}
                  aria-invalid={Boolean(aptFieldErrors.patient_id)}
                  className="form-input"
                  required
                >
                  <option value="">-- Selecciona un paciente --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.age ?? '-'} años · Tel: {p.phone})
                    </option>
                  ))}
                </select>
                <div aria-live="polite">
                  {aptFieldErrors.patient_id && (
                    <span className="error-message active">{aptFieldErrors.patient_id}</span>
                  )}
                </div>
              </div>

              <fieldset className="form-fieldset">
                <legend className="form-legend">
                  Espacio de atención (máx. 2 pacientes por hora){' '}
                  <span className="required-asterisk" aria-hidden="true">*</span>
                </legend>
                <div className="space-y-2 mt-1">
                  <div className="flex items-center gap-2">
                    <input
                      id="slot-option-auto"
                      type="radio"
                      name="slot_number"
                      value="auto"
                      checked={aptForm.slot_number === 'auto'}
                      onChange={(e) => setAptForm((prev) => ({ ...prev, slot_number: e.target.value }))}
                      className="radio-input h-4 w-4"
                    />
                    <label htmlFor="slot-option-auto" className="text-sm font-medium text-[#222222]">
                      Automático (Asignar Espacio 1 o 2 libre)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="slot-option-1"
                      type="radio"
                      name="slot_number"
                      value="1"
                      checked={aptForm.slot_number === '1'}
                      onChange={(e) => setAptForm((prev) => ({ ...prev, slot_number: e.target.value }))}
                      className="radio-input h-4 w-4"
                    />
                    <label htmlFor="slot-option-1" className="text-sm font-medium text-[#222222]">
                      Espacio 1
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="slot-option-2"
                      type="radio"
                      name="slot_number"
                      value="2"
                      checked={aptForm.slot_number === '2'}
                      onChange={(e) => setAptForm((prev) => ({ ...prev, slot_number: e.target.value }))}
                      className="radio-input h-4 w-4"
                    />
                    <label htmlFor="slot-option-2" className="text-sm font-medium text-[#222222]">
                      Espacio 2
                    </label>
                  </div>
                </div>
                <div aria-live="polite">
                  {aptFieldErrors.slot_number && (
                    <span className="error-message active">{aptFieldErrors.slot_number}</span>
                  )}
                </div>
              </fieldset>

              <div className="form-group">
                <label htmlFor="apt-date-input" className="form-label">
                  Fecha de la atención <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="apt-date-input"
                  type="date"
                  value={aptForm.date}
                  onChange={(e) => setAptForm((prev) => ({ ...prev, date: e.target.value }))}
                  aria-invalid={Boolean(aptFieldErrors.date)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="apt-start-time" className="form-label">
                  Hora de inicio <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="apt-start-time"
                  type="time"
                  value={aptForm.startTime}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setAptForm((prev) => ({
                      ...prev,
                      startTime: newStart,
                      endTime: addMinutesToTimeStr(newStart, 60),
                    }));
                  }}
                  aria-invalid={Boolean(aptFieldErrors.startTime)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="apt-end-time" className="form-label">
                  Hora de término <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="apt-end-time"
                  type="time"
                  value={aptForm.endTime}
                  onChange={(e) => setAptForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  aria-invalid={Boolean(aptFieldErrors.endTime)}
                  className="form-input"
                  required
                />
                <div aria-live="polite">
                  {aptFieldErrors.endTime && (
                    <span className="error-message active">{aptFieldErrors.endTime}</span>
                  )}
                </div>
              </div>

              {editingAppointmentId && (
                <>
                  <div className="form-group">
                    <label htmlFor="apt-status-select" className="form-label">
                      Estado de la sesión
                    </label>
                    <select
                      id="apt-status-select"
                      value={aptForm.status}
                      onChange={(e) => setAptForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="form-input"
                    >
                      <option value="scheduled">Programada</option>
                      <option value="completed">Completada (Asistió)</option>
                      <option value="no_show">No asistió</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="apt-patient-condition" className="form-label">
                      Estado o evolución del paciente en la sesión
                    </label>
                    <textarea
                      id="apt-patient-condition"
                      rows={2}
                      value={aptForm.patient_condition}
                      onChange={(e) =>
                        setAptForm((prev) => ({ ...prev, patient_condition: e.target.value }))
                      }
                      placeholder="Ej. Disminución de dolor a la palpación (EVA 2/10), mejoría en rango articular..."
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="apt-treatment-notes" className="form-label">
                      Descripción de lo que se le hizo en la sesión
                    </label>
                    <textarea
                      id="apt-treatment-notes"
                      rows={3}
                      value={aptForm.treatment_notes}
                      onChange={(e) =>
                        setAptForm((prev) => ({
                          ...prev,
                          treatment_notes: e.target.value,
                          status:
                            prev.status === 'scheduled' && e.target.value.trim().length > 0
                              ? 'completed'
                              : prev.status,
                        }))
                      }
                      placeholder="Ej. Electroterapia 15 min, liberación miofascial, ejercicios excéntricos..."
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="apt-professional-name" className="form-label">
                      Fisioterapeuta que atendió{' '}
                      <span className="required-asterisk" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="apt-professional-name"
                      type="text"
                      required
                      value={aptForm.professional_name}
                      onChange={(e) =>
                        setAptForm((prev) => ({ ...prev, professional_name: e.target.value }))
                      }
                      aria-invalid={Boolean(aptFieldErrors.professional_name)}
                      className="form-input"
                    />
                  </div>
                </>
              )}

              <div aria-live="polite" className="mb-4">
                {aptFormError && <div className="error-message active">{aptFormError}</div>}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAppointmentModalOpen(false)}
                  className="secondary-button"
                >
                  Cancelar
                </button>
                <button type="submit" className="submit-button">
                  {editingAppointmentId ? 'Guardar Nota de Sesión y Cambios' : 'Confirmar y Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ALTA / EDICIÓN DE FICHA CLÍNICA */}
      {isPatientModalOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-patient-title"
        >
          <div className="form-container my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 id="modal-patient-title" className="text-lg font-bold text-[#222222]">
                {editingPatientId ? 'Editar Expediente del Paciente' : 'Alta de Paciente y Expediente'}
              </h2>
              <button
                type="button"
                onClick={() => setIsPatientModalOpen(false)}
                className="secondary-button text-xs py-1 px-2.5"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSavePatient} noValidate>
              <div className="form-group">
                <label htmlFor="patient-full-name" className="form-label">
                  Nombre completo <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="patient-full-name"
                  type="text"
                  required
                  minLength={3}
                  value={patientForm.full_name}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  aria-invalid={Boolean(patientFieldErrors.full_name)}
                  placeholder="Ej. Juan Carlos Morales"
                  className="form-input"
                />
                <div aria-live="polite">
                  {patientFieldErrors.full_name && (
                    <span className="error-message active">{patientFieldErrors.full_name}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="patient-age" className="form-label">
                  Edad <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="patient-age"
                  type="number"
                  required
                  min={0}
                  max={120}
                  value={patientForm.age}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, age: e.target.value }))}
                  aria-invalid={Boolean(patientFieldErrors.age)}
                  placeholder="Ej. 29"
                  className="form-input"
                />
                <div aria-live="polite">
                  {patientFieldErrors.age && (
                    <span className="error-message active">{patientFieldErrors.age}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="patient-phone" className="form-label">
                  Teléfono / WhatsApp <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="patient-phone"
                  type="tel"
                  required
                  minLength={7}
                  value={patientForm.phone}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, phone: e.target.value }))}
                  aria-invalid={Boolean(patientFieldErrors.phone)}
                  placeholder="Ej. 5512345678"
                  className="form-input"
                />
                <div aria-live="polite">
                  {patientFieldErrors.phone && (
                    <span className="error-message active">{patientFieldErrors.phone}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="patient-reason" className="form-label">
                  Motivo de consulta <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="patient-reason"
                  rows={2}
                  required
                  value={patientForm.consultation_reason}
                  onChange={(e) =>
                    setPatientForm((prev) => ({ ...prev, consultation_reason: e.target.value }))
                  }
                  aria-invalid={Boolean(patientFieldErrors.consultation_reason)}
                  placeholder="Ej. Esguince de tobillo grado II..."
                  className="form-input"
                />
                <div aria-live="polite">
                  {patientFieldErrors.consultation_reason && (
                    <span className="error-message active">
                      {patientFieldErrors.consultation_reason}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="patient-allergies" className="form-label">
                  Alergias (Destacadas en alerta visual durante la consulta)
                </label>
                <input
                  id="patient-allergies"
                  type="text"
                  value={patientForm.allergies}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, allergies: e.target.value }))}
                  placeholder="Ej. Ninguna conocida, AINEs, Penicilina, Látex..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="patient-studies" className="form-label">
                  Estudios previos
                </label>
                <textarea
                  id="patient-studies"
                  rows={2}
                  value={patientForm.previous_studies}
                  onChange={(e) =>
                    setPatientForm((prev) => ({ ...prev, previous_studies: e.target.value }))
                  }
                  placeholder="Ej. Radiografía AP y lateral, resonancia magnética, ultrasonido..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="patient-family-history" className="form-label">
                  Antecedentes familiares
                </label>
                <textarea
                  id="patient-family-history"
                  rows={2}
                  value={patientForm.family_history}
                  onChange={(e) =>
                    setPatientForm((prev) => ({ ...prev, family_history: e.target.value }))
                  }
                  placeholder="Ej. Padre con diabetes tipo 2, madre con hipertensión..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="patient-email" className="form-label">
                  Correo electrónico (opcional)
                </label>
                <input
                  id="patient-email"
                  type="email"
                  value={patientForm.email}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, email: e.target.value }))}
                  aria-invalid={Boolean(patientFieldErrors.email)}
                  placeholder="paciente@ejemplo.com"
                  className="form-input"
                />
              </div>

              <fieldset className="form-fieldset">
                <legend className="form-legend">
                  Consentimiento de Privacidad{' '}
                  <span className="required-asterisk" aria-hidden="true">*</span>
                </legend>
                <div className="flex items-start gap-2 mt-1">
                  <input
                    id="patient-privacy-consent"
                    type="checkbox"
                    checked={patientForm.privacy_consent}
                    onChange={(e) =>
                      setPatientForm((prev) => ({ ...prev, privacy_consent: e.target.checked }))
                    }
                    aria-invalid={Boolean(patientFieldErrors.privacy_consent)}
                    className="h-4 w-4 mt-1"
                  />
                  <label htmlFor="patient-privacy-consent" className="text-xs text-[#222222]">
                    El paciente aceptó el{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyNoticeModal(true)}
                      className="underline font-bold text-[#004070] cursor-pointer"
                    >
                      Aviso de Privacidad
                    </button>{' '}
                    para el registro de su expediente clínico.
                  </label>
                </div>
                <div aria-live="polite">
                  {patientFieldErrors.privacy_consent && (
                    <span className="error-message active">
                      {patientFieldErrors.privacy_consent}
                    </span>
                  )}
                </div>
              </fieldset>

              <div aria-live="polite" className="mb-4">
                {patientFormError && <div className="error-message active">{patientFormError}</div>}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPatientModalOpen(false)}
                  className="secondary-button"
                >
                  Cancelar
                </button>
                <button type="submit" className="submit-button">
                  Guardar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESUMEN CLÍNICO E HISTORIAL CRONOLÓGICO DE SESIONES */}
      {selectedPatientForRecord && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-record-title"
        >
          <div className="form-container my-6 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-2 border-b-2 border-[#595959] pb-3">
              <div>
                <h2 id="modal-record-title" className="text-lg font-bold text-[#222222]">
                  Expediente Clínico: {selectedPatientForRecord.full_name} (
                  {selectedPatientForRecord.age ?? '-'} años)
                </h2>
                <p className="text-xs text-slate-700">
                  Tel: {selectedPatientForRecord.phone} · Historial clínico del paciente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientForRecord(null)}
                className="secondary-button text-xs py-1 px-2.5"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="p-2.5 rounded-sm bg-[#fff0f0] border-2 border-[#990000] font-bold text-[#990000]">
                ⚠️ Alergias: {selectedPatientForRecord.allergies || 'Ninguna conocida'}
              </div>
              <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-300">
                <strong>Motivo de consulta:</strong>{' '}
                {selectedPatientForRecord.consultation_reason || '-'}
              </div>
              <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-300">
                <strong>Estudios previos:</strong>{' '}
                {selectedPatientForRecord.previous_studies || '-'}
              </div>
              <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-300">
                <strong>Antecedentes familiares:</strong>{' '}
                {selectedPatientForRecord.family_history || '-'}
              </div>
            </div>

            <div className="space-y-2 border-t-2 border-[#595959] pt-3">
              <h3 className="text-sm font-bold text-[#222222]">
                Historial de Sesiones y Tratamientos
              </h3>
              {appointments
                .filter((a) => a.patient_id === selectedPatientForRecord.id)
                .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
                .map((ses) => (
                  <div
                    key={ses.id}
                    className="rounded-sm border border-[#595959] p-3 bg-white text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-[#004070]">
                      <span>
                        {new Date(ses.start_time).toLocaleDateString('es-MX')} ·{' '}
                        {formatTimeShort(ses.start_time)} - {formatTimeShort(ses.end_time)} (Espacio{' '}
                        {ses.slot_number || 1})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientForRecord(null);
                          openEditAppointmentModal(ses);
                        }}
                        className="underline text-[#004070] cursor-pointer"
                      >
                        Editar nota
                      </button>
                    </div>
                    {ses.patient_condition && (
                      <p className="text-[#222222]">
                        <strong>Estado del paciente:</strong> {ses.patient_condition}
                      </p>
                    )}
                    <p className="text-[#222222]">
                      <strong>Lo que se le hizo (Tratamiento):</strong>{' '}
                      {ses.treatment_notes || 'Sin nota registrada.'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Fisioterapeuta:</strong> {ses.professional_name || DEFAULT_PROFESSIONAL}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: AVISO DE PRIVACIDAD */}
      {showPrivacyNoticeModal && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-privacy-title"
        >
          <div className="form-container my-6 max-h-[92vh] overflow-y-auto space-y-3 text-xs text-[#222222]">
            <div className="flex items-center justify-between border-b-2 border-[#595959] pb-2">
              <h2 id="modal-privacy-title" className="text-base font-bold">
                Aviso de Privacidad del Consultorio
              </h2>
              <button
                type="button"
                onClick={() => setShowPrivacyNoticeModal(false)}
                className="secondary-button text-xs py-1 px-2.5"
              >
                Cerrar
              </button>
            </div>
            <p>
              <strong>Responsable:</strong> Consultorio de Fisioterapia Deportiva (Lic. Ft. Eduardo).
            </p>
            <p>
              <strong>Datos recabados:</strong> Nombre completo, edad, teléfono, correo electrónico, alergias, estudios previos, antecedentes familiares, motivo de consulta y notas de evolución fisioterapéutica.
            </p>
            <p>
              <strong>Finalidades:</strong> Integración y resguardo del expediente clínico del paciente, programación de sesiones de rehabilitación, prevención de riesgos por alergias y seguimiento de tratamientos.
            </p>
            <p>
              <strong>Confidencialidad:</strong> Los datos clínicos se resguardan de forma privada y <strong>no se comparten ni sincronizan con calendarios externos ni servicios de terceros</strong>.
            </p>
            <p>
              <strong>Acceso y actualización:</strong> El paciente puede solicitar en cualquier momento copia de su historial de sesiones o la actualización de sus datos directamente en el consultorio.
            </p>
          </div>
        </div>
      )}

      {/* MODAL 5: AUTENTICACIÓN DE SUPABASE */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-auth-title"
        >
          <div className="form-container">
            <div className="flex items-center justify-between mb-4">
              <h2 id="modal-auth-title" className="text-lg font-bold text-[#222222]">
                {authMode === 'login'
                  ? 'Iniciar Sesión del Fisioterapeuta'
                  : 'Registrar Cuenta del Consultorio'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="secondary-button text-xs py-1 px-2.5"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="auth-email-input" className="form-label">
                  Correo electrónico <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="eduardo@fisiodeportiva.mx"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-password-input" className="form-label">
                  Contraseña <span className="required-asterisk" aria-hidden="true">*</span>
                </label>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  minLength={6}
                  value={authForm.password}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="form-input"
                />
              </div>

              <div aria-live="polite" className="mb-4">
                {authError && <div className="error-message active">{authError}</div>}
                {authSuccess && (
                  <div className="p-2.5 rounded-sm bg-emerald-50 border border-[#137752] text-xs font-bold text-[#137752]">
                    {authSuccess}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'))
                  }
                  className="underline text-xs font-bold text-[#004070] cursor-pointer"
                >
                  {authMode === 'login'
                    ? '¿Primera vez? Crear cuenta'
                    : 'Ya tengo cuenta · Iniciar sesión'}
                </button>

                <button type="submit" className="submit-button">
                  {authMode === 'login' ? 'Entrar al Consultorio' : 'Registrar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
