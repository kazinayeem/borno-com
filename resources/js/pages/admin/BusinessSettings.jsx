import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { errorMessage, useGetGroupQuery, useSaveGroupMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Field, inputCls, Section, TextInput } from '../../components/FormKit';
import { t } from '../../i18n';

function zones() {
    const list = typeof Intl !== 'undefined' && Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Asia/Dhaka'];
    return list.map((zone) => {
        let name = zone;
        try {
            const now = new Date();
            const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
            const local = new Date(now.toLocaleString('en-US', { timeZone: zone }));
            const mins = Math.round((local - utc) / 60000);
            const sign = mins >= 0 ? '+' : '-';
            const abs = Math.abs(mins);
            name = `UTC/GMT ${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')} - ${zone}`;
        } catch { /* keep the identifier when the zone cannot be formatted */ }
        return { id: zone, name };
    });
}

function shades(hex) {
    const n = Number.parseInt(String(hex).replace('#', ''), 16);
    if (Number.isNaN(n)) return [hex];
    const mix = (amt) => `#${[16, 8, 0].map((shift) => Math.max(0, Math.min(255, ((n >> shift) & 255) + amt)).toString(16).padStart(2, '0')).join('')}`;
    return [mix(80), mix(40), hex, mix(-30), mix(-60)];
}

const Check = ({ label, on, onChange }) => (
    <label className="flex items-center gap-2 py-1 text-[13px] font-medium">
        <input type="checkbox" className="accent-primary" checked={!!on} onChange={(e) => onChange(e.target.checked)} />
        {label}
    </label>
);

