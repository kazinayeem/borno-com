import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, errorMessage, useAccountOrderQuery, useAccountOrdersQuery, useAccountSummaryQuery, useCancelMyOrderMutation, useChangeAccountPasswordMutation, useCustLogoutMutation, useDeleteAddressMutation, useGetAccountQuery, useGetAddressesQuery, useGetProductsQuery, useSaveAccountMutation, useSaveAddressMutation } from '../../../app/api';
import { customerLoggedOut, customerUpdated, pushToast } from '../../../app/slices';
import { Field, TextInput } from '../../../components/FormKit';
import { OrderBadge, ORDER_STATUSES, statusLabel } from '../../../components/OrderBadge';
import ProductCard from '../../../components/ProductCard';
import { Empty, Icon, Img, Modal, Pagination, money } from '../../../components/ui';

const date = (d, t) => (d ? new Date(d).toLocaleString('en-GB', t ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const notifier = (dispatch) => (r, ok) => { dispatch(r.error ? pushToast(errorMessage(r.error), 'error') : pushToast(ok)); return !r.error; };

export function AccountLayout() {
    const user = useSelector((s) => s.customer.user);
    const [logout] = useCustLogoutMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const out = async () => { await logout(); dispatch(customerLoggedOut()); dispatch(api.util.resetApiState()); navigate('/'); };
    const links = [['/account', 'Dashboard', 'grid', true], ['/account/orders', 'My Orders', 'bag'], ['/account/addresses', 'Addresses', 'home'], ['/account/profile', 'Profile & Password', 'user'], ['/wishlist', 'Wishlist', 'heart']];
    return (
        <div className="grid gap-6 py-6 lg:grid-cols-[240px_1fr] print:block">
            <aside className="card h-fit p-3 print:hidden">
                <div className="mb-2 flex items-center gap-3 border-b border-line px-2 pb-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">{user?.name?.[0]?.toUpperCase()}</span><span className="min-w-0"><b className="block truncate text-sm">{user?.name}</b><span className="block truncate text-xs text-muted">{user?.email}</span></span></div>
                <nav className="space-y-1">{links.map(([to, label, icon, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-primary-soft font-medium text-primary' : 'hover:bg-surface'}`}><Icon name={icon} size={16} />{label}</NavLink>)}
                    <button onClick={out} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"><Icon name="logout" size={16} />Sign out</button></nav>
            </aside>
            <section className="min-w-0"><Outlet /></section>
        </div>
    );
}

export function AccountHome() {
    const { data, isError } = useAccountSummaryQuery();
    const { data: me } = useGetAccountQuery();
    if (isError) return <Empty title="Could not load your account" />;
    return (
        <div>
            <h1 className="mb-4 text-xl font-semibold">Hello, {me?.name ?? '…'} 👋</h1>
            <div className="grid gap-4 sm:grid-cols-3">
                {[['Total orders', data?.orders], ['Total spent', data && money(data.spent)], ['Pending', data?.by_status?.pending ?? (data ? 0 : undefined)]].map(([l, v]) => <div key={l} className="card p-4"><p className="text-2xl font-bold">{v ?? '…'}</p><p className="text-sm text-muted">{l}</p></div>)}
            </div>
            <div className="card mt-5 p-4"><div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Recent orders</h2><Link to="/account/orders" className="text-sm text-primary">View all</Link></div>
                {data?.latest.length === 0 && <Empty title="No orders yet" hint="Your orders will show up here." />}
                {data?.latest.map((o) => <Link key={o.id} to={`/account/orders/${o.id}`} className="flex items-center justify-between border-t border-line py-3 text-sm hover:text-primary"><span><b>{o.number}</b> <span className="text-muted">· {date(o.created_at)}</span></span><span className="flex items-center gap-3"><OrderBadge status={o.status} /><b>{money(o.total)}</b></span></Link>)}</div>
        </div>
    );
}

export function AccountOrders() {
    const [f, setF] = useState({ page: 1, status: '' });
    const { data, isFetching, isError } = useAccountOrdersQuery({ page: f.page, status: f.status || undefined });
    return (
        <div>
            <h1 className="mb-4 text-xl font-semibold">My orders</h1>
            <div className="mb-4 flex flex-wrap gap-2">{['', ...ORDER_STATUSES].map((s) => <button key={s} onClick={() => setF({ page: 1, status: s })} className={`rounded-full border px-4 py-1.5 text-sm ${f.status === s ? 'border-ink font-medium' : 'border-line text-muted hover:border-primary'}`}>{s ? statusLabel(s) : 'All'}</button>)}</div>
            <div className={`card overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}>
                <table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-surface text-xs uppercase text-muted"><tr>{['Order', 'Date', 'Shop', 'Items', 'Total', 'Status', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                    <tbody>{data?.data.map((o) => <tr key={o.id} className="border-t border-line"><td className="px-4 py-3 font-medium">{o.number}</td><td className="px-4">{date(o.created_at)}</td><td className="px-4">{o.shop?.name}</td><td className="px-4">{o.items_count}</td><td className="px-4 font-medium">{money(o.total)}</td><td className="px-4"><OrderBadge status={o.status} /></td><td className="px-4"><Link to={`/account/orders/${o.id}`} className="text-primary">Details</Link></td></tr>)}</tbody></table>
                {!data && !isError && <div className="skeleton m-4 h-32" />}{isError && <Empty title="Could not load orders" />}{data?.data.length === 0 && <Empty title="No orders found" />}
            </div>
            <Pagination meta={data} onPage={(page) => setF({ ...f, page })} />
        </div>
    );
}

const FLOW = ['pending', 'confirm', 'processing', 'pickup', 'on_the_way', 'delivered'];

export function AccountOrderDetail() {
    const { id } = useParams();
    const { data: o, isLoading, isError } = useAccountOrderQuery(id);
    const [cancel, { isLoading: cancelling }] = useCancelMyOrderMutation();
    const dispatch = useDispatch();
    const notify = notifier(dispatch);
    if (isError) return <Empty title="Order not found" hint="It may belong to a different account." />;
    if (isLoading || !o) return <div className="skeleton h-72" />;
    const step = FLOW.indexOf(o.status);
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden"><Link to="/account/orders" className="text-sm text-muted hover:text-primary">← All orders</Link>
                <div className="flex gap-2"><button onClick={() => window.print()} className="btn-outline !py-2"><Icon name="doc" size={14} />Print invoice</button>
                    {o.status === 'pending' && <button disabled={cancelling} onClick={async () => { if (window.confirm('Cancel this order? Items go back into stock.')) notify(await cancel(o.id), 'Order cancelled'); }} className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">{cancelling ? 'Cancelling…' : 'Cancel order'}</button>}</div></div>
            <div className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-semibold">Order {o.number}</h1><p className="text-sm text-muted">Placed {date(o.created_at, true)} · {o.shop?.name}</p></div><OrderBadge status={o.status} /></div>
                {o.status === 'cancelled' ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">This order was cancelled.</p> : (
                    <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] sm:grid-cols-6 print:hidden">{FLOW.map((s, n) => <li key={s}><span className={`mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${n <= step ? 'bg-primary text-white' : 'bg-surface text-muted'}`}>{n + 1}</span><span className={n <= step ? 'font-medium' : 'text-muted'}>{statusLabel(s)}</span></li>)}</ol>)}
                <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="bg-surface text-xs uppercase text-muted"><tr>{['Item', 'Qty', 'Price', 'Total'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
                    <tbody>{o.items.map((i) => <tr key={i.id} className="border-t border-line"><td className="px-3 py-2"><span className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded bg-surface text-gray-300"><Img src={i.product?.image_url} alt="" className="h-full w-full object-cover" fallback={<Icon name="box" size={14} />} /></span>{i.name}</span></td><td className="px-3">{i.qty}</td><td className="px-3">{money(i.price)}</td><td className="px-3">{money(i.price * i.qty)}</td></tr>)}</tbody></table></div>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div className="text-sm"><h2 className="mb-1 font-semibold">Delivery address</h2><p>{o.address_name}</p><p className="text-muted">{o.shipping_address}{o.area ? `, ${o.area}` : ''}</p><p className="text-muted">{o.address_phone}</p><h2 className="mb-1 mt-3 font-semibold">Payment</h2><p className="text-muted">{o.payment_method} · {o.payment_status === 'paid' ? 'Paid' : 'Pay on delivery'}</p>{o.notes && <><h2 className="mb-1 mt-3 font-semibold">Notes</h2><p className="text-muted">{o.notes}</p></>}</div>
                    <dl className="ml-auto w-full max-w-[300px] space-y-1.5 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotal)}</dd></div><div className="flex justify-between"><dt>Discount</dt><dd>- {money(o.coupon_discount)}</dd></div><div className="flex justify-between"><dt>Delivery</dt><dd>{o.shipping ? money(o.shipping) : 'Free'}</dd></div><div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{money(o.total)}</dd></div></dl></div>
            </div>
        </div>
    );
}

function AddressModal({ initial, onClose }) {
    const [f, setF] = useState(initial ?? { name: '', phone: '', address_line: '', area: '', type: 'home', is_default: false });
    const [save, { isLoading, error }] = useSaveAddressMutation();
    const dispatch = useDispatch();
    const errs = error?.data?.errors ?? {};
    const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
    return (
        <Modal title={initial?.id ? 'Edit address' : 'Add address'} onClose={onClose}>
            <form onSubmit={async (e) => { e.preventDefault(); if (notifier(dispatch)(await save(f), 'Address saved')) onClose(); }}>
                <div className="grid gap-x-4 sm:grid-cols-2"><Field label="Full name" required error={errs.name?.[0]}><TextInput value={f.name} onChange={set('name')} /></Field><Field label="Phone" required error={errs.phone?.[0]}><TextInput value={f.phone} onChange={set('phone')} /></Field></div>
                <Field label="Address" required error={errs.address_line?.[0]}><TextInput value={f.address_line} onChange={set('address_line')} /></Field>
                <div className="grid gap-x-4 sm:grid-cols-2"><Field label="Area / city"><TextInput value={f.area} onChange={set('area')} /></Field><Field label="Type"><select className="field" value={f.type} onChange={(e) => set('type')(e.target.value)}><option value="home">Home</option><option value="office">Office</option><option value="other">Other</option></select></Field></div>
                <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={!!f.is_default} onChange={(e) => set('is_default')(e.target.checked)} />Make this my default address</label>
                <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>Cancel</button><button disabled={isLoading} className="btn-primary">{isLoading ? 'Saving…' : 'Save'}</button></div>
            </form>
        </Modal>
    );
}

export function AccountAddresses() {
    const { data, isLoading, isError } = useGetAddressesQuery();
    const [del] = useDeleteAddressMutation();
    const [edit, setEdit] = useState(null);
    const dispatch = useDispatch();
    if (isError) return <Empty title="Could not load addresses" />;
    return (
        <div>
            <div className="mb-4 flex items-center justify-between"><h1 className="text-xl font-semibold">Addresses</h1><button className="btn-primary !py-2" onClick={() => setEdit({})}><Icon name="plus" size={14} />Add address</button></div>
            {isLoading && <div className="skeleton h-28" />}
            {data?.length === 0 && <Empty title="No saved addresses" hint="Add one to speed up checkout." />}
            <div className="grid gap-4 sm:grid-cols-2">{data?.map((a) => (
                <div key={a.id} className="card p-4 text-sm"><div className="mb-1 flex items-center justify-between"><b>{a.name}</b><span className="flex gap-2">{a.is_default && <span className="rounded bg-primary-soft px-2 py-0.5 text-[11px] text-primary">Default</span>}<span className="rounded bg-surface px-2 py-0.5 text-[11px] capitalize">{a.type}</span></span></div>
                    <p className="text-muted">{a.address_line}{a.area ? `, ${a.area}` : ''}</p><p className="text-muted">{a.phone}</p>
                    <div className="mt-3 flex gap-3 text-xs"><button className="text-primary" onClick={() => setEdit(a)}>Edit</button><button className="text-red-500" onClick={async () => { if (window.confirm('Delete this address?')) notifier(dispatch)(await del(a.id), 'Address deleted'); }}>Delete</button></div></div>))}</div>
            {edit && <AddressModal initial={edit.id ? edit : null} onClose={() => setEdit(null)} />}
        </div>
    );
}

export function AccountProfile() {
    const { data: me } = useGetAccountQuery();
    const [save, { isLoading, error }] = useSaveAccountMutation();
    const [changePw, { isLoading: changing, error: pwError }] = useChangeAccountPasswordMutation();
    const [f, setF] = useState(null);
    const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
    const dispatch = useDispatch();
    React.useEffect(() => { if (me) setF({ name: me.name ?? '', phone: me.phone ?? '', gender: me.gender ?? '', birth_date: me.birth_date?.slice(0, 10) ?? '' }); }, [me]);
    if (!f) return <div className="skeleton h-72" />;
    const e1 = error?.data?.errors ?? {};
    const e2 = pwError?.data?.errors ?? {};
    return (
        <div className="max-w-2xl space-y-5">
            <h1 className="text-xl font-semibold">Profile & password</h1>
            <form className="card p-5" onSubmit={async (e) => { e.preventDefault(); const r = await save({ ...f, gender: f.gender || null, birth_date: f.birth_date || null }); if (notifier(dispatch)(r, 'Profile updated')) dispatch(customerUpdated(r.data)); }}>
                <div className="grid gap-x-4 sm:grid-cols-2">
                    <Field label="Name" required error={e1.name?.[0]}><TextInput value={f.name} onChange={(v) => setF({ ...f, name: v })} /></Field>
                    <Field label="Email" hint="Your email can't be changed."><input className="field bg-surface" value={me.email} disabled readOnly /></Field>
                    <Field label="Phone" error={e1.phone?.[0]}><TextInput value={f.phone} onChange={(v) => setF({ ...f, phone: v })} /></Field>
                    <Field label="Gender"><select className="field" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select></Field>
                    <Field label="Date of birth" error={e1.birth_date?.[0]}><TextInput type="date" value={f.birth_date} onChange={(v) => setF({ ...f, birth_date: v })} /></Field></div>
                <button disabled={isLoading} className="btn-primary">{isLoading ? 'Saving…' : 'Save changes'}</button></form>
            <form className="card p-5" onSubmit={async (e) => { e.preventDefault(); if (notifier(dispatch)(await changePw(pw), me.has_password ? 'Password changed' : 'Password set')) setPw({ current_password: '', password: '', password_confirmation: '' }); }}>
                <h2 className="mb-3 font-semibold">{me.has_password ? 'Change password' : 'Set a password'}</h2>
                {!me.has_password && <p className="mb-3 text-xs text-muted">You signed up with Google. Set a password if you also want to sign in with your email.</p>}
                {me.has_password && <Field label="Current password" required error={e2.current_password?.[0]}><TextInput type="password" autoComplete="current-password" value={pw.current_password} onChange={(v) => setPw({ ...pw, current_password: v })} /></Field>}
                <div className="grid gap-x-4 sm:grid-cols-2"><Field label="New password" required error={e2.password?.[0]} hint="At least 8 characters."><TextInput type="password" autoComplete="new-password" value={pw.password} onChange={(v) => setPw({ ...pw, password: v })} /></Field>
                    <Field label="Confirm password" required><TextInput type="password" autoComplete="new-password" value={pw.password_confirmation} onChange={(v) => setPw({ ...pw, password_confirmation: v })} /></Field></div>
                <button disabled={changing} className="btn-primary">{changing ? 'Saving…' : me.has_password ? 'Update password' : 'Set password'}</button></form>
        </div>
    );
}

export function Wishlist() {
    const ids = useSelector((s) => s.shop.wishlist);
    const { data, isFetching } = useGetProductsQuery({ ids: ids.join(','), per_page: 48 }, { skip: ids.length === 0 });
    return (
        <div className="py-6"><h1 className="mb-4 text-xl font-semibold">Wishlist</h1>
            {ids.length === 0 ? <Empty title="Your wishlist is empty" hint="Tap the heart on a product to save it here." /> : (
                <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 ${isFetching ? 'opacity-60' : ''}`}>{data?.data.map((p) => <ProductCard key={p.id} p={p} />)}</div>)}
        </div>
    );
}
