import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { errorMessage, useGetOrderQuery, useGetOrdersQuery, useUpdateOrderMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Empty, Icon, Modal, Pagination, money } from '../../components/ui';

const STATUSES = ['pending', 'confirm', 'processing', 'pickup', 'on_the_way', 'delivered', 'cancelled'];
const label = (s) => ({ on_the_way: 'On The Way' }[s] ?? s[0].toUpperCase() + s.slice(1));
const tone = { pending: 'bg-amber-100 text-amber-700', processing: 'bg-sky-100 text-sky-700', confirm: 'bg-violet-100 text-violet-700', pickup: 'bg-teal-100 text-teal-700', on_the_way: 'bg-indigo-100 text-indigo-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };
export const Badge = ({ v }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[v] ?? 'bg-gray-100 text-gray-700'}`}>{label(v)}</span>;

function OrderModal({ id, onClose }) {
    const { data: o, isLoading } = useGetOrderQuery(id);
    const [update, { isLoading: saving }] = useUpdateOrderMutation();
    const dispatch = useDispatch();
    const change = async (body) => {
        const r = await update({ id, ...body });
        dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast('Order updated'));
    };
    return (
        <Modal title={o ? `Order ${o.number}` : 'Order'} onClose={onClose}>
            {isLoading || !o ? <div className="skeleton h-40" /> : (
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted">Customer</p>{o.user.name}<br /><span className="text-muted">{o.user.email}</span></div>
                        <div><p className="text-xs text-muted">Shipping address</p>{o.shipping_address}</div></div>
                    <table className="w-full"><thead className="text-left text-xs uppercase text-muted"><tr><th className="py-1">Item</th><th>Qty</th><th className="text-right">Total</th></tr></thead>
                        <tbody>{o.items.map((i) => <tr key={i.id} className="border-t border-line"><td className="py-2">{i.name}</td><td>{i.qty} × {money(i.price)}</td><td className="text-right">{money(i.price * i.qty)}</td></tr>)}</tbody></table>
                    <div className="space-y-1 text-right"><p>Subtotal {money(o.subtotal)}</p><p>Shipping {money(o.shipping)}</p><p className="text-base font-bold">Total {money(o.total)}</p></div>
                    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                        <label>Status <select disabled={saving} className="field !w-auto !py-1.5 capitalize" value={o.status} onChange={(e) => change({ status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
                        <label>Payment <select disabled={saving} className="field !w-auto !py-1.5 capitalize" value={o.payment_status} onChange={(e) => change({ status: o.status, payment_status: e.target.value })}><option>paid</option><option>unpaid</option></select></label>
                    </div>
                </div>)}
        </Modal>
    );
}

export default function Orders() {
    const [f, setF] = useState({ page: 1, search: '', status: '' });
    const [q, setQ] = useState('');
    const [view, setView] = useState(null);
    const { data, isFetching, isError } = useGetOrdersQuery(f);
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">Orders</h1>
                <div className="flex gap-2">
                    <form onSubmit={(e) => { e.preventDefault(); setF({ ...f, search: q, page: 1 }); }} className="flex gap-2"><input className="field !py-2" placeholder="Order # or customer" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn-outline" aria-label="Search"><Icon name="search" size={15} /></button></form></div></div>
            <div className="flex flex-wrap gap-2">{['', ...STATUSES].map((st) => <button key={st} onClick={() => setF({ ...f, status: st, page: 1 })} className={`rounded-full border px-4 py-1.5 text-sm ${f.status === st ? 'border-ink bg-white font-medium' : 'border-line bg-white text-[#556070] hover:border-primary'}`}>{st ? label(st) : 'All'}</button>)}</div>
            <div className="card overflow-x-auto rounded-xl !border-[#f4f4f4]"><table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-surface text-xs uppercase text-muted"><tr>{['Order ID', 'Order Date', 'Customer', 'Shop', 'Total Amount', 'Payment Method', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody className={isFetching ? 'opacity-50' : ''}>{data?.data.map((o) => (
                    <tr key={o.id} onClick={() => setView(o.id)} className="cursor-pointer border-t border-line hover:bg-primary-soft/40">
                        <td className="px-4 py-3">{o.number}</td><td className="px-4 py-3">{new Date(o.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-3">{o.user?.name}</td><td className="px-4 py-3">{o.shop?.name}</td><td className="px-4 py-3"><b className="font-medium">{money(o.total)}</b><br /><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${o.payment_status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-blue-600 text-white'}`}>{o.payment_status === 'paid' ? 'Paid' : 'Pending'}</span></td><td className="px-4 py-3">{o.payment_method}</td><td className="px-4 py-3"><Badge v={o.status} /></td></tr>))}</tbody></table>
                {!data && !isError && <div className="skeleton m-4 h-40" />}{isError && <Empty title="Could not load orders" />}{data?.data.length === 0 && <Empty title="No orders found" />}</div>
            <Pagination meta={data} onPage={(page) => setF({ ...f, page })} />
            {view && <OrderModal id={view} onClose={() => setView(null)} />}
        </div>
    );
}
