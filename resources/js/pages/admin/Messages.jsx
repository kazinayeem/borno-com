import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { errorMessage, useGetMessagesQuery, useMarkMessageMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Card, CardB, CardH, fdt, PageHead, Pager } from '../../components/sa';
import { t } from '../../i18n';

export default function Messages() {
    const [page, setPage] = useState(1);
    const { data, isError } = useGetMessagesQuery(page);
    const [mark] = useMarkMessageMutation();
    const dispatch = useDispatch();
    const rows = data?.data ?? [];
    return (
        <>
            <PageHead title={t('Contact Messages')} />
            {isError && <Card><div className="empty">{t('Could not load messages.')}</div></Card>}
            {!data && !isError && <Card><div className="empty">{t('Loading…')}</div></Card>}
            {data && rows.length === 0 && <Card><div className="empty">{t('No Data Found')}</div></Card>}
            {rows.map((m) => (
                <Card key={m.id}>
                    <CardH><h3 style={{ flex: 1 }}>{m.subject} {!m.read && <span className="pill s-pending">{t('New')}</span>}</h3><span className="muted">{fdt(m.created_at)}</span>
                        {!m.read && <button className="btn sm" onClick={async () => { const r = await mark(m.id); dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(t('Marked as read'))); }}>{t('Mark as read')}</button>}</CardH>
                    <CardB><div className="muted" style={{ marginBottom: 8 }}>{m.name} · {m.email}</div><div>{m.message}</div></CardB>
                </Card>))}
            {data && <Card><Pager meta={data} count={rows.length} onPage={setPage} /></Card>}
        </>
    );
}
