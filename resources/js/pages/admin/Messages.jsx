import React, { useState } from 'react';
import { useGetMessagesQuery, useMarkMessageMutation } from '../../app/api';
import { Empty, Pagination } from '../../components/ui';

export default function Messages() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useGetMessagesQuery(page);
    const [mark] = useMarkMessageMutation();
    return (
        <div className="space-y-4"><h1 className="text-xl font-semibold">Messages</h1>
            {isLoading && <div className="skeleton h-40" />}
            {data?.data.map((m) => (
                <div key={m.id} className={`card p-4 ${m.read ? '' : 'border-primary/50'}`}>
                    <div className="flex justify-between"><b>{m.subject}</b>{!m.read && <button onClick={() => mark(m.id)} className="text-xs text-primary">Mark as read</button>}</div>
                    <p className="text-xs text-muted">{m.name} · {m.email}</p><p className="mt-2 text-sm">{m.message}</p></div>))}
            {data?.data.length === 0 && <Empty title="No messages yet" />}
            <Pagination meta={data} onPage={setPage} /></div>
    );
}
