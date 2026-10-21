import React from 'react';
import { Link } from 'react-router-dom';
import { useGetHomeQuery } from '../../app/api';
import ProductCard from '../../components/ProductCard';
import { Icon, Img } from '../../components/ui';

const perks = [['Secure Payments', '100% safe & trusted'], ['Free Delivery', 'On orders over 999'], ['100% Authentic', 'Genuine products only'], ['24/7 Support', 'We are always here'], ['Easy Returns', 'Hassle free returns']];

export default function Home() {
    const { data, isLoading, isError, refetch } = useGetHomeQuery();
    if (isError) return <div className="py-20 text-center">Failed to load. <button className="text-primary underline" onClick={refetch}>Retry</button></div>;

    return (
        <div className="space-y-10 pb-4">
            <section className="grid gap-4 lg:grid-cols-[256px_1fr_270px]">
                <aside className="card hidden p-3 lg:block">
                    {isLoading ? <div className="skeleton h-64" /> : data.categories.map((c) => (
                        <Link key={c.id} to={`/products?category_slug=${c.slug}`} className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-primary-soft"><span className="flex items-center gap-3"><Img src={c.image_url} alt="" className="h-6 w-6 rounded object-cover" />{c.name}</span><Icon name="right" size={14} /></Link>
                    ))}
                    <Link to="/products" className="mt-2 block border-t border-line px-3 pt-3 text-sm font-medium">View All Categories</Link>
                </aside>
                <div className="relative grid min-h-72 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 to-sky-300 p-8 text-center">
                    <div><p className="text-4xl font-bold text-slate-800 md:text-5xl">Natural Beauty Care</p>
                        <p className="mt-2 text-slate-600">Discount up to 50% — cash on delivery</p>
                        <Link to="/products" className="btn-primary mt-5">Shop Now</Link></div>
                </div>
                <div className="hidden gap-4 lg:grid">
                    <div className="grid place-items-center rounded-2xl bg-sky-100 p-4 text-center font-semibold">Natural Beauty Care<br />50% OFF</div>
                    <div className="grid place-items-center rounded-2xl bg-lime-300 p-4 text-center font-bold">FLASH SALE<br />UP TO 60% OFF</div>
                </div>
            </section>

            <section className="card grid grid-cols-2 gap-4 p-5 md:grid-cols-5">
                {perks.map(([t, d]) => <div key={t}><p className="text-sm font-semibold">{t}</p><p className="text-xs text-muted">{d}</p></div>)}
            </section>

            <section>
                <h2 className="mb-4 text-xl font-semibold">Shop By Categories</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                    {(data?.categories ?? Array.from({ length: 8 })).map((c, i) => c ? (
                        <Link key={c.id} to={`/products?category_slug=${c.slug}`} className="flex flex-col items-center gap-2 text-center text-xs font-semibold">
                            <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-surface text-primary shadow-sm"><Img src={c.image_url} alt={c.name} className="h-full w-full object-cover" fallback={<Icon name="tag" size={28} />} /></span>{c.name}</Link>
                    ) : <div key={i} className="skeleton h-24" />)}
                </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900 to-primary px-6 py-10 text-center text-white">
                <p className="text-xs tracking-widest">EXCLUSIVE OFFERS</p>
                <h2 className="text-4xl font-extrabold">FLASH SALE</h2>
                <p className="mt-2 text-sm opacity-90">The biggest deals are almost here! Get ready to shop &amp; save big.</p>
                <div className="mt-4 flex justify-center gap-2">{['00', '00', '00'].map((n, i) => <span key={i} className="rounded-lg bg-sa-surface px-4 py-2 text-2xl font-bold text-primary">{n}</span>)}</div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="rounded-2xl bg-gradient-to-b from-stone-500 to-stone-700 p-6 text-white">
                    <span className="rounded bg-sa-surface px-2 py-1 text-xs font-semibold text-ink">Limited Time Only</span>
                    <h2 className="mt-4 text-3xl font-bold">FLASH SALE</h2>
                    <p className="mt-3 text-sm opacity-90">Don't miss our Mega Flash Sale! Save up to 70% on thousands of products.</p>
                    <Link to="/products" className="btn-primary mt-6 w-full">Shop Now <Icon name="arrow" size={16} /></Link>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {isLoading ? Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-72" />) : data.flash_sale.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
            </section>

            <section>
                <h2 className="mb-4 text-xl font-semibold">Popular Products</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                    {isLoading ? Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-72" />) : data.popular.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
            </section>

            <section>
                <h2 className="mb-4 text-xl font-semibold">Top Shops</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {(data?.shops ?? []).map((s) => (
                        <div key={s.id} className="card p-4 text-center text-sm"><Img src={s.image_url} alt={s.name} className="mx-auto mb-2 h-12 w-12 rounded-full object-cover" /><div className="text-xs text-muted">★ {s.rating} ({s.reviews_count})</div>
                            <p className="my-1 font-semibold">{s.name}</p><p className="text-xs text-muted">{s.products_count}</p>
                            <Link to={`/products?shop_id=${s.id}`} className="btn-outline mt-2">Visit Shop</Link></div>
                    ))}
                </div>
            </section>
        </div>
    );
}
