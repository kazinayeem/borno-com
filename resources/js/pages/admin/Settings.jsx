import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { errorMessage, useAdminListQuery, useGetSettingsQuery, useSaveSettingsMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Field, ImagePicker, Section, Select, TextArea, TextInput } from '../../components/FormKit';
import { Icon } from '../../components/ui';
import { t } from '../../i18n';

const Toggle = ({ label, on, onChange }) => (
    <label className="flex cursor-pointer items-center justify-between py-1 text-[13px] font-medium">{label}
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-primary' : 'bg-gray-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-sa-surface shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></button></label>
);

export default function Settings() {
    const { data, isLoading } = useGetSettingsQuery();
    const { data: cur } = useAdminListQuery({ res: 'currencies', per_page: 100 });
    const [save, { isLoading: saving, error }] = useSaveSettingsMutation();
    const [f, setF] = useState(null);
    const dispatch = useDispatch();
    useEffect(() => { if (data) setF(data); }, [data]);
    if (isLoading || !f) return <div className="skeleton h-96" />;
    const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
    const errs = error?.data?.errors ?? {};
    const err = (k) => errs[k]?.[0];
    const submit = async (e) => {
        e.preventDefault();
        const r = await save(f);
        dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(t('Settings updated')));
    };
    const img = (k, label, props = {}) => <ImagePicker label={label} value={f[k]} onChange={set(k)} error={err(k)} {...props} />;

    return (
        <form onSubmit={submit} className="mx-auto max-w-[1100px]">
            <h2 className="mb-4 flex items-center gap-3 text-[22px] font-semibold"><Icon name="grid" size={22} />{t('Admin Settings')}</h2>
            <Section>
                <div className="grid gap-x-6 md:grid-cols-2">
                    <div>
                        <Field label={t('Website Name')} required error={err('name')}><TextInput value={f.name} onChange={set('name')} /></Field>
                        <Field label={t('Website Title')} required error={err('title')}><TextInput value={f.title} onChange={set('title')} /></Field>
                        <div className="grid gap-x-6 md:grid-cols-2">
                            <Field label={t('Default Currency')} error={err('currency')}><Select value={f.currency} onChange={set('currency')} options={(cur?.data ?? []).map((c) => ({ id: c.name, name: `${c.name} (${c.symbol})` }))} placeholder={t('Select Currency')} /></Field>
                            <Field label={t('Currency Position')}><Select value={f.currency_position} onChange={set('currency_position')} options={[{ id: 'prefix', name: 'Prefix' }, { id: 'suffix', name: 'Suffix' }]} /></Field>
                        </div>
                    </div>
                    <div className="grid gap-x-6 sm:grid-cols-2">{img('logo', 'Logo Ratio4:1 (200x50)', { width: 'w-full', ratio: 'aspect-[4/1]' })}{img('dark_logo', 'Dark Logo Ratio4:1 (200x50)', { width: 'w-full', ratio: 'aspect-[4/1]' })}</div>
                </div>
                <div className="grid gap-x-6 md:grid-cols-2">{img('app_logo', 'App Logo (300x300)', { width: 'w-28' })}{img('favicon', 'Favicon (300x300)', { width: 'w-28' })}</div>
            </Section>
            <Section title={t('Others Information')} icon="user"><div className="grid gap-x-6 md:grid-cols-3">
                <Field label={t('Mobile Number')} error={err('mobile')}><TextInput value={f.mobile} onChange={set('mobile')} /></Field>
                <Field label={t('Email Address')} error={err('email')}><TextInput type="email" value={f.email} onChange={set('email')} /></Field>
                <Field label={t('Address')}><TextInput value={f.address} onChange={set('address')} /></Field></div></Section>
            <Section title={t('Marketing Analytics')} icon="star">
                <Toggle label={t('Enable Meta Pixel Tracking')} on={!!f.meta_pixel_enabled} onChange={set('meta_pixel_enabled')} />
                {f.meta_pixel_enabled && <div className="mt-3 grid gap-x-6 md:grid-cols-3">
                    <Field label={t('Meta Pixel ID')}><TextInput value={f.meta_pixel_id} onChange={set('meta_pixel_id')} /></Field>
                    <Field label={t('Test Event Code')}><TextInput value={f.meta_test_event_code} onChange={set('meta_test_event_code')} /></Field>
                    <Field label={t('Conversions API Access Token')}><TextInput type="password" autoComplete="off" value={f.meta_capi_access_token} onChange={set('meta_capi_access_token')} /></Field></div>}
            </Section>
            <Section title={t('Download App Link')} icon="box">
                <Toggle label={t('Show/Hide Website Navigation Download App')} on={!!f.show_download_app} onChange={set('show_download_app')} />
                <div className="mt-3 grid gap-x-6 md:grid-cols-2">
                    <Field label={t('Google PlayStore App Link')} error={err('google_playstore_url')}><TextArea value={f.google_playstore_url} onChange={set('google_playstore_url')} /></Field>
                    <Field label={t('Apple Store App Link')} error={err('app_store_url')}><TextArea value={f.app_store_url} onChange={set('app_store_url')} /></Field></div>
            </Section>
            <Section title={t('Footer Section Info')} icon="doc">
                <Toggle label={t('Show/Hide Website Footer')} on={!!f.show_footer} onChange={set('show_footer')} />
                <div className="mt-3 grid gap-x-6 md:grid-cols-2">
                    <Field label={t('Hotline Number')}><TextInput value={f.footer_phone} onChange={set('footer_phone')} /></Field>
                    <Field label={t('Footer Text')}><TextInput value={f.footer_text} onChange={set('footer_text')} /></Field></div>
                <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
                    {img('footer_logo', 'Frontend Footer Logo Ratio4:1', { width: 'w-full', ratio: 'aspect-[4/1]' })}{img('footer_qrcode', 'Frontend Scan the QR (200x200)', { width: 'w-28' })}
                    {img('footer_payment_img', 'Frontend Footer Payment Image', { width: 'w-full', ratio: 'aspect-[4/1]' })}{img('footer_bg_image', 'Frontend Footer Background Image', { width: 'w-full', ratio: 'aspect-[4/1]' })}</div>
            </Section>
            <div className="flex justify-end pb-6"><button disabled={saving} className="btn-primary !rounded-lg !px-8">{saving ? t('Saving…') : t('Save And Update')}</button></div>
        </form>
    );
}
