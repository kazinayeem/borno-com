import React, { useEffect, useState } from 'react';
import { errorMessage, useUploadImageMutation } from '../app/api';
import { Icon } from './ui';
import { t } from '../i18n';

export const PageTitle = ({ children }) => <div className="page-head" style={{ marginBottom: 4 }}><h1>{children}</h1></div>;

export const Section = ({ title, children, className = '' }) => (
    <section className={`card mb-5 ${className}`}>
        {title && <div className="card-h"><h3>{title}</h3></div>}
        <div className="card-b">{children}</div>
    </section>
);

export function Field({ label, required, error, hint, children }) {
    return (
        <div className="mb-4">
            <label className="mb-1.5 block text-[13px]">{label}{required && <span className="text-red-500"> *</span>}</label>
            {children}
            {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export const inputCls = 'w-full rounded-[10px] border border-line bg-sa-surface px-3 py-[9px] text-sm outline-none placeholder:text-gray-400 focus:border-primary focus:ring-[3px] focus:ring-primary-soft';

export function TextInput({ value, onChange, ...rest }) {
    return <input className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
export function TextArea({ value, onChange, rows = 3, ...rest }) {
    return <textarea rows={rows} className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
export function Select({ value, onChange, options, placeholder }) {
    return (
        <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.id} value={o.id}>{o.name}</option>))}
        </select>
    );
}

// Chip multi-select (colors, sizes, keywords).
export function MultiSelect({ value = [], onChange, options = [], swatch = false }) {
    const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    return (
        <div className="rounded-md border border-line p-2">
            <div className="flex flex-wrap gap-2" role="group">
                {options.map((o) => {
                    const on = value.includes(o.id);
                    return (
                        <button type="button" key={o.id} aria-pressed={on} onClick={() => toggle(o.id)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${on ? 'border-primary bg-primary text-white' : 'border-line bg-sa-surface hover:border-primary'}`}>
                            {swatch && o.code && <span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: o.code }} />}
                            {on && <span aria-hidden="true">✓</span>}{o.name}
                        </button>);
                })}
            </div>
            <div className="mt-2 flex gap-3 text-xs"><button type="button" className="text-primary" onClick={() => onChange(options.map((o) => o.id))}>{t('Select all')}</button><button type="button" className="text-muted" onClick={() => onChange([])}>{t('Clear')}</button></div>
        </div>
    );
}

export function TagInput({ value = [], onChange, placeholder }) {
    const tags = Array.isArray(value) ? value : [];
    const [draft, setDraft] = useState('');
    const add = () => { const v = draft.trim(); if (v && !tags.includes(v)) onChange([...tags, v]); setDraft(''); };
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-line p-2">
            {tags.map((k) => <span key={k} className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary">{k}<button type="button" onClick={() => onChange(tags.filter((x) => x !== k))} aria-label={t('Remove {name}', { name: k })}><Icon name="close" size={11} /></button></span>)}
            <input className="min-w-40 flex-1 text-[13px] outline-none" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
        </div>
    );
}

// Uploads the chosen file right away and stores the returned path (e.g. "uploads/abc.png") in the form.
export function ImagePicker({ label, value, onChange, error, ratio = 'aspect-square', width = 'w-48' }) {
    const [upload, { isLoading }] = useUploadImageMutation();
    const [localError, setLocalError] = useState(null);
    const pick = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setLocalError(null);
        const r = await upload(file);
        if (r.error) return setLocalError(r.error.data?.errors?.file?.[0] ?? errorMessage(r.error));
        onChange(r.data.path);
    };
    return (
        <div className="mb-4">
            {label && <label className="mb-1.5 block text-[13px]">{label}</label>}
            <div className={`${width} ${ratio} relative mb-2 grid place-items-center overflow-hidden rounded-md bg-surface text-gray-400`}>
                {value ? <img src={/^https?:\/\//.test(value) ? value : `/storage/${value}`} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain" /> : <Icon name="box" size={40} />}
                {isLoading && <div className="absolute inset-0 grid place-items-center bg-sa-surface/70 text-xs">{t('Uploading…')}</div>}
            </div>
            <div className="flex items-center gap-3">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={isLoading} onChange={pick} className="w-full text-[13px] file:me-3 file:rounded file:border file:border-line file:bg-sa-surface file:px-3 file:py-1.5" />
                {value && <button type="button" onClick={() => onChange('')} className="whitespace-nowrap text-xs text-red-500">{t('Remove')}</button>}
            </div>
            {(localError || error) && <p className="mt-1 text-xs text-red-500">{localError || error}</p>}
        </div>
    );
}

export function FormActions({ saving, onReset, back }) {
    return (
        <div className="row" style={{ justifyContent: 'flex-end', gap: 10, paddingBottom: 24 }}>
            {onReset && <button type="button" onClick={onReset} className="btn">{t('Reset')}</button>}
            {back && <a href={back} className="btn">{t('Cancel')}</a>}
            <button disabled={saving} className="btn primary">{saving ? t('Saving…') : t('Submit')}</button>
        </div>
    );
}

/** Several product photos: up to `max`, picked in one go or one by one, each removable. */
export function GalleryPicker({ value, onChange, max = 5, error }) {
    const list = Array.isArray(value) ? value : [];
    const [upload] = useUploadImageMutation();
    const [busy, setBusy] = useState(0);
    const [localError, setLocalError] = useState(null);
    const pick = async (e) => {
        const files = [...e.target.files].slice(0, Math.max(0, max - list.length));
        const skipped = e.target.files.length - files.length;
        e.target.value = '';
        setLocalError(skipped > 0 ? t('Only {n} images are allowed. Extra files were skipped.', { n: max }) : null);
        setBusy(files.length);
        const added = [];
        for (const f of files) {
            const r = await upload(f);
            if (r.error) setLocalError(r.error.data?.errors?.file?.[0] ?? errorMessage(r.error)); else added.push(r.data.path);
            setBusy((n) => n - 1);
        }
        if (added.length) onChange([...list, ...added]);
    };
    const src = (v) => (/^https?:\/\//.test(v) ? v : `/storage/${v}`);
    return (
        <div>
            <div className="flex flex-wrap gap-3">
                {list.map((v, i) => (
                    <div key={v} className="relative h-24 w-24 overflow-hidden rounded-md border border-line bg-surface">
                        <img src={src(v)} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                        <button type="button" aria-label={t('Remove image {n}', { n: i + 1 })} onClick={() => onChange(list.filter((x) => x !== v))} className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white">✕</button>
                    </div>))}
                {busy > 0 && <div className="grid h-24 w-24 place-items-center rounded-md border border-dashed border-line text-xs text-muted">{t('Uploading…')}</div>}
                {list.length + busy < max && (
                    <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-md border border-dashed border-primary text-center text-xs text-primary">
                        <span>+<br />{t('Add images')}</span>
                        <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={pick} />
                    </label>)}
            </div>
            <p className="mt-2 text-xs text-muted">{t('{n} of {max} images', { n: list.length, max })}</p>
            {(localError || error) && <p className="mt-1 text-xs text-red-500">{localError || error}</p>}
        </div>
    );
}
