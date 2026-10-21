import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useGetOrderQuery, useGetRidersQuery, useUpdateOrderMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Empty, Icon, Img, Modal, money } from '../../components/ui';
import { Badge, STATUSES, label } from './Orders';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-');
const Row = ({ k, v }) => <div className="flex items-center justify-between border-t border-[#f4f4f4] px-4 py-3 text-[14px] first:border-0"><span className="text-[#556070]">{k}:</span><span className="text-right font-medium">{v ?? '-'}</span></div>;
const Card = ({ title, children, className = '' }) => <section className={`card mb-4 rounded-xl !border-[#f4f4f4] ${className}`}>{title && <h3 className="border-b border-[#f4f4f4] px-4 py-3 text-[16px] font-semibold text-[#334155]">{title}</h3>}{children}</section>;

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
        <Modal title="Select a rider" onClose={onClose}>
            {isLoading ? <div className="skeleton h-24" /> : (
                <div className="space-y-2">{riders.map((r) => (
                    <label key={r.id} className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm ${pick === r.id ? 'border-primary bg-primary-soft' : 'border-line'}`}>
                        <span className="flex items-center gap-3"><input type="radio" name="rider" checked={pick === r.id} onChange={() => setPick(r.id)} className="accent-primary" /><b>{r.name}</b></span>
                        <span className="text-xs text-muted">Incomplete Orders: {r.incomplete_orders}</span></label>))}</div>)}
            <div className="mt-4 flex justify-end gap-2"><button className="btn-outline" onClick={onClose}>Close</button><button disabled={saving || !pick} onClick={go} className="btn-primary">{saving ? 'Assigning…' : 'Assign Now'}</button></div>
        </Modal>
    );
}

export function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const isAdmin = useSelector((s) => s.auth.user?.role === 'admin');
    const { data: o, isLoading, isError } = useGetOrderQuery(id);
    const [update, { isLoading: saving }] = useUpdateOrderMutation();
    const [assign, setAssign] = useState(false);
    if (isError) return <Empty title="Order not found" hint="It may have been removed, or it belongs to another shop." />;
    if (isLoading || !o) return <div className="skeleton h-96" />;

    const change = async (body) => {
        const r = await update({ id: o.id, status: o.status, ...body });
        dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast('Order updated'));
    };
    const paid = o.payment_status === 'paid';

    return (
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <div>
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f4f4f4] p-4">
                        <h2 className="text-[26px] font-semibold text-[#1f2937]">Order Details</h2>
                        <div className="flex flex-wrap gap-2">
                            <button disabled title="Barcode attachment is not built yet" className="rounded-lg bg-[#22b2e6] px-4 py-2.5 text-[15px] text-white opacity-60">Attach Product Barcode</button>
                            <Link to={`/admin/orders/${o.id}/slip`} className="flex items-center gap-2 rounded-lg bg-[#16874f] px-4 py-2.5 text-[15px] text-white"><Icon name="doc" size={15} />Payment Slip</Link>
                            <Link to={`/admin/orders/${o.id}/invoice`} className="flex items-center gap-2 rounded-lg bg-[#f43f6a] px-4 py-2.5 text-[15px] text-white"><Icon name="doc" size={15} />Download Invoice</Link>
                        </div>
                    </div>
                    <div className="grid gap-x-8 p-4 text-[14px] md:grid-cols-2">
                        <div className="space-y-2"><div className="flex justify-between"><span className="text-[#556070]">Order Id:</span><b>#{o.number}</b></div><div className="flex justify-between"><span className="text-[#556070]">Payment Status:</span><b className="capitalize">{paid ? 'Paid' : 'Pending'}</b></div><div className="flex justify-between"><span className="text-[#556070]">Payment Method:</span><b>{o.payment_method}</b></div></div>
                        <div className="space-y-2"><div className="flex justify-between"><span className="text-[#556070]">Order Status:</span><b>{label(o.status)}</b></div><div className="flex justify-between"><span className="text-[#556070]">Order Date:</span><b>{fmtDate(o.created_at)}</b></div><div className="flex justify-between"><span className="text-[#556070]">Delivery Date:</span><b>{fmtDate(o.delivered_at)}</b></div></div>
                    </div>
                    <div className="overflow-x-auto px-4 pb-2"><table className="w-full min-w-[640px] text-left text-sm">
                        <thead><tr className="bg-[#f6f7f9] text-[13px]">{['SL', 'Product', 'Shop', 'Quantity', 'Size', 'Color', 'Price', 'Total'].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
                        <tbody>{o.items.map((i, n) => (
                            <tr key={i.id} className="border-b border-[#f4f4f4]"><td className="px-3 py-3">{n + 1}</td>
                                <td className="px-3"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center overflow-hidden rounded bg-[#f1f2f4] text-gray-400"><Img src={i.product?.image_url} alt="" className="h-full w-full object-cover" fallback={<Icon name="box" size={14} />} /></span>{i.name}</span></td>
                                <td className="px-3">{o.shop?.name}</td><td className="px-3">{i.qty}</td><td className="px-3">{i.size ?? '-'}</td><td className="px-3">{i.color ?? '-'}</td><td className="px-3">{money(i.price)}</td><td className="px-3">{money(i.price * i.qty)}</td></tr>))}</tbody></table></div>
                    <dl className="ml-auto w-full max-w-[330px] space-y-1.5 p-4 text-[14px]">
                        <div className="flex justify-between"><dt>Sub Total</dt><dd>{money(o.subtotal)}</dd></div><div className="flex justify-between"><dt>Coupon Discount</dt><dd>{money(o.coupon_discount)}</dd></div>
                        <div className="flex justify-between"><dt>Delivery Charge</dt><dd>{money(o.shipping)}</dd></div><div className="flex justify-between"><dt>VAT &amp; Tax</dt><dd>{money(o.vat_tax)}</dd></div>
                        <div className="flex justify-between border-t border-[#f4f4f4] pt-2 font-semibold"><dt>Grand Total</dt><dd>{money(o.total)}</dd></div></dl>
                </Card>
                <Card title="Customer Info"><Row k="Name" v={o.user?.name} /><Row k="Phone" v={o.user?.phone} /><Row k="Email" v={o.user?.email} /></Card>
            </div>
            <div>
                <Card title="Order & Shipping Info">
                    <div className="flex items-center justify-between px-4 py-3 text-[14px]"><span className="text-[#556070]">Change Order Status</span>
                        {isAdmin ? <select disabled={saving} value={o.status} onChange={(e) => change({ status: e.target.value })} className="rounded-md border border-line px-3 py-1.5 text-sm">{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select> : <Badge v={o.status} />}</div>
                    <div className="flex items-center justify-between border-t border-[#f4f4f4] px-4 py-3 text-[14px]"><span className="text-[#556070]">Payment Status</span>
                        <span className="flex items-center gap-2">{paid ? 'Paid' : 'Pending'}<button role="switch" aria-checked={paid} aria-label="Toggle payment status" disabled={!isAdmin || saving} onClick={() => change({ payment_status: paid ? 'unpaid' : 'paid' })} className={`relative h-6 w-11 rounded-full transition ${paid ? 'bg-primary' : 'bg-gray-300'} disabled:opacity-60`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${paid ? 'left-[22px]' : 'left-0.5'}`} /></button></span></div>
                    <div className="flex items-center justify-between border-t border-[#f4f4f4] px-4 py-3 text-[14px]"><span className="text-[#556070]">Assign Rider</span>
                        {o.rider ? <span className="text-right text-sm"><b>{o.rider.name}</b>{isAdmin && <button onClick={() => setAssign(true)} className="ml-2 text-xs text-primary underline">Change</button>}</span> : <button disabled={!isAdmin} onClick={() => setAssign(true)} className="btn-outline !rounded-lg !px-4"><Icon name="truck" size={15} />Assign</button>}</div>
                </Card>
                <Card title="Shipping Address"><Row k="Name" v={o.address_name} /><Row k="Phone" v={o.address_phone} /><Row k="Address Type" v={o.address_type} /><Row k="Area" v={o.area} /><Row k="Address Line" v={o.shipping_address} /></Card>
                <button onClick={() => navigate('/admin/orders')} className="btn-outline !rounded-lg">← Back to orders</button>
            </div>
            {assign && <AssignRider order={o} onClose={() => setAssign(false)} />}
        </div>
    );
}

// Printable invoice / payment slip. "Download" = browser print → Save as PDF.
export function OrderDocument({ kind }) {
    const { id } = useParams();
    const { data: o, isLoading, isError } = useGetOrderQuery(id);
    if (isError) return <Empty title="Order not found" />;
    if (isLoading || !o) return <div className="skeleton h-96" />;
    const slip = kind === 'slip';
    return (
        <div className="mx-auto max-w-[820px]">
            <div className="mb-4 flex justify-between print:hidden"><Link to={`/admin/orders/${o.id}/show`} className="btn-outline !rounded-lg">← Back</Link><button onClick={() => window.print()} className="btn-primary !rounded-lg !bg-[#f43f6a]"><Icon name="doc" size={15} />{slip ? 'Print / Save Slip' : 'Print / Save PDF'}</button></div>
            <article className="rounded-xl bg-white p-8 shadow-sm print:rounded-none print:p-0 print:shadow-none">
                <header className="flex items-start justify-between border-b border-line pb-5"><img src="/assets/logo.png" alt="ReadyEcommerce" className="h-12" /><div className="text-right text-sm"><h1 className="text-2xl font-bold uppercase tracking-wide">{slip ? 'Payment Slip' : 'Invoice'}</h1><p>#{o.number}</p><p className="text-muted">{fmtDate(o.created_at)}</p></div></header>
                <section className="grid gap-6 py-5 text-sm sm:grid-cols-2">
                    <div><h2 className="mb-1 font-semibold">Billed to</h2><p>{o.user?.name}</p><p className="text-muted">{o.user?.phone}</p><p className="text-muted">{o.user?.email}</p></div>
                    <div><h2 className="mb-1 font-semibold">Ship to</h2><p>{o.address_name}</p><p className="text-muted">{o.shipping_address}{o.area ? `, ${o.area}` : ''}</p><p className="text-muted">{o.address_phone}</p></div>
                </section>
                <div className="mb-4 flex flex-wrap gap-x-8 gap-y-1 rounded-lg bg-[#f6f7f9] p-3 text-sm"><span>Payment: <b>{o.payment_method}</b></span><span>Payment status: <b>{o.payment_status === 'paid' ? 'Paid' : 'Pending'}</b></span><span>Order status: <b>{label(o.status)}</b></span>{o.shop && <span>Shop: <b>{o.shop.name}</b></span>}</div>
                {!slip && <table className="w-full text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase text-muted">{['#', 'Item', 'Qty', 'Price', 'Total'].map((h) => <th key={h} className="py-2">{h}</th>)}</tr></thead>
                    <tbody>{o.items.map((i, n) => <tr key={i.id} className="border-b border-[#f4f4f4]"><td className="py-2">{n + 1}</td><td>{i.name}{(i.size || i.color) && <span className="text-xs text-muted"> ({[i.size, i.color].filter(Boolean).join(', ')})</span>}</td><td>{i.qty}</td><td>{money(i.price)}</td><td>{money(i.price * i.qty)}</td></tr>)}</tbody></table>}
                <dl className="ml-auto mt-4 w-full max-w-[300px] space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt>Sub Total</dt><dd>{money(o.subtotal)}</dd></div><div className="flex justify-between"><dt>Coupon Discount</dt><dd>- {money(o.coupon_discount)}</dd></div>
                    <div className="flex justify-between"><dt>Delivery Charge</dt><dd>{money(o.shipping)}</dd></div><div className="flex justify-between"><dt>VAT &amp; Tax</dt><dd>{money(o.vat_tax)}</dd></div>
                    <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>{slip ? 'Amount' : 'Grand Total'}</dt><dd>{money(o.total)}</dd></div></dl>
                <footer className="mt-8 border-t border-line pt-4 text-center text-xs text-muted">Thank you for shopping with ReadyEcommerce.</footer>
            </article>
        </div>
    );
}
