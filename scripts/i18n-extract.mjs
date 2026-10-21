// Collects every translatable English string: t('…') calls, capitalised UI-looking literals (data-driven labels), and the page spec.
// Usage: node scripts/i18n-extract.mjs            -> prints keys, one per line
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'resources/js';
const keys = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === 'i18n' ? [] : walk(p);
    return /\.(jsx?|mjs)$/.test(e.name) && !e.name.includes('iconPaths') ? [p] : [];
});
const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');

for (const f of walk(ROOT)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'((?:\\.|[^'\\])*)'/g)) keys.add(unescape(m[1]));
    for (const m of src.matchAll(/\bt\(\s*"((?:\\.|[^"\\])*)"/g)) keys.add(unescape(m[1]));
    // data-driven labels (arrays/objects of plain English passed to t() at render time) — only inside UI folders
    if (/\/(pages|components)\//.test(f.replace(/\\/g, '/'))) {
        for (const m of src.matchAll(/'((?:\\.|[^'\\\n])+)'/g)) {
            const v = unescape(m[1]);
            if (!/^[A-Z0-9][A-Za-z0-9 &/+%.,:!?'’“”…·—–()#@-]*$/.test(v) || v.length > 90) continue;
            if (/^[A-Z0-9_ ]+$/.test(v) && !['FAQ'].includes(v)) continue;          // verbs, ids, constants
            if (/^(Bearer|Content-Type|Authorization|Accept|GET|POST|PUT|PATCH)\b/.test(v)) continue;
            if (/\b(px|fr)\b|^\d+(\.\d+)?[a-z]*(\s|$)\s*\d*[a-z]*$/.test(v) && !/[A-Za-z]{4,}/.test(v.replace(/px|fr|digit/g, ''))) continue;   // CSS values
            if (/^[A-Z][a-z]+([A-Z][a-z]+)+$/.test(v) || /@/.test(v) || /^[A-Z][a-z]+\/[A-Z]/.test(v) || v === '2-digit' || /^M\d/.test(v) || ['Escape', 'PageView', 'InitiateCheckout'].includes(v)) continue;   // identifiers, emails, time zones
            keys.add(v);
        }
    }
}
const spec = JSON.parse(fs.readFileSync(`${ROOT}/pages/admin/spec/spec.json`, 'utf8'));
const label = (s) => s.split(':').slice(2).join(':').replace(/@\w+$/, '').replace(/\[(.*)\]$/, '');
const opts = (s) => (s.match(/\[(.*)\]$/)?.[1] ?? '').split('|').filter(Boolean);
for (const m of spec.menu) { if (m.label) keys.add(m.label); if (m.section) keys.add(m.section); (m.children ?? []).forEach(([l]) => keys.add(l)); }
for (const p of Object.values(spec.pages)) {
    if (p.title) keys.add(p.title);
    (p.tabs ?? []).forEach((x) => keys.add(String(x).replace(/_/g, ' ')));
    for (const def of [...(p.columns ?? []), ...(p.fields ?? []), ...(p.modal ?? []), ...(p.filters ?? [])]) {
        keys.add(label(def));
        opts(def).forEach((o) => keys.add(o.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())));
    }
}
for (const s of ['Pending', 'Confirm', 'Processing', 'Pickup', 'On The Way', 'Delivered', 'Cancelled', 'Paid', 'Approved', 'Rejected', 'Accepted', 'Active', 'Inactive', 'Refunded', 'Received', 'Update', 'Completed']) keys.add(s);
[...keys].filter((k) => /[A-Za-z]/.test(k)).sort((a, b) => a.localeCompare(b)).forEach((k) => console.log(k));
