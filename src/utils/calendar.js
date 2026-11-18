// Calendar rows include existing appointments even after the working hours change.
export function calendarHours(rules, appointments) {
  let first = 24, last = 0;
  for (const rule of rules.filter((r) => r?.is_active)) {
    const minutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
    first = Math.min(first, Math.floor(minutes(rule.start_time) / 60));
    last = Math.max(last, Math.ceil(minutes(rule.end_time) / 60));
  }
  for (const apt of appointments.filter((a) => a.status !== 'cancelled')) {
    const start = new Date(apt.start_time), end = new Date(apt.end_time);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) continue;
    first = Math.min(first, start.getHours());
    const crossesDate = start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth() || start.getDate() !== end.getDate();
    last = Math.max(last, crossesDate ? 24 : Math.ceil((end.getHours() * 60 + end.getMinutes()) / 60));
  }
  return Array.from({ length: Math.max(0, last - first) }, (_, i) => `${String(first + i).padStart(2, '0')}:00`);
}
export function calendarCell(date, hour) {
  const start = new Date(`${date}T${hour}:00`);
  // Adding milliseconds, rather than appending 00:00 to the same date, handles 23:00.
  return [start.getTime(), start.getTime() + 60 * 60 * 1000];
}
export function appointmentsInCell(appointments, date, hour, slot) {
  const [start, end] = calendarCell(date, hour);
  return appointments.filter((a) => a.status !== 'cancelled' && Number(a.slot_number || 1) === slot &&
    start < new Date(a.end_time).getTime() && new Date(a.start_time).getTime() < end)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}
