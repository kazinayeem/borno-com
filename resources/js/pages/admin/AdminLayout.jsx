import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, usePermissionsCatalogQuery, useGetBellQuery, useGetDashboardQuery, useGetGroupQuery, useGetMasterQuery, useLogoutMutation, useReadAllNotificationsMutation } from '../../app/api';
import { loggedOut, setLang, toggleTheme } from '../../app/slices';
import { fdate, SaIcon } from '../../components/sa';
import { menu, shopMenu, toRoute } from './spec/engine';
import { PageTransition } from '../../components/Motion';
import { applyCurrency } from '../../components/ui';

// Staff roles: hide sidebar pages whose section the role cannot view (the API enforces it as well).
const needsAdd = (label, path) => /^add\b/i.test(String(label ?? '')) || /\/(create|add)(\b|-|\/|$)/i.test(String(path));
const canSeePath = (perms, cat, path, label) => {
    if (!perms || !cat) return true;
    const p = toRoute(String(path).split('?')[0]);
    if (p === '/admin' || p === '/admin/') return true;          // the dashboard is open to every staff member
    for (const m of cat.modules) for (const prefix of m.ui) if (p === prefix || p.startsWith(prefix)) return (perms[m.key] ?? []).includes('view') && (!needsAdd(label, path) || (perms[m.key] ?? []).includes('add'));
    return (perms.settings ?? []).includes('view'); // unmapped pages behave like the API: administrative settings
};
import { LANGS, t } from '../../i18n';

// Sellers live under /shop. A few hand-built screens still sit on /admin (order detail, product edit, POS).
const shopOk = (p) => p === '/shop' || p.startsWith('/shop/') || ['/admin/orders', '/admin/products', '/admin/pos', '/admin/product/'].some((a) => p === a || p.startsWith(a));
const isActive = (to, loc) => {
    const [path, query] = to.split('?');
    if (loc.pathname !== path) return false;
    if (query) return loc.search === `?${query}`;
    if (path === '/admin/products' || path === '/shop/orders') return !loc.search;
    return true;
};
const ORDER_KEY = { Pending: 'pending', Confirm: 'confirm', Processing: 'processing', Pickup: 'pickup', 'On The Way': 'on_the_way', Delivered: 'delivered', Cancelled: 'cancelled' };

function Menu({ items, loc, filter, onNavigate, literal }) {
    const [open, setOpen] = useState(() => new Set());
    const toggle = (l) => setOpen((s) => { const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n; });
    const out = [];
    items.forEach((m, i) => {
        if (m.section) { if (!filter) out.push(<div key={`s${i}`} className="menu-section">{t(m.section)}</div>); return; }
        if (m.children) {
            const kids = m.children.map(([l, p]) => [l, literal ? p : toRoute(p)]).filter(([l]) => !filter || [l, t(l), m.label, t(m.label)].some((x) => x.toLowerCase().includes(filter)));
            if (!kids.length) return;
            const act = kids.some(([, p]) => isActive(p, loc));
            const isOpen = !!filter || act || open.has(m.label);
            out.push(
                <React.Fragment key={m.label}>
                    <button className={`menu-item ${isOpen ? 'open' : ''} ${act ? 'active' : ''}`} onClick={() => toggle(m.label)} aria-expanded={isOpen}>
                        <SaIcon name={m.icon} className="ic" /><span>{t(m.label)}</span>{m.addon && <em className="tag">{t('add-on')}</em>}<SaIcon name="chev" className="chev" />
                    </button>
                    <div className={`submenu ${isOpen ? 'open' : ''}`}>{kids.map(([l, p]) => <Link key={l} to={p} onClick={onNavigate} className={isActive(p, loc) ? 'active' : ''}>{t(l)}</Link>)}</div>
                </React.Fragment>,
            );
        } else if (!filter || [m.label, t(m.label)].some((x) => x.toLowerCase().includes(filter))) {
            const to = literal ? m.path : toRoute(m.path);
            out.push(<Link key={m.label} to={to} onClick={onNavigate} className={`menu-item ${isActive(to, loc) ? 'active' : ''}`}><SaIcon name={m.icon} className="ic" /><span>{t(m.label)}</span></Link>);
        }
    });
    return <nav className="menu">{out.length ? out : <div className="empty">{t('No menu found')}</div>}</nav>;
}

