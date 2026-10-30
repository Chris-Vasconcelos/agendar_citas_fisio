export function normalizePatientText(value) {
  return String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\s+/g, ' ').trim();
}

export function phoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function matchesPatient(patient, query) {
  const terms = normalizePatientText(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const name = normalizePatientText(patient.full_name);
  const id = normalizePatientText(patient.id);
  const phone = phoneDigits(patient.phone);
  return terms.every((term) => name.includes(term) || id.includes(term) ||
    (/^\d+$/.test(term) && phone.includes(term)));
}

export function possibleDuplicatePatients(patients, candidate, excludedId = null) {
  const name = normalizePatientText(candidate.full_name);
  const phone = phoneDigits(candidate.phone);
  return patients.filter((p) =>
    p.id !== excludedId && (
      (name.length >= 3 && normalizePatientText(p.full_name) === name) ||
      (phone.length >= 7 && phoneDigits(p.phone) === phone)
    )
  );
}
