// Presentation-safe name casing. Preserve accents and compound surnames.
const connectors = new Set(['de','del','la','las','los','y','e']);
export function formatPatientName(value) {
  if (!value) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-MX').split(' ').map((word, index) => {
    if (index > 0 && connectors.has(word)) return word;
    return word.split('-').map((segment) => segment.charAt(0).toLocaleUpperCase('es-MX') + segment.slice(1)).join('-');
  }).join(' ');
}
