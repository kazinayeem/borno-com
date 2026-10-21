import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    errorMessage, useAdminSaveMutation, useGetGroupQuery, useGetLookupQuery, useRecDeleteMutation, useRecGetQuery, useRecListQuery,
    useRecSaveMutation, useRecToggleMutation, useSaveGroupMutation,
} from '../../app/api';
import { pushToast } from '../../app/slices';
import { Field, FormActions, ImagePicker, MultiSelect, PageTitle, Section, Select, TagInput, TextArea, TextInput } from '../../components/FormKit';
import { Empty, Icon, Img, Modal, Pagination, money } from '../../components/ui';
import { imgUrl, isGenericResource, parseColumn, parseField, resolvePage, stripQuery, toRoute } from './spec/engine';
import { CUSTOM_PAGES } from './CustomPages';

const card = 'card rounded-xl !border-[#f4f4f4]';
const toneFor = (v) => {
    const s = String(v ?? '').toLowerCase();
    if (/(paid|approved|accepted|delivered|refunded|active|success|completed)/.test(s)) return 'bg-emerald-100 text-emerald-700';
    if (/(pending|processing|update)/.test(s)) return 'bg-amber-100 text-amber-700';
    if (/(cancel|reject|failed|unpaid)/.test(s)) return 'bg-red-100 text-red-700';
    return 'bg-sky-100 text-sky-700';
};
const fmtDate = (v, withTime) => (v ? new Date(v).toLocaleString('en-GB', withTime ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const Toggle = ({ on, onChange, disabled }) => (
    <button role="switch" aria-checked={!!on} disabled={disabled} onClick={onChange} className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-primary' : 'bg-gray-300'} disabled:opacity-60`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></button>
);
const initials = (s) => String(s ?? '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// ---- a single input, chosen by the field's spec type ----------------------------------------------------------------
function FieldInput({ f, value, onChange, error }) {
    const { data: lookup } = useGetLookupQuery(f.resource, { skip: !f.resource });
    const opts = f.options ?? lookup;
    const wrap = (child, hint) => <Field label={f.label} required={f.required} error={error} hint={hint}>{child}</Field>;
    switch (f.type) {
        case 'textarea': case 'richtext': return wrap(<TextArea rows={f.type === 'richtext' ? 6 : 3} value={value} onChange={onChange} />);
        case 'number': return wrap(<TextInput type="number" step="any" value={value} onChange={onChange} />);
        case 'email': case 'password': return wrap(<TextInput type={f.type} autoComplete={f.type === 'password' ? 'new-password' : undefined} value={value} onChange={onChange} />);
        case 'secret': return wrap(<TextInput type="password" autoComplete="off" value={value} onChange={onChange} />, 'Stored securely and never shown again.');
        case 'date': return wrap(<TextInput type="date" value={(value ?? '').slice(0, 10)} onChange={onChange} />);
        case 'datetime-local': return wrap(<TextInput type="datetime-local" value={(value ?? '').slice(0, 16)} onChange={onChange} />);
        case 'color': return wrap(<input type="color" className="h-10 w-20 rounded border border-line" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />);
        case 'checkbox': return <div className="mb-4"><label className="flex items-center gap-3 text-[13px]"><Toggle on={!!value} onChange={() => onChange(!value)} />{f.label}</label>{error && <p className="mt-1 text-xs text-red-500">{error}</p>}</div>;
        case 'image': case 'file': return <ImagePicker label={f.label} value={value?.startsWith?.('uploads/') ? value : ''} onChange={onChange} error={error} width="w-40" />;
        case 'select': return wrap(<Select value={value} onChange={onChange} placeholder={`Select ${f.label}`} options={(opts ?? []).map((o) => (typeof o === 'string' ? { id: o, name: o[0].toUpperCase() + o.slice(1) } : o))} />);
        case 'radio': return wrap(<div className="flex flex-wrap gap-4 text-[13px]">{(f.options ?? []).map((o) => <label key={o} className="flex items-center gap-2"><input type="radio" className="accent-primary" checked={value === o} onChange={() => onChange(o)} />{o[0].toUpperCase() + o.slice(1)}</label>)}</div>);
        case 'multiselect': return wrap(<MultiSelect value={value ?? []} onChange={onChange} options={opts ?? []} />);
        case 'tags': return wrap(<TagInput value={value ?? []} onChange={onChange} placeholder="Type and press Enter" />);
        default: return wrap(<TextInput value={value} onChange={onChange} />);
    }
}

function useSaveToast() {
    const dispatch = useDispatch();
    return (r, ok) => { dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(ok)); return !r.error; };
}

// ---- list -----------------------------------------------------------------------------------------------------------
function Cell({ col, row, onToggle, busy }) {
    const v = row[col.key];
    switch (col.type) {
        case 'image': return <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-bold text-primary"><Img src={imgUrl(v)} alt="" className="h-full w-full object-cover" fallback={initials(row.name ?? row.title)} /></span>;
        case 'toggle': return <Toggle on={v} onChange={() => onToggle(row, col.key)} disabled={busy} />;
        case 'bool': return v ? 'Yes' : 'No';
        case 'money': return money(v);
        case 'date': return fmtDate(v);
        case 'datetime': return fmtDate(v, true);
        case 'color': return <span className="inline-block h-6 w-12 rounded border border-line" style={{ background: v }} />;
        case 'badge': case 'status': return v ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toneFor(v)}`}>{String(v)}</span> : '—';
        default: return Array.isArray(v) ? v.join(', ') : (v ?? '—');
    }
}

export function GenericList({ page, path }) {
    const navigate = useNavigate();
    const [sp] = useSearchParams();
    const res = page.resource;
    const cols = useMemo(() => (page.columns ?? []).map(parseColumn), [page]);
    const modalFields = useMemo(() => (page.modal ?? []).map(parseField), [page]);
    const [f, setF] = useState({ page: 1, search: '', from: '', to: '', tab: page.tabFromQuery ? (sp.get(page.tabFromQuery) ?? page.tabs?.[0]) : (page.tabs ? 'All' : ''), extra: {} });
    const [q, setQ] = useState('');
    const [editing, setEditing] = useState(null);
    const params = { res, page: f.page, search: f.search || undefined, from: f.from || undefined, to: f.to || undefined, ...f.extra, ...(page.tabField && f.tab && f.tab !== 'All' ? { [page.tabField]: f.tab } : {}) };
    const { data, isFetching, isError } = useRecListQuery(params);
    const [remove] = useRecDeleteMutation();
    const [toggle, { isLoading: toggling }] = useRecToggleMutation();
    const notify = useSaveToast();
    const actions = page.actions ?? [];
    const createTo = page.createPath ? toRoute(page.createPath) : null;

    const del = async (row) => { if (window.confirm('Delete this record?')) notify(await remove({ res, id: row.id }), 'Deleted'); };
    const edit = (row) => (modalFields.length ? setEditing(row) : navigate(`${createTo ?? path}?edit=${row.id}`));
    const filters = (page.filters ?? []).map(parseField);

    const rows = data?.data ?? [];
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-[22px] font-semibold">{page.title}</h2>
                {!page.noCreate && <button className="btn-primary !rounded-lg !py-2.5" onClick={() => (createTo ? navigate(createTo) : setEditing({}))}><Icon name="plus" size={15} /> Add {page.title.replace(/s$/i, '')}</button>}</div>
            {(page.tabs || page.dateFilter || filters.length > 0) && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    {page.tabs?.map((t) => <button key={t} onClick={() => setF({ ...f, tab: t, page: 1 })} className={`rounded-full border px-4 py-1.5 text-sm capitalize ${f.tab === t ? 'border-ink bg-white font-medium' : 'border-line bg-white text-[#556070] hover:border-primary'}`}>{t}</button>)}
                    {filters.map((fl) => <FilterSelect key={fl.name} fl={fl} value={f.extra[fl.name] ?? ''} onChange={(v) => setF({ ...f, page: 1, extra: { ...f.extra, [fl.name]: v || undefined } })} />)}
                    {page.dateFilter && <><input type="date" aria-label="From date" className="field !w-auto !py-1.5" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} /><span className="text-sm text-muted">to</span><input type="date" aria-label="To date" className="field !w-auto !py-1.5" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 1 })} /></>}
                </div>)}
            <div className={`${card} overflow-x-auto p-3`}>
                <form onSubmit={(e) => { e.preventDefault(); setF({ ...f, search: q, page: 1 }); }} className="mb-3 flex gap-2"><input className="field !w-64 !py-2" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn-outline" aria-label="Search"><Icon name="search" size={15} /></button></form>
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead><tr className="bg-[#f6f7f9] text-[13px]"><th className="rounded-l-lg px-4 py-3">SL</th>{cols.map((c) => <th key={c.key} className="px-4 py-3">{c.label}</th>)}{actions.length > 0 && <th className="rounded-r-lg px-4 py-3 text-center">Action</th>}</tr></thead>
                    <tbody className={isFetching ? 'opacity-50' : ''}>
                        {rows.map((row, i) => (
                            <tr key={row.id} className="border-b border-[#f4f4f4] last:border-0">
                                <td className="px-4 py-3">{(data.current_page - 1) * data.per_page + i + 1}</td>
                                {cols.map((c) => <td key={c.key} className="px-4 py-2.5"><Cell col={c} row={row} busy={toggling} onToggle={async (r, field) => notify(await toggle({ res, id: r.id, field }), 'Status updated')} /></td>)}
                                {actions.length > 0 && <td className="px-4 py-2.5 text-center"><span className="inline-flex gap-2">
                                    {actions.includes('edit') && <button aria-label="Edit" onClick={() => edit(row)} className="grid h-9 w-9 place-items-center rounded-lg border border-primary/30 bg-primary-soft text-primary"><Icon name="edit" size={15} /></button>}
                                    {actions.includes('delete') && <button aria-label="Delete" onClick={() => del(row)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-red-500"><Icon name="trash" size={15} /></button>}
                                    {['view', 'approve', 'reject', 'invoice', 'location', 'password'].some((a) => actions.includes(a)) && !actions.includes('edit') && !actions.includes('delete') && <span className="text-xs text-muted">—</span>}
                                </span></td>}
                            </tr>))}
                    </tbody>
                </table>
                {!data && !isError && <div className="skeleton m-4 h-40" />}
                {isError && <Empty title="Could not load data" hint="You may not have permission for this section." />}
                {data && rows.length === 0 && <Empty title="No records found" hint={page.noCreate ? 'Nothing here yet.' : 'Add your first one.'} />}
            </div>
            <Pagination meta={data} onPage={(p) => setF({ ...f, page: p })} />
            {editing && <ModalForm page={page} fields={modalFields} row={editing} onClose={() => setEditing(null)} />}
        </div>
    );
}

function FilterSelect({ fl, value, onChange }) {
    const { data } = useGetLookupQuery(fl.resource, { skip: !fl.resource });
    return <select aria-label={fl.label} className="field !w-auto !py-1.5" value={value} onChange={(e) => onChange(e.target.value)}><option value="">All {fl.label}</option>{(fl.options ?? data ?? []).map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.id} value={o.id}>{o.name}</option>))}</select>;
}

// Add/edit dialog for list pages that declare `modal` fields.
function ModalForm({ page, fields, row, onClose }) {
    const [form, setForm] = useState(() => ({ ...row }));
    const [save, { isLoading, error }] = useRecSaveMutation();
    const notify = useSaveToast();
    const errs = error?.data?.errors ?? {};
    const submit = async (e) => { e.preventDefault(); if (notify(await save({ res: page.resource, ...(row.id ? { id: row.id } : {}), ...form }), 'Saved successfully')) onClose(); };
    return (
        <Modal title={row.id ? `Edit ${page.title}` : `Add ${page.title}`} onClose={onClose}>
            <form onSubmit={submit}>
                {fields.map((fl) => <FieldInput key={fl.name} f={fl} value={form[fl.name]} onChange={(v) => setForm((x) => ({ ...x, [fl.name]: v }))} error={errs[fl.name]?.[0]} />)}
                <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>Cancel</button><button disabled={isLoading} className="btn-primary">{isLoading ? 'Saving…' : 'Save'}</button></div>
            </form>
        </Modal>
    );
}

// ---- full-page form -------------------------------------------------------------------------------------------------
// `store: 'admin'` posts to the typed admin API (real tables); otherwise to the generic records API.
const ADMIN_STORE = { customers: 'customers' };

export function GenericForm({ page }) {
    const [sp] = useSearchParams();
    const editId = sp.get('edit');
    const navigate = useNavigate();
    const fields = useMemo(() => page.fields.map(parseField), [page]);
    const back = toRoute(page.back ?? '/admin');
    const adminStore = ADMIN_STORE[page.resource];
    const { data: record, isLoading } = useRecGetQuery({ res: page.resource, id: editId }, { skip: !editId || !!adminStore });
    const [form, setForm] = useState({ ...(page.defaults ?? {}) });
    const [save, { isLoading: saving, error }] = useRecSaveMutation();
    const [adminSave, { isLoading: savingAdmin, error: adminError }] = useAdminSaveMutation();
    const notify = useSaveToast();
    useEffect(() => { if (record) setForm({ ...(page.defaults ?? {}), ...Object.fromEntries(Object.entries(record).filter(([, v]) => v !== null)) }); }, [record]); // eslint-disable-line
    const errs = (adminStore ? adminError : error)?.data?.errors ?? {};
    const submit = async (e) => {
        e.preventDefault();
        const r = adminStore ? await adminSave({ res: adminStore, ...form }) : await save({ res: page.resource, ...(editId ? { id: editId } : {}), ...form });
        if (notify(r, editId ? 'Updated successfully' : 'Created successfully')) navigate(back);
    };
    if (editId && isLoading) return <div className="skeleton h-72" />;
    return (
        <form onSubmit={submit} className="mx-auto max-w-[1000px]">
            <PageTitle icon="doc">{editId ? page.title.replace(/^Add/, 'Edit') : page.title}</PageTitle>
            <Section><div className="grid gap-x-6 md:grid-cols-2">{fields.map((fl) => (
                <div key={fl.name} className={['textarea', 'richtext', 'image', 'tags', 'multiselect'].includes(fl.type) ? 'md:col-span-2' : ''}>
                    <FieldInput f={fl} value={form[fl.name]} onChange={(v) => setForm((x) => ({ ...x, [fl.name]: v }))} error={errs[fl.name]?.[0]} /></div>))}</div></Section>
            <FormActions saving={saving || savingAdmin} back={back} />
        </form>
    );
}

// ---- settings groups ------------------------------------------------------------------------------------------------
export function GenericSettings({ page }) {
    const fields = useMemo(() => page.fields.map(parseField), [page]);
    const { data, isLoading, isError } = useGetGroupQuery(page.key);
    const [save, { isLoading: saving, error }] = useSaveGroupMutation();
    const [form, setForm] = useState(null);
    const notify = useSaveToast();
    useEffect(() => { if (data) setForm(data); }, [data]);
    if (isError) return <Empty title="Could not load settings" hint="You may not have permission for this section." />;
    if (isLoading || !form) return <div className="skeleton h-72" />;
    const errs = error?.data?.errors ?? {};
    return (
        <form onSubmit={async (e) => { e.preventDefault(); notify(await save({ key: page.key, ...form }), 'Settings updated'); }} className="mx-auto max-w-[1000px]">
            <PageTitle icon="grid">{page.title}</PageTitle>
            <Section><div className="grid gap-x-6 md:grid-cols-2">{fields.map((fl) => (
                <div key={fl.name} className={['textarea', 'richtext', 'image', 'tags'].includes(fl.type) ? 'md:col-span-2' : ''}>
                    <FieldInput f={fl} value={form[fl.name]} onChange={(v) => setForm((x) => ({ ...x, [fl.name]: v }))} error={errs[fl.name]?.[0]} /></div>))}</div></Section>
            <div className="flex justify-end pb-6"><button disabled={saving} className="btn-primary !rounded-lg !bg-[#f43f6a] !px-8">{saving ? 'Saving…' : 'Save And Update'}</button></div>
        </form>
    );
}

export function NotBuilt({ title, why }) {
    return (
        <div className={`${card} grid place-items-center py-24 text-center`}>
            <Icon name="box" size={44} className="text-gray-300" /><h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-1 max-w-md text-sm text-muted">{why ?? 'This section exists in the reference admin but is not built in this clone yet.'}</p>
            <Link to="/admin" className="btn-outline mt-4 !rounded-lg">Back to dashboard</Link>
        </div>
    );
}

// ---- router for every spec path that has no hand-built route -------------------------------------------------------
export default function GenericPage() {
    const { pathname } = useLocation();
    const page = resolvePage(stripQuery(pathname));
    if (!page) return <NotBuilt title="Page not found" why="This address is not part of the admin." />;
    const mapped = toRoute(stripQuery(pathname));
    if (mapped !== stripQuery(pathname)) return <Navigate to={mapped} replace />;
    if (page.type === 'custom') { const C = CUSTOM_PAGES[page.view]; return C ? <C page={page} /> : <NotBuilt title={page.title} />; }
    if (page.type === 'settings') return page.key === 'general' ? <Navigate to="/admin/settings" replace /> : <GenericSettings key={page.key} page={page} />;
    if (page.type === 'list' && isGenericResource(page.resource)) return <GenericList key={pathname} page={page} path={pathname} />;
    if (page.type === 'form' && (isGenericResource(page.resource) || page.resource === 'customers')) return <GenericForm key={pathname} page={page} />;
    return <NotBuilt title={page.title} />;
}
