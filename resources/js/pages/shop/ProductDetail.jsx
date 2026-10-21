import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetProductQuery, useGetProductsQuery } from '../../app/api';
import { addToCart, pushToast, toggleWish } from '../../app/slices';
import ProductCard from '../../components/ProductCard';
import { Empty, Icon, money } from '../../components/ui';

const colors = [['Orange', '#f5a742'], ['Gray', '#808080'], ['Purple', '#800080']];
const sizes = ['M', 'L', 'XXL', 'XXXL'];

export default function ProductDetail() {
    const { id } = useParams();
    const { data: p, isLoading, isError } = useGetProductQuery(id);
    const { data: related } = useGetProductsQuery({ category_slug: p?.category?.slug, per_page: 4 }, { skip: !p?.category });
    const [qty, setQty] = useState(1);
    const [color, setColor] = useState(0);
    const [size, setSize] = useState('M');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const wished = useSelector((s) => s.shop.wishlist.includes(Number(id)));

    if (isError) return <Empty title="Product not found" hint="It may have been removed." />;
    if (isLoading) return <div className="grid gap-6 py-6 md:grid-cols-2"><div className="skeleton h-96" /><div className="skeleton h-96" /></div>;

    const add = () => { for (let i = 0; i < qty; i++) dispatch(addToCart(p)); dispatch(pushToast('Added to cart')); };
    return (
        <div className="pb-4">
            <nav className="flex items-center gap-2 py-4 text-sm"><Link to="/"><Icon name="home" size={15} /></Link>›<span>{p.name}</span></nav>
            <div className="grid gap-8 lg:grid-cols-2">
                <div className="card grid h-[480px] place-items-center bg-surface text-gray-300"><Icon name="box" size={120} /></div>
                <div>
                    <div className="flex items-start justify-between"><div>
                        <p className="text-sm text-primary">{p.brand?.name}</p><h1 className="mt-1 text-2xl font-bold">{p.name}</h1></div>
                        <button onClick={() => dispatch(toggleWish(p.id))} aria-label="Wishlist" className={`grid h-10 w-10 place-items-center rounded-full border border-line ${wished ? 'text-primary' : ''}`}><Icon name="heart" fill={wished} /></button></div>
                    <p className="mt-3 text-sm text-muted">{p.description}</p>
                    <p className="mt-3 flex items-center gap-2 text-sm"><Icon name="star" size={15} fill className="text-amber-400" /><b>{p.rating}</b>({p.reviews_count})<span className="text-line">|</span><span className="text-muted">{p.stock}+ in stock</span></p>
                    <hr className="my-5 border-line" />
                    <p className="flex items-baseline gap-3 text-3xl font-bold">{money(p.price)}{p.old_price > p.price && <span className="text-lg font-medium text-gray-400 line-through">{money(p.old_price)}</span>}</p>
                    <div className="mt-5 flex items-center gap-3"><span className="w-16 text-sm text-muted">Color:</span>
                        {colors.map(([n, c], i) => <button key={n} aria-label={n} onClick={() => setColor(i)} style={{ background: c }} className={`h-6 w-6 rounded-full ring-offset-2 ${color === i ? 'ring-2 ring-primary' : ''}`} />)}<b className="text-sm">{colors[color][0]}</b></div>
                    <div className="mt-4 flex items-center gap-3"><span className="w-16 text-sm text-muted">Size:</span>
                        {sizes.map((s) => <button key={s} onClick={() => setSize(s)} className={`rounded-md border px-4 py-1.5 text-sm ${size === s ? 'border-primary bg-primary-soft text-primary' : 'border-line'}`}>{s}</button>)}</div>
                    <div className="mt-4 flex items-center gap-4"><span className="w-16 text-sm text-muted">Qty:</span>
                        <div className="flex items-center rounded-md border border-line"><button className="px-3 py-1.5" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</button><span className="w-10 text-center text-sm font-semibold">{qty}</span><button className="px-3 py-1.5" onClick={() => setQty(qty + 1)} aria-label="Increase">+</button></div>
                        <span className={`text-sm font-medium ${p.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{p.stock > 0 ? 'In Stock' : 'Out of Stock'}</span></div>
                    <div className="mt-6 flex gap-3"><button disabled={p.stock < 1} onClick={add} className="btn-primary min-w-40">Add to Cart</button>
                        <button disabled={p.stock < 1} onClick={() => { add(); navigate('/products'); }} className="btn-outline min-w-40 !py-2.5">Buy Now</button></div>
                    <div className="card mt-6 flex items-center justify-between p-4 text-sm"><div><b>{p.shop?.name}</b> <span className={`ml-2 rounded px-2 py-0.5 text-[10px] text-white ${p.shop?.online ? 'bg-lime-600' : 'bg-slate-500'}`}>{p.shop?.online ? 'Online' : 'Offline'}</span><p className="text-xs text-muted">Est. delivery: 3-4 days</p></div>
                        <Link to={`/products?shop_id=${p.shop_id}`} className="btn-outline">Visit Shop</Link></div>
                </div>
            </div>
            {related?.data.filter((r) => r.id !== p.id).length > 0 && (
                <section className="mt-12"><div className="mb-4 flex justify-between"><h2 className="text-xl font-semibold">You may also like</h2><Link to="/products" className="text-sm text-primary">View all</Link></div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.data.filter((r) => r.id !== p.id).map((r) => <ProductCard key={r.id} p={r} />)}</div></section>)}
        </div>
    );
}
