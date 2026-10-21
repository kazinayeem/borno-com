import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuoteCartMutation } from '../../app/api';
import { removeFromCart, setCartQty } from '../../app/slices';
import { Empty, Icon, Img, money } from '../../components/ui';

// Shared by the cart and checkout pages: asks the server for prices/shipping/availability whenever the cart or coupon changes.
export function useCartQuote(coupon) {
    const cart = useSelector((s) => s.shop.cart);
    const [quote, { isLoading }] = useQuoteCartMutation();
    const [data, setData] = useState(null);
    const [couponError, setCouponError] = useState(null);
    const items = useMemo(() => cart.map((i) => ({ product_id: i.id, qty: i.qty })), [cart]);
    useEffect(() => {
        if (!items.length) { setData(null); return undefined; }
        let live = true;
        quote({ items, coupon: coupon || undefined }).then((r) => {
            if (!live) return;
            if (r.error) { setCouponError(r.error.data?.errors?.coupon?.[0] ?? null); return; }
            setCouponError(null); setData(r.data);
        });
        return () => { live = false; };
    }, [items, coupon, quote]);
    return { cart, data, couponError, loading: isLoading, issues: Object.fromEntries((data?.issues ?? []).map((i) => [i.product_id, i])) };
}

export function CouponBox({ applied, onApply, error }) {
    const [v, setV] = useState(applied ?? '');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onApply(v.trim()); }} className="mt-3 flex gap-2">
            <input aria-label="Coupon code" className="field !py-2" placeholder="Coupon code" value={v} onChange={(e) => setV(e.target.value)} maxLength={40} />
            <button className="btn-outline !px-4">Apply</button>
            {applied && <button type="button" className="text-xs text-muted underline" onClick={() => { setV(''); onApply(''); }}>Remove</button>}
        </form>
    );
}

export function Totals({ data, coupon, couponError, onCoupon }) {
    return (
        <div className="card h-fit p-5">
            <h2 className="mb-3 font-semibold">Order summary</h2>
            <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(data?.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="text-emerald-600">- {money(data?.discount)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{data?.shipping ? money(data.shipping) : 'Free'}</dd></div>
                <div className="flex justify-between border-t border-line pt-3 text-base font-bold"><dt>Total</dt><dd>{money(data?.total)}</dd></div>
            </dl>
            {onCoupon && <><CouponBox applied={coupon} onApply={onCoupon} />{couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}</>}
            <p className="mt-3 text-xs text-muted">Free delivery on each shop's order over $999. Payment on delivery.</p>
        </div>
    );
}

export default function Cart() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const signedIn = useSelector((s) => !!s.customer.token);
    const [coupon, setCoupon] = useState('');
    const { cart, data, couponError, issues, loading } = useCartQuote(coupon);
    const fresh = Object.fromEntries((data?.orders ?? []).flatMap((o) => o.lines).map((l) => [l.product_id, l]));
    const blocked = Object.keys(issues).length > 0;

    if (cart.length === 0) return <div className="py-10"><Empty title="Your cart is empty" hint="Browse the shop and add something you like." /><div className="text-center"><Link to="/products" className="btn-primary">Continue shopping</Link></div></div>;
    return (
        <div className="pb-6">
            <h1 className="my-5 text-2xl font-semibold">Shopping cart</h1>
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="space-y-3">
                    {cart.map((i) => {
                        const f = fresh[i.id];
                        const issue = issues[i.id];
                        const price = f?.price ?? i.price;
                        return (
                            <div key={i.id} className={`card flex gap-4 p-4 ${issue ? '!border-red-300' : ''}`}>
                                <Link to={`/products/${i.id}/details`} className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface text-gray-300"><Img src={f?.image_url ?? i.image} alt={i.name} className="h-full w-full object-contain" fallback={<Icon name="box" size={32} />} /></Link>
                                <div className="min-w-0 flex-1">
                                    <Link to={`/products/${i.id}/details`} className="line-clamp-2 font-medium">{i.name}</Link>
                                    <p className="mt-1 font-semibold text-primary">{money(price)}</p>
                                    {issue && <p className="mt-1 text-xs text-red-600">{issue.message} {issue.available > 0 && <button className="underline" onClick={() => dispatch(setCartQty({ id: i.id, qty: issue.available }))}>Set to {issue.available}</button>}</p>}
                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="flex items-center rounded-md border border-line">
                                            <button aria-label={`Decrease ${i.name}`} className="px-3 py-1" onClick={() => dispatch(setCartQty({ id: i.id, qty: i.qty - 1 }))}>−</button>
                                            <span className="w-9 text-center text-sm font-semibold" aria-label="Quantity">{i.qty}</span>
                                            <button aria-label={`Increase ${i.name}`} className="px-3 py-1" disabled={i.stock != null && i.qty >= i.stock} onClick={() => dispatch(setCartQty({ id: i.id, qty: i.qty + 1 }))}>+</button>
                                        </div>
                                        <button className="text-xs text-red-500" onClick={() => dispatch(removeFromCart(i.id))}><Icon name="trash" size={14} className="mr-1 inline" />Remove</button>
                                    </div>
                                </div>
                                <b className="shrink-0 text-sm">{money(price * i.qty)}</b>
                            </div>);
                    })}
                </div>
                <div className={loading ? 'opacity-60' : ''}>
                    <Totals data={data} coupon={coupon} couponError={couponError} onCoupon={setCoupon} />
                    <button disabled={blocked || !data} onClick={() => navigate(signedIn ? '/checkout' : '/login?next=%2Fcheckout', { state: { coupon } })} className="btn-primary mt-3 w-full !py-3">{signedIn ? 'Proceed to checkout' : 'Sign in to check out'}</button>
                    {blocked && <p className="mt-2 text-xs text-red-600">Fix the highlighted items to continue.</p>}
                </div>
            </div>
        </div>
    );
}
