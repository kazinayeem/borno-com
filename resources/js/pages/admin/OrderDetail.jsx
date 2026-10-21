import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useGetMasterQuery, useGetOrderQuery, useGetRidersQuery, useUpdateOrderMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Card, CardB, CardH, fdate, fdt, Modal, money, PageHead, Pill, SaIcon, Switch, Thumb } from '../../components/sa';
import { STATUSES, label } from './Orders';
import { t } from '../../i18n';

const Kv = ({ rows }) => <dl className="kv">{rows.map(([k, v]) => <React.Fragment key={k}><dt>{t(k)}</dt><dd>{v ?? '--'}</dd></React.Fragment>)}</dl>;

function AssignRider({ order, onClose }) {
    const { data: riders, isLoading } = useGetRidersQuery();
    const [update, { isLoading: saving }] = useUpdateOrderMutation();
    const [pick, setPick] = useState(order.rider_id ?? null);
    const dispatch = useDispatch();
    const go = async () => {
        const r = await update({ id: order.id, status: order.status, rider_id: pick });
        dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(t('Rider assigned')));
        if (!r.error) onClose();
    };
    return (
        <Modal title={t('Select a rider')} onClose={onClose} footer={<><button className="btn" onClick={onClose}>{t('Close')}</button><button className="btn primary" disabled={saving || !pick} onClick={go}>{saving ? t('Assigning…') : t('Assign Now')}</button></>}>
            {isLoading ? <div className="empty">{t('Loading…')}</div> : (
                <div className="rank">{riders.map((r) => (
                    <label key={r.id} className="rank-row" style={{ cursor: 'pointer', borderColor: pick === r.id ? 'var(--primary)' : undefined }}>
                        <input type="radio" name="rider" checked={pick === r.id} onChange={() => setPick(r.id)} />
                        <div className="grow"><div>{r.name}</div><small>{t('Incomplete Orders: {n}', { n: r.incomplete_orders })}</small></div></label>))}</div>)}
        </Modal>
    );
}

