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
export function MultiSelect({ value = [], onChange, options }) {
    const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    return <div className="flex flex-wrap gap-2 rounded-md border border-line p-2">{options.map((o) => <button type="button" key={o.id} onClick={() => toggle(o.id)} className={`rounded-full px-3 py-1 text-xs ${value.includes(o.id) ? 'bg-primary text-white' : 'bg-surface'}`}>{o.name}</button>)}</div>;
}

export function TagInput({ value = [], onChange, placeholder }) {
    const [t, setT] = useState('');
    const add = () => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setT(''); };
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-line p-2">
            {value.map((k) => <span key={k} className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary">{k}<button type="button" onClick={() => onChange(value.filter((x) => x !== k))} aria-label={t('Remove {name}', { name: k })}><Icon name="close" size={11} /></button></span>)}
            <input className="min-w-40 flex-1 text-[13px] outline-none" value={t} placeholder={placeholder} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
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
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={isLoading} onChange={pick} className="w-full text-[13px] file:mr-3 file:rounded file:border file:border-line file:bg-sa-surface file:px-3 file:py-1.5" />
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
