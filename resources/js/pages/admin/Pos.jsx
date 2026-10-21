import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    errorMessage, useAdminListQuery, useGetOptionsQuery, usePosAddCustomerMutation, usePosCheckoutMutation, usePosCustomersQuery,
    usePosDeleteDraftMutation, usePosDraftsQuery, usePosProductsQuery, usePosQuoteMutation, usePosSalesQuery, usePosSaveDraftMutation,
} from '../../app/api';
import { pushToast } from '../../app/slices';
import { ActBtn, Card, CardB, CardH, fdt, Modal, money, PageHead, Pager, Pill, SaIcon, Thumb } from '../../components/sa';
import { t } from '../../i18n';

const DRAFT_KEY = 'pos_resume';
const TABS_KEY = 'pos_tabs';
let tabSeq = 0;
const newTab = () => ({ id: `o${Date.now().toString(36)}${tabSeq++}`, cart: [], customer: '', custSearch: '', coupon: '', appliedCoupon: '', discType: 'percent', discValue: '', draftId: null, payment: 'Cash Payment' });
// Open orders survive navigating away from the POS (kept for the browser session only).
const loadTabs = () => {
    try { const d = JSON.parse(sessionStorage.getItem(TABS_KEY)); if (Array.isArray(d?.tabs) && d.tabs.length) return d; } catch { /* start fresh */ }
    const first = newTab();
    return { tabs: [first], active: first.id };
};
const optionId = (v) => (v ? Number(v) : null);
const posKey = (id, colorId, sizeId) => `${id}-${colorId || 0}-${sizeId || 0}`;

function posLine(line) {
    const colorId = line.color_id ?? null;
    const sizeId = line.size_id ?? null;
    const v = (line.product.variants ?? []).find((row) => optionId(row.color_id) === optionId(colorId) && optionId(row.size_id) === optionId(sizeId));
    const color = line.product.colors?.find((c) => c.id === colorId);
    const size = line.product.sizes?.find((s) => s.id === sizeId);
    return { ...line, color_id: colorId, size_id: sizeId, price: v ? Number(v.price) : line.product.price, stock: v ? Number(v.stock) : line.product.stock, color: color?.name ?? null, size: size?.name ?? null };
}

function VariantPicker({ product, colorId, sizeId, onColor, onSize, onClose, onAdd }) {
    const match = (product.variants ?? []).find((row) => optionId(row.color_id) === optionId(colorId) && optionId(row.size_id) === optionId(sizeId));
    return (
        <Modal title={t('Choose options')} onClose={onClose} footer={<button className="btn primary" onClick={onAdd} disabled={!match || Number(match.stock) < 1}>{t('Add to cart')}</button>}>
            <p style={{ marginBottom: 8 }}><b>{product.name}</b></p>
            {(product.colors ?? []).length > 0 && <div className="sa-field"><label>{t('Color')}</label><div className="row">{product.colors.map((c) => <button type="button" key={c.id} className="btn sm" onClick={() => onColor(c.id)} style={colorId === c.id ? { borderColor: 'var(--primary)' } : undefined}>{c.code && <span className="swatch" style={{ background: c.code }} />} {c.name}</button>)}</div></div>}
            {(product.sizes ?? []).length > 0 && <div className="sa-field"><label>{t('Size')}</label><div className="row">{product.sizes.map((s) => <button type="button" key={s.id} className="btn sm" onClick={() => onSize(s.id)} style={sizeId === s.id ? { borderColor: 'var(--primary)' } : undefined}>{s.name}</button>)}</div></div>}
            <p>{match ? <><b>{money(match.price)}</b> <small className="muted">{Number(match.stock) > 0 ? t('{n} left', { n: match.stock }) : t('Out of stock')}</small></> : t('Choose a color and size')}</p>
        </Modal>
    );
}

