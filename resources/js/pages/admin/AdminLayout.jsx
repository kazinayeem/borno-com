import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, useGetDashboardQuery, useLogoutMutation } from '../../app/api';
import { loggedOut } from '../../app/slices';
import { Icon } from '../../components/ui';
import { BUILT, SELLER_MENU, menu, pages, resolvePage, stripQuery, toRoute } from './spec/engine';

const ICONS = { home: 'home', cart: 'bag', truck: 'truck', gift: 'box', pos: 'grid', refund: 'logout', chat: 'mail', grid: 'grid', box: 'box', layers: 'box', inbox: 'box', megaphone: 'star', chart: 'doc', bell: 'mail', image: 'doc', users: 'user', user: 'user', store: 'store', card: 'tag', help: 'mail', wallet: 'tag', swap: 'grid', pin: 'home', globe: 'grid', settings: 'grid', file: 'doc', plug: 'grid', shield: 'star', phone: 'mail', puzzle: 'box' };
const extraTitles = { '/admin/messages': 'Contact Messages', '/admin/settings': 'Admin Settings', '/admin/pos': 'Point of Sale (POS)', '/admin/pos/sales': 'POS Sales', '/admin/pos/draft': 'POS Draft', '/admin/product/create': 'Add New Product', '/admin/category/create': 'Create New Category', '/admin/shops/create': 'Add New Shop', '/admin/products': 'Product List', '/admin/riders': 'All Driver', '/admin/profile': 'Profile', '/admin/customers': 'All Customers' };
const reverse = Object.fromEntries(Object.entries(BUILT).map(([spec, mine]) => [stripQuery(mine), pages[stripQuery(spec)]?.title]).filter(([, t]) => t));
const shopOk = (p) => p === '/admin' || p === '/shop/profile' || ['/admin/orders', '/admin/products', '/admin/pos', '/admin/product/', '/admin/soon'].some((a) => p === a || p.startsWith(a + (a.endsWith('/') ? '' : '/')));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const isActive = (to, loc) => { const [path, query] = to.split('?'); return loc.pathname === path && (query ? loc.search === `?${query}` : !(path === '/admin/products' && loc.search)); };

