import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetDashboardQuery, useGetStatisticsQuery } from '../../app/api';
import { Empty } from '../../components/ui';
import { ActBtn, Card, CardB, CardH, Chip, fdate, money, Pill, SaIcon, statusLabel } from '../../components/sa';
import { t } from '../../i18n';

const STATUSES = ['pending', 'confirm', 'processing', 'pickup', 'on_the_way', 'delivered', 'cancelled'];
const S_ICON = { pending: 'refund', confirm: 'cart', processing: 'settings', pickup: 'box', on_the_way: 'truck', delivered: 'check', cancelled: 'x' };

// ---- charts (same geometry as the original) ---------------------------------------------------------------------------
function BarChart({ labels, values }) {
    const W = 640, H = 260, pl = 36, pb = 28, max = Math.max(1, ...values) * 1.15, bw = (W - pl) / labels.length;
    const y = (v) => H - pb - (v / max) * (H - pb - 10);
    const ticks = [0, 1, 2, 3, 4].map((i) => Math.round((max / 4) * i));
    const cx = (i) => pl + i * bw + bw / 2;
    return (
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Order statistics chart')}>
            {ticks.map((v) => <g key={v}><line x1={pl} x2={W} y1={y(v)} y2={y(v)} stroke="var(--border)" /><text x={pl - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v}</text></g>)}
            {values.map((v, i) => <g key={labels[i]}><rect x={pl + i * bw + bw * 0.2} y={y(v)} width={bw * 0.6} height={H - pb - y(v)} rx="6" fill="var(--primary)" opacity=".35"><title>{`${labels[i]}: ${v}`}</title></rect><text x={cx(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{String(labels[i]).slice(-5)}</text></g>)}
            <polyline fill="none" stroke="var(--primary)" strokeWidth="2" points={values.map((v, i) => `${cx(i)},${y(v)}`).join(' ')} />
            {values.map((v, i) => <circle key={i} cx={cx(i)} cy={y(v)} r="3.5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />)}
        </svg>
    );
}

function Donut({ parts }) {
    const total = parts.reduce((a, p) => a + p.v, 0) || 1;
    const R = 80, r = 50, cx = 100, cy = 100;
    let a0 = Math.PI;
    const pt = (rad, a) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    const paths = parts.map((p) => {
        const a1 = a0 + (Math.PI * p.v) / total;
        const big = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M${pt(R, a0)} A${R},${R} 0 ${big} 1 ${pt(R, a1)} L${pt(r, a1)} A${r},${r} 0 ${big} 0 ${pt(r, a0)} Z`;
        a0 = a1;
        return <path key={p.l} d={d} fill={p.c} stroke="var(--surface)" strokeWidth="2"><title>{`${p.l}: ${p.v}`}</title></path>;
    });
    return (
        <>
            <svg viewBox="0 0 200 110" style={{ width: '100%', maxWidth: 260, display: 'block', margin: 'auto' }} role="img" aria-label={t('User overview')}>{paths}</svg>
            <div className="donut-legend">{parts.map((p) => <span key={p.l}><i style={{ background: p.c }} />{p.l} ({p.v})</span>)}</div>
        </>
    );
}

function RoundImg({ src, name }) {
    const [bad, setBad] = useState(false);
    return <img src={!src || bad ? `/placeholder/${encodeURIComponent(name || '?')}.svg?h=200` : src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}

const Rank = ({ title, rows, render }) => (
    <Card><CardH><h3>{title}</h3></CardH><CardB className="rank">
        {rows.length === 0 && <div className="empty">{t('Nothing yet')}</div>}
        {rows.map((r) => <div key={r.id ?? r.name} className="rank-row">{render(r)}</div>)}
    </CardB></Card>
);

function Statistics({ users }) {
    const [type, setType] = useState('yearly');
    const [date, setDate] = useState('');
    const { data, isFetching } = useGetStatisticsQuery({ type, date: date || undefined });
    const totalUsers = users.customer + users.shop + users.rider;
    return (
        <Card>
            <CardH>
                <h3 style={{ flex: 1 }}>{t('Statistics')}</h3>
                <div className="seg">{['daily', 'monthly', 'yearly'].map((t) => <button key={t} className={t === type ? 'active' : ''} onClick={() => setType(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
                <input type="date" className="input" style={{ width: 'auto' }} aria-label={t('Date')} value={date} onChange={(e) => setDate(e.target.value)} />
                <button className="btn sm" onClick={() => setDate('')}>{t('Reset')}</button>
            </CardH>
            <CardB className="sa-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <div style={{ opacity: isFetching ? 0.5 : 1 }}>
                    <b style={{ fontSize: 26 }}>{data?.total ?? '–'}</b><div className="muted">{t('Total Orders')}</div>
                    {data ? <BarChart labels={data.labels} values={data.values} /> : <div className="empty">{t('Loading…')}</div>}
                </div>
                <div>
                    <b style={{ fontSize: 26 }}>{totalUsers}</b><div className="muted" style={{ marginBottom: 24 }}>{t('User Overview')}</div>
                    <Donut parts={[{ l: 'Customer', v: users.customer, c: '#e11d48' }, { l: 'Shop', v: users.shop, c: '#2563eb' }, { l: 'Rider', v: users.rider, c: '#f59e0b' }]} />
                </div>
            </CardB>
        </Card>
    );
}

function AdminDashboard({ d }) {
    const w = d.wallet;
    return (
        <>
            <div className="sa-grid sa-g4">
                {[['Total Shops', d.totals.shops, 'store', 'a', '/admin/shops'], ['Total Products', d.totals.products, 'box', 'b', '/admin/products'], ['Total Orders', d.totals.orders, 'cart', 'c', '/admin/orders'], ['Total Customers', d.totals.customers, 'users', 'd', '/admin/customers']]
                    .map(([l, v, i, c, to]) => <Link key={t(l)} to={to} className={`stat st-${c}`}><div><b>{v}</b>{t(l)}</div><div className="ico"><SaIcon name={i} /></div></Link>)}
            </div>
            <Card><CardH><h3>{t('Order Analytics')}</h3></CardH><CardB className="sa-grid sa-g4">
                {STATUSES.map((s) => <Link key={s} className="mini" to={`/admin/orders?status=${s}`}><div className="t"><span><SaIcon name={S_ICON[s]} className="inline-icon" />{statusLabel(s)}</span><span>↗</span></div><b>{d.order_analytics[s] ?? 0}</b></Link>)}
            </CardB></Card>
            <Card><CardH><h3>{t('Admin Wallet')}</h3></CardH><CardB className="sa-grid sa-g3" style={{ gridTemplateColumns: '1.4fr 1fr 1fr' }}>
                <div className="wallet-big"><b>{money(w.total_earning)}</b><span className="muted">{t('Total Earning')}</span></div>
                {[['Already Withdraw', w.already_withdraw], ['Pending Withdraw', w.pending_withdraw], ['Total Commission', w.total_commission], ['Rejected Withdraw', w.rejected_withdraw]].map(([l, v]) => <div key={t(l)} className="mini"><b style={{ margin: '0 0 6px' }}>{money(v)}</b><span className="muted">{t(l)}</span></div>)}
            </CardB></Card>
            <Statistics users={d.user_overview} />
            <Card><CardH><h3>{t('Order Summary (Latest 5 Orders)')}</h3></CardH><div className="table-wrap"><table>
                <thead><tr><th>{t('Order ID')}</th><th>{t('Qty')}</th><th>{t('Shop')}</th><th>{t('Date')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead>
                <tbody>{d.latest_orders.map((o) => <tr key={o.id}><td>#{o.number}</td><td>{o.qty}</td><td>{o.shop_name}</td><td>{fdate(o.created_at)}</td><td><Pill value={o.status} /></td><td><div className="actions"><Link to={`/admin/orders/${o.id}/show`} className="act" aria-label={t('View')}><SaIcon name="eye" /></Link></div></td></tr>)}</tbody>
            </table></div></Card>
            <div className="sa-grid sa-g3">
                <Rank title={t('Top Trending Shops')} rows={d.top_shops} render={(s) => <><RoundImg src={s.image_url} name={s.name} /><div className="grow"><div>{s.name}</div><span className="stars">★ {s.rating}</span></div><Chip>{t('Order: {n}', { n: s.orders })}</Chip></>} />
                <Rank title={t('Most Favorite Products')} rows={d.favorite_products} render={(p) => <><RoundImg src={p.image_url} name={p.name} /><div className="grow"><div>{p.name}</div><small style={{ color: 'var(--primary)' }}>♥ {p.favorites}</small></div></>} />
                <Rank title={t('Top Selling Products')} rows={d.top_selling} render={(p) => <><RoundImg src={p.image_url} name={p.name} /><div className="grow"><div>{p.name}</div><small>{money(p.price)}</small></div><Chip>{t('Sold: {n}', { n: p.sold })}</Chip></>} />
            </div>
        </>
    );
}

// Seller dashboard, laid out like the ReadyEcommerce shop portal.
function SellerDashboard({ d }) {
    const w = d.wallet;
    const rank = (title, rows, extra) => (
        <Rank title={title} rows={rows} render={(p) => <>
            <RoundImg src={p.image_url} name={p.name} />
            <div className="grow"><div>{p.name}</div><small className="muted">{extra(p)}</small></div>
        </>} />
    );
    return (
        <>
            <div className="sa-grid sa-g4">
                {[['Total Products', d.stats.products, 'box', 'a', '/shop/products'], ['Total Orders', d.stats.orders, 'cart', 'b', '/shop/orders'], ['Total Categories', d.stats.categories, 'grid', 'c', '/shop/categories'], ['Total Brands', d.stats.brands, 'star', 'd', '/shop/brands']].map(([l, v, i, c, to]) => <Link key={l} to={to} className={`stat st-${c}`}><div><b>{v}</b>{t(l)}</div><div className="ico"><SaIcon name={i} /></div></Link>)}
            </div>
            <Card><CardH><h3>{t('Order Analytics')}</h3></CardH><CardB className="sa-grid sa-g4">
                {STATUSES.map((s) => <Link key={s} className="mini" to={`/shop/orders?status=${s}`}><div className="t"><span><SaIcon name={S_ICON[s]} className="inline-icon" />{statusLabel(s)}</span><span>↗</span></div><b>{d.orders_by_status[s] ?? 0}</b></Link>)}
            </CardB></Card>
            <Card><CardH><h3>{t('Shop Wallet')}</h3></CardH><CardB className="sa-grid sa-g3" style={{ gridTemplateColumns: '1.4fr 1fr 1fr' }}>
                <div className="wallet-big">
                    <b>{money(w.balance)}</b>
                    <span className="muted">{t('Available Balance')}</span>
                    <Link to="/shop/withdraw" className="btn primary sm" style={{ marginTop: 14, width: 'auto' }}>{t('Withdraw')}</Link>
                </div>
                {[['Pending Withdraw', w.pending_withdraw], ['Already Withdraw', w.already_withdraw], ['Rejected Withdraw', w.rejected_withdraw], ['Total Withdraw', w.total_withdraw], ['Delivery Charge Collected', w.delivery_charge], ['Total Pos Sales', w.pos_sales]].map(([l, v]) => <div key={l} className="mini"><b style={{ margin: '0 0 6px' }}>{money(v)}</b><span className="muted">{t(l)}</span></div>)}
            </CardB></Card>
            <Card><CardH><h3>{t('Order Summary (Latest 8 Orders)')}</h3></CardH><div className="table-wrap"><table>
                <thead><tr><th>{t('Order ID')}</th><th>{t('Qty')}</th><th>{t('Date')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead>
                <tbody>{(d.latest_orders ?? []).map((o) => <tr key={o.id}><td>#{o.number}</td><td>{o.qty}</td><td>{fdate(o.created_at)}</td><td><Pill value={o.status} /></td><td><div className="actions"><Link to={`/admin/orders/${o.id}/show`} className="act" aria-label={t('View')}><SaIcon name="eye" /></Link></div></td></tr>)}
                    {(d.latest_orders ?? []).length === 0 && <tr><td colSpan={5} className="empty">{t('No Data Found')}</td></tr>}
                </tbody>
            </table></div></Card>
            <div className="sa-grid sa-g3">
                {rank(t('Top Selling Products'), d.top_selling ?? [], (p) => <>{t('Rating')}: {Number(p.rating ?? 0).toFixed(1)} · {t('Sold: {n}', { n: p.sold })}</>)}
                {rank(t('Top Rating Products'), d.top_rating ?? [], (p) => <>{t('Sold: {n}', { n: p.sold })} · {t('Rating')}: {Number(p.rating ?? 0).toFixed(1)}</>)}
                {rank(t('Most Favorite Products'), d.favorite_products ?? [], (p) => <>{t('Sold: {n}', { n: p.sold })} · ♥ {p.favorites}</>)}
            </div>
        </>
    );
}

export default function Dashboard() {
    const { data, isError } = useGetDashboardQuery();
    if (isError) return <Empty title={t('Could not load dashboard')} />;
    if (!data) return <div className="card"><div className="empty">{t('Loading…')}</div></div>;
    return data.scope === 'shop' ? <SellerDashboard d={data} /> : <AdminDashboard d={data} />;
}
void ActBtn;
