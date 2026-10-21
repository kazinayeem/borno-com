import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGetOrdersQuery } from '../../app/api';
import { ORDER_STATUSES, statusLabel } from '../../components/OrderBadge';
import { Card, CardH, fdt, money, PageHead, Pager, Pill, SaIcon, Tabs, useDebounced } from '../../components/sa';
import { t } from '../../i18n';

// Re-exported for the pages that still import them from here.
export const STATUSES = ORDER_STATUSES;
export const label = statusLabel;
export const Badge = ({ v }) => <Pill value={v} />;

export default function Orders() {
    const [sp] = useSearchParams();
    const initial = sp.get('status');
    const [tab, setTab] = useState(STATUSES.includes(initial) ? initial : 'All');
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const search = useDebounced(q);
    useEffect(() => setPage(1), [search, tab]);
    const { data, isFetching, isError } = useGetOrdersQuery({ page, search: search || undefined, status: tab === 'All' ? undefined : tab });
    const rows = data?.data ?? [];

    return (
        <>
            <PageHead title={t('Orders')} />
            <Tabs tabs={['All', ...STATUSES]} value={tab} onChange={setTab} label={(x) => (x === 'All' ? t('All') : statusLabel(x))} />
            <Card>
                <CardH><div className="toolbar" style={{ flex: 1 }}><input className="input" aria-label={t('Search orders')} placeholder={t('Order # or customer…')} style={{ minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} /></div></CardH>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>{t('SL')}</th><th>{t('Order ID')}</th><th>{t('Order Date')}</th><th>{t('Customer')}</th><th>{t('Shop')}</th><th>{t('Total Amount')}</th><th>{t('Payment')}</th><th>{t('Payment Method')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead>
                    <tbody>
                        {rows.map((o, i) => (
                            <tr key={o.id}>
                                <td>{(data.current_page - 1) * data.per_page + i + 1}</td><td>{o.number}</td><td>{fdt(o.created_at)}</td><td>{o.user?.name}</td><td>{o.shop?.name}</td>
                                <td>{money(o.total)}</td><td><span className="chip">{o.payment_status === 'paid' ? t('Paid') : t('Pending')}</span></td><td>{o.payment_method}</td><td><Pill value={o.status} /></td>
                                <td><div className="actions"><Link className="act" to={`/admin/orders/${o.id}/show`} title={t('View')} aria-label={t('View')}><SaIcon name="eye" /></Link><Link className="act" to={`/admin/orders/${o.id}/invoice`} title={t('Invoice')} aria-label={t('Invoice')}><SaIcon name="download" /></Link></div></td>
                            </tr>))}
                        {!data && !isError && <tr><td colSpan={10} className="empty">{t('Loading…')}</td></tr>}
                        {isError && <tr><td colSpan={10} className="empty">{t('Could not load orders.')}</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={10} className="empty">{t('No Data Found')}</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
        </>
    );
}
