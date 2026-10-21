import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    errorMessage, useAdminSaveMutation, useGetGroupQuery, useGetLookupQuery, useRecDecideMutation, useRecDeleteMutation, useRecGetQuery, useRecListQuery,
    useRecSaveMutation, useRecToggleMutation, useSaveGroupMutation, useUploadImageMutation,
} from '../../app/api';
import { pushToast } from '../../app/slices';
import { ActBtn, Card, CardB, CardH, Cell, fdt, Modal, PageHead, Pager, SaIcon, Switch, Tabs, useDebounced } from '../../components/sa';
import { isGenericResource, parseColumn, parseField, resolvePage, stripQuery, toRoute } from './spec/engine';
import { CUSTOM_PAGES } from './CustomPages';
import { t } from '../../i18n';

const label = (v) => String(v).replace(/_/g, ' ');
function useNotify() {
    const dispatch = useDispatch();
    return (r, ok) => { dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(ok)); return !r.error; };
}

// ---- one input per spec field type (shop-admin markup) ------------------------------------------------------------------
function ImagePick({ value, onChange, label: text }) {
    const [upload, { isLoading }] = useUploadImageMutation();
    const notify = useNotify();
    const src = !value ? '/placeholder/%2B.svg?h=220' : value.startsWith('uploads/') ? `/storage/${value}` : value;
    return (
        <div className="img-pick">
            <img src={src} alt="" referrerPolicy="no-referrer" />
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={t(text)} disabled={isLoading}
                onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const r = await upload(f); if (notify(r, t('Image uploaded'))) onChange(r.data.path); }} />
            {isLoading && <span className="muted">{t('Uploading…')}</span>}
            {value && <button type="button" className="btn sm" onClick={() => onChange('')}>{t('Remove')}</button>}
        </div>
    );
}

function FieldInput({ f, value, onChange, error }) {
    const { data: lookup } = useGetLookupQuery(f.resource, { skip: !f.resource });
    const opts = (f.options ? f.options.map((o) => ({ id: o, name: t(label(o)) })) : lookup) ?? [];
    const wide = ['textarea', 'richtext', 'image', 'tags', 'file'].includes(f.type) ? ' wide' : '';
    const lab = <label htmlFor={`f_${f.name}`}>{t(f.label)}{f.required && <> <span className="req">*</span></>}</label>;
    const err = <span className="err">{error}</span>;
    const id = `f_${f.name}`;
    switch (f.type) {
        case 'textarea': case 'richtext': return <div className={`sa-field${wide}`}>{lab}<textarea id={id} className={f.type === 'richtext' ? 'input' : 'input'} style={f.type === 'richtext' ? { minHeight: 140 } : undefined} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{err}</div>;
        case 'checkbox': return <div className="sa-field check"><Switch checked={value} label={t(f.label)} onChange={() => onChange(!value)} /><label>{t(f.label)}</label></div>;
        case 'select': return <div className="sa-field">{lab}<select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}><option value="">{t('Select {name}', { name: t(f.label) })}</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>{err}</div>;
        case 'multiselect': return <div className="sa-field">{lab}<select id={id} className="input" multiple size={4} value={(value ?? []).map(String)} onChange={(e) => onChange([...e.target.selectedOptions].map((o) => Number(o.value) || o.value))}>{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>{err}</div>;
        case 'radio': return <div className="sa-field">{lab}<div className="radio-row">{opts.map((o) => <label key={o.id}><input type="radio" name={f.name} checked={String(value) === String(o.id)} onChange={() => onChange(o.id)} /> {o.name}</label>)}</div>{err}</div>;
        case 'image': case 'file': return <div className={`sa-field${wide}`}>{lab}<ImagePick label={t(f.label)} value={value} onChange={onChange} />{err}</div>;
        case 'tags': return <div className={`sa-field${wide}`}>{lab}<input id={id} className="input" placeholder={t('Comma separated')} value={Array.isArray(value) ? value.join(', ') : value ?? ''} onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />{err}</div>;
        case 'secret': return <div className="sa-field">{lab}<input id={id} className="input" type="password" autoComplete="off" placeholder={value ? '' : t('Not set')} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{err}</div>;
        case 'color': return <div className="sa-field">{lab}<input id={id} className="input" type="color" style={{ height: 42, padding: 4 }} value={value || '#e11d48'} onChange={(e) => onChange(e.target.value)} />{err}</div>;
        case 'date': return <div className="sa-field">{lab}<input id={id} className="input" type="date" value={(value ?? '').slice(0, 10)} onChange={(e) => onChange(e.target.value)} />{err}</div>;
        case 'datetime-local': return <div className="sa-field">{lab}<input id={id} className="input" type="datetime-local" value={(value ?? '').slice(0, 16)} onChange={(e) => onChange(e.target.value)} />{err}</div>;
        default: return <div className="sa-field">{lab}<input id={id} className="input" type={f.type} step={f.type === 'number' ? 'any' : undefined} autoComplete={f.type === 'password' ? 'new-password' : undefined} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{err}</div>;
    }
}

