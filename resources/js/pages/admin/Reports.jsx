import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetOptionsQuery, useReportAnalyticsQuery, useReportCommissionsQuery, useReportOverviewQuery, useReportPayoutsQuery, useReportSalesQuery } from '../../app/api';
import { Card, CardB, CardH, money, PageHead, Pager } from '../../components/sa';
import { t } from '../../i18n';

const iso = (d) => d.toISOString().slice(0, 10);
const PRESETS = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['365', 'Last 12 months'], ['', 'All time']];

/** Date range + quick presets shared by every report. */
function useRange() {
    const [r, setR] = useState({ from: '', to: '' });
    const preset = (days) => setR(days ? { from: iso(new Date(Date.now() - (Number(days) - 1) * 864e5)), to: iso(new Date()) } : { from: '', to: '' });
    return [r, setR, preset];
}
function RangeBar({ r, setR, preset, children }) {
    return (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            {PRESETS.map(([d, l]) => <button key={l} type="button" className="btn sm" onClick={() => preset(d)}>{t(l)}</button>)}
            <input type="date" className="input" style={{ width: 'auto' }} aria-label={t('From')} value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} />
            <input type="date" className="input" style={{ width: 'auto' }} aria-label={t('To')} value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} />
            {children}
        </div>
    );
}
const q = (r, extra = {}) => ({ from: r.from || undefined, to: r.to || undefined, ...extra });

function Kpi({ label, value, hint }) {
    return <div className="card" style={{ padding: 16 }}><div className="muted" style={{ fontSize: 12 }}>{t(label)}</div><b style={{ fontSize: 22 }}>{value}</b>{hint && <div className="muted" style={{ fontSize: 11 }}>{hint}</div>}</div>;
}
const KpiGrid = ({ children }) => <div className="sa-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', marginBottom: 16 }}>{children}</div>;

function Bars({ rows, label, value, fmt = (v) => v, color = 'var(--primary)' }) {
    const max = Math.max(1, ...rows.map(value));
    return (
        <div>{rows.length === 0 && <p className="muted">{t('No data in this range.')}</p>}
            {rows.map((r) => (
                <div key={label(r)} style={{ margin: '8px 0' }}>
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{label(r)}</span><b>{fmt(value(r))}</b></div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-2, rgba(127,127,127,.15))' }}><div style={{ width: `${(value(r) / max) * 100}%`, height: '100%', borderRadius: 4, background: color }} /></div>
                </div>))}
        </div>
    );
}

function Trend({ rows, metric }) {
    if (!rows.length) return <p className="muted">{t('No data in this range.')}</p>;
    const W = 720, H = 220, pl = 8, pb = 24;
    const vals = rows.map((r) => r[metric]);
    const max = Math.max(1, ...vals) * 1.1;
    const bw = (W - pl) / rows.length;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label={t('Sales trend')}>
            {rows.map((r, i) => { const h = (r[metric] / max) * (H - pb - 8); return <rect key={r.date} x={pl + i * bw + bw * 0.15} y={H - pb - h} width={Math.max(1, bw * 0.7)} height={h} rx="2" fill="var(--primary)" opacity=".8"><title>{`${r.date}: ${metric === 'sales' ? money(r.sales) : r.orders}`}</title></rect>; })}
            <text x={pl} y={H - 6} fontSize="11" fill="var(--muted)">{rows[0].date}</text><text x={W - 4} y={H - 6} fontSize="11" textAnchor="end" fill="var(--muted)">{rows[rows.length - 1].date}</text>
        </svg>
    );
}

