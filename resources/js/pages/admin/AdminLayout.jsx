import React, { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, useLogoutMutation } from '../../app/api';
import { loggedOut } from '../../app/slices';
import { Icon } from '../../components/ui';
import { menu } from './menu';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const titles = { '/admin': 'Dashboard', '/admin/orders': 'Orders', '/admin/categories': 'Categories', '/admin/products': 'Product List', '/admin/brands': 'Brands', '/admin/customers': 'All Customers', '/admin/shops': 'All Shops', '/admin/blogs': 'Blogs', '/admin/messages': 'Contact Us', '/admin/product/create': 'Add New Product', '/admin/category/create': 'Create New Category', '/admin/shops/create': 'Add New Shop' };
const shopAllowed = ['/admin', '/admin/orders', '/admin/products'];

function Group({ item, pathname, onNavigate }) {
    const kids = item.children.map((c) => (Array.isArray(c) ? c : [c, `/admin/soon/${slug(item.label)}-${slug(c)}`]));
    const active = kids.some(([, to]) => to === pathname);
    const [open, setOpen] = useState(active);
    return (
        <div>
            <button onClick={() => setOpen(!open)} className={`menu flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-[15px] ${active ? 'bg-[#fee5e8] text-primary' : 'text-[#556070] hover:bg-[#fff1f3]'}`}>
                <Icon name={item.icon} size={18} /><span className="flex-1 text-left">{item.label}</span><Icon name="chevron" size={13} className={open ? 'rotate-180' : ''} />
            </button>
            {open && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/40 pl-3">
                    {kids.map(([label, to]) => (
                        <NavLink key={to} to={to} end onClick={onNavigate} className={({ isActive }) => `block rounded-md px-3 py-2 text-[13px] ${isActive ? 'bg-[#fee5e8] text-primary' : 'bg-[#f6f7f9] text-[#556070] hover:text-primary'}`}>{label}</NavLink>
                    ))}
                </div>
            )}
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
    const { pathname } = useLocation();
    const [userMenu, setUserMenu] = useState(false);
    useEffect(() => setUserMenu(false), [pathname]);
    if (!token) return <Navigate to="/admin/login" replace />;
    if (user?.role === 'shop' && pathname.startsWith('/admin') && !shopAllowed.includes(pathname) && !pathname.startsWith('/admin/soon')) return <Navigate to="/admin" replace />;
    const out = async () => { await logout(); dispatch(loggedOut()); dispatch(api.util.resetApiState()); navigate('/admin/login'); };
    const items = menu.filter((m) => user?.role === 'admin' || m.to === '/admin' || m.to === '/admin/orders' || m.label === 'Product').filter((m) => !q || m.label.toLowerCase().includes(q.toLowerCase()) || m.children?.some((c) => (Array.isArray(c) ? c[0] : c).toLowerCase().includes(q.toLowerCase())));
    const title = titles[pathname] ?? (/\/edit$/.test(pathname) ? 'Edit' : null) ?? (pathname.startsWith('/admin/soon') ? 'Coming soon' : 'Admin');

    return (
        <div className="min-h-screen bg-[#f6f7f9] text-[14px]">
            <aside className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col bg-white px-3 pt-[15px] transition-transform lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
                <img src="/assets/logo.png" alt="ReadyEcommerce" className="mx-auto mb-3 h-11 w-auto" />
                <div className="relative mb-3"><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu..." className="w-full rounded-lg border border-line py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
                <nav className="flex-1 space-y-1 overflow-y-auto pb-3">
                    {items.map((m) => m.children ? <Group key={m.label} item={m} pathname={pathname} onNavigate={() => setOpen(false)} /> : (
                        <NavLink key={m.label} to={m.to ?? `/admin/soon/${slug(m.label)}`} end onClick={() => setOpen(false)} className={({ isActive }) => `menu flex items-center gap-3 rounded-lg px-2 py-2.5 text-[15px] ${isActive ? 'active bg-[#fee5e8] text-primary' : 'text-[#556070] hover:bg-[#fff1f3]'}`}><Icon name={m.icon} size={18} />{m.label}</NavLink>))}
                </nav>
                <div className="flex items-center justify-between border-t border-line py-3 text-xs text-gray-500"><Icon name="grid" /><Icon name="user" /><Icon name="store" /><span>4.6.1</span></div>
            </aside>
            {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
            <div className="lg:pl-[290px]">
                <header className="sticky top-0 z-20 flex h-[69px] items-center justify-between border-b border-line bg-white px-4">
                    <div className="flex items-center gap-4"><button onClick={() => setOpen(!open)} aria-label="Menu" className="text-primary"><Icon name="menu" size={26} /></button>
                        <div><h1 className="text-lg font-semibold">{pathname === '/admin' ? `Welcome Back, ${user?.name}` : title}</h1>{pathname === '/admin' && <p className="text-xs text-muted">Monitor your business analytics and statistics.</p>}</div></div>
                    <div className="relative flex items-center gap-3">
                        <span className="relative grid h-9 w-9 place-items-center rounded-full"><Icon name="mail" /><span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] text-white">9</span></span>
                        <span className="hidden text-sm sm:block">EN</span>
                        <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 text-left"><span className="hidden sm:block"><b className="block text-sm leading-4">{user?.name}</b><span className="text-xs capitalize text-muted">{user?.role === 'admin' ? 'Root' : 'Shop'}</span></span>
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">{user?.name?.[0]}</span></button>
                        {userMenu && <div className="absolute right-0 top-12 w-44 rounded-lg border border-line bg-white p-1 shadow-lg"><button onClick={out} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-primary-soft"><Icon name="logout" size={15} />Logout</button></div>}
                    </div>
                </header>
                <main className="p-4 md:p-5"><Outlet /></main>
            </div>
        </div>
    );
}
