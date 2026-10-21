import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    errorMessage, useAdminListQuery, useGetOptionsQuery, usePosAddCustomerMutation, usePosCheckoutMutation, usePosCustomersQuery,
    usePosDeleteDraftMutation, usePosDraftsQuery, usePosProductsQuery, usePosQuoteMutation, usePosSalesQuery, usePosSaveDraftMutation,
} from '../../app/api';
import { pushToast } from '../../app/slices';
import { Field, TextInput } from '../../components/FormKit';
import { Empty, Icon, Img, Modal, Pagination, money } from '../../components/ui';
import { Badge } from './Orders';

const DRAFT_KEY = 'pos_resume';

export function Pos() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ brand_id: '', category_id: '', search: '', page: 1 });
    const [q, setQ] = useState('');
    const [cart, setCart] = useState([]); // [{ product, qty }]
    const [customer, setCustomer] = useState('');
    const [custSearch, setCustSearch] = useState('');
    const [coupon, setCoupon] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const [quote, setQuote] = useState({ subtotal: 0, discount: 0, total: 0 });
    const [couponError, setCouponError] = useState(null);
    const [showCustomer, setShowCustomer] = useState(false);
    const [showPay, setShowPay] = useState(false);
    const [payment, setPayment] = useState('Cash Payment');
    const [draftId, setDraftId] = useState(null);

    const { data: opts } = useGetOptionsQuery();
    const { data: products, isFetching } = usePosProductsQuery(filters);
    const { data: customers } = usePosCustomersQuery(custSearch);
    const [getQuote] = usePosQuoteMutation();
    const [checkout, { isLoading: paying }] = usePosCheckoutMutation();
    const [saveDraft] = usePosSaveDraftMutation();

    const items = useMemo(() => cart.map((c) => ({ product_id: c.product.id, qty: c.qty })), [cart]);
    const body = useMemo(() => ({ items, customer_id: customer || null, coupon: appliedCoupon || null }), [items, customer, appliedCoupon]);

    // Resume a draft chosen on the Drafts page.
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            sessionStorage.removeItem(DRAFT_KEY);
            const d = JSON.parse(raw);
            setCart(d.cart); setCustomer(d.customer_id ?? ''); setDraftId(d.id); setAppliedCoupon(d.coupon ?? ''); setCoupon(d.coupon ?? '');
        } catch { /* ignore bad draft */ }
    }, []);

    // Totals always come from the server so prices cannot be tampered with in the browser.
    useEffect(() => {
        if (!items.length) { setQuote({ subtotal: 0, discount: 0, total: 0 }); return; }
        let live = true;
        getQuote(body).then((r) => {
            if (!live) return;
            if (r.error) {
                if (r.error.data?.errors?.coupon) { setCouponError(r.error.data.errors.coupon[0]); setAppliedCoupon(''); }
                return;
            }
            setCouponError(null); setQuote(r.data);
        });
        return () => { live = false; };
    }, [body, getQuote, items.length]);

    const add = (p) => {
        if (p.stock < 1) return dispatch(pushToast('Out of stock', 'error'));
        setCart((c) => {
            const row = c.find((x) => x.product.id === p.id);
            if (row) return c.map((x) => (x === row ? { ...x, qty: Math.min(x.qty + 1, p.stock) } : x));
            return [...c, { product: p, qty: 1 }];
        });
    };
    const setQty = (id, qty) => setCart((c) => c.map((x) => (x.product.id === id ? { ...x, qty: Math.max(1, Math.min(Number(qty) || 1, x.product.stock)) } : x)));
    const remove = (id) => setCart((c) => c.filter((x) => x.product.id !== id));
    const reset = () => { setCart([]); setCustomer(''); setCoupon(''); setAppliedCoupon(''); setDraftId(null); };

    const pay = async () => {
        const r = await checkout({ ...body, payment_method: payment, draft_id: draftId });
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(pushToast(`Order ${r.data.number} placed`));
        setShowPay(false); reset();
    };
    const draft = async () => {
        if (!items.length) return dispatch(pushToast('Add products first', 'error'));
        const r = await saveDraft(body);
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(pushToast('Saved as draft')); reset();
    };

    return (
        <div>
            <h2 className="mb-4 text-[22px] font-semibold">Point of Sale (POS)</h2>
            <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                <section className="card rounded-xl !border-[#f4f4f4] p-4">
                    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
                        <select className="field" value={filters.brand_id} onChange={(e) => setFilters({ ...filters, brand_id: e.target.value, page: 1 })}><option value="">Select Brand</option>{opts?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                        <select className="field" value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}><option value="">Select Category</option>{opts?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <form className="flex" onSubmit={(e) => { e.preventDefault(); setFilters({ ...filters, search: q, page: 1 }); }}><input className="field !rounded-r-none" placeholder="Search by product name" value={q} onChange={(e) => setQ(e.target.value)} /><button className="rounded-r-md border border-l-0 border-line px-3" aria-label="Search"><Icon name="search" size={16} /></button></form>
                    </div>
                    <div className={`grid gap-3 sm:grid-cols-2 ${isFetching ? 'opacity-60' : ''}`}>
                        {!products ? Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-24" />) : products.data.map((p) => (
                            <button key={p.id} onClick={() => add(p)} disabled={p.stock < 1} className="flex overflow-hidden rounded-lg border border-[#f0f0f0] text-left transition hover:border-primary disabled:opacity-50">
                                <span className="grid h-[100px] w-[100px] shrink-0 place-items-center bg-[#f1f2f4] text-gray-400"><Img src={p.image_url} alt={p.name} className="h-full w-full object-cover" fallback={<Icon name="box" size={28} />} /></span>
                                <span className="flex flex-1 flex-col justify-center px-3 text-xs">
                                    <b className="line-clamp-1 text-[13px] font-medium">{p.name}</b>
                                    <span className="my-0.5"><b className="text-xl text-blue-600">{money(p.price).replace('.00', '')}</b>{p.old_price > p.price && <s className="ml-2 text-[11px] text-gray-500">{money(p.old_price).replace('.00', '')}</s>}</span>
                                    <span className="flex justify-between text-[12px] text-[#556070]"><span>{p.sold} Sold</span><span>{p.stock > 0 ? `${p.stock} Left` : 'Out of stock'}</span></span>
                                </span>
                            </button>))}
                    </div>
                    {products?.data.length === 0 && <Empty title="No products found" />}
                    <Pagination meta={products} onPage={(page) => setFilters({ ...filters, page })} />
                </section>

                <section className="card h-fit rounded-xl !border-[#f4f4f4] p-4">
                    <div className="mb-4 flex gap-3">
                        <div className="flex-1"><input className="field mb-1" list="pos-customers" placeholder="Enter customer name or phone number" value={custSearch} onChange={(e) => { setCustSearch(e.target.value); const m = customers?.find((c) => `${c.name} (${c.phone ?? ''})` === e.target.value); setCustomer(m ? String(m.id) : ''); }} />
                            <datalist id="pos-customers">{customers?.map((c) => <option key={c.id} value={`${c.name} (${c.phone ?? ''})`} />)}</datalist>
                            {customer ? <p className="text-xs text-emerald-600">Customer selected</p> : <p className="text-xs text-muted">Walk-in customer if none selected</p>}</div>
                        <button onClick={() => setShowCustomer(true)} className="btn-outline !rounded-lg !px-4"><Icon name="plus" size={15} /> Customer</button>
                    </div>
                    <div className="min-h-[220px] space-y-2 rounded-lg bg-[#f4f4f4] p-3">
                        {cart.length === 0 && <p className="py-16 text-center text-sm text-muted">Cart is empty. Click a product to add it.</p>}
                        {cart.map(({ product: p, qty }) => (
                            <div key={p.id} className="flex items-center gap-3 rounded-lg bg-white p-3">
                                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded bg-[#f1f2f4] text-gray-400"><Img src={p.image_url} alt="" className="h-full w-full object-cover" fallback={<Icon name="box" size={20} />} /></span>
                                <div className="flex-1 text-sm"><b className="line-clamp-1">{p.name}</b><span className="text-blue-600">{money(p.price)}</span></div>
                                <input type="number" min="1" max={p.stock} aria-label={`Quantity for ${p.name}`} value={qty} onChange={(e) => setQty(p.id, e.target.value)} className="w-16 rounded border border-line px-2 py-1 text-center text-sm" />
                                <button onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`} className="text-red-500"><Icon name="trash" size={16} /></button>
                            </div>))}
                    </div>
                    <dl className="mt-4 space-y-1 text-[15px]"><div className="flex justify-between"><dt>Sub Total</dt><dd>{money(quote.subtotal)}</dd></div><div className="flex justify-between"><dt>Discount Amount</dt><dd className="text-red-500">- {money(quote.discount)}</dd></div></dl>
                    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); setAppliedCoupon(coupon.trim()); setCouponError(null); }}><input className="field" placeholder="Add Coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} /><button className="btn-primary !rounded-md !bg-[#f43f6a] !px-6">Apply</button></form>
                    {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
                    <div className="mt-4 flex gap-3"><button onClick={draft} className="rounded-lg bg-[#fdecb6] px-6 py-3 font-medium text-amber-700">Draft</button>
                        <button disabled={!items.length} onClick={() => setShowPay(true)} className="btn-primary flex-1 !rounded-lg !bg-[#f43f6a] !py-3 text-[15px]">Grand Total {money(quote.total).replace('.00', '')} →</button></div>
                </section>
            </div>

            {showCustomer && <AddCustomer onClose={() => setShowCustomer(false)} onAdded={(c) => { setCustomer(String(c.id)); setCustSearch(`${c.name} (${c.phone})`); }} />}
            {showPay && (
                <Modal title="Confirm payment" onClose={() => setShowPay(false)}>
                    <p className="mb-3 text-sm">Total to collect: <b className="text-lg">{money(quote.total)}</b></p>
                    <Field label="Payment method"><select className="field" value={payment} onChange={(e) => setPayment(e.target.value)}>{['Cash Payment', 'Card', 'Bkash'].map((m) => <option key={m}>{m}</option>)}</select></Field>
                    <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setShowPay(false)}>Close</button><button disabled={paying} onClick={pay} className="btn-primary">{paying ? 'Processing…' : 'Confirm'}</button></div>
                </Modal>)}
            {draftId && <p className="mt-2 text-xs text-muted">Resuming draft #{draftId}. <button className="text-primary underline" onClick={() => navigate(0)}>Discard</button></p>}
        </div>
    );
}

function AddCustomer({ onClose, onAdded }) {
    const [f, setF] = useState({ first_name: '', last_name: '', phone: '', gender: 'male', email: '' });
    const [add, { isLoading, error }] = usePosAddCustomerMutation();
    const dispatch = useDispatch();
    const errs = error?.data?.errors ?? {};
    const submit = async (e) => {
        e.preventDefault();
        const r = await add(f);
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(pushToast('Customer added')); onAdded(r.data); onClose();
    };
    const set = (k) => (v) => setF({ ...f, [k]: v });
    return (
        <Modal title="Add Customer" onClose={onClose}>
            <form onSubmit={submit}>
                <div className="grid gap-x-4 sm:grid-cols-2"><Field label="First Name" required error={errs.first_name?.[0]}><TextInput value={f.first_name} onChange={set('first_name')} placeholder="First Name" /></Field><Field label="Last Name"><TextInput value={f.last_name} onChange={set('last_name')} placeholder="Enter Name" /></Field></div>
                <Field label="Phone Number" required error={errs.phone?.[0]}><TextInput value={f.phone} onChange={set('phone')} placeholder="Enter phone number" /></Field>
                <Field label="Gender"><select className="field" value={f.gender} onChange={(e) => set('gender')(e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></Field>
                <Field label="Email" required error={errs.email?.[0]}><TextInput type="email" value={f.email} onChange={set('email')} placeholder="Enter Email Address" /></Field>
                <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>Close</button><button disabled={isLoading} className="btn-primary">{isLoading ? 'Saving…' : 'Confirm'}</button></div>
            </form>
        </Modal>
    );
}

export function PosSales() {
    const [page, setPage] = useState(1);
    const { data, isFetching, isError } = usePosSalesQuery(page);
    return (
        <div><h2 className="mb-4 text-[22px] font-semibold">POS Sales</h2>
            <div className="card overflow-x-auto rounded-xl !border-[#f4f4f4] p-4"><p className="mb-3 text-sm">Orders Summary</p><table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="bg-[#f6f7f9] text-[13px]">{['Order ID', 'Order Date', 'Customer', 'Total Amount', 'Payment Method', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody className={isFetching ? 'opacity-50' : ''}>{data?.data.map((o) => <tr key={o.id} className="border-b border-[#f4f4f4]"><td className="px-4 py-3">{o.number}</td><td className="px-4">{new Date(o.created_at).toLocaleString()}</td><td className="px-4">{o.user?.name}</td><td className="px-4 font-medium">{money(o.total)}</td><td className="px-4">{o.payment_method}</td><td className="px-4"><Badge v={o.status} /></td></tr>)}</tbody></table>
                {data?.data.length === 0 && <Empty title="No POS sales yet" hint="Completed POS orders appear here." />}{isError && <Empty title="Could not load sales" />}{!data && !isError && <div className="skeleton h-24" />}</div>
            <Pagination meta={data} onPage={setPage} /></div>
    );
}

export function PosDrafts() {
    const [page, setPage] = useState(1);
    const { data, isFetching, isError } = usePosDraftsQuery(page);
    const [del] = usePosDeleteDraftMutation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const resume = (d) => {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ cart: d.lines, customer_id: d.customer_id, id: d.id, coupon: d.coupon }));
        navigate('/admin/pos');
    };
    return (
        <div><h2 className="mb-4 text-[22px] font-semibold">POS Draft</h2>
            <div className="card overflow-x-auto rounded-xl !border-[#f4f4f4] p-4"><table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="bg-[#f6f7f9] text-[13px]">{['SL', 'Created Date', 'Customer', 'Total Products', 'Sub Total', 'Discount', 'Total', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody className={isFetching ? 'opacity-50' : ''}>{data?.data.map((d, i) => <tr key={d.id} className="border-b border-[#f4f4f4]"><td className="px-4 py-3">{(data.current_page - 1) * data.per_page + i + 1}</td><td className="px-4">{new Date(d.created_at).toLocaleString()}</td><td className="px-4">{d.customer?.name ?? 'Walk-in'}</td><td className="px-4">{d.items.length}</td><td className="px-4">{money(d.subtotal)}</td><td className="px-4">{money(d.discount)}</td><td className="px-4 font-medium">{money(d.total)}</td>
                    <td className="px-4"><button onClick={() => resume(d)} className="mr-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs text-primary">Resume</button>
                        <button aria-label="Delete draft" onClick={async () => { if (window.confirm('Delete this draft?')) { const r = await del(d.id); dispatch(pushToast(r.error ? errorMessage(r.error) : 'Draft deleted', r.error ? 'error' : 'success')); } }} className="text-red-500"><Icon name="trash" size={16} /></button></td></tr>)}</tbody></table>
                {data?.data.length === 0 && <Empty title="No drafts" hint="Use the Draft button in POS to save a cart for later." />}{isError && <Empty title="Could not load drafts" />}{!data && !isError && <div className="skeleton h-24" />}</div>
            <Pagination meta={data} onPage={setPage} /></div>
    );
}
