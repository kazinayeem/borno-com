import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetHomeQuery, useGetMasterQuery } from '../../app/api';
import ProductCard from '../../components/ProductCard';
import { Icon, Img } from '../../components/ui';
import { t } from '../../i18n';

const catName = (c, lang) => (lang === 'ar' && c.name_ar) || c.name;
const pad2 = (n) => String(n).padStart(2, '0');
const remaining = (endsAt) => {
    const end = endsAt ? new Date(endsAt).getTime() : NaN;
    const total = Number.isFinite(end) ? Math.max(0, Math.floor((end - Date.now()) / 1000)) : 0;
    return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map(pad2);
};

function SaleClock({ endsAt, boxed }) {
    const [parts, setParts] = useState(() => remaining(endsAt));
    useEffect(() => {
        setParts(remaining(endsAt));
        const id = setInterval(() => setParts(remaining(endsAt)), 1000);
        return () => clearInterval(id);
    }, [endsAt]);
    if (boxed) return <div className="mt-4 flex gap-2">{parts.map((n, i) => <span key={i} className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-2xl font-bold text-primary">{n}</span>)}</div>;
    return <p className="mt-3 text-xs">{t('Sale ends in')} {parts.join(' : ')}</p>;
}

const perks = [['Secure Payments', '100% safe & trusted'], ['Free Delivery', 'On orders over 999'], ['100% Authentic', 'Genuine products only'], ['24/7 Support', 'We are always here'], ['Easy Returns', 'Hassle free returns']];

function BannerSlider({ banners }) {
    const [i, setI] = useState(0);
    useEffect(() => { if (banners.length < 2) return undefined; const id = setInterval(() => setI((n) => (n + 1) % banners.length), 5000); return () => clearInterval(id); }, [banners.length]);
    if (!banners.length) return null;
    const b = banners[i];
    return (
        <div className="relative h-[280px] overflow-hidden rounded-[14px] bg-white md:h-[460px]">
            <Link to={b.url || '/products'} className="block h-full"><Img src={b.image} alt={b.title} className="h-full w-full object-cover" /></Link>
            {banners.length > 1 && <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">{banners.map((slide, n) => <button key={slide.id} aria-label={t('Go to slide {n}', { n: n + 1 })} onClick={() => setI(n)} className={`h-2.5 w-2.5 rounded-full ${n === i ? 'bg-primary' : 'bg-white/80'}`} />)}</div>}
        </div>
    );
}

export default function Home() {
    const { data, isLoading, isError, refetch } = useGetHomeQuery();
    const { data: master } = useGetMasterQuery();
    const lang = useSelector((s) => s.ui.lang);
    if (isError) return <div className="py-20 text-center">{t('Failed to load.')} <button className="text-primary underline" onClick={refetch}>{t('Retry')}</button></div>;

    const menuCats = (data?.categories ?? []).filter((c) => c.image_url);
    const side = [data?.banners?.[1], ...(data?.ads ?? [])].filter(Boolean).slice(0, 2);
    const deal = data?.flash_deal;
    const dealName = deal?.name || t('FLASH SALE');
    const dealText = deal?.description || t('Don\'t miss our Mega Flash Sale! Save up to 70% on thousands of products including electronics, fashion, beauty, home essentials, and fast nationwide delivery.');

    return (
        <div className="space-y-10 pb-4">
            <section className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="hidden h-full flex-col overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] xl:flex">
                    {isLoading ? <div className="skeleton m-3 h-64" /> : menuCats.map((c) => (
                        <Link key={c.id} to={`/products?category_slug=${c.slug}`} className="flex items-center justify-between px-4 py-3 text-[15px] text-slate-700 hover:bg-primary-soft hover:text-primary"><span className="flex min-w-0 items-center gap-3"><Img src={c.image_url} alt="" className="h-7 w-7 shrink-0 rounded object-cover" /><span className="truncate">{catName(c, lang)}</span></span><Icon name="right" size={14} /></Link>
                    ))}
                    <Link to="/products" className="mt-auto flex items-center gap-2 border-t border-slate-100 px-4 py-3.5 text-[15px] font-semibold text-slate-700 hover:text-primary">{t('View All Categories')}</Link>
                </aside>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                    {(data?.banners?.length) ? <BannerSlider banners={data.banners} /> : (
                        <div className="grid h-[280px] place-items-center rounded-[14px] bg-gradient-to-br from-sky-100 to-sky-300 p-8 text-center md:h-[460px]">
                            <div><p className="text-4xl font-bold text-slate-800">{t('Natural Beauty Care')}</p>
                                <Link to="/products" className="btn-primary mt-5">{t('Shop Now')}</Link></div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-5 lg:h-[460px] lg:grid-cols-1">
                        {side.map((a) => <Link key={a.image} to={a.url || '/products'} className="overflow-hidden rounded-[12px] bg-white"><Img src={a.image} alt={a.title || ''} className="aspect-[4/3] h-[180px] w-full object-cover lg:h-full" /></Link>)}
                    </div>
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
                    {(isLoading ? Array.from({ length: 8 }) : menuCats).map((c, i) => c ? (
                        <Link key={c.id} to={`/products?category_slug=${c.slug}`} className="flex flex-col items-center gap-2 text-center text-xs font-semibold">
                            <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-surface text-primary shadow-sm"><Img src={c.image_url} alt={catName(c, lang)} className="h-full w-full object-cover" fallback={<Icon name="tag" size={28} />} /></span>{catName(c, lang)}</Link>
                    ) : <div key={i} className="skeleton h-24" />)}
                </div>
            </section>

            <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#fb7185] via-primary to-[#9f1239] px-4 py-6 text-white sm:px-8 lg:px-10 lg:py-8">
                <div className="grid items-center gap-6 lg:grid-cols-2">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.25em]">{t('COMING SOON')}</p>
                        <h2 className="text-4xl font-extrabold leading-none">{dealName}</h2>
                        <p className="mt-2 text-sm opacity-90">{t('The biggest deals are almost here! Get ready to shop & save big.')}</p>
                        {deal?.discount > 0 && <p className="mt-1 text-sm font-semibold">{t('Up to {n}% off', { n: deal.discount })}</p>}
                        <SaleClock endsAt={deal?.ends_at} boxed />
                    </div>
                    <div className="lg:text-right">
                        <p className="text-xs font-semibold tracking-[0.25em]">{t('EXCLUSIVE OFFERS')}</p>
                        <h3 className="text-3xl font-extrabold">{t('Big Deals Are Waiting For You')}</h3>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="rounded-2xl bg-gradient-to-b from-stone-500 to-stone-700 p-6 text-white">
                    <span className="rounded bg-sa-surface px-2 py-1 text-xs font-semibold text-ink">{t('Limited Time Only')}</span>
                    <h2 className="mt-4 text-3xl font-bold">{dealName}</h2>
                    <p className="mt-3 text-sm opacity-90">{dealText}</p>
                    <SaleClock endsAt={deal?.ends_at} />
                    <Link to="/products?flash=1" className="btn-primary mt-6 w-full">{t('Shop Now')} <Icon name="arrow" size={16} /></Link>
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
