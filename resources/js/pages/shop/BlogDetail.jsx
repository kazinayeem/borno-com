import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetBlogQuery } from '../../app/api';
import { Empty, Img } from '../../components/ui';
import { Html } from '../../components/RichText';
import { t } from '../../i18n';

export default function BlogDetail() {
    const { id } = useParams();
    const { data, isLoading, isError } = useGetBlogQuery(id);
    if (isLoading) return <div className="skeleton my-8 h-64" />;
    if (isError || !data) return <Empty title={t('Page not found')} />;
    return (
        <article className="mx-auto max-w-3xl py-8">
            <Link to="/blogs" className="text-sm text-primary">&larr; {t('Blog')}</Link>
            <span className="mt-4 block text-[11px] font-semibold uppercase text-primary">{data.category}</span>
            <h1 className="mt-1 mb-2 text-3xl font-semibold">{data.title}</h1>
            <p className="mb-6 text-xs text-muted">{new Date(data.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {t('{n} views', { n: data.views })}</p>
            {data.image_url && <Img src={data.image_url} alt={data.title} className="mb-6 max-h-[420px] w-full rounded-xl object-cover" />}
            <Html html={data.body || data.excerpt} />
        </article>
    );
}