// ---- list ---------------------------------------------------------------------------------------------------------------
function FilterSelect({ fl, value, onChange }) {
    const { data } = useGetLookupQuery(fl.resource, { skip: !fl.resource });
    const opts = fl.options ? fl.options.map((o) => ({ id: o, name: t(label(o)) })) : data ?? [];
    return <select aria-label={t(fl.label)} className="input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{t('All {name}', { name: t(fl.label) })}</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>;
}

export function GenericList({ page, path }) {
    const navigate = useNavigate();
    const [sp] = useSearchParams();
    const res = page.resource;
    const cols = useMemo(() => (page.columns ?? []).map(parseColumn), [page]);
    const modalFields = useMemo(() => (page.modal ?? []).map(parseField), [page]);
    const filters = useMemo(() => (page.filters ?? []).map(parseField), [page]);
    const [st, setSt] = useState({ page: 1, from: '', to: '', extra: {}, tab: page.tabFromQuery ? (sp.get(page.tabFromQuery) ?? page.tabs?.[0]) : (page.tabs ? page.tabs[0] : '') });
    const [q, setQ] = useState('');
    const search = useDebounced(q);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    useEffect(() => setSt((s) => ({ ...s, page: 1 })), [search]);
    const params = { res, page: st.page, per_page: 15, search: search || undefined, from: st.from || undefined, to: st.to || undefined, ...st.extra, ...(page.tabField && st.tab && st.tab !== 'All' ? { [page.tabField]: st.tab } : {}) };
    const { data, isFetching, isError } = useRecListQuery(params);
    const [remove] = useRecDeleteMutation();
    const [toggle, { isLoading: toggling }] = useRecToggleMutation();
    const [decide] = useRecDecideMutation();
    const notify = useNotify();
    const actions = page.actions ?? [];
    const createTo = page.createPath ? toRoute(page.createPath) : null;
    const rows = data?.data ?? [];
    const edit = (row) => (modalFields.length ? setEditing(row) : navigate(`${createTo ?? path}?edit=${row.id}`));
    const ACT = { view: ['eye', 'View'], edit: ['edit', 'Edit'], delete: ['trash', 'Delete'], approve: ['check', 'Approve'], reject: ['x', 'Reject'] };
    const run = async (a, row) => {
        if (a === 'view') return setViewing(row);
        if (a === 'edit') return edit(row);
        if (a === 'delete') { if (window.confirm(t('Delete this record?'))) notify(await remove({ res, id: row.id }), t('Deleted')); return undefined; }
        if (a === 'approve' || a === 'reject') { if (window.confirm(a === 'approve' ? t('Approve this request?') : t('Reject this request?'))) notify(await decide({ res, id: row.id, decision: a }), a === 'approve' ? t('Approved') : t('Rejected')); }
        return undefined;
    };
    const shown = actions.filter((a) => ACT[a]);
    const set = (patch) => setSt((s) => ({ ...s, page: 1, ...patch }));

    return (
        <>
            <PageHead title={t(page.title)}>
                {!page.noCreate && (createTo ? <Link className="btn primary" to={createTo}><SaIcon name="plus" /> {t('Add New')}</Link> : <button className="btn primary" onClick={() => setEditing({})}><SaIcon name="plus" /> {t('Add New')}</button>)}
            </PageHead>
            {page.tabs && <Tabs tabs={page.tabs} value={st.tab} onChange={(t) => set({ tab: t })} />}
            <Card>
                <CardH><div className="toolbar" style={{ flex: 1 }}>
                    <input className="input" aria-label={t('Search')} placeholder={t('Search…')} style={{ minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />
                    {filters.map((fl) => <FilterSelect key={fl.name} fl={fl} value={st.extra[fl.name] ?? ''} onChange={(v) => set({ extra: { ...st.extra, [fl.name]: v || undefined } })} />)}
                    {page.dateFilter && <><input className="input" type="date" aria-label={t('From')} value={st.from} onChange={(e) => set({ from: e.target.value })} /><input className="input" type="date" aria-label={t('To')} value={st.to} onChange={(e) => set({ to: e.target.value })} /></>}
                </div></CardH>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>{t('SL')}</th>{cols.map((c) => <th key={c.key}>{t(c.label)}</th>)}{shown.length > 0 && <th>{t('Action')}</th>}</tr></thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={row.id}>
                                <td>{(data.current_page - 1) * data.per_page + i + 1}</td>
                                {cols.map((c) => <td key={c.key}><Cell type={c.type} value={row[c.key]} row={row} busy={toggling} onToggle={async (r) => notify(await toggle({ res, id: r.id, field: c.key }), t('Status updated'))} /></td>)}
                                {shown.length > 0 && <td><div className="actions">{shown.map((a) => <ActBtn key={a} icon={ACT[a][0]} title={t(ACT[a][1])} onClick={() => run(a, row)} />)}</div></td>}
                            </tr>))}
                        {!data && !isError && <tr><td colSpan={cols.length + 2} className="empty">{t('Loading…')}</td></tr>}
                        {isError && <tr><td colSpan={cols.length + 2} className="empty">{t('Could not load data. You may not have permission for this section.')}</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={cols.length + 2} className="empty">{t('No Data Found')}</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={(p) => setSt((s) => ({ ...s, page: p }))} />
            </Card>
            {editing && <ModalForm page={page} fields={modalFields} row={editing} onClose={() => setEditing(null)} />}
            {viewing && (
                <Modal title={page.title} onClose={() => setViewing(null)} footer={<button className="btn" onClick={() => setViewing(null)}>{t('Close')}</button>}>
                    <dl className="kv">{cols.map((c) => <React.Fragment key={c.key}><dt>{t(c.label)}</dt><dd><Cell type={c.type === 'toggle' ? 'bool' : c.type} value={viewing[c.key]} row={viewing} /></dd></React.Fragment>)}<dt>{t('Created')}</dt><dd>{fdt(viewing.created_at)}</dd></dl>
                </Modal>)}
        </>
    );
}

