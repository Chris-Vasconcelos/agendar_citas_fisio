import React from 'react';
import { DAYS_OF_WEEK } from '../utils/constants';

export function AvailabilityPage({ availability, appointments = [], saveAvailabilityDay }) {
  const [feedback, setFeedback] = React.useState('');
  const validTime = (time) => String(time || '08:00').slice(0,5);
  const update = async (row, changes) => {
    const next = { ...row, ...changes };
    if (next.start_time >= next.end_time) {
      setFeedback('La hora de cierre debe ser posterior a la apertura.');
      return;
    }
    if (row.is_active && changes.is_active === false) {
      const now = Date.now();
      const futureCount = appointments.filter((apt) =>
        apt.status !== 'cancelled' &&
        new Date(apt.start_time).getTime() >= now &&
        new Date(apt.start_time).getDay() === row.day_of_week
      ).length;
      if (futureCount > 0 && !window.confirm(`Hay ${futureCount} cita(s) futuras para este día de la semana. Deshabilitarlo no cancela esas citas. ¿Quieres continuar?`)) {
        return;
      }
    }
    setFeedback('');
    const result = await saveAvailabilityDay(next);
    if (!result?.success) setFeedback(result?.error || 'No se pudo guardar el horario.');
  };

  return (
    <section aria-labelledby="mina-hours-title" className="mina-hours-page">
      <div className="mina-section-heading">
        <h2 id="mina-hours-title">Horarios</h2>
        <p>Configura los días y horas de atención del consultorio.</p>
      </div>
      {feedback && <p role="alert" className="mina-inline-error">{feedback}</p>}
      <div className="mina-hours-list">
        {DAYS_OF_WEEK.map((day) => {
          const row = availability.find((a) => a.day_of_week === day.value) || {
            day_of_week: day.value, start_time:'08:00', end_time:'19:00',
            slot_duration_minutes:60, is_active:false
          };
          const active = Boolean(row.is_active);
          const start = validTime(row.start_time);
          const end = validTime(row.end_time);
          const blocks = active ? Math.max(0, (Number(end.slice(0,2))*60 + Number(end.slice(3,5)) - Number(start.slice(0,2))*60 - Number(start.slice(3,5))) / 60) : 0;
          return (
            <div key={day.value} className={`mina-hours-row ${active ? '' : 'mina-hours-row-closed'}`}>
              <label className="mina-hours-toggle">
                <input type="checkbox" checked={active} onChange={(e) => update(row, { is_active:e.target.checked })} />
                <span>{day.label}</span>
              </label>
              <div className="mina-hours-times">
                <label>
                  <span className="sr-only">Apertura de {day.label}</span>
                  <input type="time" step="3600" value={start} disabled={!active}
                    onChange={(e) => update(row,{start_time:e.target.value})} />
                </label>
                <span aria-hidden="true">–</span>
                <label>
                  <span className="sr-only">Cierre de {day.label}</span>
                  <input type="time" step="3600" value={end} disabled={!active}
                    onChange={(e) => update(row,{end_time:e.target.value})} />
                </label>
              </div>
              <span className="mina-hours-capacity">{active ? `${Number.isInteger(blocks)?blocks:blocks.toFixed(1)} h · ${blocks*2} espacios` : 'Sin atención'}</span>
            </div>
          );
        })}
      </div>
      <p className="mina-hours-note">Los horarios son reglas semanales. Antes de cerrar un día con citas existentes, revisa la agenda. Las pausas y excepciones por fecha requieren una función adicional.</p>
    </section>
  );
}
