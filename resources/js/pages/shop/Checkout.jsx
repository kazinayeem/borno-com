import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useCustGoogleMutation, useGetAccountQuery, useGetAddressesQuery, useGetMasterQuery, usePlaceGuestOrderMutation, usePlaceOrderMutation } from '../../app/api';
import { cartKey, clearCart, customerLoggedIn, pushToast } from '../../app/slices';
import { GoogleButton } from './Login';
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
    const { data: master } = useGetMasterQuery();
    const signedIn = useSelector((s) => !!s.customer.token);
    const { data: me } = useGetAccountQuery(undefined, { skip: !signedIn });
    const { data: addresses } = useGetAddressesQuery(undefined, { skip: !signedIn });
    const [placeMember, { isLoading: l1, error: e1 }] = usePlaceOrderMutation();
    const [placeGuest, { isLoading: l2, error: e2 }] = usePlaceGuestOrderMutation();
    const [google] = useCustGoogleMutation();
    const isLoading = l1 || l2;
    const error = signedIn ? e1 : e2;
    const [method, setMethod] = useState(null);                // null = first available
    const [contact, setContact] = useState({ guest_name: '', guest_email: '', guest_phone: '' });
    const [addrId, setAddrId] = useState(null);             // null = decide automatically, 'new' = typing a new one
    const [form, setForm] = useState({ name: '', phone: '', address_line: '', area: '', type: 'home' });
    const [save, setSave] = useState(true);
    const [notes, setNotes] = useState('');
    const useSaved = signedIn && addresses?.length > 0 && addrId !== 'new';
    const chosen = useSaved ? (addresses.find((a) => a.id === addrId) ?? addresses.find((a) => a.is_default) ?? addresses[0]) : null;
    useEffect(() => { if (me && !form.name) setForm((f) => ({ ...f, name: me.name ?? '', phone: me.phone ?? '' })); }, [me]); // eslint-disable-line

    const guestOk = !!master?.data?.guest_checkout;
    if (!signedIn && master && !guestOk) return <Navigate to={`/login?next=${encodeURIComponent('/checkout')}`} replace />;
    if (cart.length === 0) return <div className="py-10"><Empty title={t('Your cart is empty')} /><div className="text-center"><Link to="/products" className="btn-primary">{t('Continue shopping')}</Link></div></div>;

    const errs = error?.data?.errors ?? {};
    const itemErrors = errs.items ?? [];
    const blocked = Object.keys(issues).length > 0;
    const cashOnDelivery = master?.data?.cash_on_delivery !== false;
    const gateways = master?.data?.payment_gateways ?? [];
    const options = [...(cashOnDelivery ? [{ key: 'Cash Payment', title: t('Cash on delivery') }] : []), ...gateways];
    const picked = options.find((o) => o.key === method) ?? options[0];
    const onlinePayment = gateways.length > 0;
    const phoneCode = master?.data?.default_phone_code ? `+${String(master.data.default_phone_code).replace(/\D/g, '')}` : '';
    const mapQuery = [form.address_line, form.area].filter(Boolean).join(', ');
    const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        const body = { items: cart.map((i) => ({ product_id: i.id, qty: i.qty, ...(i.color_id ? { color_id: i.color_id } : {}), ...(i.size_id ? { size_id: i.size_id } : {}) })), coupon: coupon || undefined, payment_method: picked?.key, notes: notes || undefined, ...(chosen ? { address_id: chosen.id } : { address: signedIn ? form : { ...form, name: form.name || contact.guest_name, phone: form.phone || contact.guest_phone }, ...(signedIn ? { save_address: save } : {}) }), ...(signedIn ? {} : contact) };
        const r = await (signedIn ? placeMember(body) : placeGuest(body));
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        if (r.data.redirect_url) { window.location.href = r.data.redirect_url; return; }   // online payment: the cart is cleared once the gateway confirms
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
                    {!signedIn && (
                        <section className="card p-5">
                            <h2 className="mb-1 font-semibold">{t('Your details')}</h2>
                            <p className="mb-3 text-sm text-muted">{t('Order without an account, or sign in to track your orders.')}</p>
                            {master?.data?.google_client_id && <div className="mb-3"><GoogleButton clientId={master.data.google_client_id} onCredential={async (cred) => { const r = await google(cred); if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error')); dispatch(customerLoggedIn(r.data)); }} /></div>}
                            <p className="mb-3 text-sm"><Link to={`/login?next=${encodeURIComponent('/checkout')}`} className="text-primary underline">{t('Sign in or create an account')}</Link></p>
                            <div className="grid gap-x-4 sm:grid-cols-2">
                                <Field label={t('Full name')} required error={errs.guest_name?.[0]}><TextInput value={contact.guest_name} onChange={(v) => setContact({ ...contact, guest_name: v })} autoComplete="name" /></Field>
                                <Field label={t('Email')} required error={errs.guest_email?.[0]}><TextInput type="email" value={contact.guest_email} onChange={(v) => setContact({ ...contact, guest_email: v })} autoComplete="email" /></Field>
                                <Field label={t('Phone')} required error={errs.guest_phone?.[0]}><TextInput value={contact.guest_phone} onChange={(v) => setContact({ ...contact, guest_phone: v })} autoComplete="tel" /></Field>
                            </div>
                        </section>)}
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
                                <Field label={t('Phone')} required error={fe('phone')}><div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-primary">{phoneCode && <span className="grid place-items-center bg-surface px-3 text-sm text-muted">{phoneCode}</span>}<input className="min-w-0 flex-1 bg-transparent px-3 py-[9px] text-sm outline-none" value={form.phone} onChange={(e) => set('phone')(e.target.value)} autoComplete="tel" /></div></Field>
                                <div className="sm:col-span-2"><Field label={t('Address')} required error={fe('address_line')}><TextInput value={form.address_line} onChange={set('address_line')} autoComplete="street-address" /></Field></div>
                                <Field label={t('Area / city')}><TextInput value={form.area} onChange={set('area')} /></Field>
                                <Field label={t('Address type')}><select className="field" value={form.type} onChange={(e) => set('type')(e.target.value)}><option value="home">{t('Home')}</option><option value="office">{t('Office')}</option><option value="other">{t('Other')}</option></select></Field>
                                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-primary" checked={save} onChange={(e) => setSave(e.target.checked)} />{t('Save this address for next time')}</label>
                                {addresses?.length > 0 && <button type="button" className="text-start text-sm text-primary underline sm:col-span-2" onClick={() => setAddrId(null)}>{t('Use a saved address instead')}</button>}
                                {master?.data?.show_address_map && mapQuery && <iframe title={t('Address map')} className="h-48 w-full rounded-lg border border-line sm:col-span-2" src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`} />}
                            </div>)}
                    </section>
                    <section className="card p-5">
                        <h2 className="mb-3 font-semibold">{t('Payment')}</h2>
                        {errs.payment_method && <p className="mb-2 text-xs text-red-500">{errs.payment_method[0]}</p>}
                        <div className="space-y-2">{options.map((o) => (
                            <label key={o.key} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${picked?.key === o.key ? 'border-primary bg-primary-soft' : 'border-line'}`}>
                                <input type="radio" name="pay" className="accent-primary" checked={picked?.key === o.key} onChange={() => setMethod(o.key)} />
                                <span className="flex-1"><b>{o.title}</b>{o.key === 'Cash Payment' ? <><br /><span className="text-muted">{t('Pay with cash when your order arrives.')}</span></> : <><br /><span className="text-muted">{t('You will be taken to {name} to pay securely.', { name: o.title })}</span></>}</span>
                                {o.logo && o.key !== 'Cash Payment' && <img src={o.logo} alt="" className="h-6 max-w-[80px] object-contain" />}</label>))}</div>
                        {options.length === 0 && <p className="text-sm text-muted">{t('No payment method is enabled in Business Setup.')}</p>}
                    </section>
                    <section className="card p-5"><Field label={t('Order notes (optional)')}><TextArea value={notes} onChange={setNotes} placeholder={t('Delivery instructions…')} rows={3} /></Field></section>
                </div>
                <div className={loading ? 'opacity-60' : ''}>
                    <div className="card mb-3 p-4"><h2 className="mb-2 text-sm font-semibold">{t('Items ({n})', { n: cart.reduce((a, i) => a + i.qty, 0) })}</h2>{cart.map((i) => { const option = [i.color, i.size].filter(Boolean).join(' / '); const line = (data?.orders ?? []).flatMap((o) => o.lines).find((l) => l.key === cartKey(i)); const price = line?.price ?? i.price; return <div key={cartKey(i)} className="flex justify-between gap-2 py-1 text-sm"><span className="line-clamp-1">{i.qty} × {i.name}{option ? ` (${option})` : ''}</span><span className="shrink-0">{money(price * i.qty)}</span></div>; })}</div>
                    <Totals data={data} coupon={coupon} couponError={couponError} onCoupon={setCoupon} />
                    {data?.orders.length > 1 && <p className="mt-2 text-xs text-muted">{t('Your items come from {n} shops, so they are delivered as {n} separate orders.', { n: data.orders.length })}</p>}
                    <button disabled={isLoading || blocked || !data || !picked} className="btn-primary mt-3 w-full !py-3">{isLoading ? t('Placing order…') : t('Place order · {total}', { total: money(data?.total) })}</button>
                </div>
            </div>
        </form>
    );
}
