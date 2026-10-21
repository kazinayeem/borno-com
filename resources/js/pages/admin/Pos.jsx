import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    errorMessage, useAdminListQuery, useGetOptionsQuery, usePosAddCustomerMutation, usePosCheckoutMutation, usePosCustomersQuery,
    usePosDeleteDraftMutation, usePosDraftsQuery, usePosProductsQuery, usePosQuoteMutation, usePosSalesQuery, usePosSaveDraftMutation,
} from '../../app/api';
import { pushToast } from '../../app/slices';
import { ActBtn, Card, CardB, CardH, fdt, Modal, money, PageHead, Pager, Pill, SaIcon, Thumb } from '../../components/sa';

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

    const rows = products?.data ?? [];
    return (
        <>
            <PageHead title="POS">{draftId && <span className="muted">Resuming draft #{draftId} <button className="btn sm" onClick={() => navigate(0)}>Discard</button></span>}</PageHead>
            <div className="pos">
                <Card>
                    <CardH><form className="toolbar" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); setFilters({ ...filters, search: q, page: 1 }); }}>
                        <input className="input" aria-label="Search products" placeholder="Search product by name" style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} />
                        <select className="input" aria-label="Brand" value={filters.brand_id} onChange={(e) => setFilters({ ...filters, brand_id: e.target.value, page: 1 })}><option value="">All Brands</option>{opts?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                        <select className="input" aria-label="Category" value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}><option value="">All Categories</option>{opts?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    </form></CardH>
                    <CardB className="prod-grid" style={{ opacity: isFetching ? 0.6 : 1 }}>
                        {rows.map((p) => (
                            <button key={p.id} className="prod" disabled={p.stock < 1} onClick={() => add(p)} style={p.stock < 1 ? { opacity: 0.5 } : undefined}>
                                <img src={p.image_url || `/placeholder/${encodeURIComponent(p.name)}.svg?h=${(p.id * 37) % 360}`} alt="" loading="lazy" referrerPolicy="no-referrer" />
                                <div>{p.name}</div><b>{money(p.price)}</b> <small className="muted">{p.stock > 0 ? `${p.stock} left` : 'Out of stock'}</small>
                            </button>))}
                        {!products && <p className="muted">Loading…</p>}
                        {products && rows.length === 0 && <p className="muted">No products</p>}
                    </CardB>
                    <Pager meta={products} count={rows.length} onPage={(page) => setFilters({ ...filters, page })} />
                </Card>

                <Card>
                    <CardH><h3 style={{ flex: 1 }}>Cart</h3><button className="btn sm" onClick={() => setShowCustomer(true)}><SaIcon name="plus" /> Customer</button></CardH>
                    <CardB>
                        <div className="sa-field" style={{ marginBottom: 12 }}><label htmlFor="pos-cust">Customer</label>
                            <input id="pos-cust" className="input" list="pos-customers" placeholder="Enter customer name or phone number" value={custSearch} onChange={(e) => { setCustSearch(e.target.value); const m = customers?.find((c) => `${c.name} (${c.phone ?? ''})` === e.target.value); setCustomer(m ? String(m.id) : ''); }} />
                            <datalist id="pos-customers">{customers?.map((c) => <option key={c.id} value={`${c.name} (${c.phone ?? ''})`} />)}</datalist>
                            <small className="muted">{customer ? 'Customer selected' : 'Walk-in customer if none selected'}</small></div>
                        <div id="cart">
                            {cart.length === 0 && <p className="muted">Cart is empty — click a product to add it.</p>}
                            {cart.map(({ product: p, qty }) => (
                                <div key={p.id} className="cart-row">
                                    <span>{p.name}</span>
                                    <input className="input" type="number" min="1" max={p.stock} aria-label={`Quantity for ${p.name}`} value={qty} onChange={(e) => setQty(p.id, e.target.value)} />
                                    <span>{money(qty * p.price)}</span>
                                    <button className="act" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)}><SaIcon name="x" /></button>
                                </div>))}
                        </div>
                        <form className="row" style={{ margin: '12px 0' }} onSubmit={(e) => { e.preventDefault(); setAppliedCoupon(coupon.trim()); setCouponError(null); }}>
                            <input className="input" aria-label="Coupon code" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} /><button className="btn">Apply</button>
                        </form>
                        {couponError && <p className="err" style={{ margin: '0 0 8px', color: 'var(--danger)', fontSize: 12 }}>{couponError}</p>}
                        <div className="totals">
                            <div><span>Sub total</span><span>{money(quote.subtotal)}</span></div>
                            <div><span>Discount{appliedCoupon && quote.discount ? ` (${appliedCoupon})` : ''}</span><span>-{money(quote.discount)}</span></div>
                            <div className="grand"><span>Total</span><span>{money(quote.total)}</span></div>
                        </div>
                        <div className="sa-field" style={{ marginTop: 12 }}><label htmlFor="pos-pay">Payment Method</label>
                            <select id="pos-pay" className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>{['Cash Payment', 'Card', 'Bkash'].map((m) => <option key={m}>{m}</option>)}</select></div>
                        <div className="row" style={{ marginTop: 14 }}>
                            <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={draft}>Save Draft</button>
                            <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!items.length || paying} onClick={pay}>{paying ? 'Processing…' : 'Place Order'}</button>
                        </div>
                    </CardB>
                </Card>
            </div>
            {showCustomer && <AddCustomer onClose={() => setShowCustomer(false)} onAdded={(c) => { setCustomer(String(c.id)); setCustSearch(`${c.name} (${c.phone})`); }} />}
        </>
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
    const row = (k, label, props = {}) => <div className="sa-field"><label htmlFor={`pc_${k}`}>{label}{props.required && <> <span className="req">*</span></>}</label><input id={`pc_${k}`} className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /><span className="err">{errs[k]?.[0]}</span></div>;
    return (
        <Modal title="Add Customer" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button form="pos-cust-form" className="btn primary" disabled={isLoading}>{isLoading ? 'Saving…' : 'Save'}</button></>}>
            <form id="pos-cust-form" className="form-grid" onSubmit={submit}>
                {row('first_name', 'First Name', { required: true })}{row('last_name', 'Last Name')}{row('phone', 'Phone', { required: true })}{row('email', 'Email', { type: 'email', required: true })}
                <div className="sa-field"><label htmlFor="pc_gender">Gender</label><select id="pc_gender" className="input" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option></select></div>
            </form>
        </Modal>
    );
}

