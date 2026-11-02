export function escapeCsvCell(val) {
  let str = val === null || val === undefined ? '' : String(val);

  // Spreadsheet formula injection can start after whitespace/control characters.
  // Prefix a quote so CSV/Excel consumers treat the cell as text.
  if (/^[\s\u0000-\u001f\u007f]*[=+@\-]/u.test(str)) {
    str = "'" + str;
  }

  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
