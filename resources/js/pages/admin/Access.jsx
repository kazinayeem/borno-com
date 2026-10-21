import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    errorMessage, useActivityLogsQuery, useDeleteStaffMutation, useDeleteStaffRoleMutation, usePermissionsCatalogQuery, useSaveStaffMutation, useSaveStaffRoleMutation,
    useStaffListQuery, useStaffRolesQuery,
} from '../../app/api';
import { pushToast } from '../../app/slices';
import { ActBtn, Card, fdt, Modal, PageHead, Pager, Pill, SaIcon, Tabs, useDebounced } from '../../components/sa';
import { t } from '../../i18n';

const ACTIONS = ['view', 'add', 'edit', 'delete'];
const useNotify = () => { const d = useDispatch(); return (r, ok) => { d(pushToast(r.error ? errorMessage(r.error) : ok, r.error ? 'error' : 'success')); return !r.error; }; };

// ---- roles + permission matrix -----------------------------------------------------------------------------------------
function RoleForm({ role, onClose }) {
    const { data: cat } = usePermissionsCatalogQuery();
    const [name, setName] = useState(role?.name ?? '');
    const [perms, setPerms] = useState(() => Object.fromEntries(Object.entries(role?.permissions ?? {}).map(([k, v]) => [k, [...v]])));
    const [save, { isLoading, error }] = useSaveStaffRoleMutation();
    const notify = useNotify();
    const toggle = (m, a) => setPerms((p) => {
        const cur = new Set(p[m] ?? []);
        if (cur.has(a)) { cur.delete(a); if (a === 'view') cur.clear(); } else { cur.add(a); if (a !== 'view') cur.add('view'); }
        return { ...p, [m]: [...cur] };
    });
    const rowAll = (m) => setPerms((p) => ({ ...p, [m]: (p[m] ?? []).length === ACTIONS.length ? [] : [...ACTIONS] }));
    const submit = async (e) => { e.preventDefault(); if (notify(await save({ id: role?.id, name, permissions: perms }), t('Role saved'))) onClose(); };
    return (
        <Modal wide title={role ? t('Edit Role') : t('New Role')} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>{t('Cancel')}</button><button form="role-form" className="btn primary" disabled={isLoading}>{isLoading ? t('Saving…') : t('Save')}</button></>}>
            <form id="role-form" onSubmit={submit}>
                <div className="sa-field"><label htmlFor="role-name">{t('Role Name')} <span className="req">*</span></label><input id="role-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                    <span className="err">{error?.data?.errors?.name?.[0]}</span></div>
                <p className="muted" style={{ margin: '4px 0 10px' }}>{t('Choose what this role can open in the sidebar (View) and do on each page (Add, Edit, Delete). Removing View hides the page.')}</p>
                <div className="table-wrap"><table className="perm-table">
                    <thead><tr><th>{t('Section')}</th>{ACTIONS.map((a) => <th key={a} style={{ textAlign: 'center' }}>{t(a[0].toUpperCase() + a.slice(1))}</th>)}<th /></tr></thead>
                    <tbody>{(cat?.modules ?? []).map((m) => (
                        <tr key={m.key}><td><b>{t(m.label)}</b></td>
                            {ACTIONS.map((a) => <td key={a} style={{ textAlign: 'center' }}><input type="checkbox" aria-label={`${m.label} ${a}`} checked={(perms[m.key] ?? []).includes(a)} onChange={() => toggle(m.key, a)} /></td>)}
                            <td><button type="button" className="btn sm" onClick={() => rowAll(m.key)}>{(perms[m.key] ?? []).length === ACTIONS.length ? t('Clear') : t('All')}</button></td></tr>))}
                    </tbody>
                </table></div>
            </form>
        </Modal>
    );
}

