import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useGetAccountQuery, useGetAddressesQuery, usePlaceOrderMutation } from '../../app/api';
import { clearCart, pushToast } from '../../app/slices';
import { Field, TextArea, TextInput } from '../../components/FormKit';
import { Empty, money } from '../../components/ui';
import { Totals, useCartQuote } from './Cart';
import { t } from '../../i18n';

export default function Checkout() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const loc = useLocation();
    const [coupon, setCoupon] = useState(loc.state?.coupon ?? '');
    const { cart, data, couponError, issues, loading } = useCartQuote(coupon);
    const { data: me } = useGetAccountQuery();
    const { data: addresses } = useGetAddressesQuery();
    const [place, { isLoading, error }] = usePlaceOrderMutation();
    const [addrId, setAddrId] = useState(null);             // null = decide automatically, 'new' = typing a new one
    const [form, setForm] = useState({ name: '', phone: '', address_line: '', area: '', type: 'home' });
    const [save, setSave] = useState(true);
    const [notes, setNotes] = useState('');
    const useSaved = addresses?.length > 0 && addrId !== 'new';
    const chosen = useSaved ? (addresses.find((a) => a.id === addrId) ?? addresses.find((a) => a.is_default) ?? addresses[0]) : null;
    useEffect(() => { if (me && !form.name) setForm((f) => ({ ...f, name: me.name ?? '', phone: me.phone ?? '' })); }, [me]); // eslint-disable-line

    if (cart.length === 0) return <div className="py-10"><Empty title={t('Your cart is empty')} /><div className="text-center"><Link to="/products" className="btn-primary">{t('Continue shopping')}</Link></div></div>;

    const errs = error?.data?.errors ?? {};
    const itemErrors = errs.items ?? [];
    const blocked = Object.keys(issues).length > 0;
    const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        const body = { items: cart.map((i) => ({ product_id: i.id, qty: i.qty })), coupon: coupon || undefined, payment_method: 'Cash Payment', notes: notes || undefined, ...(chosen ? { address_id: chosen.id } : { address: form, save_address: save }) };
        const r = await place(body);
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(clearCart());
        navigate(`/order-success?orders=${r.data.orders.map((o) => o.number).join(',')}`, { replace: true });
    };
    const fe = (k) => errs[`address.${k}`]?.[0];

    return (
        <form onSubmit={submit} className="pb-6">
            <h1 className="my-5 text-2xl font-semibold">{t('Checkout')}</h1>
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="space-y-5">
                    {(itemErrors.length > 0 || blocked) && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{[...itemErrors, ...Object.values(issues).map((i) => i.message)].filter((v, i, a) => a.indexOf(v) === i).map((m) => <p key={m}>{m}</p>)}<Link to="/cart" className="mt-1 inline-block underline">{t('Review your cart')}</Link></div>}
                    <section className="card p-5">
                        <h2 className="mb-3 font-semibold">{t('Delivery address')}</h2>
                        {errs.address_id && <p className="mb-2 text-xs text-red-500">{errs.address_id[0]}</p>}
                        {useSaved && (
                            <div className="space-y-2">{addresses.map((a) => (
                                <label key={a.id} className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${chosen?.id === a.id ? 'border-primary bg-primary-soft' : 'border-line'}`}>
                                    <input type="radio" name="addr" className="mt-1 accent-primary" checked={chosen?.id === a.id} onChange={() => setAddrId(a.id)} />
                                    <span><b>{a.name}</b> · {a.phone}<br /><span className="text-muted">{a.address_line}{a.area ? `, ${a.area}` : ''} ({a.type})</span></span></label>))}
                                <button type="button" className="text-sm text-primary underline" onClick={() => setAddrId('new')}>{t('+ Use a new address')}</button></div>)}
                        {!useSaved && (
                            <div className="grid gap-x-4 sm:grid-cols-2">
                                <Field label={t('Full name')} required error={fe('name')}><TextInput value={form.name} onChange={set('name')} autoComplete="name" /></Field>
                                <Field label={t('Phone')} required error={fe('phone')}><TextInput value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
                                <div className="sm:col-span-2"><Field label={t('Address')} required error={fe('address_line')}><TextInput value={form.address_line} onChange={set('address_line')} autoComplete="street-address" /></Field></div>
                                <Field label={t('Area / city')}><TextInput value={form.area} onChange={set('area')} /></Field>
                                <Field label={t('Address type')}><select className="field" value={form.type} onChange={(e) => set('type')(e.target.value)}><option value="home">{t('Home')}</option><option value="office">{t('Office')}</option><option value="other">{t('Other')}</option></select></Field>
                                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-primary" checked={save} onChange={(e) => setSave(e.target.checked)} />{t('Save this address for next time')}</label>
                                {addresses?.length > 0 && <button type="button" className="text-left text-sm text-primary underline sm:col-span-2" onClick={() => setAddrId(null)}>{t('Use a saved address instead')}</button>}
                            </div>)}
                    </section>
                    <section className="card p-5">
                        <h2 className="mb-3 font-semibold">{t('Payment')}</h2>
                        <label className="flex items-center gap-3 rounded-lg border border-primary bg-primary-soft p-3 text-sm"><input type="radio" checked readOnly className="accent-primary" /><span><b>{t('Cash on delivery')}</b><br /><span className="text-muted">{t('Pay when your order arrives.')}</span></span></label>
                        <p className="mt-2 text-xs text-muted">{t('Card and mobile-wallet payments are not available yet.')}</p>
                    </section>
                    <section className="card p-5"><Field label={t('Order notes (optional)')}><TextArea value={notes} onChange={setNotes} placeholder={t('Delivery instructions…')} rows={3} /></Field></section>
                </div>
                <div className={loading ? 'opacity-60' : ''}>
                    <div className="card mb-3 p-4"><h2 className="mb-2 text-sm font-semibold">{t('Items ({n})', { n: cart.reduce((a, i) => a + i.qty, 0) })}</h2>{cart.map((i) => <div key={i.id} className="flex justify-between gap-2 py-1 text-sm"><span className="line-clamp-1">{i.qty} × {i.name}</span><span className="shrink-0">{money(i.price * i.qty)}</span></div>)}</div>
                    <Totals data={data} coupon={coupon} couponError={couponError} onCoupon={setCoupon} />
                    {data?.orders.length > 1 && <p className="mt-2 text-xs text-muted">{t('Your items come from {n} shops, so they are delivered as {n} separate orders.', { n: data.orders.length })}</p>}
                    <button disabled={isLoading || blocked || !data} className="btn-primary mt-3 w-full !py-3">{isLoading ? t('Placing order…') : t('Place order · {total}', { total: money(data?.total) })}</button>
                </div>
            </div>
        </form>
    );
}
