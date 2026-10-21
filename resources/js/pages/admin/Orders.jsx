import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGetOrdersQuery } from '../../app/api';
import { ORDER_STATUSES, statusLabel } from '../../components/OrderBadge';
import { Card, CardH, fdt, money, PageHead, Pager, Pill, SaIcon, Tabs, useDebounced } from '../../components/sa';
import { t } from '../../i18n';

// Re-exported for the pages that still import them from here.
export const STATUSES = ORDER_STATUSES;
export const label = statusLabel;
export const Badge = ({ v }) => <Pill value={v} />;

export default function Orders() {
    const { status: pathStatus } = useParams();
    const [sp] = useSearchParams();
    const fromUrl = (pathStatus || sp.get('status') || '').toLowerCase();
    const [tab, setTab] = useState(STATUSES.includes(fromUrl) ? fromUrl : 'All');
    useEffect(() => setTab(STATUSES.includes(fromUrl) ? fromUrl : 'All'), [fromUrl]);
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
                    <thead><tr><th>{t('Order ID')}</th><th>{t('Order Date')}</th><th>{t('Customer')}</th><th>{t('Shop')}</th><th>{t('Total Amount')}</th><th>{t('Payment Method')}</th><th>{t('Action')}</th></tr></thead>
                    <tbody>
                        {rows.map((o) => (
                            <tr key={o.id}>
                                <td>{o.number}</td><td>{fdt(o.created_at)}</td><td>{o.buyer?.name ?? o.user?.name}{o.buyer?.guest ? <small className="muted"> ({t('guest')})</small> : null}</td><td>{o.shop?.name}</td>
                                <td>{money(o.total)}<br /><span className="chip">{o.payment_status === 'paid' ? t('Paid') : t('Pending')}</span></td>
                                <td>{o.payment_method}</td>
                                <td><div className="actions"><Link className="act" to={`/admin/orders/${o.id}/show`} title={t('view details')} aria-label={t('view details')}><SaIcon name="eye" /></Link><Link className="act" to={`/admin/orders/${o.id}/invoice`} title={t('Download Invoice')} aria-label={t('Download Invoice')}><SaIcon name="download" /></Link></div></td>
                            </tr>))}
                        {!data && !isError && <tr><td colSpan={7} className="empty">{t('Loading…')}</td></tr>}
                        {isError && <tr><td colSpan={7} className="empty">{t('Could not load orders.')}</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={7} className="empty">{t('No Data Found')}</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
        </>
    );
}