export function BusinessSetup() {
    const { data, isError, isLoading } = useGetGroupQuery('business');
    const [save, { isLoading: saving, error }] = useSaveGroupMutation();
    const [f, setF] = useState(null);
    const [dirty, setDirty] = useState(false);
    const dispatch = useDispatch();
    const zoneOptions = useMemo(zones, []);
    useEffect(() => { if (data) { setF(data); setDirty(false); } }, [data]);
    useEffect(() => {
        const onLeave = (e) => { if (!dirty) return; e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onLeave);
        return () => window.removeEventListener('beforeunload', onLeave);
    }, [dirty]);
    if (isError) return <div className="card"><div className="empty">{t('Could not load settings. You may not have permission for this section.')}</div></div>;
    if (isLoading || !f) return <div className="skeleton h-96" />;
    const set = (k) => (v) => { setDirty(true); setF((x) => ({ ...x, [k]: v })); };
    const errs = error?.data?.errors ?? {};
    const err = (k) => errs[k]?.[0];
    const num = (v) => (v === '' || v == null ? null : Number(v));
    const submit = async (e) => {
        e.preventDefault();
        const r = await save({
            key: 'business', ...f,
            email: f.email || null, mobile: f.mobile || null, default_phone_code: f.default_phone_code || null,
            return_order_within_days: num(f.return_order_within_days), low_stock_alert_quantity: num(f.low_stock_alert_quantity),
        });
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        setDirty(false);
        dispatch(pushToast(t('Settings updated')));
    };

    return (
        <form onSubmit={submit} className="mx-auto w-full max-w-[1100px]">
            <h2 className="page-head mb-4 text-[22px] font-semibold">{t('Business Settings')}</h2>
            <Section title={t('Business Settings')}>
                <div className="grid gap-x-6 md:grid-cols-2">
                    <Field label={t('Company Name')} error={err('name')}><TextInput value={f.name} onChange={set('name')} /></Field>
                    <Field label={t('Company Email')} error={err('email')}><TextInput type="email" value={f.email} onChange={set('email')} /></Field>
                    <Field label={t('Company Phone')} error={err('mobile')}><TextInput value={f.mobile} onChange={set('mobile')} /></Field>
                    <Field label={t('Default Phone Code')} error={err('default_phone_code')}><TextInput value={f.default_phone_code} onChange={set('default_phone_code')} placeholder="+880" /></Field>
                </div>
                <Field label={t('Shop Type')} error={err('shop_type')}>
                    <div className="flex flex-wrap gap-6 text-sm">
                        {[['single', 'Single Shop'], ['multi', 'Multi Shop']].map(([id, label]) => (
                            <label key={id} className="flex items-center gap-2"><input type="radio" name="shop_type" className="accent-primary" checked={f.shop_type === id} onChange={() => set('shop_type')(id)} />{t(label)}</label>
                        ))}
                    </div>
                </Field>
                <Field label={t('Currency Position')} error={err('currency_position')}>
                    <div className="flex flex-wrap gap-6 text-sm">
                        {[['prefix', '($) Left'], ['suffix', 'Right ($)']].map(([id, label]) => (
                            <label key={id} className="flex items-center gap-2"><input type="radio" name="currency_position" className="accent-primary" checked={f.currency_position === id} onChange={() => set('currency_position')(id)} />{t(label)}</label>
                        ))}
                    </div>
                </Field>
                <Field label={t('Time Zone')} error={err('timezone')}>
                    <select className={inputCls} value={f.timezone || 'Asia/Dhaka'} onChange={(e) => set('timezone')(e.target.value)} aria-label={t('Time Zone')}>
                        {zoneOptions.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                </Field>
                <div className="grid gap-x-6 md:grid-cols-2">
                    <Field label={t('Return Order Within Days')} error={err('return_order_within_days')}><TextInput type="number" min="0" value={f.return_order_within_days} onChange={set('return_order_within_days')} /></Field>
                    <Field label={t('Low Stock Alert Quantity')} error={err('low_stock_alert_quantity')}><TextInput type="number" min="0" value={f.low_stock_alert_quantity} onChange={set('low_stock_alert_quantity')} /></Field>
                </div>
                <Check label={t('Low Stock Alert')} on={f.low_stock_alert} onChange={set('low_stock_alert')} />
                <Check label={t('Low Stock Mail Notification')} on={f.low_stock_mail_notification} onChange={set('low_stock_mail_notification')} />
                <Check label={t('Show Product Stock')} on={f.show_product_stock} onChange={set('show_product_stock')} />
                <Check label={t('Show Map When Adding Address')} on={f.show_address_map} onChange={set('show_address_map')} />
            </Section>
            <Section title={t('Payment Method Setup')}>
                <Check label={t('💰 Cash on Delivery Enable')} on={f.cash_on_delivery} onChange={set('cash_on_delivery')} />
                <Check label={t('💳 Online Payment Enable')} on={f.online_payment} onChange={set('online_payment')} />
                <Check label={t('👤 Allow guest checkout (no login needed)')} on={f.guest_checkout} onChange={set('guest_checkout')} />
            </Section>
            <div className="flex justify-end pb-6"><button disabled={saving} className="btn-primary !rounded-lg !px-8">{saving ? t('Saving…') : t('Save And Update')}</button></div>
        </form>
    );
}

export function ThemeColors() {
    const { data, isError, isLoading } = useGetGroupQuery('theme');
    const [save, { isLoading: saving, error }] = useSaveGroupMutation();
    const [f, setF] = useState(null);
    const dispatch = useDispatch();
    useEffect(() => { if (data) setF({ primary_color: data.primary_color || '#ee456b', secondary_color: data.secondary_color || '#111827' }); }, [data]);
    if (isError) return <div className="card"><div className="empty">{t('Could not load settings. You may not have permission for this section.')}</div></div>;
    if (isLoading || !f) return <div className="skeleton h-72" />;
    const palette = shades(f.primary_color);
    const errs = error?.data?.errors ?? {};
    const submit = async (e) => {
        e.preventDefault();
        const r = await save({ key: 'theme', primary_color: f.primary_color, secondary_color: f.secondary_color, generated_color_variants: JSON.stringify(palette) });
        dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(t('Settings updated')));
    };

    return (
        <form onSubmit={submit} className="mx-auto w-full max-w-[1100px]">
            <h2 className="mb-4 text-[22px] font-semibold">{t('Theme Colors')}</h2>
            <Section title={t('Theme Colors Settings')}>
                <div className="grid gap-x-6 md:grid-cols-2">
                    <Field label={t('Select Your Primary Color')} error={errs.primary_color?.[0]}>
                        <input type="color" aria-label={t('Select Your Primary Color')} className={`${inputCls} h-11`} value={f.primary_color} onChange={(e) => setF((x) => ({ ...x, primary_color: e.target.value }))} />
                    </Field>
                    <Field label={t('Secondary')} error={errs.secondary_color?.[0]}>
                        <input type="color" aria-label={t('Secondary')} className={`${inputCls} h-11`} value={f.secondary_color} onChange={(e) => setF((x) => ({ ...x, secondary_color: e.target.value }))} />
                    </Field>
                </div>
                <p className="mb-2 text-sm font-medium">{t('Current Color')}</p>
                <div className="mb-4 h-10 w-24 rounded-md border border-line" style={{ background: f.primary_color }} />
                <p className="mb-2 text-sm font-medium">{t('Available Colors palette')}</p>
                <div className="flex gap-2">{palette.map((c) => <span key={c} title={c} className="h-8 w-8 rounded-md border border-line" style={{ background: c }} />)}</div>
                <p className="mt-3 text-sm text-muted">{t('Change Color Palette by picking a new primary color. The palette is saved with the theme.')}</p>
            </Section>
            <div className="flex justify-end pb-6"><button disabled={saving} className="btn-primary !rounded-lg !px-8">{saving ? t('Saving…') : t('Save And Update')}</button></div>
        </form>
    );
}
