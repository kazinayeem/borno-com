import React from 'react';
import { Link } from 'react-router-dom';
import { useGetDashboardQuery } from '../../app/api';
import { Empty, money } from '../../components/ui';
import { Badge } from './Orders';

const stat = [['shops', 'Total Shops', 'border-purple-400 bg-purple-50'], ['products', 'Total Products', 'border-sky-400 bg-sky-50'], ['orders', 'Total Orders', 'border-rose-400 bg-rose-50'], ['customers', 'Total Customers', 'border-emerald-400 bg-emerald-50']];
const analytics = [['pending', 'Pending'], ['confirm', 'Confirm'], ['processing', 'Processing'], ['pickup', 'Pickup'], ['on_the_way', 'On The Way'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];
const Panel = ({ title, children }) => <section className="card mt-4 rounded-xl !border-[#f4f4f4] p-5"><h2 className="mb-4 text-sm font-medium">{title}</h2>{children}</section>;

// Seller dashboard — layout and colours follow the ShopDesk seller panel (stat cards, analytics tiles, wallet tiles, 7-day bars, top products).
const SELLER_STATS = [['products', 'Total Products', '📦', 'border-[#a78bfa] bg-[#f5f3ff]'], ['orders', 'Total Orders', '🛒', 'border-[#60a5fa] bg-[#eff6ff]'], ['categories', 'Total Categories', '🗂', 'border-[#f87171] bg-[#fef2f2]'], ['brands', 'Total Brands', '🏷', 'border-[#4ade80] bg-[#f0fdf4]']];
const SELLER_STATUS = [['pending', 'Pending', '⏱'], ['confirm', 'Confirm', '🛒'], ['processing', 'Processing', '⚙️'], ['pickup', 'Pickup', '📦'], ['on_the_way', 'On The Way', '🚚'], ['delivered', 'Delivered', '✅'], ['cancelled', 'Cancelled', '✖']];
const Box = ({ title, children, className = '' }) => <section className={`mb-[18px] rounded-xl border border-[#e5e7eb] bg-white p-[18px] ${className}`}>{title && <h3 className="mb-3 text-[15px] font-semibold">{title}</h3>}{children}</section>;
const Mini = ({ label, value, to, big }) => {
    const body = <><span className="text-[13px] text-[#6b7280]">{label}</span>{to && <span className="float-right text-[#6b7280]">↗</span>}<b className={`mt-1.5 block ${big ? 'text-[28px]' : 'text-lg'}`}>{value}</b></>;
    const cls = 'block rounded-lg border border-[#e5e7eb] p-3 hover:border-primary';
    return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
};

function Last7Chart({ days }) {
    const max = Math.max(1, ...days.map((d) => d.count));
    return (
        <div className="mb-6 flex h-[200px] items-end gap-2.5 pt-2.5" role="img" aria-label="Orders in the last 7 days">
            {days.map((d) => (
                <div key={d.date} className="relative min-h-[2px] flex-1 rounded-t-md bg-primary" style={{ height: `${(d.count / max) * 100}%` }}>
                    <em className="absolute -top-[18px] left-0 right-0 text-center text-[11px] not-italic">{d.count}</em>
                    <span className="absolute -bottom-5 left-0 right-0 text-center text-[11px] text-[#6b7280]">{d.date.slice(5)}</span>
                </div>))}
        </div>
    );
}

function SellerDashboard({ data }) {
    const w = data.wallet;
    return (
        <div>
            <Box><div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                {SELLER_STATS.map(([k, label, icon, cls]) => <div key={k} className={`relative rounded-[10px] border p-[18px] ${cls}`}><b className="block text-[26px]">{data.stats[k]}</b><span className="text-[#6b7280]">{label}</span><i className="absolute bottom-3.5 right-3.5 text-[22px] not-italic">{icon}</i></div>)}</div></Box>
            <Box title="Order Analytics"><div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                {SELLER_STATUS.map(([k, label, icon]) => <Mini key={k} to={`/admin/orders?status=${k}`} label={`${icon} ${label}`} value={data.orders_by_status[k] ?? 0} />)}</div></Box>
            <Box title="👛 Shop Wallet"><div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                <Mini label="Available Balance" value={money(w.balance)} big />
                <Mini label="Pending Withdraw" value={money(w.pending_withdraw)} />
                <Mini label="Already Withdraw" value={money(w.already_withdraw)} />
                <Mini label="Total Sales" value={money(w.total_sales)} />
                <Mini label="Delivery Charge Collected" value={money(w.delivery_charge)} />
                <Mini label="POS Sales" value={money(w.pos_sales)} /></div></Box>
            <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]">
                <Box title="Orders – last 7 days"><Last7Chart days={data.last7} /></Box>
                <Box title="Top Selling Products">
                    {data.top_products.length === 0 && <p className="p-5 text-center text-[#6b7280]">No sales yet</p>}
                    {data.top_products.map((p) => <div key={p.name} className="my-2 flex items-center justify-between gap-2"><span className="truncate">{p.name}</span><b className="shrink-0">{p.sold} sold</b></div>)}</Box>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { data, isLoading, isError } = useGetDashboardQuery();
    if (isError) return <Empty title="Could not load dashboard" />;
    if (data?.scope === 'shop') return <SellerDashboard data={data} />;
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
