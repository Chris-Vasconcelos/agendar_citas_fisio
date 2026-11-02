import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, Edit3, ClipboardList, MessageCircle, XCircle } from 'lucide-react';
import { addMinutesToTimeStr, getTodayDateString, formatDateHuman, formatTimeShort } from '../utils/date';

export function AgendaPage({
  selectedDate,
  setSelectedDate,
  calendarViewMode,
  setCalendarViewMode,
  weekDays,
  dailyHourlySlots,
  weeklyHourRange,
  activeDayAppointments,
  weeklyTotalActive,
  allergyAlertsTodayCount,
  completedNotesTodayCount,
  appointmentsForSelectedDate,
  patientsById,
  handleEnableDayNow,
  openCreateAppointmentModal,
  openEditAppointmentModal,
  setSelectedPatientForRecord,
  handleCancelAppointment,
  setActiveTab
}) {
  const changeSelectedDateByDays = (delta) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + delta);
    const ny = next.getFullYear();
    const nm = String(next.getMonth() + 1).padStart(2, '0');
    const nd = String(next.getDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  return (
    <section aria-labelledby="heading-agenda" className="mina-agenda space-y-4">

      <div className="mina-page-heading">
        <div>
          <h2 id="heading-agenda" className="mina-page-title">Agenda</h2>
          <p className="mina-date-subtitle capitalize">{formatDateHuman(selectedDate)}</p>
        </div>
        <div className="mina-compact-metrics" aria-label="Resumen de citas">
          <span><strong>{activeDayAppointments.length}</strong> hoy</span>
          <span><strong>{weeklyTotalActive}</strong> esta semana</span>
          {allergyAlertsTodayCount > 0 && (
            <span className="mina-metric-alert" role="status">⚠ {allergyAlertsTodayCount} con alergias</span>
          )}
        </div>
      </div>
      <article className="mina-agenda-panel">
        <div className="mina-agenda-toolbar">
          <div className="mina-date-controls">
            <button type="button" className="mina-date-arrow"
              onClick={() => changeSelectedDateByDays(calendarViewMode === 'week' ? -7 : -1)}
              aria-label={calendarViewMode === 'week' ? 'Semana anterior' : 'Día anterior'}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" className="mina-today-btn" onClick={() => setSelectedDate(getTodayDateString())}>Hoy</button>
            <button type="button" className="mina-date-arrow"
              onClick={() => changeSelectedDateByDays(calendarViewMode === 'week' ? 7 : 1)}
              aria-label={calendarViewMode === 'week' ? 'Semana siguiente' : 'Día siguiente'}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="mina-week-label">
              {weekDays[0]?.dayNumber} {weekDays[0]?.monthShort} – {weekDays[6]?.dayNumber} {weekDays[6]?.monthShort}
            </span>
          </div>
          <div className="mina-toolbar-right">
            <label htmlFor="agenda-date-picker" className="sr-only">Elegir fecha</label>
            <input id="agenda-date-picker" type="date" value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="mina-date-input" />
            <div className="mina-view-switch" role="group" aria-label="Vista del calendario">
              <button type="button" aria-pressed={calendarViewMode === 'week'}
                className={calendarViewMode === 'week' ? 'is-active' : ''}
                onClick={() => setCalendarViewMode('week')}>Semana</button>
              <button type="button" aria-pressed={calendarViewMode === 'day'}
                className={calendarViewMode === 'day' ? 'is-active' : ''}
                onClick={() => setCalendarViewMode('day')}>Día</button>
            </div>
          </div>
        </div>
        <div className="mina-day-strip" role="group" aria-label="Seleccionar día de la semana">
          {weekDays.map((wd) => {
            const isSelected = wd.dateStr === selectedDate;
            const isToday = wd.dateStr === getTodayDateString();
            return (
              <button key={wd.dateStr} type="button" onClick={() => setSelectedDate(wd.dateStr)}
                aria-pressed={isSelected} aria-label={`${wd.fullName} ${wd.dayNumber}, ${wd.activeCount} citas`}
                className={`mina-day-pill ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${!wd.isActive ? 'is-closed' : ''}`}>
                <span className="mina-day-name">{wd.shortName}</span>
                <span className="mina-day-number">{wd.dayNumber}</span>
                <span className="mina-day-count">{wd.isActive ? (wd.activeCount ? `${wd.activeCount} citas` : 'Libre') : 'Cerrado'}</span>
              </button>
            );
          })}
        </div>
        {calendarViewMode === 'week' && dailyHourlySlots.length === 0 && (
          <div className="mina-closed-hint">
            <span>Este día está cerrado.</span>
            <button type="button" className="mina-text-action" onClick={() => setActiveTab('availability')}>Revisar horarios</button>
          </div>
        )}
      </article>

      {/* MODO 1: CALENDARIO SEMANAL HORIZONTAL (Columnas = Días Lunes a Sábado/Domingo, Filas = Horas) */}
      {calendarViewMode === 'week' && (
        <div className="space-y-2 min-w-0 max-w-full">
          <div className="calendar-scroll-wrapper mina-calendar-week" tabIndex={0} aria-label="Calendario semanal: desplazar horizontalmente para ver otros días">
            <table
              className="calendar-grid-table"
              aria-label="Calendario semanal horizontal de citas por día y hora"
            >
              <thead>
                <tr>
                  <th scope="col" className="calendar-hour-col">
                    <span className="text-xs font-bold">Hora</span>
                    <div className="text-[11px] font-medium text-slate-600 mt-0.5">
                      60 min
                    </div>
                  </th>
                  {weekDays
                    .filter(
                      (wd) =>
                        wd.isActive ||
                        wd.dayOfWeek !== 0 ||
                        wd.activeCount > 0 ||
                        wd.dateStr === selectedDate
                    )
                    .map((wd) => {
                      const isSelected = wd.dateStr === selectedDate;
                      return (
                        <th
                          key={wd.dateStr}
                          scope="col"
                          className={
                            isSelected ? 'bg-[#eef5fb]' : 'bg-[#e8eef3]'
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(wd.dateStr);
                                setCalendarViewMode('day');
                              }}
                              className="text-left text-sm font-bold text-[#004070] hover:underline truncate"
                            >
                              {wd.fullName} {wd.dayNumber}/{wd.dateStr.slice(5, 7)}
                            </button>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-400 text-[#222222] shrink-0">
                              {wd.activeCount}
                            </span>
                          </div>
                          {wd.isActive ? (
                            <div className="text-[11px] font-medium text-slate-600 mt-1 truncate">
                              {wd.rule.start_time} – {wd.rule.end_time} · 2 espacios
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1 mt-1">
                              <span className="text-[11px] font-medium text-slate-500 truncate">
                                Cerrado
                              </span>
                              <button
                                type="button"
                                onClick={() => handleEnableDayNow(wd.dayOfWeek)}
                                className="slot-btn-primary flex-none"
                                title={`Activar ${wd.fullName}`}
                              >
                                + Activar día
                              </button>
                            </div>
                          )}
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody>
                {weeklyHourRange.map((hourStr) => {
                  const nextHourStr = addMinutesToTimeStr(hourStr, 60);
                  const hourNum = Number(hourStr.split(':')[0]);

                  return (
                    <tr key={hourStr}>
                      <th scope="row" className="calendar-hour-col">
                        <div className="text-sm font-bold text-[#222222]">{hourStr}</div>
                        <div className="text-[11px] font-medium text-slate-600">
                          a {nextHourStr}
                        </div>
                      </th>

                      {weekDays
                        .filter(
                          (wd) =>
                            wd.isActive ||
                            wd.dayOfWeek !== 0 ||
                            wd.activeCount > 0 ||
                            wd.dateStr === selectedDate
                        )
                        .map((wd) => {
                          const startH = wd.rule
                            ? Number(wd.rule.start_time.split(':')[0])
                            : 8;
                          const endH = wd.rule
                            ? Number(wd.rule.end_time.split(':')[0])
                            : 19;
                          const isWithinWorkingHours =
                            wd.isActive && hourNum >= startH && hourNum < endH;

                          const slotStartMs = new Date(
                            `${wd.dateStr}T${hourStr}:00`
                          ).getTime();
                          const slotEndMs = new Date(
                            `${wd.dateStr}T${nextHourStr}:00`
                          ).getTime();

                          const activeInCell = wd.appointments.filter((a) => {
                            const aS = new Date(a.start_time).getTime();
                            const aE = new Date(a.end_time).getTime();
                            return slotStartMs < aE && aS < slotEndMs;
                          });

                          const slot1Apt = activeInCell.find(
                            (a) => Number(a.slot_number || 1) === 1
                          );
                          const slot2Apt = activeInCell.find(
                            (a) => Number(a.slot_number || 1) === 2
                          );

                          if (!isWithinWorkingHours && activeInCell.length === 0) {
                            return (
                              <td
                                key={`${wd.dateStr}-${hourStr}`}
                                className="bg-slate-100/90 text-center align-middle"
                              >
                                <span className="text-xs text-slate-500 font-semibold">
                                  Cerrado
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={`${wd.dateStr}-${hourStr}`}
                              className={
                                wd.dateStr === selectedDate ? 'bg-[#f8fbff]' : 'bg-white'
                              }
                            >
                              <div className="space-y-1.5">
                                {[1, 2].map((slotNum) => {
                                  const apt = slotNum === 1 ? slot1Apt : slot2Apt;
                                  if (apt) {
                                    const pt = patientsById.get(apt.patient_id);
                                    const hasAllergy =
                                      pt?.allergies &&
                                      pt.allergies.toLowerCase() !== 'ninguna' &&
                                      pt.allergies.toLowerCase() !== 'ninguna conocida';
                                    const hasNotes = Boolean(
                                      apt.treatment_notes && apt.treatment_notes.trim()
                                    );

                                    return (
                                      <div
                                        key={`slot-${slotNum}`}
                                        className="calendar-booked-slot mina-booked-week" data-status={apt.status}
                                      >
                                        <div className="slot-card-header">
                                          <span className="text-[11px] font-bold text-[#004070]">
                                            Espacio {slotNum}
                                          </span>
                                          <span className="mina-slot-status">
                                            {apt.status === 'completed' || hasNotes
                                              ? '✓ Nota'
                                              : 'Programada'}
                                          </span>
                                        </div>

                                        <div className="slot-card-patient">
                                          {pt?.full_name || 'Paciente'}
                                        </div>

                                        {hasAllergy && (
                                          <div className="slot-card-allergy">
                                            ⚠️ {pt.allergies}
                                          </div>
                                        )}

                                        <div className="slot-card-actions">
                                          <button
                                            type="button"
                                            onClick={() => openEditAppointmentModal(apt)}
                                            className="slot-btn-primary"
                                            title={
                                              hasNotes
                                                ? 'Ver o editar nota de sesión'
                                                : 'Atender cita y registrar nota'
                                            }
                                          >
                                            {hasNotes ? 'Ver / Nota' : 'Atender'}
                                          </button>
                                          {pt && (
                                            <button
                                              type="button"
                                              onClick={() => setSelectedPatientForRecord(pt)}
                                              className="slot-btn-secondary"
                                              title="Ver expediente clínico"
                                            >
                                              Ficha
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <button
                                      key={`slot-${slotNum}`}
                                      type="button"
                                      onClick={() =>
                                        openCreateAppointmentModal(
                                          hourStr,
                                          String(slotNum),
                                          wd.dateStr
                                        )
                                      }
                                      className="calendar-empty-slot"
                                      title={`Agendar en Espacio ${slotNum} a las ${hourStr}`}
                                    >
                                      <span>+ Espacio {slotNum}</span>
                                      <span className="text-[11px] font-normal opacity-75 shrink-0">
                                        {hourStr}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODO 2: VISTA DÍA EN CALENDARIO HORIZONTAL DE 2 COLUMNAS (Hora | Espacio 1 | Espacio 2) */}
      {calendarViewMode === 'day' && (
        <div className="space-y-3 min-w-0 max-w-full">
          <div className="mina-day-note">Dos espacios por horario · sesiones de 60 minutos</div>

          {dailyHourlySlots.length === 0 ? (
            <div className="mina-closed-day p-6 text-center space-y-3">
              <Calendar className="w-8 h-8 text-[#004070] mx-auto" />
              <h3 className="text-base font-bold text-[#222222]">
                Consultorio cerrado ({formatDateHuman(selectedDate)})
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    const dow = new Date(y, m - 1, d).getDay();
                    handleEnableDayNow(dow);
                  }}
                  className="toolbar-btn-active"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Activar este día ahora (08:00 – 13:00)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('availability')}
                  className="toolbar-btn"
                >
                  <Clock className="w-4 h-4" />
                  Ir a Horarios
                </button>
              </div>
            </div>
          ) : (
            <div className="calendar-scroll-wrapper mina-calendar-day" tabIndex={0} aria-label="Calendario diario: desplazar horizontalmente para ver los espacios">
              <table
                className="calendar-grid-table"
                aria-label="Calendario diario de 2 espacios simultáneos"
              >
                <thead>
                  <tr>
                    <th scope="col" className="calendar-hour-col">
                      Hora (60m)
                    </th>
                    <th scope="col">
                      Espacio 1
                    </th>
                    <th scope="col">
                      Espacio 2
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailyHourlySlots.map((hourStr) => {
                    const nextHourStr = addMinutesToTimeStr(hourStr, 60);
                    const sMs = new Date(`${selectedDate}T${hourStr}:00`).getTime();
                    const eMs = new Date(`${selectedDate}T${nextHourStr}:00`).getTime();

                    const activeInHour = appointmentsForSelectedDate.filter((a) => {
                      if (a.status === 'cancelled') return false;
                      const aS = new Date(a.start_time).getTime();
                      const aE = new Date(a.end_time).getTime();
                      return sMs < aE && aS < eMs;
                    });

                    const slot1Apt = activeInHour.find(
                      (a) => Number(a.slot_number || 1) === 1
                    );
                    const slot2Apt = activeInHour.find(
                      (a) => Number(a.slot_number || 1) === 2
                    );

                    return (
                      <tr key={hourStr}>
                        <th scope="row" className="calendar-hour-col">
                          <div className="text-sm font-bold text-[#222222]">{hourStr}</div>
                          <div className="text-xs font-normal text-slate-600">
                            a {nextHourStr}
                          </div>
                        </th>

                        {[1, 2].map((slotNum) => {
                          const apt = slotNum === 1 ? slot1Apt : slot2Apt;
                          if (!apt) {
                            return (
                              <td key={`day-slot-${slotNum}`} className="bg-white">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openCreateAppointmentModal(
                                      hourStr,
                                      String(slotNum),
                                      selectedDate
                                    )
                                  }
                                  className="calendar-empty-slot"
                                >
                                  <span>+ Agendar</span>
                                  <span className="text-xs font-normal opacity-80">
                                    {hourStr} – {nextHourStr}
                                  </span>
                                </button>
                              </td>
                            );
                          }

                          const patient = patientsById.get(apt.patient_id);
                          const cleanPhone = (patient?.phone || '').replace(/\D/g, '');
                          const whatsappMsg = encodeURIComponent(
                            `Hola ${patient?.full_name || ''}, te recordamos tu sesión de fisioterapia el ${formatDateHuman(
                              selectedDate
                            )} a las ${hourStr}.`
                          );
                          const hasAllergies =
                            patient?.allergies &&
                            patient.allergies.toLowerCase() !== 'ninguna' &&
                            patient.allergies.toLowerCase() !== 'ninguna conocida';

                          return (
                            <td key={`day-slot-${slotNum}`} className="bg-white">
                              <div className="calendar-booked-slot mina-booked-day" data-status={apt.status}>
                                <div className="slot-card-header">
                                  <span className="text-sm font-bold text-[#222222]">
                                    {patient?.full_name || 'Paciente'}
                                  </span>
                                  <span className="mina-slot-status">
                                    {apt.status === 'completed'
                                      ? 'Completada'
                                      : apt.status === 'no_show'
                                      ? 'No asistió'
                                      : 'Programada'}
                                  </span>
                                </div>

                                {hasAllergies && (
                                  <div className="slot-card-allergy">⚠ Alergia: {patient.allergies}</div>
                                )}


                                <div className="mina-appointment-primary-actions">
                                  <button type="button" onClick={() => openEditAppointmentModal(apt)} className="toolbar-btn-active">
                                    <Edit3 className="w-3.5 h-3.5" /> Atender / Nota
                                  </button>
                                  {patient && (
                                    <button type="button" onClick={() => setSelectedPatientForRecord(patient)} className="toolbar-btn">
                                      <ClipboardList className="w-3.5 h-3.5" /> Expediente
                                    </button>
                                  )}
                                </div>
                                <details className="mina-appointment-more">
                                  <summary>Detalles y opciones</summary>
                                  <div className="mina-appointment-extra">
                                    {patient?.consultation_reason && <p><strong>Motivo:</strong> {patient.consultation_reason}</p>}
                                    {apt.treatment_notes && <p><strong>Nota:</strong> {apt.treatment_notes}</p>}
                                    {cleanPhone && (
                                      <a href={`https://wa.me/52${cleanPhone}?text=${whatsappMsg}`} target="_blank" rel="noreferrer" className="toolbar-btn no-underline">
                                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                      </a>
                                    )}
                                    <button type="button" onClick={() => handleCancelAppointment(apt)} className="toolbar-btn">
                                      <XCircle className="w-3.5 h-3.5" /> Cancelar cita
                                    </button>
                                  </div>
                                </details>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