export function Roles() {
    const { data = [], isLoading } = useStaffRolesQuery();
    const [del] = useDeleteStaffRoleMutation();
    const [edit, setEdit] = useState(null);
    const notify = useNotify();
    return (
        <>
            <PageHead title={t('Roles & Permissions')}><button className="btn primary" onClick={() => setEdit('new')}><SaIcon name="plus" /> {t('New Role')}</button></PageHead>
            <Card><div className="table-wrap"><table>
                <thead><tr><th>{t('Role')}</th><th>{t('Sections')}</th><th>{t('Staff')}</th><th>{t('Action')}</th></tr></thead>
                <tbody>
                    {data.map((r) => (
                        <tr key={r.id}><td><b>{r.name}</b></td>
                            <td>{Object.entries(r.permissions ?? {}).map(([k, v]) => <span key={k} className="chip" style={{ marginInlineEnd: 4 }}>{k} · {v.map((a) => a[0].toUpperCase()).join('')}</span>)}</td>
                            <td>{r.users_count}</td>
                            <td><div className="actions"><ActBtn icon="edit" title={t('Edit')} onClick={() => setEdit(r)} />
                                <ActBtn icon="trash" title={t('Delete')} onClick={async () => { if (window.confirm(t('Delete this role?'))) notify(await del(r.id), t('Role deleted')); }} /></div></td></tr>))}
                    {isLoading && <tr><td colSpan={4} className="empty">{t('Loading…')}</td></tr>}
                    {!isLoading && data.length === 0 && <tr><td colSpan={4} className="empty">{t('No roles yet.')}</td></tr>}
                </tbody>
            </table></div></Card>
            {edit && <RoleForm key={edit === 'new' ? 'new' : edit.id} role={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
        </>
    );
}

// ---- staff accounts ----------------------------------------------------------------------------------------------------
function StaffForm({ row, roles, onClose }) {
    const [f, setF] = useState({ name: row?.name ?? '', email: row?.email ?? '', phone: row?.phone ?? '', staff_role_id: row?.staff_role_id ?? roles[0]?.id ?? '', password: '', password_confirmation: '' });
    const [save, { isLoading, error }] = useSaveStaffMutation();
    const notify = useNotify();
    const errs = error?.data?.errors ?? {};
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const submit = async (e) => { e.preventDefault(); if (notify(await save({ id: row?.id, ...f }), t('Staff saved'))) onClose(); };
    const fld = (k, label, props = {}) => <div className="sa-field"><label htmlFor={`st_${k}`}>{label}{props.required && <> <span className="req">*</span></>}</label><input id={`st_${k}`} className="input" value={f[k]} onChange={set(k)} {...props} /><span className="err">{errs[k]?.[0]}</span></div>;
    return (
        <Modal title={row ? t('Edit Staff') : t('Add Staff')} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>{t('Cancel')}</button><button form="staff-form" className="btn primary" disabled={isLoading}>{isLoading ? t('Saving…') : t('Save')}</button></>}>
            <form id="staff-form" className="form-grid" onSubmit={submit}>
                {fld('name', t('Name'), { required: true })}{fld('email', t('Email'), { type: 'email', required: true })}{fld('phone', t('Phone'))}
                <div className="sa-field"><label htmlFor="st_role">{t('Role')} <span className="req">*</span></label><select id="st_role" className="input" value={f.staff_role_id} onChange={set('staff_role_id')}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><span className="err">{errs.staff_role_id?.[0]}</span></div>
                {fld('password', row ? t('New password (leave blank to keep)') : t('Password'), { type: 'password', required: !row, autoComplete: 'new-password' })}
                {fld('password_confirmation', t('Confirm Password'), { type: 'password', required: !row, autoComplete: 'new-password' })}
            </form>
        </Modal>
    );
}

export function Staff() {
    const { data = [], isLoading } = useStaffListQuery();
    const { data: roles = [] } = useStaffRolesQuery();
    const [del] = useDeleteStaffMutation();
    const [edit, setEdit] = useState(null);
    const notify = useNotify();
    return (
        <>
            <PageHead title={t('Staff')}><button className="btn primary" onClick={() => setEdit('new')} disabled={!roles.length}><SaIcon name="plus" /> {t('Add Staff')}</button></PageHead>
            {!roles.length && !isLoading && <p className="muted">{t('Create a role first, then add staff to it.')}</p>}
            <Card><div className="table-wrap"><table>
                <thead><tr><th>{t('Name')}</th><th>{t('Email')}</th><th>{t('Phone')}</th><th>{t('Role')}</th><th>{t('Action')}</th></tr></thead>
                <tbody>
                    {data.map((u) => (
                        <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.phone || '—'}</td><td><Pill value={u.staff_role?.name ?? '—'} /></td>
                            <td><div className="actions"><ActBtn icon="edit" title={t('Edit')} onClick={() => setEdit(u)} />
                                <ActBtn icon="trash" title={t('Delete')} onClick={async () => { if (window.confirm(t('Remove this staff member? They will be signed out.'))) notify(await del(u.id), t('Staff removed')); }} /></div></td></tr>))}
                    {isLoading && <tr><td colSpan={5} className="empty">{t('Loading…')}</td></tr>}
                    {!isLoading && data.length === 0 && <tr><td colSpan={5} className="empty">{t('No staff yet.')}</td></tr>}
                </tbody>
            </table></div></Card>
            {edit && <StaffForm key={edit === 'new' ? 'new' : edit.id} row={edit === 'new' ? null : edit} roles={roles} onClose={() => setEdit(null)} />}
        </>
    );
}

