import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { OrderPrint, PrintBar } from '../../components/OrderPrint';
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

// Printable invoice / payment slip, A4 or 80 mm POS receipt. "Download" = browser print → Save as PDF.
export function OrderDocument({ kind }) {
    const { id } = useParams();
    const [sp, setSp] = useSearchParams();
    const size = sp.get('size') === 'pos' ? 'pos' : 'a4';
    const { data: o, isLoading, isError } = useGetOrderQuery(id);
    const { data: master } = useGetMasterQuery();
    if (isError) return <Card><div className="empty">{t('Order not found.')}</div></Card>;
    if (isLoading || !o) return <Card><div className="empty">{t('Loading…')}</div></Card>;
    return (
        <div>
            <PrintBar size={size} kind={kind} onSize={(v) => setSp({ size: v }, { replace: true })} onBack={() => window.history.back()} backLabel={t('← Back')} />
            <OrderPrint o={o} brand={master?.data} size={size} kind={kind} money={money} />
        </div>
    );
}
