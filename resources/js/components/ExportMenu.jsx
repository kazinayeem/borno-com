import React, { useEffect, useRef, useState } from 'react';
import { useGetMasterQuery } from '../app/api';
import { t } from '../i18n';

const SKIP_HEAD = new Set(['action', 'actions', '']);
const stamp = () => new Date().toISOString().slice(0, 10);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export';

/** Reads the first data table on the page (what the admin is looking at, filters and page included). */
function readTable() {
    const table = document.querySelector('.sa .content .table-wrap table') ?? document.querySelector('.sa .content table');
    if (!table) return null;
    const heads = [...table.querySelectorAll('thead th')].map((th) => th.innerText.trim());
    const bodyRows = [...table.querySelectorAll('tbody tr')].filter((tr) => !tr.querySelector('td.empty, td[colspan]'));
    const cell = (td) => {
        const box = td.querySelector('input[type=checkbox]');
        if (box && !td.innerText.trim()) return box.checked ? t('Active') : t('Inactive');
        return td.innerText.replace(/\s*\n\s*/g, ' ').trim();
    };
    const rows = bodyRows.map((tr) => [...tr.children].map(cell));
    const keep = heads.map((h, i) => !SKIP_HEAD.has(h.toLowerCase()) && rows.some((r) => (r[i] ?? '') !== ''));
    return { head: heads.filter((_, i) => keep[i]), rows: rows.map((r) => r.filter((_, i) => keep[i])) };
}

const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function logoData(src) {
    try {
        const blob = await (await fetch(src, { credentials: 'omit' })).blob();
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); });
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        return { url: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight };
    } catch { return null; }
}

const NON_LATIN = /[^\u0000-ɏ -⃏←-⇿]/;

export default function ExportMenu() {
    const { data: master } = useGetMasterQuery();
    const [open, setOpen] = useState(false);
    const [has, setHas] = useState(false);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);
    // Only show the menu on pages that actually have a table.
    useEffect(() => {
        const root = document.querySelector('.sa .content') ?? document.body;
        const check = () => setHas(!!root.querySelector('table'));
        check();
        const mo = new MutationObserver(check);
        mo.observe(root, { childList: true, subtree: true });
        return () => mo.disconnect();
    }, []);
    useEffect(() => {
        if (!open) return undefined;
        const out = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', out);
        return () => document.removeEventListener('mousedown', out);
    }, [open]);
    if (!has) return null;

    const title = () => document.querySelector('.sa .page-head h1')?.innerText.trim() || 'Export';
    const company = () => master?.data?.company_name || master?.data?.app_name || '';
    const run = async (kind) => {
        setOpen(false);
        const data = readTable();
        if (!data || !data.rows.length) { window.alert(t('There is nothing to export on this page.')); return; }
        const name = `${slug(title())}-${stamp()}`;
        setBusy(true);
        try {
            if (kind === 'csv') {
                const text = [data.head, ...data.rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
                download(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
            } else if (kind === 'xlsx') {
                const { default: writeXlsx } = await import('write-excel-file/browser');
                const header = data.head.map((h) => ({ value: h, fontWeight: 'bold', backgroundColor: '#EEF2FF' }));
                const body = data.rows.map((r) => r.map((v) => ({ value: /^-?\d+(\.\d+)?$/.test(v) && v.length < 15 && !/^0\d/.test(v) ? Number(v) : v })));
                await writeXlsx([header, ...body], { fileName: `${name}.xlsx`, sheet: title().slice(0, 30), columns: data.head.map(() => ({ width: 22 })) });
            } else {
                await makePdf(data, title(), company(), master?.data?.web_logo, name);
            }
        } catch (e) {
            window.alert(t('Export failed: {msg}', { msg: e.message }));
        } finally { setBusy(false); }
    };
    return (
        <div className="rel" ref={ref}>
            <button type="button" className="btn" aria-haspopup="menu" aria-expanded={open} disabled={busy} onClick={() => setOpen((v) => !v)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" /></svg> {busy ? t('Exporting…') : t('Export')}</button>
            {open && <div className="dropdown" role="menu" style={{ minWidth: 170 }}>
                <button role="menuitem" onClick={() => run('pdf')}>PDF</button>
                <button role="menuitem" onClick={() => run('xlsx')}>Excel (.xlsx)</button>
                <button role="menuitem" onClick={() => run('csv')}>CSV</button>
            </div>}
        </div>
    );
}

/** Branded PDF: logo + company, title, date, striped table, page numbers and the bornosoft credit on every page. */
async function makePdf(data, title, company, logoSrc, fileName) {
    const text = [title, company, ...data.head, ...data.rows.flat()].join('');
    if (NON_LATIN.test(text)) return printFallback(data, title, company, logoSrc);   // jsPDF's built-in fonts cannot draw Bangla / Arabic
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const landscape = data.head.length > 6;
    const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight(); const M = 36;
    const logo = logoSrc ? await logoData(logoSrc) : null;
    const primary = [238, 69, 107];
    const header = () => {
        let x = M;
        if (logo) { const h = 38; const w = Math.min(130, (logo.w / logo.h) * h); doc.addImage(logo.url, 'PNG', M, M - 6, w, w * (logo.h / logo.w) > h ? h : w * (logo.h / logo.w)); x = M + w + 12; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(31, 35, 48); doc.text(company || '', x, M + 8);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 114, 128); doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, x, M + 22);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...primary); doc.text(title.toUpperCase(), W - M, M + 10, { align: 'right' });
        doc.setDrawColor(...primary); doc.setLineWidth(1.5); doc.line(M, M + 38, W - M, M + 38);
    };
    autoTable(doc, {
        head: [data.head], body: data.rows, startY: M + 52, margin: { top: M + 52, left: M, right: M, bottom: 40 },
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' }, headStyles: { fillColor: primary, textColor: 255 }, alternateRowStyles: { fillColor: [249, 250, 251] },
        didDrawPage: header,
    });
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
        doc.text(`${company ? `${company}  ·  ` : ''}Developed by bornosoft.bd`, M, H - 18); doc.text(`Page ${i} of ${pages}`, W - M, H - 18, { align: 'right' });
    }
    doc.save(`${fileName}.pdf`);
}

/** Bangla / Arabic reports: print a styled page so the browser's own fonts draw the text ("Save as PDF"). */
function printFallback(data, title, company, logoSrc) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open();
    d.write(`<!doctype html><html dir="${document.documentElement.dir}"><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:'Noto Sans Arabic','Noto Sans Bengali',Inter,Arial,sans-serif;font-size:11px;color:#1f2330}
.h{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ee456b;padding-bottom:8px;margin-bottom:12px}.h img{height:40px;margin-inline-end:10px}h1{font-size:20px;color:#ee456b;margin:0}table{width:100%;border-collapse:collapse}th{background:#ee456b;color:#fff;text-align:start;padding:6px}td{padding:5px 6px;border-bottom:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}.f{margin-top:14px;text-align:center;color:#6b7280;font-size:10px}</style>
<div class="h"><div style="display:flex;align-items:center">${logoSrc ? `<img src="${esc(logoSrc)}">` : ''}<b>${esc(company)}</b></div><h1>${esc(title)}</h1></div>
<table><thead><tr>${data.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${data.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
<div class="f">${esc(company)} · Developed by bornosoft.bd</div></html>`);
    d.close();
    const go = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1500); };
    const img = d.querySelector('img');
    if (img && !img.complete) { img.onload = go; img.onerror = go; } else setTimeout(go, 200);
}