// ---- login history + activity log -------------------------------------------------------------------------------------
const ACTION_LABEL = { login: 'Signed in', login_failed: 'Failed sign-in', logout: 'Signed out', create: 'Created', update: 'Updated', delete: 'Deleted' };
const ACTION_COLOR = { login: '#16a34a', login_failed: '#dc2626', logout: '#6b7280', create: '#2563eb', update: '#d97706', delete: '#dc2626' };

export function ActivityLogs() {
    const [kind, setKind] = useState('login');
    const [q, setQ] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);
    const search = useDebounced(q, 300);
    const { data, isFetching, isError } = useActivityLogsQuery({ kind, search: search || undefined, from: from || undefined, to: to || undefined, page });
    const rows = data?.data ?? [];
    const reset = (fn) => (v) => { fn(v); setPage(1); };
    return (
        <>
            <PageHead title={t('Activity Logs')} />
            <Card>
                <div className="card-h" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <Tabs tabs={['login', 'activity']} value={kind} onChange={reset(setKind)} label={(x) => (x === 'login' ? t('Login history') : t('Activity'))} />
                    <input className="input" style={{ flex: 1, minWidth: 160 }} aria-label={t('Search')} placeholder={t('Search name, email, IP…')} value={q} onChange={(e) => reset(setQ)(e.target.value)} />
                    <input type="date" className="input" style={{ width: 'auto' }} aria-label={t('From')} value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
                    <input type="date" className="input" style={{ width: 'auto' }} aria-label={t('To')} value={to} onChange={(e) => reset(setTo)(e.target.value)} />
                </div>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>{t('Time')}</th><th>{t('User')}</th><th>{t('Event')}</th><th>{kind === 'login' ? t('IP address') : t('Details')}</th>{kind === 'login' ? <th>{t('Device')}</th> : <th>{t('IP address')}</th>}</tr></thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}><td>{fdt(r.created_at)}</td><td>{r.user_name || '—'}<small className="muted" style={{ display: 'block' }}>{r.email}</small></td>
                                <td><span style={{ color: ACTION_COLOR[r.action], fontWeight: 600 }}>{t(ACTION_LABEL[r.action] ?? r.action)}</span></td>
                                {kind === 'login' ? <><td><code>{r.ip}</code></td><td title={r.device} style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.device}</td></> : <><td>{r.description}</td><td><code>{r.ip}</code></td></>}</tr>))}
                        {!data && !isError && <tr><td colSpan={5} className="empty">{t('Loading…')}</td></tr>}
                        {isError && <tr><td colSpan={5} className="empty">{t('Could not load logs.')}</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={5} className="empty">{t('No Data Found')}</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
        </>
    );
}
