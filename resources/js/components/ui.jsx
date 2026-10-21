import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismiss } from '../app/slices';

const paths = {
    search: 'M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z',
    heart: 'M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z',
    bag: 'M6 7h12l1 13H5L6 7zM9 7a3 3 0 016 0',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
    menu: 'M4 6h16M4 12h16M4 18h16',
    chevron: 'M6 9l6 6 6-6',
    right: 'M9 6l6 6-6 6',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
    eyeOff: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.9M6.6 6.6A17 17 0 002 12s4 7 10 7a9.7 9.7 0 004.4-1M9.9 9.9a3 3 0 004.2 4.2',
    copy: 'M9 9h11v11H9zM5 15V5h10',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    edit: 'M4 20h4L19 9l-4-4L4 16v4z',
    plus: 'M12 5v14M5 12h14',
    close: 'M6 6l12 12M18 6L6 18',
    truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    moon: 'M20 14A8 8 0 1110 4a7 7 0 0010 10z',
    home: 'M3 11l9-8 9 8M5 10v10h14V10',
    box: 'M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10',
    tag: 'M3 12V3h9l9 9-9 9-9-9zM8 8h.01',
    store: 'M4 9l1-5h14l1 5M4 9a3 3 0 006 0 3 3 0 006 0 3 3 0 004 0M5 12v8h14v-8',
    mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
    doc: 'M6 3h9l4 4v14H6zM14 3v5h5',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
    logout: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
};

export function Icon({ name, size = 18, className = '', fill = false }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export const money = (n) => `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Toasts() {
    const toasts = useSelector((s) => s.toast);
    const dispatch = useDispatch();
    React.useEffect(() => {
        const timers = toasts.map((t) => setTimeout(() => dispatch(dismiss(t.id)), 3000));
        return () => timers.forEach(clearTimeout);
    }, [toasts, dispatch]);
    return (
        <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
            {toasts.map((t) => (
                <div key={t.id} role="status" className={`min-w-64 rounded-lg border-l-4 bg-white px-4 py-3 text-sm shadow-lg ${t.type === 'error' ? 'border-red-500' : 'border-emerald-500'}`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}

export function Pagination({ meta, onPage }) {
    if (!meta || meta.last_page <= 1) return null;
    const pages = Array.from({ length: meta.last_page }, (_, i) => i + 1);
    return (
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
            <button disabled={meta.current_page === 1} onClick={() => onPage(meta.current_page - 1)} className="rounded-md border border-line px-3 py-1.5 text-sm disabled:opacity-40">Prev</button>
            {pages.map((p) => (
                <button key={p} onClick={() => onPage(p)} className={`h-9 w-9 rounded-md border text-sm ${p === meta.current_page ? 'border-primary bg-primary text-white' : 'border-line hover:border-primary'}`}>{p}</button>
            ))}
            <button disabled={meta.current_page === meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="rounded-md border border-line px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
        </nav>
    );
}

export function Empty({ title = 'Nothing found', hint }) {
    return (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted">
            <Icon name="box" size={40} />
            <p className="font-semibold text-ink">{title}</p>
            {hint && <p className="text-sm">{hint}</p>}
        </div>
    );
}

export function Modal({ title, onClose, children }) {
    React.useEffect(() => {
        const h = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
            <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} aria-label="Close"><Icon name="close" /></button>
                </div>
                {children}
            </div>
        </div>
    );
}