// Add/edit dialog for list pages that declare `modal` fields.
function ModalForm({ page, fields, row, onClose }) {
    const [form, setForm] = useState(() => ({ ...row }));
    const [save, { isLoading, error }] = useRecSaveMutation();
    const notify = useNotify();
    const errs = error?.data?.errors ?? {};
    const submit = async (e) => { e.preventDefault(); if (notify(await save({ res: page.resource, ...(row.id ? { id: row.id } : {}), ...form }), t('Saved successfully'))) onClose(); };
    return (
        <Modal title={row.id ? t('Edit {name}', { name: t(page.title) }) : t('Add {name}', { name: t(page.title) })} onClose={onClose}
            footer={<><button type="button" className="btn" onClick={onClose}>{t('Cancel')}</button><button form="modal-form" className="btn primary" disabled={isLoading}>{isLoading ? t('Saving…') : t('Save')}</button></>}>
            <form id="modal-form" className="form-grid" onSubmit={submit}>
                {fields.map((fl) => <FieldInput key={fl.name} f={fl} value={form[fl.name]} onChange={(v) => setForm((x) => ({ ...x, [fl.name]: v }))} error={errs[fl.name]?.[0]} />)}
            </form>
        </Modal>
    );
}

// ---- full-page form -----------------------------------------------------------------------------------------------------
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
    const notify = useNotify();
    useEffect(() => { if (record) setForm({ ...(page.defaults ?? {}), ...Object.fromEntries(Object.entries(record).filter(([, v]) => v !== null)) }); }, [record]); // eslint-disable-line
    const errs = (adminStore ? adminError : error)?.data?.errors ?? {};
    const submit = async (e) => {
        e.preventDefault();
        const r = adminStore ? await adminSave({ res: adminStore, ...form }) : await save({ res: page.resource, ...(editId ? { id: editId } : {}), ...form });
        if (notify(r, editId ? t('Updated successfully') : t('Created successfully'))) navigate(back);
    };
    if (editId && isLoading) return <div className="card"><div className="empty">{t('Loading…')}</div></div>;
    return (
        <>
            <PageHead title={editId ? `${t('Edit')}${record ? ` · ${record.name ?? record.title ?? `#${record.id}`}` : ''}` : t(page.title)}>{page.back && <Link className="btn" to={back}>{t('Back to list')}</Link>}</PageHead>
            <form className="card" onSubmit={submit}>
                <div className="card-b form-grid">{fields.map((fl) => <FieldInput key={fl.name} f={fl} value={form[fl.name]} onChange={(v) => setForm((x) => ({ ...x, [fl.name]: v }))} error={errs[fl.name]?.[0]} />)}</div>
                <div className="modal-f"><button type="reset" className="btn" onClick={() => setForm({ ...(page.defaults ?? {}), ...(record ?? {}) })}>{t('Reset')}</button><button className="btn primary" disabled={saving || savingAdmin}>{saving || savingAdmin ? t('Saving…') : editId ? t('Update') : t('Submit')}</button></div>
            </form>
        </>
    );
}