export function Pos() {
    const dispatch = useDispatch();
    const [filters, setFilters] = useState({ brand_id: '', category_id: '', search: '', page: 1 });
    const [q, setQ] = useState('');
    const [{ tabs, active }, setBoard] = useState(loadTabs);
    const cur = tabs.find((x) => x.id === active) ?? tabs[0];
    const { cart, customer, custSearch, coupon, appliedCoupon, draftId, payment, discType = 'percent', discValue = '' } = cur;
    const patchTab = (id, p) => setBoard((b) => ({ ...b, tabs: b.tabs.map((x) => (x.id === id ? { ...x, ...(typeof p === 'function' ? p(x) : p) } : x)) }));
    const patch = (p) => patchTab(cur.id, p);
    const field = (k) => (v) => patch((x) => ({ [k]: typeof v === 'function' ? v(x[k]) : v }));
    const setCart = field('cart'); const setCustomer = field('customer'); const setCustSearch = field('custSearch');
    const setCoupon = field('coupon'); const setAppliedCoupon = field('appliedCoupon'); const setDraftId = field('draftId'); const setPayment = field('payment'); const setDiscType = field('discType'); const setDiscValue = field('discValue');
    useEffect(() => { try { sessionStorage.setItem(TABS_KEY, JSON.stringify({ tabs, active: cur.id })); } catch { /* storage full or blocked */ } }, [tabs, cur.id]);
    const [quote, setQuote] = useState({ subtotal: 0, discount: 0, total: 0 });
    const [couponError, setCouponError] = useState(null);
    const [showCustomer, setShowCustomer] = useState(false);
    const [showPay, setShowPay] = useState(false);
    const [done, setDone] = useState(null); // last placed order, offers receipt printing
    const base = useLocation().pathname.startsWith('/shop') ? '/shop' : '/admin';
    const [pick, setPick] = useState(null);
    const [pickColor, setPickColor] = useState(null);
    const [pickSize, setPickSize] = useState(null);

    const { data: opts } = useGetOptionsQuery();
    const { data: products, isFetching } = usePosProductsQuery(filters);
    const { data: customers } = usePosCustomersQuery(custSearch);
    const [getQuote] = usePosQuoteMutation();
    const [checkout, { isLoading: paying }] = usePosCheckoutMutation();
    const [saveDraft] = usePosSaveDraftMutation();

    const items = useMemo(() => cart.map((c) => ({ product_id: c.product.id, qty: c.qty, ...(c.color_id ? { color_id: c.color_id } : {}), ...(c.size_id ? { size_id: c.size_id } : {}) })), [cart]);
    const dv = Number(discValue) > 0 ? Number(discValue) : 0;
    const body = useMemo(() => ({ items, customer_id: customer || null, coupon: appliedCoupon || null, discount_type: dv ? discType : null, discount_value: dv || null }), [items, customer, appliedCoupon, discType, dv]);

    // Resume a draft chosen on the Drafts page.
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            sessionStorage.removeItem(DRAFT_KEY);
            const d = JSON.parse(raw);
            const filled = { cart: (d.cart ?? []).map(posLine), customer: d.customer_id ?? '', draftId: d.id, appliedCoupon: d.coupon ?? '', coupon: d.coupon ?? '', discType: d.discount_type || 'percent', discValue: Number(d.discount_value) > 0 ? String(d.discount_value) : '' };
            setBoard((b) => {
                const open = b.tabs.find((x) => x.draftId === d.id);
                if (open) return { ...b, active: open.id };
                const empty = b.tabs.find((x) => x.id === b.active && !x.cart.length);
                if (empty) return { ...b, tabs: b.tabs.map((x) => (x === empty ? { ...x, ...filled } : x)) };
                const t2 = { ...newTab(), ...filled };
                return { tabs: [...b.tabs, t2], active: t2.id };
            });
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

    const pushLine = (p, colorId, sizeId, price, stock, color, size) => {
        const key = posKey(p.id, colorId, sizeId);
        setCart((c) => {
            const row = c.find((x) => posKey(x.product.id, x.color_id, x.size_id) === key);
            if (row) return c.map((x) => (x === row ? { ...x, qty: Math.min(x.qty + 1, stock), price, stock } : x));
            return [...c, { product: p, qty: 1, color_id: colorId, size_id: sizeId, price, stock, color, size }];
        });
    };
    const add = (p) => {
        if ((p.variants ?? []).length) {
            setPick(p);
            setPickColor(p.colors?.[0]?.id ?? null);
            setPickSize(p.sizes?.[0]?.id ?? null);
            return;
        }
        if (p.stock < 1) return dispatch(pushToast(t('Out of stock'), 'error'));
        pushLine(p, null, null, p.price, p.stock, null, null);
    };
    const confirmPick = () => {
        const v = (pick.variants ?? []).find((row) => optionId(row.color_id) === optionId(pickColor) && optionId(row.size_id) === optionId(pickSize));
        if (!v) return dispatch(pushToast(t('Choose a color and size'), 'error'));
        if (Number(v.stock) < 1) return dispatch(pushToast(t('Out of stock'), 'error'));
        const color = pick.colors?.find((c) => c.id === pickColor);
        const size = pick.sizes?.find((s) => s.id === pickSize);
        pushLine(pick, pickColor, pickSize, Number(v.price), Number(v.stock), color?.name ?? null, size?.name ?? null);
        setPick(null);
    };
    const setQty = (key, qty, stock) => setCart((c) => c.map((x) => (posKey(x.product.id, x.color_id, x.size_id) === key ? { ...x, qty: Math.max(1, Math.min(Number(qty) || 1, stock)) } : x)));
    const remove = (key) => setCart((c) => c.filter((x) => posKey(x.product.id, x.color_id, x.size_id) !== key));
    const resetTab = (id) => patchTab(id, { cart: [], customer: '', custSearch: '', coupon: '', appliedCoupon: '', discType: 'percent', discValue: '', draftId: null });
    const addTab = () => { const n = newTab(); setBoard((b) => ({ tabs: [...b.tabs, n], active: n.id })); };
    const closeTab = (id) => {
        const tab = tabs.find((x) => x.id === id);
        if (tab?.cart.length && !window.confirm(t('Close this order? Its cart will be lost.'))) return;
        setBoard((b) => {
            const left = b.tabs.filter((x) => x.id !== id);
            if (!left.length) { const n = newTab(); return { tabs: [n], active: n.id }; }
            return { tabs: left, active: b.active === id ? left[Math.max(0, b.tabs.findIndex((x) => x.id === id) - 1)].id : b.active };
        });
    };

    const pay = async () => {
        const id = cur.id;
        const r = await checkout({ ...body, payment_method: payment, draft_id: draftId });
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(pushToast(t('Order {number} placed', { number: r.data.number })));
        setDone({ id: r.data.id, number: r.data.number });
        setShowPay(false); resetTab(id);
    };
    const draft = async () => {
        if (!items.length) return dispatch(pushToast(t('Add products first'), 'error'));
        const id = cur.id;
        const r = await saveDraft(body);
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(pushToast(t('Saved as draft'))); resetTab(id);
    };

    const rows = products?.data ?? [];
    return (
        <>
            <PageHead title={t('POS')}>{draftId && <span className="muted">{t('Resuming draft #{id}', { id: draftId })} <button className="btn sm" onClick={() => resetTab(cur.id)}>{t('Discard')}</button></span>}</PageHead>
            <div className="pos-tabs" role="tablist" aria-label={t('Open orders')}>
                {tabs.map((o, i) => {
                    const n = o.cart.reduce((a, l) => a + l.qty, 0);
                    return (
                        <div key={o.id} className={`pos-tab ${o.id === cur.id ? 'active' : ''}`}>
                            <button role="tab" aria-selected={o.id === cur.id} onClick={() => setBoard((b) => ({ ...b, active: o.id }))}>{t('Order {n}', { n: i + 1 })}{n > 0 && <span className="pos-tab-n">{n}</span>}</button>
                            <button className="pos-tab-x" aria-label={t('Close order {n}', { n: i + 1 })} onClick={() => closeTab(o.id)}><SaIcon name="x" /></button>
                        </div>);
                })}
                <button className="pos-tab-add" onClick={addTab} aria-label={t('New order')}><SaIcon name="plus" /> {t('New order')}</button>
            </div>
            <div className="pos">
                <Card>
                    <CardH><form className="toolbar" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); setFilters({ ...filters, search: q, page: 1 }); }}>
                        <input className="input" aria-label={t('Search products')} placeholder={t('Search product by name')} style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} />
                        <select className="input" aria-label={t('Brand')} value={filters.brand_id} onChange={(e) => setFilters({ ...filters, brand_id: e.target.value, page: 1 })}><option value="">{t('All Brands')}</option>{opts?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                        <select className="input" aria-label={t('Category')} value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}><option value="">{t('All Categories')}</option>{opts?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    </form></CardH>
                    <CardB className="prod-grid" style={{ opacity: isFetching ? 0.6 : 1 }}>
                        {rows.map((p) => {
                            const prices = (p.variants ?? []).map((v) => Number(v.price)).filter((n) => !Number.isNaN(n));
                            const show = prices.length ? Math.min(...prices) : p.price;
                            return (
                            <button key={p.id} className="prod" disabled={p.stock < 1} onClick={() => add(p)} style={p.stock < 1 ? { opacity: 0.5 } : undefined}>
                                <img src={p.image_url || `/placeholder/${encodeURIComponent(p.name)}.svg?h=${(p.id * 37) % 360}`} alt="" loading="lazy" referrerPolicy="no-referrer" />
                                <div>{p.name}</div><b>{prices.length > 1 && Math.min(...prices) !== Math.max(...prices) ? `${t('From')} ` : ''}{money(show)}</b> <small className="muted">{p.stock > 0 ? t('{n} left', { n: p.stock }) : t('Out of stock')}</small>
                            </button>);
                        })}
                        {!products && <p className="muted">{t('Loading…')}</p>}
                        {products && rows.length === 0 && <p className="muted">{t('No products')}</p>}
                    </CardB>
                    <Pager meta={products} count={rows.length} onPage={(page) => setFilters({ ...filters, page })} />
                </Card>

                <Card>
                    <CardH><h3 style={{ flex: 1 }}>{t('Cart')}</h3><button className="btn sm" onClick={() => setShowCustomer(true)}><SaIcon name="plus" /> {t('Customer')}</button></CardH>
                    <CardB>
                        <div className="sa-field" style={{ marginBottom: 12 }}><label htmlFor="pos-cust">{t('Customer')}</label>
                            <input id="pos-cust" className="input" list="pos-customers" placeholder={t('Enter customer name or phone number')} value={custSearch} onChange={(e) => { setCustSearch(e.target.value); const m = customers?.find((c) => `${c.name} (${c.phone ?? ''})` === e.target.value); setCustomer(m ? String(m.id) : ''); }} />
                            <datalist id="pos-customers">{customers?.map((c) => <option key={c.id} value={`${c.name} (${c.phone ?? ''})`} />)}</datalist>
                            <small className="muted">{customer ? t('Customer selected') : t('Walk-in customer if none selected')}</small></div>
                        <div id="cart">
                            {cart.length === 0 && <p className="muted">{t('Cart is empty — click a product to add it.')}</p>}
                            {cart.map((row) => {
                                const key = posKey(row.product.id, row.color_id, row.size_id);
                                const quoted = (quote.lines ?? []).find((l) => l.key === key);
                                const price = quoted?.price ?? row.price ?? row.product.price;
                                const stock = row.stock ?? row.product.stock;
                                const option = [row.color, row.size].filter(Boolean).join(' / ');
                                return (
                                <div key={key} className="cart-row">
                                    <span>{row.product.name}{option ? <small className="muted"> {option}</small> : null}</span>
                                    <input className="input" type="number" min="1" max={stock} aria-label={t('Quantity for {name}', { name: row.product.name })} value={row.qty} onChange={(e) => setQty(key, e.target.value, stock)} />
                                    <span>{money(row.qty * price)}</span>
                                    <button className="act" aria-label={t('Remove {name}', { name: row.product.name })} onClick={() => remove(key)}><SaIcon name="x" /></button>
                                </div>);
                            })}
                        </div>
                        <form className="row" style={{ margin: '12px 0' }} onSubmit={(e) => { e.preventDefault(); setAppliedCoupon(coupon.trim()); setCouponError(null); }}>
                            <input className="input" aria-label={t('Coupon code')} placeholder={t('Coupon code')} value={coupon} onChange={(e) => setCoupon(e.target.value)} /><button className="btn">{t('Apply')}</button>
                        </form>
                        <div className="sa-field" style={{ marginBottom: 8 }}><label htmlFor="pos-disc">{t('Discount')}</label>
                            <div className="row"><select className="input" aria-label={t('Discount type')} value={discType} onChange={(e) => setDiscType(e.target.value)} style={{ maxWidth: 120 }}><option value="percent">{t('Percent (%)')}</option><option value="fixed">{t('Fixed amount')}</option></select>
                                <input id="pos-disc" className="input" type="number" min="0" max={discType === 'percent' ? 100 : undefined} step="0.01" placeholder="0" value={discValue} onChange={(e) => setDiscValue(e.target.value)} />
                                {dv > 0 && <button type="button" className="btn sm" onClick={() => setDiscValue('')}>{t('Clear')}</button>}</div></div>
                        {couponError && <p className="err" style={{ margin: '0 0 8px', color: 'var(--danger)', fontSize: 12 }}>{couponError}</p>}
                        <div className="totals">
                            <div><span>{t('Sub total')}</span><span>{money(quote.subtotal)}</span></div>
                            {(quote.coupon_discount ?? quote.discount) > 0 && <div><span>{t('Coupon')}{appliedCoupon ? ` (${appliedCoupon})` : ''}</span><span>-{money(quote.coupon_discount ?? quote.discount)}</span></div>}
                            {quote.manual_discount > 0 && <div><span>{t('Discount')}{discType === 'percent' ? ` (${dv}%)` : ''}</span><span>-{money(quote.manual_discount)}</span></div>}
                            {!(quote.discount > 0) && <div><span>{t('Discount')}</span><span>-{money(0)}</span></div>}
                            <div className="grand"><span>{t('Total')}</span><span>{money(quote.total)}</span></div>
                        </div>
                        <div className="sa-field" style={{ marginTop: 12 }}><label htmlFor="pos-pay">{t('Payment Method')}</label>
                            <select id="pos-pay" className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>{['Cash Payment', 'Card', 'Bkash'].map((m) => <option key={m}>{t(m)}</option>)}</select></div>
                        <div className="row" style={{ marginTop: 14 }}>
                            <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={draft}>{t('Save Draft')}</button>
                            <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!items.length || paying} onClick={pay}>{paying ? t('Processing…') : t('Place Order')}</button>
                        </div>
                    </CardB>
                </Card>
            </div>
            {showCustomer && <AddCustomer onClose={() => setShowCustomer(false)} onAdded={(c) => { setCustomer(String(c.id)); setCustSearch(`${c.name} (${c.phone})`); }} />}
            {done && (
                <Modal title={t('Order {number} placed', { number: done.number })} onClose={() => setDone(null)} footer={<button className="btn primary" onClick={() => setDone(null)}>{t('New order')}</button>}>
                    <p style={{ marginBottom: 12 }}>{t('Print the receipt for the customer?')}</p>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
                        <Link className="btn primary" to={`${base}/orders/${done.id}/invoice?size=pos`}><SaIcon name="download" /> {t('Print POS receipt (80mm)')}</Link>
                        <Link className="btn" to={`${base}/orders/${done.id}/invoice?size=a4`}><SaIcon name="download" /> {t('Print A4 invoice')}</Link>
                    </div>
                </Modal>)}
            {pick && <VariantPicker product={pick} colorId={pickColor} sizeId={pickSize} onColor={setPickColor} onSize={setPickSize} onClose={() => setPick(null)} onAdd={confirmPick} />}
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
        dispatch(pushToast(t('Customer added'))); onAdded(r.data); onClose();
    };
    const row = (k, label, props = {}) => <div className="sa-field"><label htmlFor={`pc_${k}`}>{label}{props.required && <> <span className="req">*</span></>}</label><input id={`pc_${k}`} className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /><span className="err">{errs[k]?.[0]}</span></div>;
    return (
        <Modal title={t('Add Customer')} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>{t('Cancel')}</button><button form="pos-cust-form" className="btn primary" disabled={isLoading}>{isLoading ? t('Saving…') : t('Save')}</button></>}>
            <form id="pos-cust-form" className="form-grid" onSubmit={submit}>
                {row('first_name', 'First Name', { required: true })}{row('last_name', 'Last Name')}{row('phone', 'Phone', { required: true })}{row('email', 'Email', { type: 'email', required: true })}
                <div className="sa-field"><label htmlFor="pc_gender">{t('Gender')}</label><select id="pc_gender" className="input" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="male">{t('Male')}</option><option value="female">{t('Female')}</option></select></div>
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
            <PageHead title={t('POS Sales')} />
            <Card>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>{t('SL')}</th><th>{t('Order ID')}</th><th>{t('Order Date')}</th><th>{t('Customer')}</th><th>{t('Total Amount')}</th><th>{t('Payment Method')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead>
                    <tbody>
                        {rows.map((o, i) => <tr key={o.id}><td>{(data.current_page - 1) * data.per_page + i + 1}</td><td>{o.number}</td><td>{fdt(o.created_at)}</td><td>{o.user?.name}</td><td>{money(o.total)}</td><td>{o.payment_method}</td><td><Pill value={o.status} /></td><td><div className="actions"><a className="act" href={`/admin/orders/${o.id}/show`} title={t('View')} aria-label={t('View')}><SaIcon name="eye" /></a></div></td></tr>)}
                        {!data && !isError && <tr><td colSpan={8} className="empty">{t('Loading…')}</td></tr>}
                        {isError && <tr><td colSpan={8} className="empty">{t('Could not load sales.')}</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={8} className="empty">{t('No Data Found')}</td></tr>}
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
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ cart: d.lines, customer_id: d.customer_id, id: d.id, coupon: d.coupon, discount_type: d.discount_type, discount_value: d.discount_value }));
        navigate('/admin/pos');
    };
    const rows = data?.data ?? [];
    return (
        <>
            <PageHead title={t('POS Draft')} />
            <Card>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>{t('SL')}</th><th>{t('Created Date')}</th><th>{t('Customer')}</th><th>{t('Total Products')}</th><th>{t('Sub Total')}</th><th>{t('Discount')}</th><th>{t('Total')}</th><th>{t('Action')}</th></tr></thead>
                    <tbody>
                        {rows.map((d, i) => (
                            <tr key={d.id}><td>{(data.current_page - 1) * data.per_page + i + 1}</td><td>{fdt(d.created_at)}</td><td>{d.customer?.name ?? t('Walk-in')}</td><td>{d.items.length}</td><td>{money(d.subtotal)}</td><td>{money(d.discount)}</td><td>{money(d.total)}</td>
                                <td><div className="actions"><button className="btn sm" onClick={() => resume(d)}>{t('Resume')}</button>
                                    <ActBtn icon="trash" title={t('Delete draft')} onClick={async () => { if (window.confirm(t('Delete this draft?'))) { const r = await del(d.id); dispatch(pushToast(r.error ? errorMessage(r.error) : t('Draft deleted'), r.error ? 'error' : 'success')); } }} /></div></td></tr>))}
                        {!data && !isError && <tr><td colSpan={8} className="empty">{t('Loading…')}</td></tr>}
                        {isError && <tr><td colSpan={8} className="empty">{t('Could not load drafts.')}</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={8} className="empty">{t('No Data Found')}</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
        </>
    );
}
