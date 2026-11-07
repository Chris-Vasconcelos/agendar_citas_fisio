import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the consultorio login has no public sign-up action', () => {
  const auth = read('../src/components/modals/AuthModal.jsx');
  assert.ok(auth.includes('signInWithEmailPassword'));
  assert.ok(!auth.includes('signUpWithEmailPassword'));
  assert.ok(!auth.includes('Crear cuenta'));
  assert.ok(auth.includes('Acceso exclusivo del consultorio'));
});

test('basic backups are accurately labeled as not including signed photos', () => {
  const security = read('../src/pages/SecurityPage.jsx');
  assert.ok(security.includes('Exportar datos (.JSON, sin fotografías)'));
  assert.ok(security.includes('las fotografías de consentimientos guardadas en Storage NO se incluyen'));
  assert.ok(security.includes('Restaurar datos (.JSON, sin fotografías)'));
});

test('signed consent photo requires visual legibility check and releases preview URL', () => {
  const consent = read('../src/components/modals/ConsentPhotoSection.jsx');
  assert.ok(consent.includes('URL.createObjectURL(file)'));
  assert.ok(consent.includes('URL.revokeObjectURL(url)'));
  assert.ok(consent.includes('Vista previa del consentimiento seleccionado'));
  assert.ok(consent.includes('se leen el nombre, la fecha y la firma'));
  assert.ok(consent.includes('Guardar fotografía privada'));
});
