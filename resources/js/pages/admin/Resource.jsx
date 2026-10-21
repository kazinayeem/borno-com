import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { errorMessage, useAdminDeleteMutation, useAdminListQuery, useAdminSaveMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Empty, Icon, Modal, Pagination, money } from '../../components/ui';

const thumb = (row) => (row.image_url ? <img src={row.image_url} alt={row.name} className="h-10 w-10 rounded object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded bg-[#f6f7f9] text-gray-400"><Icon name="box" size={16} /></span>);
const logo = (row) => (row.image_url ? <img src={row.image_url} alt={row.name} className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">{(row.name ?? row.title)?.[0]}</span>);

// Columns/fields mirror the reference admin's list pages. `status` renders a toggle switch bound to `active`.
export const resources = {
    categories: { page: 'category', title: 'Category List', add: 'Add Category', cols: [['Thumbnail', thumb], ['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    brands: { title: 'Brand List', add: 'Add Brand', cols: [['Image', thumb], ['Name', (r) => r.name], ['Status', 'status'], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    shops: { page: 'shops', title: 'All Shops', add: 'Add Shop', cols: [['Logo', logo], ['Name', (r) => r.name], ['Status', 'status'], ['Products', (r) => r.products_count], ['Orders', (r) => r.orders_count], ['Action', 'actions']], fields: [['name', 'Name', 'text'], ['active', 'Active', 'checkbox']], defaults: { active: true } },
    products: { page: 'product', title: 'Product List', add: 'Add Product', shopFilter: true, cols: [['Thumbnail', thumb], ['Product Name', (r) => r.name], ['Shop', (r) => r.shop?.name], ['Price', (r) => money(r.price)], ['Discount Price', (r) => money(r.discount_price ?? r.price)], ['Action', 'actions']],
        fields: [['name', 'Name', 'text'], ['shop_id', 'Shop ID', 'number'], ['category_id', 'Category ID', 'number'], ['price', 'Price', 'number'], ['discount_price', 'Discount price', 'number'], ['stock', 'Stock', 'number'], ['description', 'Description', 'textarea'], ['is_flash_sale', 'Flash sale', 'checkbox'], ['active', 'Active', 'checkbox']], defaults: { shop_id: 1, active: true, stock: 0 } },
    blogs: { title: 'All Blog', add: 'Add Blog', cols: [['Title', (r) => r.title], ['Category', (r) => r.category], ['Views', (r) => r.views], ['Status', 'published'], ['Action', 'actions']], fields: [['title', 'Title', 'text'], ['category', 'Category', 'text'], ['excerpt', 'Excerpt', 'textarea'], ['body', 'Body', 'textarea'], ['published', 'Published', 'checkbox']], defaults: { published: true } },
};

const Toggle = ({ on, onChange }) => (
    <button role="switch" aria-checked={on} onClick={onChange} className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-primary' : 'bg-gray-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></button>
);

export default function Resource({ res }) {
    const cfg = resources[res];
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [shop, setShop] = useState('');
    const [applied, setApplied] = useState('');
    const [editing, setEditing] = useState(null);
    useEffect(() => { setPage(1); setShop(''); setApplied(''); setEditing(null); }, [res]);
    const { data, isFetching, isError } = useAdminListQuery({ res, page, shop_id: applied || undefined });
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
            <div className="mb-4 flex items-center justify-between"><h2 className="text-[22px] font-semibold">{cfg.title}</h2>
                <button className="btn-primary !rounded-lg !py-2.5" onClick={() => (cfg.page ? navigate(`/admin/${cfg.page}/create`) : setEditing({ ...cfg.defaults }))}><Icon name="plus" size={15} /> {cfg.add}</button></div>
            {cfg.shopFilter && (
                <div className="card mb-4 rounded-xl !border-[#f4f4f4] p-5"><label className="mb-1 block text-sm">Shop</label>
                    <select className="field !w-64" value={shop} onChange={(e) => setShop(e.target.value)}><option value="">All Shop</option>{shops?.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    <div className="mt-3 flex justify-end gap-3"><button className="rounded-lg bg-[#f6f7f9] px-6 py-2.5 text-sm" onClick={() => { setShop(''); setApplied(''); setPage(1); }}>Reset</button><button className="btn-primary !rounded-lg !bg-[#f43f6a] !px-6" onClick={() => { setApplied(shop); setPage(1); }}>Filter Data</button></div></div>)}
            <div className="card overflow-x-auto rounded-xl !border-[#f4f4f4] p-3">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead><tr className="bg-[#f6f7f9] text-[13px]"><th className="rounded-l-lg px-4 py-3">SL</th>{cfg.cols.map(([l], i) => <th key={l} className={`px-4 py-3 ${i === cfg.cols.length - 1 ? 'rounded-r-lg text-center' : ''}`}>{l}</th>)}</tr></thead>
                    <tbody className={isFetching ? 'opacity-50' : ''}>
                        {data?.data.map((row, i) => (
                            <tr key={row.id} className="border-b border-[#f4f4f4] last:border-0">
                                <td className="px-4 py-3">{(data.current_page - 1) * data.per_page + i + 1}</td>
                                {cfg.cols.map(([l, v]) => (
                                    <td key={l} className={`px-4 py-2.5 ${v === 'actions' ? 'text-center' : ''}`}>
                                        {v === 'status' ? <Toggle on={row.active} onChange={() => toggle(row, 'active')} /> : v === 'published' ? <Toggle on={row.published} onChange={() => toggle(row, 'published')} /> : v === 'actions' ? (
                                            <span className="inline-flex gap-2"><button aria-label="Edit" onClick={() => (cfg.page ? navigate(`/admin/${res}/${row.id}/edit`) : setEditing(row))} className="grid h-9 w-9 place-items-center rounded-lg border border-primary/30 bg-primary-soft text-primary"><Icon name="edit" size={15} /></button>
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
                                        {type === 'textarea' ? <textarea rows={3} className="field" value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /> : <input type={type} step="any" className="field" value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />}</>)}
                                {errs[k] && <p className="mt-1 text-xs text-red-500">{errs[k][0]}</p>}
                            </div>))}
                        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button><button disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button></div>
                    </form>
                </Modal>)}
        </div>
    );
}
