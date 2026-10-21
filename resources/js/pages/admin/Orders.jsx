import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGetOrdersQuery } from '../../app/api';
import { Empty, Icon, Pagination, money } from '../../components/ui';

const STATUSES = ['pending', 'confirm', 'processing', 'pickup', 'on_the_way', 'delivered', 'cancelled'];
const label = (s) => ({ on_the_way: 'On The Way' }[s] ?? s[0].toUpperCase() + s.slice(1));
const tone = { pending: 'bg-amber-100 text-amber-700', processing: 'bg-sky-100 text-sky-700', confirm: 'bg-violet-100 text-violet-700', pickup: 'bg-teal-100 text-teal-700', on_the_way: 'bg-indigo-100 text-indigo-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };
export { STATUSES, label };
export const Badge = ({ v }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[v] ?? 'bg-gray-100 text-gray-700'}`}>{label(v)}</span>;

export default function Orders() {
    const [sp] = useSearchParams();
    const initial = sp.get('status');
    const [f, setF] = useState({ page: 1, search: '', status: STATUSES.includes(initial) ? initial : '' });
    const [q, setQ] = useState('');
    const navigate = useNavigate();
    const { data, isFetching, isError } = useGetOrdersQuery(f);
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">Orders</h1>
                <div className="flex gap-2">
                    <form onSubmit={(e) => { e.preventDefault(); setF({ ...f, search: q, page: 1 }); }} className="flex gap-2"><input className="field !py-2" placeholder="Order # or customer" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn-outline" aria-label="Search"><Icon name="search" size={15} /></button></form></div></div>
            <div className="flex flex-wrap gap-2">{['', ...STATUSES].map((st) => <button key={st} onClick={() => setF({ ...f, status: st, page: 1 })} className={`rounded-full border px-4 py-1.5 text-sm ${f.status === st ? 'border-ink bg-white font-medium' : 'border-line bg-white text-[#556070] hover:border-primary'}`}>{st ? label(st) : 'All'}</button>)}</div>
            <div className="card overflow-x-auto rounded-xl !border-[#f4f4f4]"><table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-surface text-xs uppercase text-muted"><tr>{['Order ID', 'Order Date', 'Customer', 'Shop', 'Total Amount', 'Payment Method', 'Status', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody className={isFetching ? 'opacity-50' : ''}>{data?.data.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}/show`)} className="cursor-pointer border-t border-line hover:bg-primary-soft/40">
                        <td className="px-4 py-3">{o.number}</td><td className="px-4 py-3">{new Date(o.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-3">{o.user?.name}</td><td className="px-4 py-3">{o.shop?.name}</td><td className="px-4 py-3"><b className="font-medium">{money(o.total)}</b><br /><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${o.payment_status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-blue-600 text-white'}`}>{o.payment_status === 'paid' ? 'Paid' : 'Pending'}</span></td><td className="px-4 py-3">{o.payment_method}</td><td className="px-4 py-3"><Badge v={o.status} /></td><td className="px-4 py-3"><span className="inline-flex gap-2" onClick={(e) => e.stopPropagation()}><button aria-label="View order" onClick={() => navigate(`/admin/orders/${o.id}/show`)} className="grid h-8 w-8 place-items-center rounded-lg border border-primary/30 bg-primary-soft text-primary"><Icon name="eye" size={15} /></button><button aria-label="Download invoice" onClick={() => navigate(`/admin/orders/${o.id}/invoice`)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:text-primary"><Icon name="doc" size={15} /></button></span></td></tr>))}</tbody></table>
                {!data && !isError && <div className="skeleton m-4 h-40" />}{isError && <Empty title="Could not load orders" />}{data?.data.length === 0 && <Empty title="No orders found" />}</div>
            <Pagination meta={data} onPage={(page) => setF({ ...f, page })} />
        </div>
    );
}
