// Fails (exit 1) if any UI string found by i18n-extract is missing from the Bangla or Arabic dictionary.
// Usage: node scripts/i18n-check.mjs   (also wired up as `npm run i18n:check`)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const keys = execFileSync('node', ['scripts/i18n-extract.mjs'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const bn = JSON.parse(fs.readFileSync('resources/js/i18n/bn.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('resources/js/i18n/ar.json', 'utf8'));
// Proper nouns / values that read the same in every language.
const SAME = new Set(['ReadyEcommerce', 'RazinSoft', 'EN', 'USD', '$ USD', 'v1.0', 'v4.6.1', 'UTC', 'Asia/Dhaka', 'Asia/Dubai', 'Europe/London']);
const missing = { bn: [], ar: [] };
for (const k of keys) {
    if (SAME.has(k) || !/[A-Za-z]{2}/.test(k)) continue;
    if (!(k in bn)) missing.bn.push(k);
    if (!(k in ar)) missing.ar.push(k);
}
// Placeholders must survive translation ({n}, {name}, …) or the interpolated value would be lost.
const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
const broken = [];
for (const [lang, dict] of [['bn', bn], ['ar', ar]]) for (const [k, v] of Object.entries(dict)) if (ph(k) !== ph(v)) broken.push(`${lang}: "${k}" -> "${v}"`);
console.log(`${keys.length} strings checked · missing bn: ${missing.bn.length}, ar: ${missing.ar.length} · broken placeholders: ${broken.length}`);
if (missing.bn.length) console.log('\nMissing in bn:\n' + missing.bn.map((k) => '  ' + k).join('\n'));
if (missing.ar.length && missing.ar.length !== missing.bn.length) console.log('\nMissing in ar:\n' + missing.ar.map((k) => '  ' + k).join('\n'));
if (broken.length) console.log('\nPlaceholder mismatches:\n' + broken.map((b) => '  ' + b).join('\n'));
process.exit(missing.bn.length || missing.ar.length || broken.length ? 1 : 0);