export function OrderDetail() {
    const { id } = useParams();
    const dispatch = useDispatch();
    const isAdmin = useSelector((s) => s.auth.user?.role === 'admin');
    const { data: o, isLoading, isError } = useGetOrderQuery(id);
    const [update, { isLoading: saving }] = useUpdateOrderMutation();
    const [assign, setAssign] = useState(false);
    if (isError) return <Card><div className="empty">{t('Order not found. It may have been removed, or it belongs to another shop.')}</div></Card>;
    if (isLoading || !o) return <Card><div className="empty">{t('Loading…')}</div></Card>;

    const change = async (body) => {
        const r = await update({ id: o.id, status: o.status, ...body });
        dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(t('Order updated')));
    };
    const paid = o.payment_status === 'paid';

    return (
        <>
            <PageHead title={t('Order {number}', { number: o.number })}>
                <Link className="btn" to="/admin/orders">{t('Back to list')}</Link>
                <Link className="btn" to={`/admin/orders/${o.id}/slip`}><SaIcon name="file" /> {t('Payment Slip')}</Link>
                <Link className="btn primary" to={`/admin/orders/${o.id}/invoice`}><SaIcon name="download" /> {t('Download Invoice')}</Link>
            </PageHead>
            <div className="sa-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card>
                        <CardH><h3>{t('Order Details')}</h3></CardH>
                        <CardB><Kv rows={[['Order ID', `#${o.number}`], ['Order Status', <Pill value={o.status} />], ['Payment Status', <Pill value={paid ? 'paid' : 'pending'} />], ['Payment Method', o.payment_method], ['Order Date', fdt(o.created_at)], ['Delivery Date', o.delivered_at ? fdate(o.delivered_at) : '--']]} /></CardB>
                        <div className="table-wrap"><table>
                            <thead><tr><th>{t('SL')}</th><th>{t('Product')}</th><th>{t('Shop')}</th><th>{t('Quantity')}</th><th>{t('Size')}</th><th>{t('Color')}</th><th>{t('Price')}</th><th>{t('Total')}</th></tr></thead>
                            <tbody>{o.items.map((i, n) => <tr key={i.id}><td>{n + 1}</td><td><div className="row"><Thumb src={i.product?.image_url} name={i.name} id={i.product_id ?? i.id} />{i.name}</div></td><td>{o.shop?.name}</td><td>{i.qty}</td><td>{i.size ?? '--'}</td><td>{i.color ?? '--'}</td><td>{money(i.price)}</td><td>{money(i.price * i.qty)}</td></tr>)}</tbody>
                        </table></div>
                        <CardB><div className="totals" style={{ maxWidth: 340, marginLeft: 'auto' }}>
                            <div><span>{t('Sub Total')}</span><span>{money(o.subtotal)}</span></div><div><span>{t('Coupon Discount')}</span><span>{money(o.coupon_discount)}</span></div>
                            <div><span>{t('Delivery Charge')}</span><span>{money(o.shipping)}</span></div><div><span>{t('VAT & Tax')}</span><span>{money(o.vat_tax)}</span></div>
                            <div className="grand"><span>{t('Grand Total')}</span><span>{money(o.total)}</span></div></div></CardB>
                    </Card>
                    <Card><CardH><h3>{t('Customer Info')}</h3></CardH><CardB><Kv rows={[['Name', o.user?.name], ['Phone', o.user?.phone], ['Email', o.user?.email]]} /></CardB></Card>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card>
                        <CardH><h3>{t('Order & Shipping Info')}</h3></CardH>
                        <CardB style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="sa-field"><label htmlFor="ost">{t('Change Order Status')}</label>
                                {isAdmin ? <select id="ost" className="input" disabled={saving} value={o.status} onChange={(e) => change({ status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select> : <div><Pill value={o.status} /></div>}</div>
                            <div className="row between"><span>{t('Payment Status')}</span><span className="row">{paid ? t('Paid') : t('Pending')}<Switch label={t('Toggle payment status')} checked={paid} disabled={!isAdmin || saving} onChange={() => change({ payment_status: paid ? 'unpaid' : 'paid' })} /></span></div>
                            <div className="row between"><span>{t('Assign Rider')}</span>
                                {o.rider ? <span className="row"><b>{o.rider.name}</b>{isAdmin && <button className="btn sm" onClick={() => setAssign(true)}>{t('Change')}</button>}</span>
                                    : <button className="btn sm" disabled={!isAdmin} onClick={() => setAssign(true)}><SaIcon name="truck" /> {t('Assign')}</button>}</div>
                        </CardB>
                    </Card>
                    <Card><CardH><h3>{t('Shipping Address')}</h3></CardH><CardB><Kv rows={[['Name', o.address_name], ['Phone', o.address_phone], ['Address Type', o.address_type], ['Area', o.area], ['Address Line', o.shipping_address]]} /></CardB></Card>
                </div>
            </div>
            {assign && <AssignRider order={o} onClose={() => setAssign(false)} />}
        </>
    );
}

// Printable invoice / payment slip. "Download" = browser print → Save as PDF.
export function OrderDocument({ kind }) {
    const { id } = useParams();
    const { data: o, isLoading, isError } = useGetOrderQuery(id);
    const { data: master } = useGetMasterQuery();
    const brand = master?.data;
    if (isError) return <Card><div className="empty">{t('Order not found.')}</div></Card>;
    if (isLoading || !o) return <Card><div className="empty">{t('Loading…')}</div></Card>;
    const slip = kind === 'slip';
    return (
        <div className="mx-auto max-w-[820px]">
            <div className="mb-4 flex justify-between print:hidden"><Link to={`/admin/orders/${o.id}/show`} className="btn">{t('← Back')}</Link><button onClick={() => window.print()} className="btn primary"><SaIcon name="download" />{slip ? t('Print / Save Slip') : t('Print / Save PDF')}</button></div>
            <article className="card" style={{ padding: 32, background: '#fff', color: '#1f2330' }}>
                <header className="flex items-start justify-between border-b border-line pb-5"><img src={brand?.web_logo || '/assets/logo.png'} alt={brand?.company_name || brand?.app_name || t('ReadyEcommerce')} className="h-12 max-w-[180px] object-contain" /><div className="text-end text-sm"><h1 className="text-2xl font-bold uppercase tracking-wide">{slip ? t('Payment Slip') : t('Invoice')}</h1><p>{brand?.company_name || brand?.app_name}</p><p>#{o.number}</p><p className="text-muted">{fdate(o.created_at)}</p></div></header>
                <section className="grid gap-6 py-5 text-sm sm:grid-cols-2">
                    <div><h2 className="mb-1 font-semibold">{t('Billed to')}</h2><p>{o.user?.name}</p><p className="text-muted">{o.user?.phone}</p><p className="text-muted">{o.user?.email}</p></div>
                    <div><h2 className="mb-1 font-semibold">{t('Ship to')}</h2><p>{o.address_name}</p><p className="text-muted">{o.shipping_address}{o.area ? `, ${o.area}` : ''}</p><p className="text-muted">{o.address_phone}</p></div>
                </section>
                <div className="mb-4 flex flex-wrap gap-x-8 gap-y-1 rounded-lg bg-surface p-3 text-sm"><span>{t('Payment:')} <b>{o.payment_method}</b></span><span>{t('Payment status:')} <b>{o.payment_status === 'paid' ? t('Paid') : t('Pending')}</b></span><span>{t('Order status:')} <b>{label(o.status)}</b></span>{o.shop && <span>{t('Shop:')} <b>{o.shop.name}</b></span>}</div>
                {!slip && <table className="w-full text-start text-sm"><thead><tr className="border-b border-line text-xs uppercase text-muted">{['#', 'Item', 'Qty', 'Price', 'Total'].map((h) => <th key={h} className="py-2">{t(h)}</th>)}</tr></thead>
                    <tbody>{o.items.map((i, n) => <tr key={i.id} className="border-b border-line"><td className="py-2">{n + 1}</td><td>{i.name}{(i.size || i.color) && <span className="text-xs text-muted"> ({[i.size, i.color].filter(Boolean).join(', ')})</span>}</td><td>{i.qty}</td><td>{money(i.price)}</td><td>{money(i.price * i.qty)}</td></tr>)}</tbody></table>}
                <dl className="ms-auto mt-4 w-full max-w-[300px] space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt>{t('Sub Total')}</dt><dd>{money(o.subtotal)}</dd></div><div className="flex justify-between"><dt>{t('Coupon Discount')}</dt><dd>- {money(o.coupon_discount)}</dd></div>
                    <div className="flex justify-between"><dt>{t('Delivery Charge')}</dt><dd>{money(o.shipping)}</dd></div><div className="flex justify-between"><dt>{t('VAT & Tax')}</dt><dd>{money(o.vat_tax)}</dd></div>
                    <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>{slip ? t('Amount') : t('Grand Total')}</dt><dd>{money(o.total)}</dd></div></dl>
                <footer className="mt-8 border-t border-line pt-4 text-center text-xs text-muted">{t('Thank you for shopping with {name}.', { name: brand?.company_name || brand?.app_name || t('ReadyEcommerce') })}</footer>
            </article>
        </div>
    );
}
