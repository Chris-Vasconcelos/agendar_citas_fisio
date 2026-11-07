import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMexicanWhatsApp, appointmentLocalDate, upcomingReminders, reminderMessage } from '../src/utils/reminders.js';

test('normalizes Mexico national and international numbers and rejects invalid ones', () => {
  assert.equal(normalizeMexicanWhatsApp('722 123 4567'), '527221234567');
  assert.equal(normalizeMexicanWhatsApp('+52 722 123 4567'), '527221234567');
  assert.equal(normalizeMexicanWhatsApp('+52 1 722 123 4567'), '527221234567');
  assert.equal(normalizeMexicanWhatsApp('123'), null);
});

test('reminder date is fixed to consultorio Mexico City timezone', () => {
  assert.equal(appointmentLocalDate('2026-11-07T16:00:00Z'), '2026-11-07');
});

test('upcoming appointments exclude completed/cancelled and expired', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const records = [
    { id: 'a', status: 'scheduled', start_time: '2026-11-08T12:00:00Z' },
    { id: 'b', status: 'cancelled', start_time: '2026-11-08T12:00:00Z' },
    { id: 'c', status: 'completed', start_time: '2026-11-08T12:00:00Z' },
    { id: 'd', status: 'scheduled', start_time: '2026-11-07T11:00:00Z' }
  ];
  assert.deepEqual(upcomingReminders(records, now).map((a) => a.id), ['a']);
  assert.ok(reminderMessage('Juan Pérez', records[0].start_time).includes('Hola Juan'));
  assert.ok(!reminderMessage('Juan Pérez', records[0].start_time).includes('diagnóstico'));
});
