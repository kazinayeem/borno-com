import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetMasterQuery } from '../app/api';
import { addToCart, pushToast, toggleWish } from '../app/slices';
import { Icon, Img, money } from './ui';
import { t } from '../i18n';
import { motion, staggerItem } from './Motion';

export default function ProductCard({ p, i = 0 }) {
    const dispatch = useDispatch();
    const { data: master } = useGetMasterQuery();
    const wished = useSelector((s) => s.shop.wishlist.includes(p.id));
    const variantPrices = (p.variants ?? []).map((v) => Number(v.price)).filter((n) => !Number.isNaN(n));
    const price = variantPrices.length ? Math.min(...variantPrices) : Number(p.price);
    const varied = variantPrices.length > 1 && Math.min(...variantPrices) !== Math.max(...variantPrices);
    const hasOptions = (p.variants ?? []).length > 0;
    const discount = p.old_price > price ? Math.round((1 - price / p.old_price) * 100) : 0;

    return (
        <motion.div className="card group relative flex flex-col p-3 transition hover:shadow-md" {...staggerItem(i % 6)} whileHover={{ y: -4 }}>
            {discount > 0 && <span className="absolute start-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">{discount}%</span>}
            <button onClick={() => dispatch(toggleWish(p.id))} aria-label={t('Wishlist')} className={`absolute end-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-line bg-sa-surface ${wished ? 'text-primary' : 'text-muted'}`}>
                <Icon name="heart" size={14} fill={wished} />
            </button>
            <Link to={`/products/${p.id}/details`} className="mb-3 grid h-40 place-items-center overflow-hidden rounded-lg bg-surface text-gray-300">
                <Img src={p.image_url} alt={p.name} className="h-full w-full object-contain" fallback={<Icon name="box" size={48} />} />
            </Link>
            <Link to={`/products/${p.id}/details`}><h3 className="line-clamp-1 text-sm font-semibold">{p.name}</h3></Link>
            <div className="mt-1 flex items-baseline gap-2 text-sm">
                <span className="font-semibold text-primary">{varied ? `${t('From')} ` : ''}{money(price)}</span>
                {p.old_price > price && <span className="text-xs text-gray-400 line-through">{money(p.old_price)}</span>}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                <Icon name="star" size={13} fill className="text-amber-400" /> <b className="text-ink">{p.rating}</b> ({p.reviews_count})
            </div>
            {master?.data?.show_product_stock && <div className="mt-1 text-xs text-muted">{p.stock < 1 ? t('Out of stock') : t('{n} in stock', { n: p.stock })}</div>}
            {hasOptions ? <Link to={`/products/${p.id}/details`} className="btn-primary mt-3 w-full !py-1.5 text-center">{t('Select')}</Link> : (
                <button disabled={p.stock < 1} onClick={() => { dispatch(addToCart({ ...p, qty: 1 })); dispatch(pushToast(t('Added to cart'))); }} className="btn-primary mt-3 w-full !py-1.5" aria-label={p.stock < 1 ? t('Out of stock') : t('Add to cart')}>
                    {p.stock < 1 ? t('Out of stock') : <Icon name="arrow" size={16} />}
                </button>)}
        </motion.div>
    );
}
