import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useGetOrderQuery, useGetRidersQuery, useUpdateOrderMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Card, CardB, CardH, fdate, fdt, Modal, money, PageHead, Pill, SaIcon, Switch, Thumb } from '../../components/sa';
import { STATUSES, label } from './Orders';

const Kv = ({ rows }) => <dl className="kv">{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v ?? '--'}</dd></React.Fragment>)}</dl>;

function AssignRider({ order, onClose }) {
    const { data: riders, isLoading } = useGetRidersQuery();
    const [update, { isLoading: saving }] = useUpdateOrderMutation();
    const [pick, setPick] = useState(order.rider_id ?? null);
    const dispatch = useDispatch();
    const go = async () => {
        const r = await update({ id: order.id, status: order.status, rider_id: pick });
        dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast('Rider assigned'));
        if (!r.error) onClose();
    };
    return (
        <Modal title="Select a rider" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Close</button><button className="btn primary" disabled={saving || !pick} onClick={go}>{saving ? 'Assigning…' : 'Assign Now'}</button></>}>
            {isLoading ? <div className="empty">Loading…</div> : (
                <div className="rank">{riders.map((r) => (
                    <label key={r.id} className="rank-row" style={{ cursor: 'pointer', borderColor: pick === r.id ? 'var(--primary)' : undefined }}>
                        <input type="radio" name="rider" checked={pick === r.id} onChange={() => setPick(r.id)} />
                        <div className="grow"><div>{r.name}</div><small>Incomplete Orders: {r.incomplete_orders}</small></div></label>))}</div>)}
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
    if (isError) return <Card><div className="empty">Order not found. It may have been removed, or it belongs to another shop.</div></Card>;
    if (isLoading || !o) return <Card><div className="empty">Loading…</div></Card>;

    const change = async (body) => {
        const r = await update({ id: o.id, status: o.status, ...body });
        dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast('Order updated'));
    };
    const paid = o.payment_status === 'paid';

    return (
        <>
            <PageHead title={`Order ${o.number}`}>
                <Link className="btn" to="/admin/orders">Back to list</Link>
                <Link className="btn" to={`/admin/orders/${o.id}/slip`}><SaIcon name="file" /> Payment Slip</Link>
                <Link className="btn primary" to={`/admin/orders/${o.id}/invoice`}><SaIcon name="download" /> Download Invoice</Link>
            </PageHead>
            <div className="sa-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card>
                        <CardH><h3>Order Details</h3></CardH>
                        <CardB><Kv rows={[['Order ID', `#${o.number}`], ['Order Status', <Pill value={o.status} />], ['Payment Status', <Pill value={paid ? 'paid' : 'pending'} />], ['Payment Method', o.payment_method], ['Order Date', fdt(o.created_at)], ['Delivery Date', o.delivered_at ? fdate(o.delivered_at) : '--']]} /></CardB>
                        <div className="table-wrap"><table>
                            <thead><tr><th>SL</th><th>Product</th><th>Shop</th><th>Quantity</th><th>Size</th><th>Color</th><th>Price</th><th>Total</th></tr></thead>
                            <tbody>{o.items.map((i, n) => <tr key={i.id}><td>{n + 1}</td><td><div className="row"><Thumb src={i.product?.image_url} name={i.name} id={i.product_id ?? i.id} />{i.name}</div></td><td>{o.shop?.name}</td><td>{i.qty}</td><td>{i.size ?? '--'}</td><td>{i.color ?? '--'}</td><td>{money(i.price)}</td><td>{money(i.price * i.qty)}</td></tr>)}</tbody>
                        </table></div>
                        <CardB><div className="totals" style={{ maxWidth: 340, marginLeft: 'auto' }}>
                            <div><span>Sub Total</span><span>{money(o.subtotal)}</span></div><div><span>Coupon Discount</span><span>{money(o.coupon_discount)}</span></div>
                            <div><span>Delivery Charge</span><span>{money(o.shipping)}</span></div><div><span>VAT &amp; Tax</span><span>{money(o.vat_tax)}</span></div>
                            <div className="grand"><span>Grand Total</span><span>{money(o.total)}</span></div></div></CardB>
                    </Card>
                    <Card><CardH><h3>Customer Info</h3></CardH><CardB><Kv rows={[['Name', o.user?.name], ['Phone', o.user?.phone], ['Email', o.user?.email]]} /></CardB></Card>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card>
                        <CardH><h3>Order &amp; Shipping Info</h3></CardH>
                        <CardB style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="sa-field"><label htmlFor="ost">Change Order Status</label>
                                {isAdmin ? <select id="ost" className="input" disabled={saving} value={o.status} onChange={(e) => change({ status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select> : <div><Pill value={o.status} /></div>}</div>
                            <div className="row between"><span>Payment Status</span><span className="row">{paid ? 'Paid' : 'Pending'}<Switch label="Toggle payment status" checked={paid} disabled={!isAdmin || saving} onChange={() => change({ payment_status: paid ? 'unpaid' : 'paid' })} /></span></div>
                            <div className="row between"><span>Assign Rider</span>
                                {o.rider ? <span className="row"><b>{o.rider.name}</b>{isAdmin && <button className="btn sm" onClick={() => setAssign(true)}>Change</button>}</span>
                                    : <button className="btn sm" disabled={!isAdmin} onClick={() => setAssign(true)}><SaIcon name="truck" /> Assign</button>}</div>
                        </CardB>
                    </Card>
                    <Card><CardH><h3>Shipping Address</h3></CardH><CardB><Kv rows={[['Name', o.address_name], ['Phone', o.address_phone], ['Address Type', o.address_type], ['Area', o.area], ['Address Line', o.shipping_address]]} /></CardB></Card>
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
    if (isError) return <Card><div className="empty">Order not found.</div></Card>;
    if (isLoading || !o) return <Card><div className="empty">Loading…</div></Card>;
    const slip = kind === 'slip';
    return (
        <div className="mx-auto max-w-[820px]">
            <div className="mb-4 flex justify-between print:hidden"><Link to={`/admin/orders/${o.id}/show`} className="btn">← Back</Link><button onClick={() => window.print()} className="btn primary"><SaIcon name="download" />{slip ? 'Print / Save Slip' : 'Print / Save PDF'}</button></div>
            <article className="card" style={{ padding: 32, background: '#fff', color: '#1f2330' }}>
                <header className="flex items-start justify-between border-b border-line pb-5"><img src="/assets/logo.png" alt="ReadyEcommerce" className="h-12" /><div className="text-right text-sm"><h1 className="text-2xl font-bold uppercase tracking-wide">{slip ? 'Payment Slip' : 'Invoice'}</h1><p>#{o.number}</p><p className="text-muted">{fdate(o.created_at)}</p></div></header>
                <section className="grid gap-6 py-5 text-sm sm:grid-cols-2">
                    <div><h2 className="mb-1 font-semibold">Billed to</h2><p>{o.user?.name}</p><p className="text-muted">{o.user?.phone}</p><p className="text-muted">{o.user?.email}</p></div>
                    <div><h2 className="mb-1 font-semibold">Ship to</h2><p>{o.address_name}</p><p className="text-muted">{o.shipping_address}{o.area ? `, ${o.area}` : ''}</p><p className="text-muted">{o.address_phone}</p></div>
                </section>
                <div className="mb-4 flex flex-wrap gap-x-8 gap-y-1 rounded-lg bg-surface p-3 text-sm"><span>Payment: <b>{o.payment_method}</b></span><span>Payment status: <b>{o.payment_status === 'paid' ? 'Paid' : 'Pending'}</b></span><span>Order status: <b>{label(o.status)}</b></span>{o.shop && <span>Shop: <b>{o.shop.name}</b></span>}</div>
                {!slip && <table className="w-full text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase text-muted">{['#', 'Item', 'Qty', 'Price', 'Total'].map((h) => <th key={h} className="py-2">{h}</th>)}</tr></thead>
                    <tbody>{o.items.map((i, n) => <tr key={i.id} className="border-b border-line"><td className="py-2">{n + 1}</td><td>{i.name}{(i.size || i.color) && <span className="text-xs text-muted"> ({[i.size, i.color].filter(Boolean).join(', ')})</span>}</td><td>{i.qty}</td><td>{money(i.price)}</td><td>{money(i.price * i.qty)}</td></tr>)}</tbody></table>}
                <dl className="ml-auto mt-4 w-full max-w-[300px] space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt>Sub Total</dt><dd>{money(o.subtotal)}</dd></div><div className="flex justify-between"><dt>Coupon Discount</dt><dd>- {money(o.coupon_discount)}</dd></div>
                    <div className="flex justify-between"><dt>Delivery Charge</dt><dd>{money(o.shipping)}</dd></div><div className="flex justify-between"><dt>VAT &amp; Tax</dt><dd>{money(o.vat_tax)}</dd></div>
                    <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>{slip ? 'Amount' : 'Grand Total'}</dt><dd>{money(o.total)}</dd></div></dl>
                <footer className="mt-8 border-t border-line pt-4 text-center text-xs text-muted">Thank you for shopping with ReadyEcommerce.</footer>
            </article>
        </div>
    );
}