// ---- Analytics -----------------------------------------------------------------------------------------------------------
export function ReportAnalytics() {
    const [r, setR, preset] = useRange();
    const [metric, setMetric] = useState('sales');
    const { data, isFetching, isError } = useReportOverviewQuery(q(r));
    if (isError) return <Card><div className="empty">{t('Could not load analytics')}</div></Card>;
    const k = data?.kpi;
    return (
        <>
            <PageHead title={t('Analytics')} />
            <RangeBar r={r} setR={setR} preset={preset} />
            {!data ? <div className="skeleton" style={{ height: 320 }} /> : (
                <div style={{ opacity: isFetching ? 0.6 : 1 }}>
                    <KpiGrid>
                        <Kpi label="Total Sales" value={money(k.sales)} /><Kpi label="Orders" value={k.orders} /><Kpi label="Average order" value={money(k.avg_order)} /><Kpi label="Items sold" value={k.units} />
                        <Kpi label="Paid" value={money(k.paid)} /><Kpi label="Unpaid" value={money(k.unpaid)} /><Kpi label="Discounts given" value={money(k.discount)} /><Kpi label="Delivery charges" value={money(k.shipping)} />
                        <Kpi label="VAT & Tax" value={money(k.vat)} /><Kpi label="Customers" value={k.customers} /><Kpi label="POS sales" value={money(k.pos_sales)} />
                    </KpiGrid>
                    <Card><CardH><h3 style={{ flex: 1 }}>{t('Sales trend')}</h3>
                        <div className="seg">{['sales', 'orders'].map((m) => <button key={m} className={m === metric ? 'active' : ''} onClick={() => setMetric(m)}>{t(m === 'sales' ? 'Sales' : 'Orders')}</button>)}</div></CardH>
                        <CardB><Trend rows={data.by_day} metric={metric} /></CardB></Card>
                    <div className="sa-grid sa-g2" style={{ marginTop: 16 }}>
                        <Card><CardH><h3>{t('Top products')}</h3></CardH><CardB><Bars rows={data.top_products} label={(x) => `${x.name} · ${x.qty}×`} value={(x) => x.revenue} fmt={money} /></CardB></Card>
                        <Card><CardH><h3>{t('Sales by category')}</h3></CardH><CardB><Bars rows={data.by_category} label={(x) => `${x.name} · ${x.qty}×`} value={(x) => x.revenue} fmt={money} color="#2563eb" /></CardB></Card>
                        <Card><CardH><h3>{t('Orders by status')}</h3></CardH><CardB><Bars rows={Object.entries(data.by_status)} label={([s]) => s.replace(/_/g, ' ')} value={([, n]) => n} color="#f59e0b" /></CardB></Card>
                        <Card><CardH><h3>{t('Payment methods')}</h3></CardH><CardB><Bars rows={Object.entries(data.by_payment)} label={([m, v]) => `${m} · ${v.orders}`} value={([, v]) => v.total} fmt={money} color="#16a34a" /></CardB></Card>
                        <Card><CardH><h3>{t('Top customers')}</h3></CardH><CardB><Bars rows={data.top_customers} label={(x) => `${x.name} · ${x.orders}`} value={(x) => x.spent} fmt={money} color="#9333ea" /></CardB></Card>
                        {data.top_shops.length > 0 && <Card><CardH><h3>{t('Top shops')}</h3></CardH><CardB><Bars rows={data.top_shops} label={(x) => `${x.name} · ${x.orders}`} value={(x) => x.sales} fmt={money} color="#0891b2" /></CardB></Card>}
                    </div>
                </div>)}
        </>
    );
}

