import React, { useState } from 'react';
import { useShopCatalogQuery } from '../../app/api';
import { Card, PageHead, Pager } from '../../components/sa';
import { t } from '../../i18n';

const TITLES = {
    categories: 'Category', subcategories: 'Sub Category', brands: 'Brand', colors: 'Color', sizes: 'Size', units: 'Unit',
    'flash-sales': 'Flash Deals', coupons: 'Promo Code', banners: 'Banner Setup',
};

export default function ShopCatalog({ res }) {
    const [page, setPage] = useState(1);
    const { data, isError, isFetching } = useShopCatalogQuery({ res, page });
    const rows = data?.data ?? [];
    return (
        <>
            <PageHead title={t(TITLES[res] ?? res)} />
            <Card>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>{t('SL')}</th><th>{t('Name')}</th><th>{t('Status')}</th></tr></thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.id}>
                                <td>{((data.current_page ?? 1) - 1) * (data.per_page ?? 15) + i + 1}</td>
                                <td>{r.name || r.code || r.title || '—'}</td>
                                <td>{r.active === false || r.is_active === false ? t('Inactive') : t('Active')}</td>
                            </tr>
                        ))}
                        {!data && !isError && <tr><td colSpan={3} className="empty">{t('Loading…')}</td></tr>}
                        {isError && <tr><td colSpan={3} className="empty">{t('Could not load.')}</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={3} className="empty">{t('No Data Found')}</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
        </>
    );
}
