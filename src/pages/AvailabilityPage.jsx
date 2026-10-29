import React from 'react';
import { DAYS_OF_WEEK } from '../utils/constants';

export function AvailabilityPage({
  availability,
  setAvailability,
  setActiveTab
}) {
  return (
    <section className="space-y-3" aria-label="Configuración de horarios por día">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setActiveTab('agenda')}
          className="toolbar-btn"
        >
          ← Volver a la Agenda
        </button>
      </div>

      <div className="schedule-responsive-grid">
        {DAYS_OF_WEEK.map((dayObj) => {
          const row = availability.find((a) => a.day_of_week === dayObj.value) || {
            day_of_week: dayObj.value,
            start_time: '08:00',
            end_time: '19:00',
            slot_duration_minutes: 60,
            is_active: false,
          };
          const isActive = Boolean(row.is_active);
          const checkboxId = `day-active-${dayObj.value}`;
          const startId = `day-start-${dayObj.value}`;
          const endId = `day-end-${dayObj.value}`;

          const startH = Number((row.start_time || '08:00').split(':')[0]);
          const endH = Number((row.end_time || '19:00').split(':')[0]);
          const totalBlocks = isActive && endH > startH ? endH - startH : 0;

          return (
            <article key={dayObj.value} className="craft-card">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/15">
                <span className="text-sm font-bold text-[#1c160e]">
                  {dayObj.label}
                </span>
                <span
                  className={`typeui-badge ${
                    isActive ? 'typeui-badge-success' : 'typeui-badge-neutral'
                  }`}
                >
                  {isActive ? 'ABIERTO' : 'CERRADO'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAvailability((prev) => {
                        const exists = prev.some((item) => item.day_of_week === dayObj.value);
                        if (exists) {
                            return prev.map((item) =>
                            item.day_of_week === dayObj.value
                                ? { ...item, is_active: checked }
                                : item
                            )
                        } else {
                            return [...prev, { ...row, is_active: checked }]
                        }
                    }
                    );
                  }}
                  className="h-4 w-4 cursor-pointer"
                />
                <label
                  htmlFor={checkboxId}
                  className="text-xs font-bold text-[#1c160e] cursor-pointer"
                >
                  {isActive ? 'Día habilitado' : 'Habilitar día'}
                </label>
              </div>

              {isActive ? (
                <div className="space-y-2.5">
                  <div>
                    <label
                      htmlFor={startId}
                      className="block text-xs font-semibold text-[#524634] mb-1"
                    >
                      Apertura:
                    </label>
                    <input
                      id={startId}
                      type="time"
                      value={row.start_time}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAvailability((prev) =>
                          prev.map((item) =>
                            item.day_of_week === dayObj.value
                              ? { ...item, start_time: val }
                              : item
                          )
                        );
                      }}
                      className="form-input py-1.5 px-2 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={endId}
                      className="block text-xs font-semibold text-[#524634] mb-1"
                    >
                      Cierre:
                    </label>
                    <input
                      id={endId}
                      type="time"
                      value={row.end_time}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAvailability((prev) =>
                          prev.map((item) =>
                            item.day_of_week === dayObj.value
                              ? { ...item, end_time: val }
                              : item
                          )
                        );
                      }}
                      className="form-input py-1.5 px-2 text-xs font-bold"
                    />
                  </div>

                  <div className="rounded-md bg-white/85 border border-black/15 p-2 text-[11px] text-[#1c160e] space-y-0.5">
                    <div className="font-bold text-[#004070]">
                      {totalBlocks} bloques de 60 min
                    </div>
                    <div>
                      Capacidad: <strong>{totalBlocks * 2} citas</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs font-medium text-[#5c4f3b]">
                  Sin consulta este día
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
