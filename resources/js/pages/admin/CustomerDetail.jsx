import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCustomerProfileQuery } from '../../app/api';
import { Card, CardB, CardH, fdate, fdt, money, PageHead, Pager, Pill, Thumb } from '../../components/sa';
import { t } from '../../i18n';

const Kpi = ({ label, value }) => <div className="card" style={{ padding: 14 }}><div className="muted" style={{ fontSize: 12 }}>{t(label)}</div><b style={{ fontSize: 20 }}>{value}</b></div>;

export default function CustomerDetail() {
    const { id } = useParams();
    const [page, setPage] = useState(1);
    const { data, isFetching, isError } = useCustomerProfileQuery({ id, page });
    if (isError) return <Card><div className="empty">{t('Customer not found.')}</div></Card>;
    if (!data) return <div className="skeleton" style={{ height: 360 }} />;
    const { customer: c, stats: s } = data;
    return (
        <>
            <PageHead title={c.name}><Link className="btn" to="/admin/customers">{t('← Back')}</Link></PageHead>
            <div className="sa-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', marginBottom: 16 }}>
                <Kpi label="Orders" value={s.orders} /><Kpi label="Total spent" value={money(s.spent)} /><Kpi label="Average order" value={money(s.avg_order)} /><Kpi label="Items sold" value={s.items} />
                <Kpi label="Delivered" value={s.delivered} /><Kpi label="Cancelled" value={s.cancelled} /><Kpi label="Unpaid" value={money(s.unpaid)} />
            </div>
            <div className="sa-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'start' }}>
                <Card><CardH><h3>{t('Profile')}</h3></CardH><CardB>
                    <div className="row" style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}><Thumb name={c.name} id={c.id} /><div><b>{c.name}</b><div className="muted">{c.email}</div></div></div>
                    <dl className="kv">
                        <dt>{t('Phone')}</dt><dd>{c.phone || '--'}</dd><dt>{t('Gender')}</dt><dd>{c.gender || '--'}</dd><dt>{t('Date of Birth')}</dt><dd>{c.birth_date ? fdate(c.birth_date) : '--'}</dd>
                        <dt>{t('Joined')}</dt><dd>{fdt(c.joined)}</dd><dt>{t('Sign-in')}</dt><dd>{c.google ? 'Google' : t('Email & password')}</dd>
                        <dt>{t('First order')}</dt><dd>{s.first_order ? fdt(s.first_order) : '--'}</dd><dt>{t('Last order')}</dt><dd>{s.last_order ? fdt(s.last_order) : '--'}</dd>
                    </dl></CardB></Card>
                <Card><CardH><h3>{t('Addresses')}</h3></CardH><CardB>
                    {data.addresses.length === 0 && <p className="muted">{t('No saved addresses.')}</p>}
                    {data.addresses.map((a) => <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}><b>{a.name}</b> {a.is_default ? <Pill value="default" /> : null}<div className="muted">{a.address_line}{a.area ? `, ${a.area}` : ''}</div><div className="muted">{a.phone} · {a.type}</div></div>)}
                </CardB></Card>
                <Card><CardH><h3>{t('Orders by status')}</h3></CardH><CardB>{Object.entries(data.by_status).map(([k, n]) => <div key={k} className="row" style={{ justifyContent: 'space-between', padding: '4px 0' }}><Pill value={k} /><b>{n}</b></div>)}
                    {data.payment_methods.length > 0 && <><h4 style={{ margin: '14px 0 6px' }}>{t('Payment methods')}</h4>{data.payment_methods.map((p) => <div key={p.payment_method} className="row" style={{ justifyContent: 'space-between' }}><span>{p.payment_method}</span><span>{p.n} · {money(p.total)}</span></div>)}</>}</CardB></Card>
                <Card><CardH><h3>{t('Most bought products')}</h3></CardH><CardB>
                    {data.top_products.length === 0 && <p className="muted">{t('Nothing yet')}</p>}
                    {data.top_products.map((p) => <div key={p.name} className="row" style={{ justifyContent: 'space-between', padding: '4px 0' }}><span>{p.name}</span><span>{p.qty}× · {money(p.spent)}</span></div>)}</CardB></Card>
            </div>
            <Card style={{ marginTop: 16 }}><CardH><h3>{t('All orders')} ({data.orders.total})</h3></CardH>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>{t('Order ID')}</th><th>{t('Order Date')}</th><th>{t('Shop')}</th><th>{t('Items')}</th><th>{t('Total Amount')}</th><th>{t('Payment Method')}</th><th>{t('Payment status')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead>
                    <tbody>{data.orders.data.map((o) => (
                        <tr key={o.id}><td>{o.number}</td><td>{fdt(o.created_at)}</td><td>{o.shop || '--'}</td>
                            <td>{o.items.map((i) => <div key={i.id} style={{ fontSize: 12 }}>{i.qty}× {i.name}{(i.size || i.color) ? <span className="muted"> ({[i.size, i.color].filter(Boolean).join(', ')})</span> : null}</div>)}</td>
                            <td>{money(o.total)}</td><td>{o.payment_method}</td><td><Pill value={o.payment_status === 'paid' ? 'paid' : 'pending'} /></td><td><Pill value={o.status} /></td>
                            <td><div className="actions"><Link className="btn sm" to={`/admin/orders/${o.id}/show`}>{t('View')}</Link></div></td></tr>))}
                        {data.orders.data.length === 0 && <tr><td colSpan={9} className="empty">{t('No orders yet.')}</td></tr>}</tbody>
                </table></div>
                <Pager meta={data.orders} count={data.orders.data.length} onPage={setPage} />
            </Card>
        </>
    );
}
