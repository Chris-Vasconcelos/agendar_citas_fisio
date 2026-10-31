export function escapeCsvCell(val) {
  let str = val === null || val === undefined ? '' : String(val);

  // Protect against CSV injection (formulas starting with =, +, -, @)
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`; // Prefix with a single quote to force text interpretation
  }

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
