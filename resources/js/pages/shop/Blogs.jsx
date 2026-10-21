import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetBlogsQuery } from '../../app/api';
import { Empty, Icon, Pagination } from '../../components/ui';
import { t } from '../../i18n';

export default function Blogs() {
    const [f, setF] = useState({ search: '', category: '', sort: 'newest', page: 1 });
    const [q, setQ] = useState('');
    const { data, isLoading } = useGetBlogsQuery(f);
    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return (
        <div className="grid gap-6 py-6 lg:grid-cols-[1fr_280px]">
            <section>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {isLoading ? Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-72" />) : data.posts.data.map((p) => (
                        <article key={p.id} className="card overflow-hidden"><div className="grid h-40 place-items-center bg-surface text-gray-300"><Icon name="doc" size={48} /></div>
                            <div className="p-4"><span className="text-[11px] font-semibold uppercase text-primary">{p.category}</span>
                                <h3 className="mt-1 line-clamp-2 font-semibold"><Link to={`/blogs/${p.id}`} className="hover:text-primary">{p.title}</Link></h3><p className="mt-1 line-clamp-2 text-sm text-muted">{p.excerpt}</p>
                                <p className="mt-3 text-xs text-muted">{fmt(p.created_at)} · {t('{n} views', { n: p.views })}</p></div></article>))}
                </div>
                {data?.posts.data.length === 0 && <Empty title={t('No posts found')} />}
                <Pagination meta={data?.posts} onPage={(page) => setF({ ...f, page })} />
            </section>
            <aside className="space-y-5">
                <div className="card p-4"><p className="mb-2 font-semibold">{t('Search')}</p>
                    <form onSubmit={(e) => { e.preventDefault(); setF({ ...f, search: q, page: 1 }); }} className="flex gap-2"><input className="field" placeholder={t('Search blog...')} value={q} onChange={(e) => setQ(e.target.value)} /><button className="rounded-md bg-ink px-3 text-white"><Icon name="search" size={15} /></button></form></div>
                <div className="card p-4"><p className="mb-2 font-semibold">{t('Filter')}</p>
                    <select className="field" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value, page: 1 })}><option value="newest">{t('Newest First')}</option><option value="oldest">{t('Oldest First')}</option></select></div>
                <div className="card p-4"><p className="mb-2 font-semibold">{t('Categories')}</p>
                    <ul className="space-y-2 text-sm">{(data?.categories ?? []).map((c) => (
                        <li key={c.name}><button onClick={() => setF({ ...f, category: f.category === c.name ? '' : c.name, page: 1 })} className={`flex w-full justify-between ${f.category === c.name ? 'text-primary' : ''}`}>{c.name}<span className="text-muted">{c.count}</span></button></li>))}</ul></div>
                <div className="card p-4"><p className="mb-2 font-semibold">{t('Popular Posts')}</p>
                    <ul className="space-y-3 text-sm">{(data?.popular ?? []).map((p) => <li key={p.id}><p className="line-clamp-2 font-medium">{p.title}</p><span className="text-xs text-muted">{fmt(p.created_at)}</span></li>)}</ul></div>
            </aside>
        </div>
    );
}
