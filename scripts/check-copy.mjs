import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

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
  ['prohibited marketing language', /\b(?:seamlessly|leverage|revolutionary|cutting-edge|powerful)\b/i],
  ['generated filler language', /\b(?:actionable insights?|at a glance|comprehensive|delve|furthermore|game-changing|holistic|moreover|robust|streamline|unlock)\b|\bdesigned to\b|\bhelps? (?:you|us)\b/i],
];
const editorialForbidden = [
  ['em dash', /—/],
  ['en dash used as prose', /\s–\s/],
];

function editorialFailures(target, text) {
  const source = ts.createSourceFile(target, text, ts.ScriptTarget.Latest, true, target.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let notButCount = 0;
  const inspect = (value, node) => {
    const copy = value.trim();
    if (!copy) return;
    if (ts.isBinaryExpression(node.parent)) return;
    if (node.getText(source).includes('\\u2014')) return;
    for (const [label, pattern] of editorialForbidden) {
      if (pattern.test(copy)) failures.push(`${target}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${label}`);
    }
    if ((copy.match(/;/g) || []).length > 1) failures.push(`${target}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: excessive semicolons`);
    notButCount += (copy.match(/\bnot\b[^.!?]{1,100}\bbut\b/gi) || []).length;
  };
  const walk = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) inspect(node.text, node);
    ts.forEachChild(node, walk);
  };
  walk(source);
  if (notButCount > 1) failures.push(`${target}: repeated "not X, but Y" construction`);
}

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
      editorialFailures(target, text);
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
