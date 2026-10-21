import React, { useState } from 'react';
import { useGetCustomersQuery } from '../../app/api';
import { Empty, Pagination } from '../../components/ui';

export default function Customers() {
    const [page, setPage] = useState(1);
    const { data, isFetching, isError } = useGetCustomersQuery({ page });
    return (
        <div>
            <h2 className="mb-4 text-[22px] font-semibold">All Customers</h2>
            <div className="card overflow-x-auto rounded-xl !border-[#f4f4f4] p-3"><table className="w-full min-w-[720px] text-left text-sm">
                <thead><tr className="bg-[#f6f7f9] text-[13px]">{['SL.', 'Profile', 'Name', 'Phone', 'Email', 'Gender', 'Date of Birth'].map((h) => <th key={h} className="px-4 py-4">{h}</th>)}</tr></thead>
                <tbody className={isFetching ? 'opacity-50' : ''}>{data?.data.map((c, i) => (
                    <tr key={c.id} className="border-b border-[#f4f4f4] last:border-0"><td className="px-4 py-3">{(data.current_page - 1) * data.per_page + i + 1}</td>
                        <td className="px-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 font-bold text-amber-600">{c.name[0]}</span></td>
                        <td className="px-4">{c.name}</td><td className="px-4">{c.phone ?? '--'}</td><td className="px-4">{c.email}</td><td className="px-4">{c.gender ?? '--'}</td><td className="px-4">{c.birth_date?.slice(0, 10) ?? '--'}</td></tr>))}</tbody></table>
                {!data && !isError && <div className="skeleton m-4 h-40" />}{isError && <Empty title="Could not load customers" />}{data?.data.length === 0 && <Empty title="No customers found" />}</div>
            <Pagination meta={data} onPage={setPage} />
        </div>
    );
}
