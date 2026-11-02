import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const components = [
  'src/pages/AgendaPage.jsx',
  'src/components/layout/Header.jsx',
  'src/components/layout/BottomNav.jsx',
];

for (const path of components) {
  test(`JSX icons imported in ${path}`, () => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    const importMatch = source.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
    assert.ok(importMatch, `${path}: missing lucide-react import`);

    const imports = new Set(
      importMatch[1].split(',').map((value) => value.trim().split(/\s+as\s+/).at(-1))
    );
    // These files render Lucide components directly, so capitalized JSX tags
    // must be imported instead of becoming undefined runtime references.
    for (const match of source.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)) {
      assert.ok(imports.has(match[1]), `${path}: <${match[1]}/> is not imported`);
    }
  });
}

test('HTML entry has no fake patient cards shown when React fails', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('Cargando agenda'));
  assert.ok(!html.includes('María Fernanda López'));
});