// ---- table helper ---------------------------------------------------------------------------------------------------------
function useCsv(path, params) {
    const token = useSelector((s) => s.auth.token);
    return async () => {
        const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), export: 'csv' });
        const res = await fetch(`/api/admin/reports/${path}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const url = URL.createObjectURL(await res.blob());
        const a = Object.assign(document.createElement('a'), { href: url, download: `${path}.csv` });
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };
}
const Empty = ({ cols, text }) => <tr><td colSpan={cols} className="empty">{text}</td></tr>;

// ---- Product sales report -----------------------------------------------------------------------------------------------
export function ReportSales() {
    const [r, setR, preset] = useRange();
    const [cat, setCat] = useState('');
    const [page, setPage] = useState(1);
    const { data: opts } = useGetOptionsQuery();
    const params = q(r, { category_id: cat || undefined });
    const { data, isFetching, isError } = useReportSalesQuery({ ...params, page });
    const csv = useCsv('sales', params);
    const rows = data?.data ?? [];
    return (
        <>
            <PageHead title={t('Product Sales Report')}><button className="btn" onClick={csv}>{t('Export CSV')}</button></PageHead>
            <RangeBar r={{ ...r }} setR={(v) => { setR(v); setPage(1); }} preset={(d) => { preset(d); setPage(1); }}>
                <select className="input" style={{ width: 'auto' }} aria-label={t('Category')} value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}><option value="">{t('All Categories')}</option>{opts?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </RangeBar>
            {data?.totals && <KpiGrid><Kpi label="Items sold" value={data.totals.qty} /><Kpi label="Total Sales" value={money(data.totals.sales)} /><Kpi label="Buying cost" value={money(data.totals.cost)} /><Kpi label="Profit" value={money(data.totals.profit)} /></KpiGrid>}
            <Card><div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                <thead><tr><th>{t('Product Name')}</th><th>SKU</th><th>{t('Orders')}</th><th>{t('Total Sold Quantity')}</th><th>{t('Total Sales')}</th><th>{t('Buying cost')}</th><th>{t('Profit')}</th></tr></thead>
                <tbody>{rows.map((x) => <tr key={x.product_id ?? x.name}><td>{x.name}</td><td>{x.sku || '—'}</td><td>{x.orders}</td><td>{x.qty}</td><td>{money(x.sales)}</td><td>{money(x.cost)}</td><td style={{ color: x.profit < 0 ? 'var(--danger,#dc2626)' : undefined }}>{money(x.profit)}</td></tr>)}
                    {!data && !isError && <Empty cols={7} text={t('Loading…')} />}{isError && <Empty cols={7} text={t('Could not load analytics')} />}{data && !rows.length && <Empty cols={7} text={t('No Data Found')} />}</tbody>
            </table></div><Pager meta={data} count={rows.length} onPage={setPage} /></Card>
        </>
    );
}

// ---- Commission list -------------------------------------------------------------------------------------------------------
export function ReportCommissions() {
    const [r, setR, preset] = useRange();
    const [page, setPage] = useState(1);
    const params = q(r);
    const { data, isFetching, isError } = useReportCommissionsQuery({ ...params, page });
    const csv = useCsv('commissions', params);
    const rows = data?.data ?? [];
    return (
        <>
            <PageHead title={t('Commission List')}><button className="btn" onClick={csv}>{t('Export CSV')}</button></PageHead>
            <RangeBar r={r} setR={(v) => { setR(v); setPage(1); }} preset={(d) => { preset(d); setPage(1); }} />
            {data?.totals && <KpiGrid><Kpi label="Commission rate" value={`${data.rate}%`} /><Kpi label="Selling amount" value={money(data.totals.selling)} /><Kpi label="Admin Commission" value={money(data.totals.commission)} /><Kpi label="Seller earning" value={money(data.totals.seller_earning)} /></KpiGrid>}
            <Card><div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                <thead><tr><th>{t('Order ID')}</th><th>{t('Created Date')}</th><th>{t('Shop')}</th><th>{t('Status')}</th><th>{t('Selling amount')}</th><th>{t('Admin Commission')}</th><th>{t('Seller earning')}</th></tr></thead>
                <tbody>{rows.map((x) => <tr key={x.id}><td>{x.number}</td><td>{new Date(x.date).toLocaleDateString('en-GB')}</td><td>{x.shop || '—'}</td><td>{String(x.status).replace(/_/g, ' ')}</td><td>{money(x.selling)}</td><td>{money(x.commission)}</td><td>{money(x.seller_earning)}</td></tr>)}
                    {!data && !isError && <Empty cols={7} text={t('Loading…')} />}{isError && <Empty cols={7} text={t('Could not load analytics')} />}{data && !rows.length && <Empty cols={7} text={t('No Data Found')} />}</tbody>
            </table></div><Pager meta={data} count={rows.length} onPage={setPage} /></Card>
        </>
    );
}

// ---- Payouts ---------------------------------------------------------------------------------------------------------------
export function ReportPayouts() {
    const [r, setR, preset] = useRange();
    const { data, isFetching, isError } = useReportPayoutsQuery(q(r));
    return (
        <>
            <PageHead title={t('PayOut')} />
            <RangeBar r={r} setR={setR} preset={preset} />
            {isError && <Card><div className="empty">{t('Could not load analytics')}</div></Card>}
            {data && <div style={{ opacity: isFetching ? 0.6 : 1 }}>
                <KpiGrid><Kpi label="Delivered sales" value={money(data.totals.gross)} /><Kpi label="Admin Commission" value={money(data.totals.commission)} hint={`${data.rate}%`} /><Kpi label="Owed to shops" value={money(data.totals.net)} /><Kpi label="Paid out so far" value={money(data.paid_out)} /></KpiGrid>
                <Card><CardH><h3>{t('Earnings by shop')}</h3></CardH><div className="table-wrap"><table>
                    <thead><tr><th>{t('Shop')}</th><th>{t('Orders')}</th><th>{t('Delivered sales')}</th><th>{t('Admin Commission')}</th><th>{t('Net earning')}</th></tr></thead>
                    <tbody>{data.shops.map((s) => <tr key={s.shop_id}><td>{s.shop || '—'}</td><td>{s.orders}</td><td>{money(s.gross)}</td><td>{money(s.commission)}</td><td><b>{money(s.net)}</b></td></tr>)}{!data.shops.length && <Empty cols={5} text={t('No Data Found')} />}</tbody>
                </table></div></Card>
                <Card><CardH><h3>{t('Payout history')}</h3></CardH><div className="table-wrap"><table>
                    <thead><tr><th>{t('PayOut Reason')}</th><th>{t('Amount')}</th></tr></thead>
                    <tbody>{data.history.map((h) => <tr key={h.id}><td>{h.reason}</td><td>{money(h.amount)}</td></tr>)}{!data.history.length && <Empty cols={2} text={t('Nothing yet')} />}</tbody>
                </table></div></Card>
            </div>}
        </>
    );
}

export function EarningSummaryPage() {
    const [r, setR, preset] = useRange();
    const { data } = useReportOverviewQuery(q(r));
    const { data: pay } = useReportPayoutsQuery(q(r));
    const { data: yearly } = useReportAnalyticsQuery({ type: 'earning' });
    const k = data?.kpi;
    return (
        <>
            <PageHead title={t('Earning Summary')} />
            <RangeBar r={r} setR={setR} preset={preset} />
            {!k || !pay ? <div className="skeleton" style={{ height: 240 }} /> : (
                <>
                    <KpiGrid>
                        <Kpi label="Total Orders" value={k.orders} /><Kpi label="Total Sales" value={money(k.sales)} /><Kpi label="Total Earning" value={money(k.paid)} hint={t('Paid orders')} />
                        <Kpi label="Pending payment" value={money(k.unpaid)} /><Kpi label="Admin Commission" value={money(pay.totals.commission)} hint={`${pay.rate}%`} /><Kpi label="Net earning" value={money(k.paid - pay.totals.commission)} />
                        <Kpi label="Discounts given" value={money(k.discount)} /><Kpi label="Delivery charges" value={money(k.shipping)} /><Kpi label="Average order" value={money(k.avg_order)} />
                    </KpiGrid>
                    {yearly && <Card><CardH><h3>{t('Earning this year')}</h3><b>{money(yearly.total)}</b></CardH><CardB>
                        <Bars rows={yearly.labels.map((l, i) => ({ l, v: yearly.values[i] }))} label={(x) => x.l} value={(x) => x.v} fmt={money} /></CardB></Card>}
                </>)}
        </>
    );
}
