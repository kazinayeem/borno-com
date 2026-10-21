import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetHomeQuery, useGetMasterQuery } from '../../app/api';
import ProductCard from '../../components/ProductCard';
import { Icon, Img } from '../../components/ui';
import { t } from '../../i18n';

const catName = (c, lang) => (lang === 'ar' && c.name_ar) || c.name;

const perks = [['Secure Payments', '100% safe & trusted'], ['Free Delivery', 'On orders over 999'], ['100% Authentic', 'Genuine products only'], ['24/7 Support', 'We are always here'], ['Easy Returns', 'Hassle free returns']];

function BannerSlider({ banners }) {
    const [i, setI] = useState(0);
    useEffect(() => { if (banners.length < 2) return undefined; const id = setInterval(() => setI((n) => (n + 1) % banners.length), 5000); return () => clearInterval(id); }, [banners.length]);
    if (!banners.length) return null;
    const b = banners[i];
    return (
        <div className="relative min-h-72 overflow-hidden rounded-2xl bg-surface">
            <Link to={b.url || '/products'}><Img src={b.image} alt={b.title} className="h-72 w-full object-cover md:h-80" /></Link>
            {banners.length > 1 && <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">{banners.map((slide, n) => <button key={slide.id} aria-label={t('Go to slide {n}', { n: n + 1 })} onClick={() => setI(n)} className={`h-2.5 w-2.5 rounded-full ${n === i ? 'bg-primary' : 'bg-white/80'}`} />)}</div>}
        </div>
    );
}

export default function Home() {
    const { data, isLoading, isError, refetch } = useGetHomeQuery();
    const { data: master } = useGetMasterQuery();
    const lang = useSelector((s) => s.ui.lang);
    if (isError) return <div className="py-20 text-center">{t('Failed to load.')} <button className="text-primary underline" onClick={refetch}>{t('Retry')}</button></div>;

    return (
        <div className="space-y-10 pb-4">
            <section className="grid gap-4 lg:grid-cols-[256px_1fr_270px]">
                <aside className="card hidden p-3 lg:block">
                    {isLoading ? <div className="skeleton h-64" /> : data.categories.map((c) => (
                        <Link key={c.id} to={`/products?category_slug=${c.slug}`} className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-primary-soft"><span className="flex items-center gap-3"><Img src={c.image_url} alt="" className="h-6 w-6 rounded object-cover" />{catName(c, lang)}</span><Icon name="right" size={14} /></Link>
                    ))}
                    <Link to="/products" className="mt-2 block border-t border-line px-3 pt-3 text-sm font-medium">{t('View All Categories')}</Link>
                </aside>
                {(data?.banners?.length) ? <BannerSlider banners={data.banners} /> : (
                    <div className="relative grid min-h-72 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 to-sky-300 p-8 text-center">
                        <div><p className="text-4xl font-bold text-slate-800 md:text-5xl">{t('Natural Beauty Care')}</p>
                            <p className="mt-2 text-slate-600">{t('Discount up to 50% — cash on delivery')}</p>
                            <Link to="/products" className="btn-primary mt-5">{t('Shop Now')}</Link></div>
                    </div>
                )}
                <div className="hidden gap-4 lg:grid">
                    {(data?.ads ?? []).slice(0, 1).map((a) => <Link key={a.id} to={a.url || '/products'} className="overflow-hidden rounded-2xl"><Img src={a.image} alt={a.title} className="h-full max-h-40 w-full object-cover" /></Link>)}
                    <Link to="/products?flash=1" className="grid place-items-center rounded-2xl bg-lime-300 p-4 text-center font-bold">{t('FLASH SALE')}<br />{t('UP TO 60% OFF')}</Link>
                </div>
            </section>

            <section className="card grid grid-cols-2 gap-4 p-5 md:grid-cols-5">
                {(data?.support?.length ? data.support : perks.map(([title, description]) => ({ title, description, image: null }))).map((p) => (
                    <div key={p.title} className="flex items-center gap-3"><Img src={p.image} alt="" className="h-10 w-10 object-contain" /><div><p className="text-sm font-semibold">{t(p.title)}</p><p className="text-xs text-muted">{t(p.description)}</p></div></div>
                ))}
            </section>

            <section>
                <h2 className="mb-4 text-xl font-semibold">{t('Shop By Categories')}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                    {(data?.categories ?? Array.from({ length: 8 })).map((c, i) => c ? (
                        <Link key={c.id} to={`/products?category_slug=${c.slug}`} className="flex flex-col items-center gap-2 text-center text-xs font-semibold">
                            <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-surface text-primary shadow-sm"><Img src={c.image_url} alt={catName(c, lang)} className="h-full w-full object-cover" fallback={<Icon name="tag" size={28} />} /></span>{catName(c, lang)}</Link>
                    ) : <div key={i} className="skeleton h-24" />)}
                </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900 to-primary px-6 py-10 text-center text-white">
                <p className="text-xs tracking-widest">{t('EXCLUSIVE OFFERS')}</p>
                <h2 className="text-4xl font-extrabold">{t('FLASH SALE')}</h2>
                <p className="mt-2 text-sm opacity-90">{t('The biggest deals are almost here! Get ready to shop & save big.')}</p>
                <div className="mt-4 flex justify-center gap-2">{['00', '00', '00'].map((n, i) => <span key={i} className="rounded-lg bg-sa-surface px-4 py-2 text-2xl font-bold text-primary">{n}</span>)}</div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="rounded-2xl bg-gradient-to-b from-stone-500 to-stone-700 p-6 text-white">
                    <span className="rounded bg-sa-surface px-2 py-1 text-xs font-semibold text-ink">{t('Limited Time Only')}</span>
                    <h2 className="mt-4 text-3xl font-bold">{t('FLASH SALE')}</h2>
                    <p className="mt-3 text-sm opacity-90">{t('Don\'t miss our Mega Flash Sale! Save up to 70% on thousands of products.')}</p>
                    <Link to="/products" className="btn-primary mt-6 w-full">{t('Shop Now')} <Icon name="arrow" size={16} /></Link>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {isLoading ? Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-72" />) : data.flash_sale.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
            </section>

            <section>
                <h2 className="mb-4 text-xl font-semibold">{t('Popular Products')}</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                    {isLoading ? Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-72" />) : data.popular.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
            </section>

            {data?.quick?.length > 0 && <section>
                <h2 className="mb-4 text-xl font-semibold">{t('Quick Access')}</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {data.quick.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
            </section>}

            {master?.data?.multi_vendor && <section>
                <h2 className="mb-4 text-xl font-semibold">{t('Top Shops')}</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {(data?.shops ?? []).map((s) => (
                        <div key={s.id} className="card p-4 text-center text-sm"><Img src={s.image_url} alt={s.name} className="mx-auto mb-2 h-12 w-12 rounded-full object-cover" /><div className="text-xs text-muted">★ {s.rating} ({s.reviews_count})</div>
                            <p className="my-1 font-semibold">{s.name}</p><p className="text-xs text-muted">{s.products_count}</p>
                            <Link to={`/products?shop_id=${s.id}`} className="btn-outline mt-2">{t('Visit Shop')}</Link></div>
                    ))}
                </div>
            </section>}
        </div>
    );
}
