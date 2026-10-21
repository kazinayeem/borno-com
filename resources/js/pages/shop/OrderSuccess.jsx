import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/ui';

export default function OrderSuccess() {
    const [sp] = useSearchParams();
    const numbers = (sp.get('orders') ?? '').split(',').filter((n) => /^RC\d+$/.test(n));
    return (
        <div className="mx-auto my-12 max-w-md text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Icon name="star" size={30} fill /></span>
            <h1 className="mt-4 text-2xl font-semibold">Thank you! Your order is placed.</h1>
            {numbers.length > 0 && <p className="mt-2 text-sm text-muted">Order {numbers.length > 1 ? 'numbers' : 'number'}: <b className="text-ink">{numbers.join(', ')}</b></p>}
            <p className="mt-1 text-sm text-muted">Pay with cash when it arrives. You can follow its progress from your account.</p>
            <div className="mt-6 flex justify-center gap-3"><Link to="/account/orders" className="btn-primary">View my orders</Link><Link to="/products" className="btn-outline !py-2.5">Keep shopping</Link></div>
        </div>
    );
}
