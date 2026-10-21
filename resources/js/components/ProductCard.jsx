import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, pushToast, toggleWish } from '../app/slices';
import { Icon, Img, money } from './ui';

export default function ProductCard({ p }) {
    const dispatch = useDispatch();
    const wished = useSelector((s) => s.shop.wishlist.includes(p.id));
    const discount = p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;

    return (
        <div className="card group relative flex flex-col p-3 transition hover:shadow-md">
            {discount > 0 && <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">{discount}%</span>}
            <button onClick={() => dispatch(toggleWish(p.id))} aria-label="Wishlist" className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-line bg-white ${wished ? 'text-primary' : 'text-muted'}`}>
                <Icon name="heart" size={14} fill={wished} />
            </button>
            <Link to={`/products/${p.id}/details`} className="mb-3 grid h-40 place-items-center overflow-hidden rounded-lg bg-surface text-gray-300">
                <Img src={p.image_url} alt={p.name} className="h-full w-full object-contain" fallback={<Icon name="box" size={48} />} />
            </Link>
            <Link to={`/products/${p.id}/details`}><h3 className="line-clamp-1 text-sm font-semibold">{p.name}</h3></Link>
            <div className="mt-1 flex items-baseline gap-2 text-sm">
                <span className="font-semibold text-primary">{money(p.price)}</span>
                {p.old_price > p.price && <span className="text-xs text-gray-400 line-through">{money(p.old_price)}</span>}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                <Icon name="star" size={13} fill className="text-amber-400" /> <b className="text-ink">{p.rating}</b> ({p.reviews_count})
            </div>
            <button onClick={() => { dispatch(addToCart(p)); dispatch(pushToast('Added to cart')); }} className="btn-primary mt-3 w-full !py-1.5" aria-label="Add to cart">
                <Icon name="arrow" size={16} />
            </button>
        </div>
    );
}
