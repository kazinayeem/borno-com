import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    errorMessage, useChangePasswordMutation, useChatMessagesQuery, useChatSendMutation, useChatUsersQuery, useDeleteImageMutation, useEarningSummaryQuery,
    useGetGalleryQuery, useGetGatewaysQuery, useGetMyShopQuery, useGetProfileQuery, useImportProductsMutation, usePreorderStatsQuery, usePushSendMutation,
    useRecListQuery, useReportAnalyticsQuery, useSaveGatewayMutation, useSaveMyShopMutation, useSaveProfileMutation, useUploadImageMutation,
} from '../../app/api';
import { pushToast } from '../../app/slices';
import { Field, ImagePicker, PageTitle, Section, Select, TextArea, TextInput } from '../../components/FormKit';
import { Empty, Icon, Img, Modal, money } from '../../components/ui';
import { t } from '../../i18n';
import * as RP from './Reports';

const card = 'card rounded-xl !border-line';
const Toggle = ({ on, onChange, label }) => <button role="switch" aria-checked={!!on} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-primary' : 'bg-gray-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-sa-surface shadow transition-all ${on ? 'start-[22px]' : 'start-0.5'}`} /></button>;
const useNotify = () => { const d = useDispatch(); return (r, ok) => { d(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(ok)); return !r.error; }; };
const Stat = ({ label, value, tone = 'border-sky-300 bg-sky-50' }) => <div className={`rounded-lg border p-4 ${tone}`}><p className="text-2xl font-bold">{value}</p><p className="mt-2 text-sm text-muted">{label}</p></div>;
const authHeader = () => { try { return { Authorization: `Bearer ${JSON.parse(localStorage.getItem('token'))}` }; } catch { return {}; } };

// ---- profile -------------------------------------------------------------------------------------------------------
function Profile() {
    const { data } = useGetProfileQuery();
    const [save, { isLoading, error }] = useSaveProfileMutation();
    const [changePw, { isLoading: changing, error: pwError }] = useChangePasswordMutation();
    const [f, setF] = useState(null);
    const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
    const notify = useNotify();
    useEffect(() => { if (data) setF(data); }, [data]);
    if (!f) return <div className="skeleton h-72" />;
    const e1 = error?.data?.errors ?? {};
    const e2 = pwError?.data?.errors ?? {};
    return (
        <div className="mx-auto max-w-[800px]"><PageTitle icon="user">{t('Profile')}</PageTitle>
            <form onSubmit={async (e) => { e.preventDefault(); notify(await save(f), t('Profile updated')); }}><Section title={t('Edit Profile')} icon="user"><div className="grid gap-x-6 md:grid-cols-2">
                <Field label={t('Name')} required error={e1.name?.[0]}><TextInput value={f.name} onChange={(v) => setF({ ...f, name: v })} /></Field>
                <Field label={t('Email')} required error={e1.email?.[0]}><TextInput type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} /></Field>
                <Field label={t('Phone')} error={e1.phone?.[0]}><TextInput value={f.phone} onChange={(v) => setF({ ...f, phone: v })} /></Field>
                <Field label={t('Gender')}><Select value={f.gender} onChange={(v) => setF({ ...f, gender: v })} placeholder={t('Select Gender')} options={[{ id: 'male', name: 'Male' }, { id: 'female', name: 'Female' }]} /></Field></div>
                <button disabled={isLoading} className="btn-primary !rounded-lg">{isLoading ? t('Saving…') : t('Save Changes')}</button></Section></form>
            <form onSubmit={async (e) => { e.preventDefault(); if (notify(await changePw(pw), t('Password changed'))) setPw({ current_password: '', password: '', password_confirmation: '' }); }}><Section title={t('Change Password')} icon="user"><div className="grid gap-x-6 md:grid-cols-3">
                <Field label={t('Current Password')} required error={e2.current_password?.[0]}><TextInput type="password" autoComplete="current-password" value={pw.current_password} onChange={(v) => setPw({ ...pw, current_password: v })} /></Field>
                <Field label={t('New Password')} required error={e2.password?.[0]}><TextInput type="password" autoComplete="new-password" value={pw.password} onChange={(v) => setPw({ ...pw, password: v })} /></Field>
                <Field label={t('Confirm Password')} required><TextInput type="password" autoComplete="new-password" value={pw.password_confirmation} onChange={(v) => setPw({ ...pw, password_confirmation: v })} /></Field></div>
                <button disabled={changing} className="btn-primary !rounded-lg">{changing ? t('Updating…') : t('Update Password')}</button></Section></form>
        </div>
    );
}

// ---- shop profile (sellers) ----------------------------------------------------------------------------------------
function ShopProfile() {
    const isShop = useSelector((s) => s.auth.user?.role === 'shop');
    const { data, isError } = useGetMyShopQuery(undefined, { skip: !isShop });
    const [save, { isLoading, error }] = useSaveMyShopMutation();
    const [f, setF] = useState(null);
    const notify = useNotify();
    useEffect(() => { if (data) setF(data); }, [data]);
    if (!isShop) return <Empty title={t('Seller profile')} hint={t('This page belongs to seller accounts. Admins manage shops from All Shop.')} />;
    if (isError) return <Empty title={t('No shop is linked to this account')} />;
    if (!f) return <div className="skeleton h-72" />;
    const errs = error?.data?.errors ?? {};
    return (
        <form onSubmit={async (e) => { e.preventDefault(); notify(await save({ name: f.name, name_ar: f.name_ar, address: f.address, description: f.description, logo: f.logo, online: f.online }), t('Shop profile updated')); }} className="mx-auto max-w-[800px]">
            <PageTitle icon="store">{t('My Profile')}</PageTitle>
            <Section title={t('Shop Information')} icon="store">
                <Field label={t('Shop Name')} required error={errs.name?.[0]}><TextInput value={f.name} onChange={(v) => setF({ ...f, name: v })} /></Field>
                <Field label={t('Shop Name (2nd Language)')}><TextInput value={f.name_ar} onChange={(v) => setF({ ...f, name_ar: v })} /></Field>
                <Field label={t('Address')}><TextInput value={f.address} onChange={(v) => setF({ ...f, address: v })} /></Field>
                <ImagePicker label={t('Shop logo')} value={f.logo} onChange={(v) => setF({ ...f, logo: v })} error={errs.logo?.[0]} width="w-36" />
                <Field label={t('Description')}><TextArea value={f.description} onChange={(v) => setF({ ...f, description: v })} rows={4} /></Field>
                <label className="mb-4 flex items-center gap-3 text-[13px]"><Toggle on={f.online} onChange={() => setF({ ...f, online: !f.online })} label={t('Online')} />{t('Shop is online')}</label>
                <button disabled={isLoading} className="btn-primary !rounded-lg">{isLoading ? t('Saving…') : t('Save Changes')}</button></Section>
        </form>
    );
}

// ---- payment gateways ----------------------------------------------------------------------------------------------
function Gateways() {
    const { data, isLoading, isError } = useGetGatewaysQuery();
    const [save] = useSaveGatewayMutation();
    const [edit, setEdit] = useState(null);
    const notify = useNotify();
    if (isError) return <Empty title={t('Could not load gateways')} />;
    return (
        <div><PageTitle icon="tag">{t('Payment Gateways')}</PageTitle>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {isLoading ? Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-28" />) : data.map((g) => (
                    <div key={g.id} className={`${card} p-4`}>
                        <div className="flex items-center justify-between"><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-primary-soft text-sm font-bold text-primary"><Img src={g.logo} alt="" className="h-full w-full object-cover" fallback={g.name[0]} /></span><b>{g.name}</b></span>
                            <Toggle label={t('{name} active', { name: g.name })} on={g.is_active} onChange={async () => notify(await save({ id: g.id, is_active: !g.is_active }), t('Gateway updated'))} /></div>
                        <p className="mt-3 text-xs text-muted">{t('Mode:')} <b className="capitalize text-ink">{g.mode}</b> · {t('{set}/{total} credentials set', { set: Object.values(g.config).filter(Boolean).length, total: Object.keys(g.config).length })}</p>
                        <button onClick={() => setEdit(g)} className="btn-outline mt-3 !rounded-lg">{t('Configure')}</button></div>))}
            </div>
            {edit && <GatewayModal g={edit} onClose={() => setEdit(null)} />}
        </div>
    );
}
function GatewayModal({ g, onClose }) {
    const [f, setF] = useState({ title: g.title, mode: g.mode, config: { ...g.config } });
    const [save, { isLoading }] = useSaveGatewayMutation();
    const notify = useNotify();
    return (
        <Modal title={t('{name} settings', { name: g.name })} onClose={onClose}>
            <form onSubmit={async (e) => { e.preventDefault(); if (notify(await save({ id: g.id, ...f }), t('Gateway saved'))) onClose(); }}>
                <Field label={t('Title')}><TextInput value={f.title} onChange={(v) => setF({ ...f, title: v })} /></Field>
                <Field label={t('Mode')}><Select value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={[{ id: 'test', name: 'Test' }, { id: 'live', name: 'Live' }]} /></Field>
                {Object.keys(f.config).map((k) => <Field key={k} label={k.replace(/_/g, ' ')} hint={t('Stored securely; shown masked once saved.')}><TextInput type="password" autoComplete="off" value={f.config[k]} onChange={(v) => setF({ ...f, config: { ...f.config, [k]: v } })} /></Field>)}
                <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>{t('Cancel')}</button><button disabled={isLoading} className="btn-primary">{isLoading ? t('Saving…') : t('Save')}</button></div>
            </form>
        </Modal>
    );
}

// ---- analytics -----------------------------------------------------------------------------------------------------
function BarChart({ labels, values }) {
    const max = Math.max(...values, 1);
    return (
        <svg viewBox="0 0 600 220" className="w-full" role="img" aria-label={t('Monthly chart')}>
            {values.map((v, i) => { const h = (v / max) * 170; return <g key={labels[i]}><rect x={20 + i * 47} y={190 - h} width="32" height={h} rx="4" fill="#ee456b" opacity={v ? 1 : 0.15}><title>{`${labels[i]}: ${money(v)}`}</title></rect><text x={36 + i * 47} y="209" textAnchor="middle" fontSize="11" fill="#6b7280">{labels[i]}</text></g>; })}
            <line x1="14" y1="190" x2="590" y2="190" stroke="#e5e7eb" />
        </svg>
    );
}
function ReportAnalytics() {
    const [type, setType] = useState('earning');
    const [year, setYear] = useState(new Date().getFullYear());
    const { data, isFetching, isError } = useReportAnalyticsQuery({ type, year });
    if (isError) return <Empty title={t('Could not load analytics')} />;
    return (
        <div><PageTitle icon="doc">{t('Analytics')}</PageTitle>
            <div className={`${card} p-5`}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{['earning', 'sale', 'cost'].map((t) => <button key={t} onClick={() => setType(t)} className={`rounded-full border px-4 py-1.5 text-sm capitalize ${type === t ? 'border-ink font-medium' : 'border-line text-muted'}`}>{t}</button>)}</div>
                    <select aria-label={t('Year')} className="field !w-auto !py-1.5" value={year} onChange={(e) => setYear(Number(e.target.value))}>{[0, 1, 2].map((d) => <option key={d}>{new Date().getFullYear() - d}</option>)}</select></div>
                {!data ? <div className="skeleton h-56" /> : <div className={isFetching ? 'opacity-50' : ''}><p className="mb-2 text-sm text-muted">{t('Total {type}:', { type: t(type) })} <b className="text-lg text-ink">{money(data.total)}</b></p><BarChart labels={data.labels} values={data.values} /></div>}
            </div></div>
    );
}
function EarningSummary() {
    const { data, isError } = useEarningSummaryQuery();
    if (isError) return <Empty title={t('Could not load summary')} />;
    const items = data && [['Total Orders', data.total_orders], ['Total Sales', money(data.total_sales)], ['Total Earning', money(data.total_earning)], ['Admin Commission', money(data.admin_commission)], ['Net Earning', money(data.net_earning)], ['Pending Payment', money(data.pending_payment)]];
    return <div><PageTitle icon="doc">{t('Earning Summary')}</PageTitle><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items ? items.map(([l, v]) => <Stat key={l} label={l} value={v} />) : Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-24" />)}</div></div>;
}
function PreorderAnalytics() {
    const { data, isError } = usePreorderStatsQuery();
    if (isError) return <Empty title={t('Could not load pre-order analytics')} />;
    const items = data && [['Pre-orders', data.orders], ['Pre-order Products', data.products], ['Commissions', data.commissions], ['Profit', money(data.profit)]];
    return <div><PageTitle icon="box">{t('Pre-order Analytics')}</PageTitle><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items ? items.map(([l, v]) => <Stat key={l} label={l} value={v} tone="border-purple-300 bg-purple-50" />) : Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-24" />)}</div></div>;
}

// ---- push notification ---------------------------------------------------------------------------------------------
function PushNotification() {
    const [f, setF] = useState({ title: '', description: '', audience: 'all' });
    const [send, { isLoading, error }] = usePushSendMutation();
    const { data } = useRecListQuery({ res: 'customer_notifications', per_page: 10 });
    const notify = useNotify();
    const errs = error?.data?.errors ?? {};
    return (
        <div className="mx-auto max-w-[900px]"><PageTitle icon="mail">{t('Push Notification')}</PageTitle>
            <form onSubmit={async (e) => { e.preventDefault(); if (notify(await send(f), t('Notification recorded'))) setF({ title: '', description: '', audience: 'all' }); }}><Section title={t('Send to customers')} icon="mail">
                <Field label={t('Title')} required error={errs.title?.[0]}><TextInput value={f.title} onChange={(v) => setF({ ...f, title: v })} /></Field>
                <Field label={t('Description')} required error={errs.description?.[0]}><TextArea value={f.description} onChange={(v) => setF({ ...f, description: v })} /></Field>
                <Field label={t('Audience')}><Select value={f.audience} onChange={(v) => setF({ ...f, audience: v })} options={[{ id: 'all', name: 'All customers' }, { id: 'with_orders', name: 'Customers with orders' }]} /></Field>
                <p className="mb-3 text-xs text-muted">{t('Notifications are recorded here; delivery to devices needs Firebase to be connected.')}</p>
                <button disabled={isLoading} className="btn-primary !rounded-lg">{isLoading ? t('Sending…') : t('Send')}</button></Section></form>
            <section className={`${card} p-4`}><h3 className="mb-3 text-sm font-semibold">{t('History')}</h3>
                {data?.data.length === 0 && <p className="text-sm text-muted">{t('Nothing sent yet.')}</p>}
                {data?.data.map((n) => <div key={n.id} className="flex justify-between border-t border-line py-2 text-sm"><span><b>{n.title}</b><span className="block text-xs text-muted">{n.description}</span></span><span className="text-xs text-muted">{t('{n} recipients', { n: n.recipients })}</span></div>)}</section>
        </div>
    );
}

// ---- conversations -------------------------------------------------------------------------------------------------
function Chats() {
    const { data: users, isError } = useChatUsersQuery(undefined, { pollingInterval: 15000 });
    const [sel, setSel] = useState(null);
    const { data: msgs } = useChatMessagesQuery(sel, { skip: !sel });
    const [send, { isLoading }] = useChatSendMutation();
    const [text, setText] = useState('');
    const end = useRef(null);
    const notify = useNotify();
    useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }); }, [msgs]);
    if (isError) return <Empty title={t('Could not load conversations')} />;
    return (
        <div><PageTitle icon="mail">{t('Conversations')}</PageTitle>
            <div className={`${card} grid min-h-[480px] md:grid-cols-[280px_1fr]`}>
                <ul className="border-b border-line md:border-b-0 md:border-e">
                    {!users && <li className="p-4"><div className="skeleton h-12" /></li>}
                    {users?.length === 0 && <li className="p-6 text-center text-sm text-muted">{t('No conversations yet.')}</li>}
                    {users?.map((u) => <li key={u.id}><button onClick={() => setSel(u.id)} className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-start text-sm ${sel === u.id ? 'bg-primary-soft' : 'hover:bg-surface'}`}><span className="min-w-0"><b className="block truncate">{u.name}</b><span className="block truncate text-xs text-muted">{u.last_message}</span></span>{u.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] text-white">{u.unread}</span>}</button></li>)}
                </ul>
                <div className="flex flex-col">
                    {!sel ? <p className="m-auto text-sm text-muted">{t('Select a conversation')}</p> : (<>
                        <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: 420 }}>{msgs?.map((m) => <div key={m.id} className={`flex ${m.from_staff ? 'justify-end' : ''}`}><span className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.from_staff ? 'bg-primary text-white' : 'bg-surface'}`}>{m.body}</span></div>)}<div ref={end} /></div>
                        <form onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; if (notify(await send({ id: sel, body: text }), t('Message sent'))) setText(''); }} className="flex gap-2 border-t border-line p-3"><input aria-label={t('Message')} className="field" placeholder={t('Type a message…')} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} /><button disabled={isLoading || !text.trim()} className="btn-primary">{t('Send')}</button></form></>)}
                </div></div></div>
    );
}

// ---- import / export / gallery -------------------------------------------------------------------------------------
function ProductExport() {
    const [busy, setBusy] = useState(false);
    const dispatch = useDispatch();
    const download = async () => {
        setBusy(true);
        try {
            const r = await fetch('/api/admin/products-export', { headers: authHeader() });
            if (!r.ok) throw new Error();
            const url = URL.createObjectURL(await r.blob());
            Object.assign(document.createElement('a'), { href: url, download: 'products.csv' }).click();
            URL.revokeObjectURL(url);
        } catch { dispatch(pushToast(t('Export failed'), 'error')); }
        setBusy(false);
    };
    return <div className="mx-auto max-w-[700px]"><PageTitle icon="doc">{t('Product Export')}</PageTitle><Section><p className="mb-4 text-sm text-muted">{t('Download your catalogue as a CSV file (name, descriptions, SKU, category, brand, prices, stock).')}</p><button onClick={download} disabled={busy} className="btn-primary !rounded-lg">{busy ? t('Preparing…') : t('Export products (CSV)')}</button></Section></div>;
}
function ProductImport() {
    const [csv, setCsv] = useState('');
    const [run, { isLoading, error }] = useImportProductsMutation();
    const notify = useNotify();
    const rows = error?.data?.row_errors ?? [];
    const sample = 'name,short_description,description,sku,category,brand,price,buy_price,stock\nSample Mug,Ceramic mug,Nice mug,MUG-1,Home & Living,,9.99,5,40';
    return (
        <div className="mx-auto max-w-[800px]"><PageTitle icon="doc">{t('Product Import')}</PageTitle>
            <Section title={t('Upload a CSV')} icon="doc">
                <p className="mb-3 text-sm text-muted">{t('Required columns:')} <code>{t('name, sku, price, buy_price, category')}</code>{t('. Categories and brands are matched by name. Up to 500 rows; if any row is invalid nothing is imported.')}</p>
                <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(sample)}`} download="products-template.csv" className="mb-3 inline-block text-sm text-primary underline">{t('Download template')}</a>
                <input type="file" accept=".csv,text/csv" aria-label={t('CSV file')} className="mb-3 block text-[13px]" onChange={async (e) => { const f = e.target.files[0]; if (f) setCsv(await f.text()); }} />
                <Field label={t('…or paste CSV')}><TextArea rows={8} value={csv} onChange={setCsv} /></Field>
                {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"><b>{error.data?.message ?? t('Import failed')}</b>{rows.map((r) => <p key={r.row} className="mt-1">{t('Row {row}:', { row: r.row })} {r.errors.join(' · ')}</p>)}</div>}
                <button disabled={isLoading || !csv.trim()} onClick={async () => { const r = await run({ csv }); if (!r.error) { notify(r, t('Imported {n} products', { n: r.data.imported })); setCsv(''); } }} className="btn-primary !rounded-lg">{isLoading ? t('Importing…') : t('Import')}</button></Section></div>
    );
}
function Gallery() {
    const { data, isLoading, isError } = useGetGalleryQuery();
    const [upload, { isLoading: uploading }] = useUploadImageMutation();
    const [del] = useDeleteImageMutation();
    const notify = useNotify();
    if (isError) return <Empty title={t('Could not load gallery')} />;
    return (
        <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><PageTitle icon="doc">{t('Gallery')}</PageTitle>
            <label className="btn-primary cursor-pointer !rounded-lg">{uploading ? t('Uploading…') : <><Icon name="plus" size={15} /> {t('Upload image')}</>}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploading} onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) notify(await upload(f), t('Image uploaded')); }} /></label></div>
            {isLoading ? <div className="skeleton h-40" /> : data.length === 0 ? <Empty title={t('No images yet')} hint={t('Uploaded product, category and shop images appear here.')} /> : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{data.map((i) => <figure key={i.name} className={`${card} overflow-hidden`}><img src={i.url} alt="" loading="lazy" className="aspect-square w-full object-cover" /><figcaption className="flex items-center justify-between gap-2 p-2 text-xs"><span className="truncate text-muted">{t('{n} KB', { n: Math.round(i.size / 1024) })}</span><button aria-label={t('Delete {name}', { name: i.name })} onClick={async () => { if (window.confirm(t('Delete this image? Records using it will show a placeholder.'))) notify(await del(i.name), t('Image deleted')); }} className="text-red-500"><Icon name="trash" size={14} /></button></figcaption></figure>)}</div>)}
        </div>
    );
}

export const CUSTOM_PAGES = {
    profile: Profile, shopProfile: ShopProfile, paymentGateways: Gateways, reportAnalytics: RP.ReportAnalytics, earningSummary: RP.EarningSummaryPage,
    reportSales: RP.ReportSales, reportCommissions: RP.ReportCommissions, reportPayouts: RP.ReportPayouts,
    preorderAnalytics: PreorderAnalytics, pushNotification: PushNotification, chats: Chats, productExport: ProductExport, productImport: ProductImport, gallery: Gallery,
};
void Link;
