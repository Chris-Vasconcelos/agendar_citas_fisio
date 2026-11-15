import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarHours, calendarCell, appointmentsInCell } from '../src/utils/calendar.js';
const date = '2030-01-07';
const apt = (id, h, m, endH, endM, status = 'scheduled') => ({ id, slot_number: 1, status,
  start_time: new Date(2030, 0, 7, h, m).toISOString(), end_time: new Date(2030, 0, 7, endH, endM).toISOString() });
test('existing appointments remain visible with closed or shortened working hours', () => {
  const records = [apt('morning', 10, 0, 11, 0), apt('late', 23, 0, 23, 30)];
  assert.ok(calendarHours([], records).includes('10:00'));
  assert.ok(calendarHours([{is_active:true,start_time:'08:00',end_time:'09:00'}], records).includes('23:00'));
  assert.deepEqual(calendarHours([], [apt('cancelled',10,0,11,0,'cancelled')]), []);
});
test('both consecutive appointments within one hourly cell remain available', () => {
  const records = [apt('first',10,0,10,30),apt('second',10,30,11,0),apt('next',11,0,12,0)];
  assert.deepEqual(appointmentsInCell(records,date,'10:00',1).map((a)=>a.id), ['first','second']);
  assert.deepEqual(appointmentsInCell(records,date,'10:00',2), []);
});
test('the final cell ends at midnight on the following date', () => {
  const [start,end] = calendarCell(date,'23:00');
  assert.equal(end-start,3600000);
  assert.equal(new Date(end).getDate(),8);
  assert.equal(new Date(end).getHours(),0);
  assert.equal(appointmentsInCell([apt('late',23,0,23,30)],date,'23:00',1).length,1);
});
