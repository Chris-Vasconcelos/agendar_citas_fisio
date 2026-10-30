import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePatientText, phoneDigits, matchesPatient, possibleDuplicatePatients } from '../src/utils/patientSearch.js';

const patients = [
  { id: '101', full_name: 'María López', phone: '55 1234 5678' },
  { id: '102', full_name: 'Maria Lopez', phone: '55 9999 0000' },
  { id: '103', full_name: 'José Pérez', phone: null }
];

test('normalization removes accents, case and repeated spaces', () => {
  assert.equal(normalizePatientText('  MARÍA   López  '), 'maria lopez');
  assert.equal(normalizePatientText(undefined), '');
});
test('search supports multiple terms, accents and identifier', () => {
  assert.equal(matchesPatient(patients[0], 'maria lopez'), true);
  assert.equal(matchesPatient(patients[0], '551234'), true);
  assert.equal(matchesPatient(patients[0], '101'), true);
  assert.equal(matchesPatient(patients[2], 'jose'), true);
  assert.equal(matchesPatient(patients[2], '551234'), false);
});
test('phone-only matches require digits', () => {
  assert.equal(phoneDigits('+52 55-1234 5678'), '525512345678');
  assert.equal(matchesPatient(patients[2], '555'), false);
});
test('potential duplicates warn without merging records', () => {
  const result = possibleDuplicatePatients(patients, { full_name: 'MARIA LOPEZ', phone: '000' });
  assert.equal(result.length, 2);
  assert.equal(possibleDuplicatePatients(patients, { full_name: 'María López', phone: '55 1234 5678' }, '101').length, 1);
  assert.equal(patients.length, 3);
});
