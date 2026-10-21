import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetCollectionQuery } from '../../app/api';
import ProductCard from '../../components/ProductCard';
import { Empty } from '../../components/ui';
import { Html } from '../../components/RichText';
import { t } from '../../i18n';

export default function CollectionPage() {
    const { slug } = useParams();
    const { data: c, isLoading, isError } = useGetCollectionQuery(slug);
    if (isLoading) return <div className="skeleton my-8 h-64" />;
    if (isError || !c) return <Empty title={t('Page not found')} />;
    return (
        <div className="py-6">
            <nav className="mb-3 text-sm"><Link to="/" className="text-muted hover:text-primary">{t('Home')}</Link> › <span>{c.title}</span></nav>
            <h1 className="text-2xl font-bold">{c.title}</h1>
            {c.description && <Html html={c.description} className="mt-2 max-w-3xl text-sm text-muted" />}
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">{c.products.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}</div>
            {c.products.length === 0 && <Empty title={t('No products found')} />}
        </div>
    );
}
