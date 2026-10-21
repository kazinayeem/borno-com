import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { errorMessage, useAdminDeleteMutation, useAdminListQuery, useAdminSaveMutation, useGetOptionsQuery, useApproveProductMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Empty, Icon, Img, Modal, Pagination, money } from '../../components/ui';
import { useSelector } from 'react-redux';

const thumb = (row) => (row.image_url ? <img src={row.image_url} alt={row.name} className="h-10 w-10 rounded object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded bg-[#f6f7f9] text-gray-400"><Icon name="box" size={16} /></span>);
const logo = (row) => (row.image_url ? <img src={row.image_url} alt={row.name} className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">{(row.name ?? row.title)?.[0]}</span>);

// Columns/fields mirror the reference admin's list pages. `status` renders a toggle switch bound to `active`.
export const resources = {
    categories: { page: 'category', title: 'Category List', add: 'Add Category', cols: [['Thumbnail', thumb], ['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    brands: { title: 'Brand List', add: 'Add Brand', cols: [['Image', thumb], ['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    shops: { page: 'shops', title: 'All Shops', add: 'Add Shop', cols: [['Logo', logo], ['Name', (r) => r.name], ['Status', 'status'], ['Products', (r) => r.products_count], ['Orders', (r) => r.orders_count], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    products: { page: 'product', title: 'Product List', add: 'Add Product', shopFilter: true, cols: [['Thumbnail', thumb], ['Product Name', (r) => r.name], ['Shop', (r) => r.shop?.name], ['Price', (r) => money(r.price)], ['Discount Price', (r) => money(r.discount_price ?? r.price)], ['Action', 'actions']],
        fields: [['name', 'Name', 'text'], ['shop_id', 'Shop ID', 'number'], ['category_id', 'Category ID', 'number'], ['price', 'Price', 'number'], ['discount_price', 'Discount price', 'number'], ['stock', 'Stock', 'number'], ['description', 'Description', 'textarea'], ['is_flash_sale', 'Flash sale', 'checkbox'], ['active', 'Active', 'checkbox']], defaults: { shop_id: 1, active: true, stock: 0 } },
    riders: { title: 'All Driver', add: 'Add Driver', cols: [['Name', (r) => r.name], ['Phone', (r) => r.phone], ['Vehicle', (r) => r.vehicle_type], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['phone', 'Phone', 'text'], ['email', 'Email', 'email'], ['vehicle_type', 'Vehicle type', 'text'], ['driving_licence', 'Driving licence', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    colors: { title: 'Colors', add: 'Add Color', cols: [['Name', (r) => r.name], ['Color', (r) => <span className="inline-block h-6 w-12 rounded border border-line" style={{ background: r.code }} />], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['code', 'Color', 'color'], ['active', 'Active', 'checkbox']], defaults: { code: '#000000', active: true } },
    sizes: { title: 'Sizes', add: 'Add Size', cols: [['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    units: { title: 'Units', add: 'Add Unit', cols: [['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    subcategories: { title: 'Sub Category List', add: 'Add Sub Category', cols: [['Thumbnail', thumb], ['Category', (r) => r.category?.name], ['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['category_id', 'Category', 'categories'], ['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    coupons: { title: 'Promo Codes', add: 'Add Promo Code', noSL: true, cols: [['Code', (r) => r.code], ['Discount', (r) => (r.discount_type === 'percent' ? `${r.discount}%` : money(r.discount))], ['Min Amount', (r) => money(r.min_amount).replace('.00', '')], ['Started At', (r) => fmtDate(r.starts_at)], ['Expired At', (r) => fmtDate(r.expires_at)], ['Status', 'status'], ['Action', 'actions']], fields: [['code', 'Code', 'text'], ['discount', 'Discount', 'number'], ['discount_type', 'Discount type', 'dtype'], ['min_amount', 'Min amount', 'number'], ['starts_at', 'Starts at', 'datetime-local'], ['expires_at', 'Expires at', 'datetime-local'], ['active', 'Active', 'checkbox']], defaults: { discount_type: 'percent', active: true } },
    'flash-sales': { title: 'Flash Deals', add: 'Add Flash Deal', cols: [['Thumbnail', thumb], ['Name', (r) => r.name], ['Start Date', (r) => fmtRaw(r.starts_at)], ['End Date', (r) => fmtRaw(r.ends_at)], ['Status', 'status'], ['Description', (r) => <span className="line-clamp-2 max-w-xs text-xs">{r.description}</span>], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['description', 'Description', 'textarea'], ['starts_at', 'Start date', 'datetime-local'], ['ends_at', 'End date', 'datetime-local'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    currencies: { title: 'Currency', add: 'Add Currency', noSL: true, cols: [['Name', (r) => r.name], ['Symbol', (r) => r.symbol], ['Rate', (r) => (r.is_default ? `${r.rate} (Default)` : `${r.rate} (From USD)`)], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['symbol', 'Symbol', 'text'], ['rate', 'Rate', 'number']], defaults: { rate: 1 } },
    'vat-taxes': { title: 'VAT & Tax', add: 'Add VAT & Tax', cols: [['Name', (r) => r.name], ['Percentage', (r) => `${r.percentage}%`], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['percentage', 'Percentage', 'number'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    blogs: { title: 'All Blog', add: 'Add Blog', cols: [['Title', (r) => r.title], ['Category', (r) => r.category], ['Views', (r) => r.views], ['Status', 'published'], ['Action', 'actions']], fields: [['title', 'Title', 'text'], ['category', 'Category', 'text'], ['excerpt', 'Excerpt', 'textarea'], ['body', 'Body', 'textarea'], ['published', 'Published', 'checkbox']], defaults: { published: true } },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const fmtRaw = (d) => (d ? new Date(d).toISOString().replace('T', ' - ').slice(0, 21) : '—');
const toLocalInput = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');

const Toggle = ({ on, onChange }) => (
    <button role="switch" aria-checked={on} onClick={onChange} className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-primary' : 'bg-gray-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></button>
);

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
    const [applied, setApplied] = useState('');
    const [editing, setEditing] = useState(null);
    useEffect(() => { setPage(1); setShop(''); setApplied(''); setEditing(null); }, [res, approval]);
    const { data, isFetching, isError } = useAdminListQuery({ res, page, shop_id: applied || undefined, approval: approval === 'accepted' || approval === 'pending' || approval === 'update' ? approval : undefined });
    const { data: opts } = useGetOptionsQuery(undefined, { skip: !cfg.fields.some((f) => f[2] === 'categories') });
    const { data: shops } = useAdminListQuery({ res: 'shops', per_page: 100 }, { skip: !cfg.shopFilter });
    const [save, { isLoading: saving, error }] = useAdminSaveMutation();
    const [remove] = useAdminDeleteMutation();
    const errs = error?.data?.errors ?? {};
    const notify = (r, ok) => dispatch(pushToast(r.error ? errorMessage(r.error) : ok, r.error ? 'error' : 'success'));

    const submit = async (e) => { e.preventDefault(); const r = await save({ res, ...editing }); notify(r, 'Saved successfully'); if (!r.error) setEditing(null); };
    const toggle = async (row, key) => notify(await save({ res, id: row.id, [key]: !row[key] }), 'Status updated');
    const del = async (row) => { if (window.confirm('Delete this record?')) notify(await remove({ res, id: row.id }), 'Deleted'); };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-[22px] font-semibold">{approval ? `Shop Products · ${approval[0].toUpperCase()}${approval.slice(1)}` : cfg.title}</h2>
                {!approval && <button className="btn-primary !rounded-lg !py-2.5" onClick={() => (cfg.page ? navigate(`/admin/${cfg.page}/create`) : setEditing({ ...cfg.defaults }))}><Icon name="plus" size={15} /> {cfg.add}</button>}</div>
            {cfg.shopFilter && (
                <div className="card mb-4 rounded-xl !border-[#f4f4f4] p-5"><label className="mb-1 block text-sm">Shop</label>
                    <select className="field !w-64" value={shop} onChange={(e) => setShop(e.target.value)}><option value="">All Shop</option>{shops?.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    <div className="mt-3 flex justify-end gap-3"><button className="rounded-lg bg-[#f6f7f9] px-6 py-2.5 text-sm" onClick={() => { setShop(''); setApplied(''); setPage(1); }}>Reset</button><button className="btn-primary !rounded-lg !bg-[#f43f6a] !px-6" onClick={() => { setApplied(shop); setPage(1); }}>Filter Data</button></div></div>)}
            <div className="card overflow-x-auto rounded-xl !border-[#f4f4f4] p-3">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead><tr className="bg-[#f6f7f9] text-[13px]">{!cfg.noSL && <th className="rounded-l-lg px-4 py-3">SL</th>}{cfg.cols.map(([l], i) => <th key={l} className={`px-4 py-3 ${i === 0 && cfg.noSL ? 'rounded-l-lg' : ''} ${i === cfg.cols.length - 1 ? 'rounded-r-lg text-center' : ''}`}>{l}</th>)}</tr></thead>
                    <tbody className={isFetching ? 'opacity-50' : ''}>
                        {data?.data.map((row, i) => (
                            <tr key={row.id} className="border-b border-[#f4f4f4] last:border-0">
                                {!cfg.noSL && <td className="px-4 py-3">{(data.current_page - 1) * data.per_page + i + 1}</td>}
                                {cfg.cols.map(([l, v]) => (
                                    <td key={l} className={`px-4 py-2.5 ${v === 'actions' ? 'text-center' : ''}`}>
                                        {v === 'status' ? <Toggle on={row.active} onChange={() => toggle(row, 'active')} /> : v === 'published' ? <Toggle on={row.published} onChange={() => toggle(row, 'published')} /> : v === 'actions' ? (
                                            <span className="inline-flex gap-2"><button aria-label="Edit" onClick={() => (cfg.page ? navigate(`/admin/${res}/${row.id}/edit`) : setEditing(row))} className="grid h-9 w-9 place-items-center rounded-lg border border-primary/30 bg-primary-soft text-primary"><Icon name="edit" size={15} /></button>
                                                {approval && approval !== 'accepted' && isAdmin && <button onClick={async () => { const r = await approve(row.id); notify(r, 'Product accepted'); }} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">Approve</button>}
                                                <button aria-label="Delete" onClick={() => del(row)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-red-500"><Icon name="trash" size={15} /></button></span>) : v(row) ?? '—'}
                                    </td>))}
                            </tr>))}
                    </tbody>
                </table>
                {!data && !isError && <div className="skeleton m-4 h-40" />}
                {isError && <Empty title="Could not load data" hint="You may not have permission for this section." />}
                {data?.data.length === 0 && <Empty title="No records" hint="Add your first one." />}
            </div>
            <Pagination meta={data} onPage={setPage} />
            {editing && (
                <Modal title={editing.id ? 'Edit' : cfg.add} onClose={() => setEditing(null)}>
                    <form onSubmit={submit} className="space-y-3">
                        {cfg.fields.map(([k, label, type]) => (
                            <div key={k}>
                                {type === 'checkbox' ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={!!editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })} />{label}</label> : (
                                    <><label className="mb-1 block text-sm font-medium">{label}</label>
                                        {type === 'textarea' ? <textarea rows={3} className="field" value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                                            : type === 'categories' ? <select className="field" value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}><option value="">Select Category</option>{opts?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                            : type === 'dtype' ? <select className="field" value={editing[k] ?? 'percent'} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed</option></select>
                                            : type === 'datetime-local' ? <input type="datetime-local" className="field" value={toLocalInput(editing[k])} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                                            : <input type={type === 'color' ? 'color' : type} step="any" className={type === 'color' ? 'h-10 w-20 rounded border border-line' : 'field'} value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />}</>)}
                                {errs[k] && <p className="mt-1 text-xs text-red-500">{errs[k][0]}</p>}
                            </div>))}
                        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button><button disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button></div>
                    </form>
                </Modal>)}
        </div>
    );
}
