import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src/pages', 'src/components'];
const failures = [];
const environmentCopy = 'Private beta · Public-source screening only · Do not upload confidential information';
let environmentCopyOccurrences = 0;
const forbidden = [
  ['malformed replacement character', /�/],
  ['obsolete document-review label', /Prototype document review/i],
  ['internal worker language', /hosted worker|quality-first worker|backend preview/i],
  ['payment language', /\b(?:payment|billing|subscription)\b/i],
  ['public monthly price', /(?:£|GBP\s*)\s*\d+(?:\.\d+)?\s*\/\s*month/i],
  ['legacy tier name', /Starter\s*\/\s*Growth|Team\s*\/\s*Platform/i],
  ['prohibited competitor wording', /right-hand system|speed of judgement|investment DNA|applied specialised intelligence|decision infrastructure/i],
];

function visit(path) {
  for (const name of readdirSync(path)) {
    const target = join(path, name);
    if (statSync(target).isDirectory()) visit(target);
    else if (/\.(ts|tsx)$/.test(name)) {
      const text = readFileSync(target, 'utf8');
      environmentCopyOccurrences += text.split(environmentCopy).length - 1;
      for (const [label, pattern] of forbidden) {
        if (pattern.test(text)) failures.push(`${target}: ${label}`);
      }
    }
  }
}

roots.forEach(visit);
if (environmentCopyOccurrences !== 1) {
  failures.push(`canonical environment banner copy appears ${environmentCopyOccurrences} times in source; expected 1`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('User-facing copy checks passed.');
