import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvCell } from '../src/utils/csv.js';

test('protects formula cells', () => {
  for (const cell of ['=1+1', '+SUM(1,2)', '-2+3', '@SUM(A1)', '  =HYPERLINK("x")', '\t=cmd']) {
    assert.equal(escapeCsvCell(cell).startsWith("'") || escapeCsvCell(cell).startsWith('"\''), true, cell);
  }
});
test('quotes commas, quotes and newlines', () => {
  assert.equal(escapeCsvCell('hola,mundo'), '"hola,mundo"');
  assert.equal(escapeCsvCell('a"b'), '"a""b"');
  assert.equal(escapeCsvCell('uno\ndos'), '"uno\ndos"');
});
test('preserves safe values and blanks', () => {
  assert.equal(escapeCsvCell(null), '');
  assert.equal(escapeCsvCell('Paciente Juan'), 'Paciente Juan');
});
