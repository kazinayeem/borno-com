import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetBrandsQuery } from '../../app/api';
import { Empty, Img } from '../../components/ui';

export default function Brands() {
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [letter, setLetter] = useState('');
    const { data = [], isLoading } = useGetBrandsQuery({ search, letter });
    return (
        <div className="pb-4">
            <h1 className="my-4 text-lg font-semibold">All Brands</h1>
            <div className="grid gap-6 lg:grid-cols-[256px_1fr]">
                <aside className="space-y-4">
                    <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="flex gap-2">
                        <input className="field" placeholder="Search brand..." value={q} onChange={(e) => setQ(e.target.value)} />
                        <button className="rounded-md bg-ink px-3 text-white">Go</button></form>
                    <div className="card p-4"><p className="mb-2 text-sm font-semibold">Alphabetical</p>
                        <div className="flex flex-wrap gap-1.5">
                            {[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l) => (
                                <button key={l} onClick={() => setLetter(letter === l ? '' : l)} className={`h-7 w-7 rounded text-xs ${letter === l ? 'bg-ink text-white' : 'bg-surface hover:bg-primary-soft'}`}>{l}</button>))}
                        </div></div>
                    <div className="card p-4 text-center text-sm"><p className="font-semibold">Become a Partner</p><Link to="/contact-us" className="btn-outline mt-2">Contact us</Link></div>
                </aside>
                <section><h2 className="mb-4 font-semibold">Featured Brands</h2>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {isLoading ? Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-36" />) : data.map((b) => (
                            <div key={b.id} className="card p-4 text-center"><div className="grid h-20 place-items-center text-2xl font-bold text-gray-300"><Img src={b.image_url} alt={b.name} className="max-h-full max-w-full object-contain" fallback={b.name[0]} /></div>
                                <p className="mb-2 text-sm font-semibold">{b.name}</p><Link to={`/products?brand_id=${b.id}`} className="btn-outline w-full">View</Link></div>))}
                    </div>
                    {!isLoading && data.length === 0 && <Empty title="No brands found" />}
                </section>
            </div>
        </div>
    );
}
