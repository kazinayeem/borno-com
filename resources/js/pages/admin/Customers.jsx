import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetCustomersQuery } from '../../app/api';
import { Card, CardH, fdate, PageHead, Pager, SaIcon, Thumb, useDebounced } from '../../components/sa';

export default function Customers() {
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const search = useDebounced(q);
    useEffect(() => setPage(1), [search]);
    const { data, isFetching, isError } = useGetCustomersQuery({ page, search: search || undefined });
    const rows = data?.data ?? [];
    return (
        <>
            <PageHead title="All Customer"><Link className="btn primary" to="/admin/customers/create"><SaIcon name="plus" /> Add New</Link></PageHead>
            <Card>
                <CardH><div className="toolbar" style={{ flex: 1 }}><input className="input" aria-label="Search customers" placeholder="Name or email…" style={{ minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} /></div></CardH>
                <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}><table>
                    <thead><tr><th>SL</th><th>Profile</th><th>Name</th><th>Phone</th><th>Email</th><th>Orders</th><th>Gender</th><th>Date of Birth</th></tr></thead>
                    <tbody>
                        {rows.map((c, i) => <tr key={c.id}><td>{(data.current_page - 1) * data.per_page + i + 1}</td><td><Thumb name={c.name} id={c.id} /></td><td>{c.name}</td><td>{c.phone ?? '--'}</td><td>{c.email}</td><td>{c.orders_count}</td><td>{c.gender ?? '--'}</td><td>{c.birth_date ? fdate(c.birth_date) : '--'}</td></tr>)}
                        {!data && !isError && <tr><td colSpan={8} className="empty">Loading…</td></tr>}
                        {isError && <tr><td colSpan={8} className="empty">Could not load customers.</td></tr>}
                        {data && rows.length === 0 && <tr><td colSpan={8} className="empty">No Data Found</td></tr>}
                    </tbody>
                </table></div>
                <Pager meta={data} count={rows.length} onPage={setPage} />
            </Card>
        </>
    );
}
