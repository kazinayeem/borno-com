import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetPaymentStatusQuery } from '../../app/api';
import { clearCart } from '../../app/slices';
import { Icon, money } from '../../components/ui';
import { t } from '../../i18n';

// Landing page after checkout. Cash orders arrive with ?orders=RC…; online payments come back with ?tran=… and are looked up on the server.
export default function OrderSuccess() {
    const [sp] = useSearchParams();
    const dispatch = useDispatch();
    const signedIn = useSelector((s) => !!s.customer.token);
    const tran = (sp.get('tran') ?? '').replace(/[^A-Za-z0-9]/g, '');
    const { data: pay, isLoading, isError } = useGetPaymentStatusQuery(tran, { skip: !tran });
    const numbers = tran ? (pay?.orders ?? []).map((o) => o.number) : (sp.get('orders') ?? '').split(',').filter((n) => /^RC\d+$/.test(n));
    const paid = pay?.status === 'paid';
    useEffect(() => { if (paid) dispatch(clearCart()); }, [paid]); // eslint-disable-line

    if (tran && isLoading) return <div className="skeleton mx-auto my-12 h-64 max-w-md" />;
    if (tran && (isError || !pay)) return <div className="mx-auto my-12 max-w-md text-center"><h1 className="text-xl font-semibold">{t('We could not find that payment.')}</h1><Link to="/" className="btn-primary mt-4">{t('Back to shop')}</Link></div>;
    if (tran && !paid) {
        const cancelled = pay.status === 'cancelled';
        return (
            <div className="mx-auto my-12 max-w-md text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600"><Icon name="close" size={30} /></span>
                <h1 className="mt-4 text-2xl font-semibold">{cancelled ? t('Payment cancelled') : pay.status === 'initiated' ? t('Payment not confirmed yet') : t('Payment failed')}</h1>
                <p className="mt-2 text-sm text-muted">{pay.status === 'initiated' ? t('We have not received a confirmation from {name}. If you were charged, contact us with your order number.', { name: pay.gateway }) : t('No money was taken and your order was not placed. Your cart is still here, so you can try again.')}</p>
                <div className="mt-6 flex justify-center gap-3"><Link to="/checkout" className="btn-primary">{t('Try again')}</Link><Link to="/cart" className="btn-outline !py-2.5">{t('Back to cart')}</Link></div>
            </div>
        );
    }
    return (
        <div className="mx-auto my-12 max-w-md text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Icon name="star" size={30} fill /></span>
            <h1 className="mt-4 text-2xl font-semibold">{paid ? t('Payment received. Thank you!') : t('Thank you! Your order is placed.')}</h1>
            {numbers.length > 0 && <p className="mt-2 text-sm text-muted">{numbers.length > 1 ? t('Order numbers:') : t('Order number:')} <b className="text-ink">{numbers.join(', ')}</b></p>}
            {paid && <p className="mt-1 text-sm text-muted">{t('Paid {amount} with {name}.', { amount: money(pay.amount), name: pay.gateway })}</p>}
            <p className="mt-1 text-sm text-muted">{paid ? t('We will start preparing your order right away.') : signedIn ? t('Pay with cash when it arrives. You can follow its progress from your account.') : t('Pay with cash when it arrives. We sent the details to your email.')}</p>
            <div className="mt-6 flex justify-center gap-3">{signedIn && <Link to="/account/orders" className="btn-primary">{t('View my orders')}</Link>}<Link to="/products" className={signedIn ? 'btn-outline !py-2.5' : 'btn-primary'}>{t('Keep shopping')}</Link></div>
        </div>
    );
}
