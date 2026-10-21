import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetCategoriesQuery, useGetProductsQuery } from '../../app/api';
import ProductCard from '../../components/ProductCard';
import { Empty, Pagination } from '../../components/ui';
import { t } from '../../i18n';

export default function Products() {
    const [sp, setSp] = useSearchParams();
    const { data: cats = [] } = useGetCategoriesQuery();
    const lang = useSelector((s) => s.ui.lang);
    const [range, setRange] = useState({ min: sp.get('min_price') ?? '', max: sp.get('max_price') ?? '' });
    const params = Object.fromEntries(sp.entries());
    const { data, isFetching, isError } = useGetProductsQuery({ ...params, per_page: 12 });

    const set = (patch) => {
        const next = new URLSearchParams(sp);
        Object.entries(patch).forEach(([k, v]) => (v === '' || v === false || v == null ? next.delete(k) : next.set(k, v)));
        if (!('page' in patch)) next.delete('page');
        setSp(next);
    };
    const selected = sp.getAll('category_slug');
    const toggleCat = (slug) => {
        const next = new URLSearchParams(sp);
        next.delete('category_slug'); next.delete('page');
        (selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]).forEach((s) => next.append('category_slug', s));
        setSp(next);
    };
    const Toggle = ({ label, k }) => (
        <label className="flex items-center justify-between py-3 text-sm font-semibold">{label}
            <input type="checkbox" checked={sp.get(k) === '1'} onChange={(e) => set({ [k]: e.target.checked ? '1' : '' })} className="h-5 w-9 accent-primary" /></label>
    );

    return (
        <div className="grid gap-6 pb-4 lg:grid-cols-[256px_1fr]">
            <aside className="card h-fit p-4">
                <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{t('Filter By')}</h2>
                    <button onClick={() => { setRange({ min: '', max: '' }); setSp({}); }} className="text-xs text-primary">{t('Clear All')}</button></div>
                <div className="flex items-center gap-2 border-b border-line pb-4 text-sm">
                    <input className="field !py-1.5" type="number" placeholder="0" value={range.min} onChange={(e) => setRange({ ...range, min: e.target.value })} />{t('To')}<input className="field !py-1.5" type="number" placeholder="1000" value={range.max} onChange={(e) => setRange({ ...range, max: e.target.value })} />
                    <button className="btn-primary !px-2.5 !py-1.5" onClick={() => set({ min_price: range.min, max_price: range.max })} aria-label={t('Apply price')}>{t('Go')}</button>
                </div>
                <div className="border-b border-line py-3"><p className="mb-2 text-sm font-semibold">{t('Sort By')}</p>
                    <select className="field" value={sp.get('sort') ?? ''} onChange={(e) => set({ sort: e.target.value })}>
                        <option value="">{t('Default Sorting')}</option><option value="price_asc">{t('Price: Low to High')}</option>
                        <option value="price_desc">{t('Price: High to Low')}</option><option value="rating">{t('Top Rated')}</option><option value="newest">{t('Newest')}</option></select></div>
                <Toggle label={t('Digital Products')} k="digital" /><Toggle label={t('Preorder Products')} k="preorder" />
                <ul className="space-y-2 border-t border-line pt-3 text-sm">
                    {cats.map((c) => <li key={c.id}><label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" checked={selected.includes(c.slug)} onChange={() => toggleCat(c.slug)} />{(lang === 'ar' && c.name_ar) || c.name}</label></li>)}
                </ul>
            </aside>
            <section>
                <div className="mb-4 flex items-center justify-between text-sm text-muted">
                    <span>{sp.get('search') ? t('Results for “{q}”', { q: sp.get('search') }) : t('All products')}</span>
                    {data && <span>{t('{n} items', { n: data.total })}</span>}
                </div>
                {isError ? <Empty title={t('Could not load products')} hint={t('Please try again.')} /> : (
                    <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
                        {!data ? Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-72" />) : data.data.map((p) => <ProductCard key={p.id} p={p} />)}
                    </div>
                )}
                {data?.data.length === 0 && <Empty title={t('No products match your filters')} hint={t('Try clearing some filters.')} />}
                <Pagination meta={data} onPage={(p) => set({ page: p })} />
            </section>
        </div>
    );
}
