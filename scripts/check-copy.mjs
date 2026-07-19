import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src/pages', 'src/components'];
const failures = [];
const forbidden = [
  ['malformed replacement character', /�/],
  ['obsolete document-review label', /Prototype document review/i],
  ['internal worker language', /hosted worker|quality-first worker|backend preview/i],
];

function visit(path) {
  for (const name of readdirSync(path)) {
    const target = join(path, name);
    if (statSync(target).isDirectory()) visit(target);
    else if (/\.(ts|tsx)$/.test(name)) {
      const text = readFileSync(target, 'utf8');
      for (const [label, pattern] of forbidden) {
        if (pattern.test(text)) failures.push(`${target}: ${label}`);
      }
    }
  }
}

roots.forEach(visit);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('User-facing copy checks passed.');