export default function AdminLayout() {
    const { token, user } = useSelector((s) => s.auth);
    const lang = useSelector((s) => s.ui.lang);
    const isAdmin = user?.role === 'admin';
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [q, setQ] = useState('');
    const [dd, setDd] = useState(null);                       // which dropdown is open: 'bell' | 'user' | null
    const theme = useSelector((s) => s.ui.theme);          // one theme for the whole app (the store persists it), so route changes never reset it
    const [logout] = useLogoutMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const loc = useLocation();
    const { data: bell } = useGetBellQuery(undefined, { skip: !isAdmin || !token, pollingInterval: 30000 });
    const [readAll] = useReadAllNotificationsMutation();
    const { data: dash } = useGetDashboardQuery(undefined, { skip: isAdmin || !token });
    const { data: business, isError: businessError } = useGetGroupQuery('business', { skip: !isAdmin || !token || (!!user?.permissions && !(user.permissions.settings ?? []).includes('view')) });
    const { data: master } = useGetMasterQuery();
    const perms = isAdmin ? user?.permissions : null;     // null/undefined = super admin
    const { data: cat } = usePermissionsCatalogQuery(undefined, { skip: !perms || !token });
    const brand = master?.data;
    // Admin amounts follow the store's default currency (Admin → Currency / General Settings); pages remount when it changes.
    const cur = master?.data?.currency;
    if (cur) applyCurrency(cur, cur.position);
    const curKey = cur ? `${cur.name}-${cur.symbol}-${cur.position}-${cur.rate}` : 'x';
    const logo = theme === 'dark' ? (brand?.web_dark_logo || brand?.web_logo) : brand?.web_logo;
    useEffect(() => { setDd(null); setMobileOpen(false); }, [loc.pathname]);
    useEffect(() => { const h = (e) => { if (!e.target.closest('.dropdown, [data-dd]')) setDd(null); }; document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

    const items = useMemo(() => {
        const restrictShops = isAdmin && (business ? business.shop_type !== 'multi' : !businessError);
        const hideAddShop = (list) => (restrictShops
            ? list.map((m) => (m.label === 'Shop' ? { ...m, children: m.children.filter(([label]) => label !== 'Add Shop') } : m))
            : list);
        if (isAdmin) {
            const base = hideAddShop(menu);
            if (!perms || !cat) return base;
            const kept = base.map((m) => (m.children ? { ...m, children: m.children.filter(([label, path]) => canSeePath(perms, cat, path, label)) } : m))
                .filter((m) => (m.children ? m.children.length > 0 : m.section || (m.path === '/admin' || canSeePath(perms, cat, m.path))));
            // drop section headings that no longer have anything under them
            return kept.filter((m, i) => !m.section || (kept[i + 1] && !kept[i + 1].section));
        }
        const counts = dash?.orders_by_status;
        if (!counts) return shopMenu;
        return shopMenu.map((m) => (m.label !== 'All Orders' ? m : {
            ...m,
            children: m.children.map(([label, path]) => {
                const n = label === 'All' ? dash.stats?.orders : counts[ORDER_KEY[label]];
                return [n == null ? label : `${label} ${n}`, path];
            }),
        }));
    }, [isAdmin, dash, business, businessError, perms, cat]);

    if (!token) return <Navigate to="/admin/login" replace />;
    if (perms && cat && !canSeePath(perms, cat, loc.pathname)) return <Navigate to="/admin" replace />;
    if (user?.role === 'shop' && (loc.pathname === '/admin' || !shopOk(loc.pathname))) return <Navigate to="/shop" replace />;
    const out = async () => { await logout(); dispatch(loggedOut()); dispatch(api.util.resetApiState()); navigate('/admin/login'); };
    const name = user?.name ?? '';
    const toggleSide = () => (window.matchMedia('(max-width:820px)').matches ? setMobileOpen((v) => !v) : setCollapsed((v) => !v));

    return (
        <div className="sa" data-theme={theme}>
            <div className={`layout ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                <aside className="sidebar print:hidden">
                    <div className="brand"><img src={logo || '/assets/logo.png'} alt={brand?.app_name || t('ReadyEcommerce')} style={{ height: 42, width: 'auto', maxWidth: 160, objectFit: 'contain' }} /></div>
                    <div className="menu-search"><SaIcon name="search" /><input aria-label={t('Search menu')} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search menu...')} /></div>
                    <Menu items={items} loc={loc} filter={q.trim().toLowerCase()} onNavigate={() => setMobileOpen(false)} literal={!isAdmin} />
                    <div className="sidebar-foot"><a href="https://readyecommerce.app/" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{t('v4.6.1')}</a></div>
                </aside>
                <div className="main">
                    <header className="topbar print:hidden">
                        <button className="icon-btn" aria-label={t('Toggle sidebar')} onClick={toggleSide}><SaIcon name="menu" /></button>
                        <div className="hello"><h2>{t('Welcome Back, {name}', { name })}</h2><p>{t('Monitor your business analytics and statistics.')}</p></div>
                        <div className="spacer" />
                        {(!perms || !cat || canSeePath(perms, cat, '/admin/pos')) && <Link to={loc.pathname.startsWith('/shop') ? '/shop/pos' : '/admin/pos'} className="btn primary sm" style={{ gap: 6 }}><SaIcon name="cart" /> {t('POS')}</Link>}
                        <button className="icon-btn" aria-label={t('Toggle dark mode')} onClick={() => dispatch(toggleTheme())}><SaIcon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
                        <div className="rel">
                            <button className="icon-btn" data-dd aria-label={t('Language')} aria-expanded={dd === 'lang'} onClick={() => setDd(dd === 'lang' ? null : 'lang')} style={{ width: 'auto', padding: '0 10px', fontSize: 13, fontWeight: 600 }}>{LANGS.find((l) => l.code === lang)?.short ?? 'EN'}</button>
                            {dd === 'lang' && <div className="dropdown" style={{ minWidth: 160 }}>{LANGS.map((l) => <button key={l.code} onClick={() => { dispatch(setLang(l.code)); setDd(null); }}>{l.name}</button>)}</div>}
                        </div>
                        {isAdmin && (
                            <div className="rel">
                                <button className="icon-btn" data-dd aria-label={t('Notifications')} aria-expanded={dd === 'bell'} onClick={() => setDd(dd === 'bell' ? null : 'bell')}>
                                    <SaIcon name="bell" />{bell?.count > 0 && <span className="badge-dot">{bell.count}</span>}
                                </button>
                                {dd === 'bell' && (
                                    <div className="dropdown" style={{ minWidth: 320 }}>
                                        <div className="row between" style={{ padding: '8px 12px' }}><b>{t('Notifications')}</b><button className="btn sm" style={{ width: 'auto' }} onClick={() => readAll()}>{t('Mark all as read')}</button></div>
                                        {bell?.notifications.length ? bell.notifications.map((n) => <Link key={n.id} className="n-item" to={toRoute(n.url || '/admin/notifications')}>{n.title}<small>{n.content} · {fdate(n.created_at)}</small></Link>) : <div className="empty">{t('No notifications')}</div>}
                                        <Link to="/admin/notifications" style={{ textAlign: 'center', color: 'var(--primary)' }}>{t('View All Notifications')}</Link>
                                    </div>)}
                            </div>)}
                        <div className="rel">
                            <button className="user-chip" data-dd aria-expanded={dd === 'user'} onClick={() => setDd(dd === 'user' ? null : 'user')}>
                                <span className="nm"><b>{user?.name}</b><small>{isAdmin ? t('Root') : t('Shop')}</small></span>
                                <img className="avatar" src={`/placeholder/${encodeURIComponent(user?.name ?? '?')}.svg?h=20`} alt="" />
                            </button>
                            {dd === 'user' && (
                                <div className="dropdown">
                                    {isAdmin && <Link to="/admin/profile">{t('Profile')}</Link>}
                                    {isAdmin && <Link to="/admin/settings">{t('Settings')}</Link>}
                                    {!isAdmin && <Link to="/shop/profile">{t('My Profile')}</Link>}
                                    <button onClick={out}>{t('Logout')}</button>
                                </div>)}
                        </div>
                    </header>
                    <main className="content"><PageTransition><Outlet key={curKey} /></PageTransition></main>
                </div>
            </div>
        </div>
    );
}
