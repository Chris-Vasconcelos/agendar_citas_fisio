const mexicoTimeZone = 'America/Mexico_City';

export function normalizeMexicanWhatsApp(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const national = digits.length === 12 && digits.startsWith('52') ? digits.slice(2)
    : digits.length === 13 && digits.startsWith('521') ? digits.slice(3) : digits;
  return national.length === 10 ? '52' + national : null;
}

export function appointmentLocalDate(timestamp) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: mexicoTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function formatReminderDate(timestamp) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: mexicoTimeZone, weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  }).format(new Date(timestamp));
}

export function reminderMessage(patientName, startTime) {
  const firstName = String(patientName || 'paciente').trim().split(/\s+/)[0];
  return `Hola ${firstName}, te recordamos tu cita en MINA — El valor del movimiento el ${formatReminderDate(startTime)}. Si necesitas cambiarla, por favor comunícate con el consultorio. Gracias.`;
}

export function upcomingReminders(appointments, now = new Date(), horizonDays = 7) {
  const start = now.getTime();
  const end = start + horizonDays * 24 * 60 * 60 * 1000;
  return appointments.filter((apt) => {
    const time = new Date(apt.start_time).getTime();
    return apt.status === 'scheduled' && Number.isFinite(time) && time >= start && time <= end;
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}