export function PosSales() {
    const [page, setPage] = useState(1);
    const { data, isFetching, isError } = usePosSalesQuery(page);
    const rows = data?.data ?? [];
    return (
        <>
            <PageHead title="POS Sales" />
            <Card>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>SL</th><th>Order ID</th><th>Order Date</th><th>Customer</th><th>Total Amount</th><th>Payment Method</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {rows.map((o, i) => <tr key={o.id}><td>{(data.current_page - 1) * data.per_page + i + 1}</td><td>{o.number}</td><td>{fdt(o.created_at)}</td><td>{o.user?.name}</td><td>{money(o.total)}</td><td>{o.payment_method}</td><td><Pill value={o.status} /></td><td><div className="actions"><a className="act" href={`/admin/orders/${o.id}/show`} title="View" aria-label="View"><SaIcon name="eye" /></a></div></td></tr>)}
                        {!data && !isError && <tr><td colSpan={8} className="empty">Loading…</td></tr>}
                        {isError && <tr><td colSpan={8} className="empty">Could not load sales.</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={8} className="empty">No Data Found</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
        </>
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
    const rows = data?.data ?? [];
    return (
        <>
            <PageHead title="POS Draft" />
            <Card>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>SL</th><th>Created Date</th><th>Customer</th><th>Total Products</th><th>Sub Total</th><th>Discount</th><th>Total</th><th>Action</th></tr></thead>
                    <tbody>
                        {rows.map((d, i) => (
                            <tr key={d.id}><td>{(data.current_page - 1) * data.per_page + i + 1}</td><td>{fdt(d.created_at)}</td><td>{d.customer?.name ?? 'Walk-in'}</td><td>{d.items.length}</td><td>{money(d.subtotal)}</td><td>{money(d.discount)}</td><td>{money(d.total)}</td>
                                <td><div className="actions"><button className="btn sm" onClick={() => resume(d)}>Resume</button>
                                    <ActBtn icon="trash" title="Delete draft" onClick={async () => { if (window.confirm('Delete this draft?')) { const r = await del(d.id); dispatch(pushToast(r.error ? errorMessage(r.error) : 'Draft deleted', r.error ? 'error' : 'success')); } }} /></div></td></tr>))}
                        {!data && !isError && <tr><td colSpan={8} className="empty">Loading…</td></tr>}
                        {isError && <tr><td colSpan={8} className="empty">Could not load drafts.</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={8} className="empty">No Data Found</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
        </>
    );
}
