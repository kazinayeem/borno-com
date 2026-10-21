import React from 'react';
import { Link } from 'react-router-dom';
import { useGetDashboardQuery } from '../../app/api';
import { Empty, money } from '../../components/ui';
import { Badge } from './Orders';

const stat = [['shops', 'Total Shops', 'border-purple-400 bg-purple-50'], ['products', 'Total Products', 'border-sky-400 bg-sky-50'], ['orders', 'Total Orders', 'border-rose-400 bg-rose-50'], ['customers', 'Total Customers', 'border-emerald-400 bg-emerald-50']];
const analytics = [['pending', 'Pending'], ['confirm', 'Confirm'], ['processing', 'Processing'], ['pickup', 'Pickup'], ['on_the_way', 'On The Way'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];
const Panel = ({ title, children }) => <section className="card mt-4 rounded-xl !border-[#f4f4f4] p-5"><h2 className="mb-4 text-sm font-medium">{title}</h2>{children}</section>;

export default function Dashboard() {
    const { data, isLoading, isError } = useGetDashboardQuery();
    if (isError) return <Empty title="Could not load dashboard" />;
    return (
        <div>
            <section className="card rounded-xl !border-[#f4f4f4] p-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stat.map(([k, label, cls]) => !data ? <div key={k} className="skeleton h-[110px]" /> : (
                    <div key={k} className={`rounded-lg border p-4 ${cls}`}><p className="text-3xl font-bold">{data.stats[k]}</p><p className="mt-3 text-[15px]">{label}</p></div>))}</div></section>
            <Panel title="Order Analytics"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {analytics.map(([k, label]) => <Link key={k} to="/admin/orders" className="rounded-lg border border-line p-3 hover:border-primary"><p className="text-sm text-[#556070]">{label}</p><p className="mt-1 text-xl font-bold text-[#556070]">{data?.orders_by_status[k] ?? 0}</p></Link>)}</div></Panel>
            <Panel title="Admin Wallet"><div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line p-4"><p className="text-3xl font-bold">{money(data?.wallet.balance)}</p><p className="text-xs text-muted">Available balance</p></div>
                <div className="rounded-lg border border-line p-4"><p className="text-2xl font-bold">{money(data?.wallet.earning)}</p><p className="text-xs text-muted">Total Earning</p></div>
                <div className="rounded-lg border border-line p-4"><p className="text-2xl font-bold">{money(0)}</p><p className="text-xs text-muted">Pending Withdraw</p></div></div></Panel>
            <Panel title="Order Summary (Latest 5 Order)"><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-[#f6f7f9] text-xs"><tr>{['Order ID', 'Qty', 'Shop', 'Date', 'Status'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
                <tbody>{data?.latest_orders.map((o) => <tr key={o.id} className="border-t border-line"><td className="px-3 py-3">#{o.number}</td><td className="px-3">{o.qty}</td><td className="px-3">{o.shop?.name}</td><td className="px-3">{new Date(o.created_at).toLocaleDateString()}</td><td className="px-3"><Badge v={o.status} /></td></tr>)}</tbody></table></div></Panel>
            <Panel title="Top Trending Shops"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {data?.trending_shops.map((s) => <div key={s.id} className="rounded-lg border border-line p-3"><p className="font-medium">{s.name}</p><p className="text-xs text-muted">★ {s.rating} · Order: {s.orders_count}</p></div>)}</div></Panel>
        </div>
    );
}
