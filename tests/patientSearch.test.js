import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePatientText } from '../src/utils/patientSearch.js';

test('ignores accents and outer spaces', () => {
  assert.equal(normalizePatientText(' MARÍA '), 'maria');
  assert.equal(normalizePatientText('José Pérez'), 'jose perez');
});
test('does not crash with an empty field', () => {
  assert.equal(normalizePatientText(null), '');
  assert.equal(normalizePatientText(undefined), '');
});
