import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useAdminDeleteMutation, useAdminListQuery, useAdminSaveMutation, useApproveProductMutation, useGetOptionsQuery } from '../../app/api';
import { pushToast } from '../../app/slices';
import { ActBtn, Card, CardH, Modal, money as fmtMoney, PageHead, Pager, SaIcon, Switch, Thumb, useDebounced } from '../../components/sa';

const thumb = (row) => <Thumb src={row.image_url} name={row.name ?? row.title} id={row.id} />;
const logo = (row) => <Thumb src={row.image_url} name={row.name ?? row.title} id={row.id} />;
const money = (v) => fmtMoney(v);

// Columns/fields mirror the reference admin's list pages. `status` renders a toggle switch bound to `active`.
export const resources = {
    categories: { page: 'category', title: 'Category List', add: 'Add Category', cols: [['Thumbnail', thumb], ['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    brands: { title: 'Brand List', add: 'Add Brand', cols: [['Image', thumb], ['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    shops: { page: 'shops', title: 'All Shops', add: 'Add Shop', cols: [['Logo', logo], ['Name', (r) => r.name], ['Status', 'status'], ['Products', (r) => r.products_count], ['Orders', (r) => r.orders_count], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    products: { page: 'product', title: 'Product List', add: 'Add Product', shopFilter: true, cols: [['Thumbnail', thumb], ['Product Name', (r) => r.name], ['Shop', (r) => r.shop?.name], ['Price', (r) => money(r.price)], ['Discount Price', (r) => money(r.discount_price ?? r.price)], ['Action', 'actions']],
        fields: [['name', 'Name', 'text'], ['shop_id', 'Shop ID', 'number'], ['category_id', 'Category ID', 'number'], ['price', 'Price', 'number'], ['discount_price', 'Discount price', 'number'], ['stock', 'Stock', 'number'], ['description', 'Description', 'textarea'], ['is_flash_sale', 'Flash sale', 'checkbox'], ['active', 'Active', 'checkbox']], defaults: { shop_id: 1, active: true, stock: 0 } },
    riders: { title: 'All Driver', add: 'Add Driver', cols: [['Name', (r) => r.name], ['Phone', (r) => r.phone], ['Vehicle', (r) => r.vehicle_type], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['phone', 'Phone', 'text'], ['email', 'Email', 'email'], ['vehicle_type', 'Vehicle type', 'text'], ['driving_licence', 'Driving licence', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    colors: { title: 'Colors', add: 'Add Color', cols: [['Name', (r) => r.name], ['Color', (r) => <><span className="swatch" style={{ background: r.code }} /> <span className="muted">{r.code}</span></>], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['code', 'Color', 'color'], ['active', 'Active', 'checkbox']], defaults: { code: '#000000', active: true } },
    sizes: { title: 'Sizes', add: 'Add Size', cols: [['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    units: { title: 'Units', add: 'Add Unit', cols: [['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    subcategories: { title: 'Sub Category List', add: 'Add Sub Category', cols: [['Thumbnail', thumb], ['Category', (r) => r.category?.name], ['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['category_id', 'Category', 'categories'], ['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    coupons: { title: 'Promo Codes', add: 'Add Promo Code', noSL: true, cols: [['Code', (r) => r.code], ['Discount', (r) => (r.discount_type === 'percent' ? `${r.discount}%` : money(r.discount))], ['Min Amount', (r) => money(r.min_amount)], ['Started At', (r) => fmtDate(r.starts_at)], ['Expired At', (r) => fmtDate(r.expires_at)], ['Status', 'status'], ['Action', 'actions']], fields: [['code', 'Code', 'text'], ['discount', 'Discount', 'number'], ['discount_type', 'Discount type', 'dtype'], ['min_amount', 'Min amount', 'number'], ['starts_at', 'Starts at', 'datetime-local'], ['expires_at', 'Expires at', 'datetime-local'], ['active', 'Active', 'checkbox']], defaults: { discount_type: 'percent', active: true } },
    'flash-sales': { title: 'Flash Deals', add: 'Add Flash Deal', cols: [['Thumbnail', thumb], ['Name', (r) => r.name], ['Start Date', (r) => fmtRaw(r.starts_at)], ['End Date', (r) => fmtRaw(r.ends_at)], ['Status', 'status'], ['Description', (r) => <span className="muted">{(r.description ?? '').slice(0, 60)}</span>], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['description', 'Description', 'textarea'], ['starts_at', 'Start date', 'datetime-local'], ['ends_at', 'End date', 'datetime-local'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    currencies: { title: 'Currency', add: 'Add Currency', noSL: true, cols: [['Name', (r) => r.name], ['Symbol', (r) => r.symbol], ['Rate', (r) => (r.is_default ? `${r.rate} (Default)` : `${r.rate} (From USD)`)], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['symbol', 'Symbol', 'text'], ['rate', 'Rate', 'number']], defaults: { rate: 1 } },
    'vat-taxes': { title: 'VAT & Tax', add: 'Add VAT & Tax', cols: [['Name', (r) => r.name], ['Percentage', (r) => `${r.percentage}%`], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['percentage', 'Percentage', 'number'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    blogs: { title: 'All Blog', add: 'Add Blog', cols: [['Title', (r) => r.title], ['Category', (r) => r.category], ['Views', (r) => r.views], ['Status', 'published'], ['Action', 'actions']], fields: [['title', 'Title', 'text'], ['category', 'Category', 'text'], ['excerpt', 'Excerpt', 'textarea'], ['body', 'Body', 'textarea'], ['published', 'Published', 'checkbox']], defaults: { published: true } },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '--');
const fmtRaw = (d) => (d ? new Date(d).toISOString().replace('T', ' - ').slice(0, 21) : '--');
const toLocalInput = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');

// Input for the small add/edit dialogs.
function ModalField({ f: [key, label, type], value, onChange, error, categories }) {
    const lab = <label htmlFor={`m_${key}`}>{label}</label>;
    const err = <span className="err">{error}</span>;
    const set = (v) => onChange(v);
    if (type === 'checkbox') return <div className="sa-field check"><Switch checked={value} label={label} onChange={() => set(!value)} /><label>{label}</label></div>;
    if (type === 'textarea') return <div className="sa-field wide">{lab}<textarea id={`m_${key}`} className="input" value={value ?? ''} onChange={(e) => set(e.target.value)} />{err}</div>;
    if (type === 'categories') return <div className="sa-field">{lab}<select id={`m_${key}`} className="input" value={value ?? ''} onChange={(e) => set(e.target.value)}><option value="">Select Category</option>{categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{err}</div>;
    if (type === 'dtype') return <div className="sa-field">{lab}<select id={`m_${key}`} className="input" value={value ?? 'percent'} onChange={(e) => set(e.target.value)}><option value="percent">Percent</option><option value="fixed">Fixed</option></select>{err}</div>;
    if (type === 'datetime-local') return <div className="sa-field">{lab}<input id={`m_${key}`} className="input" type="datetime-local" value={toLocalInput(value)} onChange={(e) => set(e.target.value)} />{err}</div>;
    if (type === 'color') return <div className="sa-field">{lab}<input id={`m_${key}`} className="input" type="color" style={{ height: 42, padding: 4 }} value={value || '#000000'} onChange={(e) => set(e.target.value)} />{err}</div>;
    return <div className="sa-field">{lab}<input id={`m_${key}`} className="input" type={type} step="any" value={value ?? ''} onChange={(e) => set(e.target.value)} />{err}</div>;
}

export default function Resource({ res }) {
    const cfg = resources[res];
    const [sp] = useSearchParams();
    const approval = res === 'products' ? sp.get('status') : null;
    const isAdmin = useSelector((st) => st.auth.user?.role === 'admin');
    const [approve] = useApproveProductMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [shop, setShop] = useState('');
    const [q, setQ] = useState('');
    const search = useDebounced(q);
    const [editing, setEditing] = useState(null);
    useEffect(() => { setPage(1); setShop(''); setQ(''); setEditing(null); }, [res, approval]);
    useEffect(() => setPage(1), [search, shop]);
    const { data, isFetching, isError } = useAdminListQuery({ res, page, per_page: 15, search: search || undefined, shop_id: shop || undefined, approval: ['accepted', 'pending', 'update'].includes(approval) ? approval : undefined });
    const { data: opts } = useGetOptionsQuery(undefined, { skip: !cfg.fields.some((f) => f[2] === 'categories') });
    const { data: shops } = useAdminListQuery({ res: 'shops', per_page: 100 }, { skip: !cfg.shopFilter });
    const [save, { isLoading: saving, error }] = useAdminSaveMutation();
    const [remove] = useAdminDeleteMutation();
    const errs = error?.data?.errors ?? {};
    const notify = (r, ok) => dispatch(pushToast(r.error ? errorMessage(r.error) : ok, r.error ? 'error' : 'success'));

    const submit = async (e) => { e.preventDefault(); const r = await save({ res, ...editing }); notify(r, 'Saved successfully'); if (!r.error) setEditing(null); };
    const toggle = async (row, key) => notify(await save({ res, id: row.id, [key]: !row[key] }), 'Status updated');
    const del = async (row) => { if (window.confirm('Delete this record?')) notify(await remove({ res, id: row.id }), 'Deleted'); };
    const title = approval ? `Shop Products · ${approval[0].toUpperCase()}${approval.slice(1)}` : cfg.title;
    const rows = data?.data ?? [];
    const colSpan = cfg.cols.length + (cfg.noSL ? 0 : 1);

    return (
        <>
            <PageHead title={title}>
                {!approval && <button className="btn primary" onClick={() => (cfg.page ? navigate(`/admin/${cfg.page}/create`) : setEditing({ ...cfg.defaults }))}><SaIcon name="plus" /> Add New</button>}
            </PageHead>
            <Card>
                <CardH><div className="toolbar" style={{ flex: 1 }}>
                    <input className="input" aria-label="Search" placeholder="Search…" style={{ minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />
                    {cfg.shopFilter && <select className="input" aria-label="Shop" value={shop} onChange={(e) => setShop(e.target.value)}><option value="">All Shop</option>{shops?.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                </div></CardH>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr>{!cfg.noSL && <th>SL</th>}{cfg.cols.map(([l]) => <th key={l}>{l}</th>)}</tr></thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={row.id}>
                                {!cfg.noSL && <td>{(data.current_page - 1) * data.per_page + i + 1}</td>}
                                {cfg.cols.map(([l, v]) => (
                                    <td key={l}>
                                        {v === 'status' ? <Switch checked={row.active} onChange={() => toggle(row, 'active')} />
                                            : v === 'published' ? <Switch checked={row.published} onChange={() => toggle(row, 'published')} />
                                                : v === 'actions' ? (
                                                    <div className="actions">
                                                        {approval && approval !== 'accepted' && isAdmin && <ActBtn icon="check" title="Approve" onClick={async () => notify(await approve(row.id), 'Product accepted')} />}
                                                        <ActBtn icon="edit" title="Edit" onClick={() => (cfg.page ? navigate(`/admin/${res}/${row.id}/edit`) : setEditing(row))} />
                                                        <ActBtn icon="trash" title="Delete" onClick={() => del(row)} />
                                                    </div>)
                                                    : (v(row) ?? '--')}
                                    </td>))}
                            </tr>))}
                        {!data && !isError && <tr><td colSpan={colSpan} className="empty">Loading…</td></tr>}
                        {isError && <tr><td colSpan={colSpan} className="empty">Could not load data. You may not have permission for this section.</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={colSpan} className="empty">No Data Found</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
            {editing && (
                <Modal title={editing.id ? `Edit ${title}` : cfg.add} onClose={() => setEditing(null)}
                    footer={<><button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button><button form="res-form" className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
                    <form id="res-form" className="form-grid" onSubmit={submit}>
                        {cfg.fields.map((f) => <ModalField key={f[0]} f={f} value={editing[f[0]]} onChange={(v) => setEditing({ ...editing, [f[0]]: v })} error={errs[f[0]]?.[0]} categories={opts?.categories} />)}
                    </form>
                </Modal>)}
        </>
    );
}
