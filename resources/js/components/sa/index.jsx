import ExportMenu from '../ExportMenu';
import React from 'react';
import { statusLabel } from '../OrderBadge';
import { paths } from './iconPaths';
import { t } from '../../i18n';

// Building blocks that render the exact markup/classes of the shop-admin UI (styles live in resources/css/sa.css).

export function SaIcon({ name, className = '' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={paths[name] ?? paths.file} />
        </svg>
    );
}

// Same formats as the original: "$1,899" (no forced decimals), "05 Oct 2026", "05 Oct 2026, 01:11 PM".
export const money = (v) => (v == null || v === '' ? '--' : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
export const fdate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--');
export const fdt = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--');
export const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

const ORDER = ['pending', 'confirm', 'processing', 'pickup', 'on_the_way', 'delivered', 'cancelled'];
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function Pill({ value }) {
    if (!value) return '--';
    const text = ORDER.includes(value) ? statusLabel(value) : t(cap(String(value).replace(/_/g, ' ')));
    return <span className={`pill s-${slug(value)}`}>{text}</span>;
}

export const Chip = ({ children }) => <span className="chip">{children}</span>;

export function Switch({ checked, onChange, label = 'Status', disabled }) {
    return <label className="switch"><input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} aria-label={label} /><span /></label>;
}

export const PageHead = ({ title, children }) => <div className="page-head"><h1>{title}</h1><div className="head-actions"><ExportMenu />{children}</div></div>;
export const Card = ({ children, className = '', ...rest }) => <div className={`card ${className}`} {...rest}>{children}</div>;
export const CardH = ({ children, className = '' }) => <div className={`card-h ${className}`}>{children}</div>;
export const CardB = ({ children, className = '' }) => <div className={`card-b ${className}`}>{children}</div>;

export function Tabs({ tabs, value, onChange, label = (x) => t(String(x).replace(/_/g, ' ')) }) {
    return <div className="tabs" role="tablist">{tabs.map((t) => <button key={t} role="tab" aria-selected={value === t} className={`tab ${value === t ? 'active' : ''}`} onClick={() => onChange(t)}>{label(t)}</button>)}</div>;
}

// "Showing 15 of 148   ‹ 1 2 3 ›"
export function Pager({ meta, count, onPage }) {
    if (!meta) return null;
    const { current_page: cp, last_page: lp, total } = meta;
    const nums = [];
    for (let n = Math.max(1, cp - 2); n <= Math.min(lp, cp + 2); n++) nums.push(n);
    return (
        <div className="pager">
            <span>{t('Showing {count} of {total}', { count, total })}</span>
            <div className="pages">
                <button aria-label={t('Previous page')} disabled={cp <= 1} onClick={() => onPage(cp - 1)}>‹</button>
                {nums.map((n) => <button key={n} className={n === cp ? 'active' : ''} onClick={() => onPage(n)}>{n}</button>)}
                <button aria-label={t('Next page')} disabled={cp >= lp} onClick={() => onPage(cp + 1)}>›</button>
            </div>
        </div>
    );
}

export const ActBtn = ({ icon, title, onClick, ...rest }) => <button className="act" title={title} aria-label={title} onClick={onClick} {...rest}><SaIcon name={icon} /></button>;

export function Thumb({ src, name, id = 0 }) {
    const [bad, setBad] = React.useState(false);
    const fallback = `/placeholder/${encodeURIComponent(name || '?')}.svg?h=${(id * 37) % 360}`;
    return <img className="thumb" src={!src || bad ? fallback : src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}
export { statusLabel };

// Dialog on the original's markup: backdrop > .modal with a .card-h header and a .modal-f footer.
export function Modal({ title, onClose, children, footer, wide }) {
    React.useEffect(() => {
        const h = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);
    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: 'min(860px,100%)' } : undefined} onMouseDown={(e) => e.stopPropagation()}>
                <div className="card-h"><h3>{title}</h3><button className="act" aria-label={t('Close')} onClick={onClose}><SaIcon name="x" /></button></div>
                <div className="card-b">{children}</div>
                {footer && <div className="modal-f">{footer}</div>}
            </div>
        </div>
    );
}

// Table cell renderer shared by every list (same column types as the original).
export function Cell({ type, value, row, onToggle, busy }) {
    switch (type) {
        case 'image': return <Thumb src={value?.startsWith?.('uploads/') ? `/storage/${value}` : value} name={row.name ?? row.title} id={row.id} />;
        case 'toggle': return <Switch checked={value} disabled={busy} onChange={() => onToggle?.(row)} />;
        case 'money': return money(value);
        case 'date': return fdate(value);
        case 'datetime': return fdt(value);
        case 'status': return <Pill value={value} />;
        case 'badge': return value ? <Chip>{String(value).replace(/_/g, ' ')}</Chip> : '--';
        case 'bool': return value ? 'Yes' : 'No';
        case 'color': return <><span className="swatch" style={{ background: value }} /> <span className="muted">{value}</span></>;
        default: { const s = value == null || value === '' ? '--' : Array.isArray(value) ? value.join(', ') : String(value); return s.length > 60 ? `${s.slice(0, 60)}…` : s; }
    }
}

// Debounced search box with the original's behaviour (250 ms, no submit button).
export function useDebounced(value, ms = 250) {
    const [v, setV] = React.useState(value);
    React.useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}
