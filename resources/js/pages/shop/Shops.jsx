import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetShopsQuery } from '../../app/api';
import { Empty, Img, Pagination } from '../../components/ui';
import { t } from '../../i18n';

export default function Shops() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useGetShopsQuery(page);
    return (
        <div className="pb-4">
            <p className="my-4 text-sm text-muted">{t('Explore all shops and shop the products you love')}</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {isLoading ? Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-52" />) : data.data.map((s) => (
                    <div key={s.id} className="card relative p-5 text-center">
                        <span className={`absolute end-3 top-3 rounded px-2 py-0.5 text-[10px] font-semibold text-white ${s.online ? 'bg-lime-600' : 'bg-slate-500'}`}>{s.online ? t('Online') : t('Offline')}</span>
                        <div className="mx-auto mb-2 grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-primary-soft text-xl font-bold text-primary"><Img src={s.image_url} alt={s.name} className="h-full w-full object-cover" fallback={s.name[0]} /></div>
                        <p className="font-semibold">{s.name}</p><p className="text-xs text-muted">{s.products_count}+</p>
                        <p className="my-1 text-xs text-muted">★ {s.rating} ({s.reviews_count})</p>
                        <Link to={`/products?shop_id=${s.id}`} className="btn-outline w-full">→</Link>
                    </div>
                ))}
            </div>
            {data?.data.length === 0 && <Empty title={t('No shops yet')} />}
            <Pagination meta={data} onPage={setPage} />
        </div>
    );
}