// ---- settings groups ----------------------------------------------------------------------------------------------------
export function GenericSettings({ page }) {
    const fields = useMemo(() => page.fields.map(parseField), [page]);
    const { data, isError } = useGetGroupQuery(page.key);
    const [save, { isLoading: saving, error }] = useSaveGroupMutation();
    const [form, setForm] = useState(null);
    const notify = useNotify();
    useEffect(() => { if (data) setForm(data); }, [data]);
    if (isError) return <div className="card"><div className="empty">{t('Could not load settings. You may not have permission for this section.')}</div></div>;
    if (!form) return <div className="card"><div className="empty">{t('Loading…')}</div></div>;
    const errs = error?.data?.errors ?? {};
    return (
        <>
            <PageHead title={t(page.title)} />
            <form className="card" onSubmit={async (e) => { e.preventDefault(); notify(await save({ key: page.key, ...form }), t('Settings updated')); }}>
                <div className="card-b form-grid">{fields.map((fl) => <FieldInput key={fl.name} f={fl} value={form[fl.name]} onChange={(v) => setForm((x) => ({ ...x, [fl.name]: v }))} error={errs[fl.name]?.[0]} />)}</div>
                <div className="modal-f"><button className="btn primary" disabled={saving}>{saving ? t('Saving…') : t('Save Changes')}</button></div>
            </form>
        </>
    );
}

export function NotBuilt({ title, why }) {
    return (
        <Card><div className="empty">
            <SaIcon name="box" className="inline-icon" style={{ width: 40, height: 40 }} /><h2 style={{ margin: '8px 0 4px', fontSize: 18 }}>{t(title)}</h2>
            <p style={{ margin: 0 }}>{why ?? t('This section exists in the reference admin but is not built in this clone yet.')}</p>
            <Link to="/admin" className="btn" style={{ marginTop: 14 }}>{t('Back to dashboard')}</Link>
        </div></Card>
    );
}

// ---- router for every spec path that has no hand-built route -----------------------------------------------------------
export default function GenericPage() {
    const { pathname } = useLocation();
    const page = resolvePage(stripQuery(pathname));
    if (!page) return <NotBuilt title={t('Page not found')} why={t('This address is not part of the admin.')} />;
    const mapped = toRoute(stripQuery(pathname));
    if (mapped !== stripQuery(pathname)) return <Navigate to={mapped} replace />;
    if (page.type === 'custom') { const C = CUSTOM_PAGES[page.view]; return C ? <C page={page} /> : <NotBuilt title={page.title} />; }
    if (page.type === 'settings') return page.key === 'general' ? <Navigate to="/admin/settings" replace /> : <GenericSettings key={page.key} page={page} />;
    if (page.type === 'list' && isGenericResource(page.resource)) return <GenericList key={pathname} page={page} path={pathname} />;
    if (page.type === 'form' && (isGenericResource(page.resource) || page.resource === 'customers')) return <GenericForm key={pathname} page={page} />;
    return <NotBuilt title={page.title} />;
}
void CardB;
