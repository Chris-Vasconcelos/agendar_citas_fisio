import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Edit3, ClipboardList, MessageCircle, XCircle, Calendar } from 'lucide-react';

export function Agenda({
  activeDayAppointments,
  dailyHourlySlots,
  weeklyTotalActive,
  weekDays,
  allergyAlertsTodayCount,
  completedNotesTodayCount,
  changeSelectedDateByDays,
  selectedDate,
  setSelectedDate,
  getTodayDateString,
  calendarViewMode,
  setCalendarViewMode,
  formatDateHuman,
  handleEnableDayNow,
  setActiveTab,
  weeklyHourRange,
  addMinutesToTimeStr,
  appointmentsForSelectedDate,
  patientsById,
  openEditAppointmentModal,
  setSelectedPatientForRecord,
  openCreateAppointmentModal,
  handleCancelAppointment,
  DEFAULT_PROFESSIONAL,
}) {
  return (
    <section aria-labelledby="heading-agenda" className="space-y-6">
            {/* Grícula #overview.dash-stat-grid con Diseño Compacto y Minimalista (Opción 1) */}
            <div id="overview" className="dash-stat-grid" aria-label="Resumen operativo del consultorio">
              <article className="craft-card craft-kpi-card">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#524634]">
                    Sesiones del Día
                  </span>
                  <span className="typeui-badge typeui-badge-primary text-[10px] px-2 py-0.5 rounded-full font-medium">
                    2 espacios / hora
                  </span>
                </div>
                <div className="text-xl font-bold text-[#1c160e] mb-0.5 leading-snug">
                  {activeDayAppointments.length}{' '}
                  <span className="text-xs font-normal text-[#524634]">
                    / {dailyHourlySlots.length * 2} espacios
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#5c4f3b] capitalize m-0">
                  {formatDateHuman(selectedDate)}
                </p>
              </article>

              <article className="craft-card craft-kpi-card">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#524634]">
                    Total en la Semana
                  </span>
                  <span className="typeui-badge typeui-badge-neutral text-[10px] px-2 py-0.5 rounded-full font-medium">
                    Lun – Sáb
                  </span>
                </div>
                <div className="text-xl font-bold text-[#1c160e] mb-0.5 leading-snug">
                  {weeklyTotalActive}{' '}
                  <span className="text-xs font-normal text-[#524634]">
                    citas activas
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#5c4f3b] m-0">
                  Semana del {weekDays[0]?.dayNumber} {weekDays[0]?.monthShort} al{' '}
                  {weekDays[6]?.dayNumber} {weekDays[6]?.monthShort}
                </p>
              </article>

              <article className="craft-card craft-kpi-card">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#524634]">
                    Alertas de Alergia
                  </span>
                  {allergyAlertsTodayCount > 0 ? (
                    <span className="typeui-badge typeui-badge-danger text-[10px] px-2 py-0.5 rounded-full font-medium">
                      ⚠️ {allergyAlertsTodayCount} en agenda hoy
                    </span>
                  ) : (
                    <span className="typeui-badge typeui-badge-success text-[10px] px-2 py-0.5 rounded-full font-medium">
                      ✓ Sin alertas
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold text-[#1c160e] mb-0.5 leading-snug">
                  {allergyAlertsTodayCount}{' '}
                  <span className="text-xs font-normal text-[#524634]">
                    paciente(s)
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#5c4f3b] m-0">
                  Verificación clínica previa a agentes físicos
                </p>
              </article>

              <article className="craft-card craft-kpi-card">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#524634]">
                    Notas de Sesión Hoy
                  </span>
                  <span className="typeui-badge typeui-badge-success text-[10px] px-2 py-0.5 rounded-full font-medium">
                    Evolución
                  </span>
                </div>
                <div className="text-xl font-bold text-[#1c160e] mb-0.5 leading-snug">
                  {completedNotesTodayCount}{' '}
                  <span className="text-xs font-normal text-[#524634]">
                    / {activeDayAppointments.length} registradas
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#5c4f3b] m-0">
                  Se llenan al atender o finalizar cada sesión
                </p>
              </article>
            </div>

            {/* Barra superior de control del Calendario con estilo article.craft-card */}
            <article className="craft-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => changeSelectedDateByDays(-7)}
                    className="toolbar-btn"
                    aria-label="Ir a la semana anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Semana ant.
                  </button>
                  <button
                    type="button"
                    onClick={() => changeSelectedDateByDays(-1)}
                    className="toolbar-btn"
                    aria-label="Ir al día anterior"
                  >
                    Día ant.
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getTodayDateString())}
                    className="toolbar-btn font-bold"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => changeSelectedDateByDays(1)}
                    className="toolbar-btn"
                    aria-label="Ir al día siguiente"
                  >
                    Día sig.
                  </button>
                  <button
                    type="button"
                    onClick={() => changeSelectedDateByDays(7)}
                    className="toolbar-btn"
                    aria-label="Ir a la semana siguiente"
                  >
                    Semana sig.
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="agenda-date-picker" className="text-xs font-bold text-[#111827]">
                    Ir a fecha:
                  </label>
                  <input
                    id="agenda-date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="form-input w-auto font-bold text-xs py-1 px-2"
                  />

                  <div className="inline-flex rounded-md border border-[#52525b] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode('week')}
                      className={
                        calendarViewMode === 'week'
                          ? 'toolbar-btn-active rounded-none border-0'
                          : 'toolbar-btn rounded-none border-0'
                      }
                    >
                      Vista Semanal
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode('day')}
                      className={
                        calendarViewMode === 'day'
                          ? 'toolbar-btn-active rounded-none border-0'
                          : 'toolbar-btn rounded-none border-0'
                      }
                    >
                      Vista Día (2 Espacios)
                    </button>
                  </div>
                </div>
              </div>

              {/* Tira Horizontal de los 7 días de la semana (Lunes a Domingo) */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p id="heading-agenda" className="text-xs font-bold text-[#111827] capitalize m-0">
                    Semana del {weekDays[0]?.dayNumber} {weekDays[0]?.monthShort} al{' '}
                    {weekDays[6]?.dayNumber} {weekDays[6]?.monthShort} ·{' '}
                    <span className="text-[#004070]">{formatDateHuman(selectedDate)}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {weekDays.map((wd) => {
                    const isSelected = wd.dateStr === selectedDate;
                    const isToday = wd.dateStr === getTodayDateString();
                    return (
                      <button
                        key={wd.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(wd.dateStr)}
                        className={`calendar-day-pill text-left ${
                          isSelected ? 'calendar-day-pill-active' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold uppercase tracking-wide">
                            {wd.shortName} {wd.dayNumber}
                          </span>
                          {isToday && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                                isSelected
                                  ? 'bg-white text-[#004070]'
                                  : 'bg-[#004070] text-white'
                              }`}
                            >
                              HOY
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            isSelected ? 'text-slate-100' : 'text-slate-600'
                          }`}
                        >
                          {wd.isActive
                            ? `${wd.rule.start_time} – ${wd.rule.end_time}`
                            : 'Cerrado'}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold ${
                              isSelected ? 'text-white' : 'text-[#004070]'
                            }`}
                          >
                            {wd.activeCount} cita(s)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Aviso interactivo con botones directos cuando el día seleccionado está cerrado */}
                {dailyHourlySlots.length === 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-white/90 border border-[#524634] flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-[#1c160e]">
                      <strong>Día cerrado ({formatDateHuman(selectedDate)}):</strong>{' '}
                      Puedes habilitar este día ahora mismo con un clic o configurar sus horas de apertura.
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const [y, m, d] = selectedDate.split('-').map(Number);
                          const dow = new Date(y, m - 1, d).getDay();
                          handleEnableDayNow(dow);
                        }}
                        className="toolbar-btn-active"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Activar este día ahora (08:00 – 13:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('availability')}
                        className="toolbar-btn"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Ir a pestaña Horarios
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>

            {/* MODO 1: CALENDARIO SEMANAL HORIZONTAL (Columnas = Días Lunes a Sábado/Domingo, Filas = Horas) */}
            {calendarViewMode === 'week' && (
              <div className="space-y-2 min-w-0 max-w-full">
                <div className="calendar-scroll-wrapper">
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
                                              className="calendar-booked-slot"
                                            >
                                              <div className="slot-card-header">
                                                <span className="text-[11px] font-bold text-[#004070]">
                                                  Espacio {slotNum}
                                                </span>
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/90 border border-slate-400 text-[#222222] shrink-0">
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
                <div className="bg-white rounded-md border border-[#595959] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#222222] capitalize m-0">
                    {formatDateHuman(selectedDate)}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode('week')}
                    className="toolbar-btn"
                  >
                    ← Volver a Vista Semanal
                  </button>
                </div>

                {dailyHourlySlots.length === 0 ? (
                  <div className="bg-white rounded-md border-2 border-[#595959] p-6 text-center space-y-3">
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
                  <div className="calendar-scroll-wrapper">
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
                            Espacio 1 · Camilla / Cubículo 1
                          </th>
                          <th scope="col">
                            Espacio 2 · Camilla / Cubículo 2
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
                                        className="calendar-empty-slot py-2.5"
                                      >
                                        <span>+ Agendar en Espacio {slotNum}</span>
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
                                    <div className="calendar-booked-slot p-3">
                                      <div className="slot-card-header">
                                        <span className="text-sm font-bold text-[#222222]">
                                          {patient?.full_name || 'Paciente'}{' '}
                                          {patient?.age !== undefined ? `(${patient.age} años)` : ''}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white border border-[#595959]">
                                          {apt.status === 'completed'
                                            ? 'Completada'
                                            : apt.status === 'no_show'
                                            ? 'No asistió'
                                            : 'Programada'}
                                        </span>
                                      </div>

                                      {hasAllergies ? (
                                        <div className="slot-card-allergy">
                                          ⚠️ ALERGIA: {patient.allergies}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-slate-600">
                                          Sin alergias reportadas
                                        </div>
                                      )}

                                      {patient?.consultation_reason && (
                                        <p className="text-xs text-[#222222] m-0">
                                          <strong>Motivo:</strong> {patient.consultation_reason}
                                        </p>
                                      )}

                                      <div className="text-xs bg-white border border-slate-300 p-2 rounded-sm space-y-1">
                                        <p className="m-0">
                                          <strong>Lo que se le hizo:</strong>{' '}
                                          {apt.treatment_notes ||
                                            'Pendiente de registrar al atender la sesión.'}
                                        </p>
                                      </div>

                                      <div className="card-actions-responsive pt-1">
                                        <button
                                          type="button"
                                          onClick={() => openEditAppointmentModal(apt)}
                                          className="toolbar-btn-active"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                          Atender / Nota
                                        </button>
                                        {patient && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedPatientForRecord(patient)}
                                            className="toolbar-btn"
                                          >
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            Expediente
                                          </button>
                                        )}
                                        {cleanPhone && (
                                          <a
                                            href={`https://wa.me/52${cleanPhone}?text=${whatsappMsg}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="toolbar-btn no-underline"
                                          >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            WhatsApp
                                          </a>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleCancelAppointment(apt)}
                                          className="toolbar-btn"
                                        >
                                          <XCircle className="w-3.5 h-3.5" />
                                          Cancelar
                                        </button>
                                      </div>
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
