import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const agenda = readFileSync(new URL('../src/pages/AgendaPage.jsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/layout/Header.jsx', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function assertIconsImported(source) {
  const match = source.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  assert.ok(match, 'No se encontró la importación de lucide-react');
  const imports = new Set(match[1].split(',').map((name) => name.trim()));
  const upperCaseTags = [...source.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((m) => m[1]);
  for (const tag of new Set(upperCaseTags)) {
    assert.ok(imports.has(tag), `Falta importar <${tag} /> desde lucide-react`);
  }
}

test('all JSX icons in the agenda and header are imported', () => {
  assertIconsImported(agenda);
  assertIconsImported(header);
});

test('calendar uses a single date heading and the two appointment slots remain available', () => {
  assert.equal((agenda.match(/id="heading-agenda"/g) || []).length, 1);
  assert.ok(agenda.includes('[1, 2].map((slotNum)'));
});

test('HTML shell does not expose static demo clinical records', () => {
  assert.doesNotMatch(html, /María Fernanda López|Carlos Eduardo Ramírez|Fisio Citas/);
  assert.match(html, /id="root"/);
});

test('weekly cards retain patient names, full time, and only exceptional statuses', () => {
  assert.match(agenda, /mina-week-appointment-name/);
  assert.match(agenda, /mina-week-appointment-time/);
  assert.match(agenda, /mina-week-allergy-icon/);
  assert.doesNotMatch(agenda, /'Programada'<\/span>/);
  assert.match(agenda, /weeklyTotalActive === 1/);
});
test('patient duplicate notice and save guidance are kept in the form', () => {
  const patientModal = readFileSync(new URL('../src/components/modals/PatientModal.jsx', import.meta.url), 'utf8');
  assert.match(patientModal, /mina-patient-duplicate-alert/);
  assert.match(patientModal, /mina-patient-save-hint/);
  assert.match(patientModal, /confirmedDifferentPerson/);
});