function Group({ item, loc, onNavigate }) {
    const kids = item.children.map(([label, path]) => [label, toRoute(path)]);
    const active = kids.some(([, to]) => isActive(to, loc));
    const [open, setOpen] = useState(active);
    return (
        <div>
            <button onClick={() => setOpen(!open)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-[15px] ${active ? 'bg-[#fee5e8] text-primary' : 'text-[#556070] hover:bg-[#fff1f3]'}`}>
                <Icon name={ICONS[item.icon] ?? 'grid'} size={18} /><span className="flex-1 text-left">{item.label}</span>{item.addon && <Icon name="box" size={13} className="text-amber-500" />}<Icon name="chevron" size={13} className={open ? 'rotate-180' : ''} />
            </button>
            {open && <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/40 pl-3">{kids.map(([label, to]) => <Link key={label} to={to} onClick={onNavigate} className={`block rounded-md px-3 py-2 text-[13px] ${isActive(to, loc) ? 'bg-[#fee5e8] text-primary' : 'bg-[#f6f7f9] text-[#556070] hover:text-primary'}`}>{label}</Link>)}</div>}
        </div>
    );
}

export default function AdminLayout() {
    const { token, user } = useSelector((s) => s.auth);
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [logout] = useLogoutMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const loc = useLocation();
    const { data: dash } = useGetDashboardQuery(undefined, { skip: user?.role !== 'shop' || !token });
    const { pathname } = loc;
    const [userMenu, setUserMenu] = useState(false);
    useEffect(() => setUserMenu(false), [pathname]);

    const items = useMemo(() => {
        const ql = q.trim().toLowerCase();
        const list = [...menu, { label: 'Contact Messages', icon: 'mail', path: '/admin/messages' }, ...(user?.role === 'shop' ? [{ label: 'My Profile', icon: 'user', path: '/shop/profile' }] : [])];
        return list.filter((m) => !m.section || !ql).filter((m) => user?.role === 'admin' ? m.label !== 'My Profile' : [...SELLER_MENU, 'My Profile'].includes(m.label))
            .filter((m) => m.section || !ql || m.label.toLowerCase().includes(ql) || m.children?.some(([l]) => l.toLowerCase().includes(ql)));
    }, [q, user?.role]);

    if (!token) return <Navigate to="/admin/login" replace />;
    if (user?.role === 'shop' && !shopOk(pathname)) return <Navigate to="/admin" replace />;
    const out = async () => { await logout(); dispatch(loggedOut()); dispatch(api.util.resetApiState()); navigate('/admin/login'); };
    const title = extraTitles[pathname] ?? (/\/admin\/orders\/\d+\/show$/.test(pathname) ? 'Order Details' : null) ?? reverse[pathname] ?? resolvePage(pathname)?.title ?? (/\/edit$/.test(pathname) ? 'Edit' : 'Admin');

    return (
        <div className="min-h-screen bg-[#f6f7f9] text-[14px] print:bg-white">
            <aside className={`print:hidden fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col bg-white px-3 pt-[15px] transition-transform lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
                <img src="/assets/logo.png" alt="ReadyEcommerce" className="mx-auto mb-3 h-11 w-auto" />
                <div className="relative mb-3"><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu..." className="w-full rounded-lg border border-line py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
                <nav className="flex-1 space-y-1 overflow-y-auto pb-3">
                    {items.map((m, i) => m.section ? <p key={m.section + i} className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{m.section}</p>
                        : m.children ? <Group key={m.label} item={m} loc={loc} onNavigate={() => setOpen(false)} />
                            : <Link key={m.label} to={toRoute(m.path)} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-2 py-2.5 text-[15px] ${isActive(toRoute(m.path), loc) ? 'bg-[#fee5e8] text-primary' : 'text-[#556070] hover:bg-[#fff1f3]'}`}><Icon name={ICONS[m.icon] ?? 'grid'} size={18} />{m.label}</Link>)}
                </nav>
                <div className="flex items-center justify-between border-t border-line py-3 text-xs text-gray-500"><Icon name="grid" /><Icon name="user" /><Icon name="store" /><span>4.6.1</span></div>
            </aside>
            {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden print:hidden" onClick={() => setOpen(false)} />}
            <div className="lg:pl-[290px] print:!pl-0">
                <header className="print:hidden sticky top-0 z-20 flex h-[69px] items-center justify-between border-b border-line bg-white px-4">
                    <div className="flex items-center gap-4"><button onClick={() => setOpen(!open)} aria-label="Menu" className="text-primary"><Icon name="menu" size={26} /></button>
                        <div><h1 className="text-lg font-semibold">{pathname === '/admin' ? `Welcome Back, ${dash?.shop_name ?? user?.name}` : title}</h1>{pathname === '/admin' && <p className="text-xs text-muted">Monitor your business analytics and statistics.</p>}</div></div>
                    <div className="relative flex items-center gap-3">
                        <Link to="/admin/notifications" aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-full"><Icon name="mail" /><span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] text-white">9</span></Link>
                        <span className="hidden text-sm sm:block">EN</span>
                        <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 text-left"><span className="hidden sm:block"><b className="block text-sm leading-4">{user?.name}</b><span className="text-xs capitalize text-muted">{user?.role === 'admin' ? 'Root' : 'Shop'}</span></span>
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">{user?.name?.[0]}</span></button>
                        {userMenu && <div className="absolute right-0 top-12 w-44 rounded-lg border border-line bg-white p-1 shadow-lg">
                            {user?.role === 'admin' && <Link to="/admin/profile" className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-primary-soft"><Icon name="user" size={15} />Profile</Link>}
                            <button onClick={out} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-primary-soft"><Icon name="logout" size={15} />Logout</button></div>}
                    </div>
                </header>
                <main className="p-4 md:p-5 print:p-0"><Outlet /></main>
            </div>
        </div>
    );
}
