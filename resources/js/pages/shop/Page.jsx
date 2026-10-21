import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetPageQuery } from '../../app/api';
import { Empty } from '../../components/ui';
import { t } from '../../i18n';
import { Html } from '../../components/RichText';

export default function CmsPage() {
    const { slug } = useParams();
    const { data, isLoading, isError } = useGetPageQuery(slug);
    if (isLoading) return <div className="skeleton my-8 h-64" />;
    if (isError) return <Empty title={t('Page not found')} />;
    return (
        <article className="mx-auto max-w-3xl py-8">
            <h1 className="mb-4 text-3xl font-semibold">{data.title}</h1>
            {data.content ? <Html html={data.content} className="text-sm text-muted" /> : <p className="text-sm text-muted">{t('This page has no content yet. Add it from Admin → CMS → Pages.')}</p>}
        </article>
    );
}
