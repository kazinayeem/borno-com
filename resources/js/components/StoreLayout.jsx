import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetCategoriesQuery, useGetHomeQuery, useGetMasterQuery } from '../app/api';
import { setCurrency, setLang, toggleTheme } from '../app/slices';
import { applyCurrency, Icon, Img, money } from './ui';
import { LANGS, t } from '../i18n';

const nav = [['/', 'Home'], ['/products', 'Products'], ['/shops', 'Shops'], ['/brands', 'Brands'], ['/contact-us', 'Contact'], ['/blogs', 'Blogs']];

function TopBar() {
    const dispatch = useDispatch();
    const lang = useSelector((s) => s.ui.lang);
    const code = useSelector((s) => s.shop.currency);
    const { data: master } = useGetMasterQuery();
    const currencies = master?.data?.currencies ?? [];
    const currentCur = currencies.find((c) => c.name === code) ?? currencies[0];
    const [open, setOpen] = useState(false);
    const [curOpen, setCurOpen] = useState(false);
    const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];
    return (
        <div className="border-b border-line text-[13px] text-ink print:hidden">
            <div className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2"><Icon name="truck" size={14} className="text-primary" /> {t('Free Delivery on orders over $999.00')}</span>
                <div className="hidden items-center gap-6 md:flex">
                    <Link to="/best-deal">{t('Daily Deals')}</Link><Link to="/pages/refund-policy">{t('Easy Returns')}</Link><Link to="/contact-us">{t('Help Center')}</Link>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <button type="button" aria-expanded={open} aria-label={t('Language')} onClick={() => setOpen(!open)} className="flex items-center gap-1">{current.short} <Icon name="chevron" size={12} /></button>
                        {open && <ul className="card absolute right-0 z-30 mt-2 w-36 p-1 shadow-lg">{LANGS.map((l) => <li key={l.code}><button type="button" className="w-full rounded px-3 py-2 text-left hover:bg-primary-soft" onClick={() => { dispatch(setLang(l.code)); setOpen(false); }}>{l.name}</button></li>)}</ul>}
                    </div>
                    <div className="relative">
                        <button type="button" aria-expanded={curOpen} aria-label={t('Currency')} onClick={() => setCurOpen(!curOpen)} className="flex items-center gap-1">{currentCur ? `${currentCur.symbol} ${currentCur.name}` : t('$ USD')} <Icon name="chevron" size={12} /></button>
                        {curOpen && <ul className="card absolute right-0 z-30 mt-2 w-32 p-1 shadow-lg">{currencies.map((c) => <li key={c.name}><button type="button" className="w-full rounded px-3 py-2 text-left hover:bg-primary-soft" onClick={() => { dispatch(setCurrency(c.name)); setCurOpen(false); }}>{c.symbol} {c.name}</button></li>)}</ul>}
                    </div>
                    <button type="button" aria-label={t('Switch to Dark')} onClick={() => dispatch(toggleTheme())}><Icon name="moon" size={15} /></button>
                </div>
            </div>
        </div>
    );
}

function CategoryMenu() {
    const { data = [] } = useGetCategoriesQuery();
    const lang = useSelector((s) => s.ui.lang);
    const [open, setOpen] = useState(false);
    return (
        <div className="relative" onMouseLeave={() => setOpen(false)}>
            <button onClick={() => setOpen(!open)} onMouseEnter={() => setOpen(true)} className="btn-primary !px-4 !py-2.5">
                <Icon name="menu" size={16} /> {t('All Categories')} <Icon name="chevron" size={14} />
            </button>
            {open && (
                <ul className="card absolute left-0 top-full z-30 w-64 p-2 shadow-lg">
                    {data.map((c) => (
                        <li key={c.id}><Link onClick={() => setOpen(false)} to={`/products?category_slug=${c.slug}`} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-primary-soft"><span className="flex items-center gap-2"><Img src={c.image_url} alt="" className="h-5 w-5 rounded object-cover" />{(lang === 'ar' && c.name_ar) || c.name}</span><Icon name="right" size={14} /></Link></li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function Header() {
    const { data: master } = useGetMasterQuery();
    const links = nav.filter(([to]) => to !== '/shops' || master?.data?.multi_vendor);
    const [q, setQ] = useState('');
    const navigate = useNavigate();
    const { cart, wishlist } = useSelector((s) => s.shop);
    const signedIn = useSelector((s) => !!s.customer.token);
    const qtyInCart = cart.reduce((a, i) => a + i.qty, 0);
    const submit = (e) => { e.preventDefault(); navigate(`/products?search=${encodeURIComponent(q)}`); };
    return (
        <header className="mx-auto max-w-[1320px] px-4 print:hidden">
            <div className="flex items-center gap-4 py-4">
                <Link to="/"><img src="/assets/logo.png" alt={t('ReadyEcommerce')} className="h-12 w-auto" /></Link>
                <form onSubmit={submit} className="mx-auto flex w-full max-w-xl overflow-hidden rounded-md border border-line shadow-sm">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search for products, brands and more...')} className="min-w-0 flex-1 px-4 py-2.5 text-sm outline-none" />
                    <button className="bg-primary px-5 text-white" aria-label={t('Search')}><Icon name="search" /></button>
                </form>
                <div className="ml-auto flex items-center gap-3">
                    {[['heart', wishlist.length, '/wishlist'], ['bag', qtyInCart, '/cart']].map(([i, n, to]) => (
                        <Link key={i} to={to} className="relative grid h-10 w-10 place-items-center rounded-full border border-line"><Icon name={i} />
                            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">{n}</span></Link>
                    ))}
                    <Link to={signedIn ? '/account' : '/login'} className="grid h-10 w-10 place-items-center rounded-full border border-line" aria-label={signedIn ? t('My account') : t('Sign in')}><Icon name="user" /></Link>
                </div>
            </div>
            <div className="flex items-center gap-8 pb-3">
                <CategoryMenu />
                <nav className="flex gap-6 overflow-x-auto text-[15px]">
                    {links.map(([to, label]) => (
                        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `whitespace-nowrap border-b-2 pb-1 ${isActive ? 'border-primary text-primary' : 'border-transparent hover:text-primary'}`}>{t(label)}</NavLink>
                    ))}
                </nav>
            </div>
        </header>
    );
}

const footerLinks = {
    'All Products': '/products', 'Digital Products': '/products?digital=1', 'Top Rated Products': '/most-popular', 'Best Deals': '/best-deal',
    'Help Center': '/contact-us', 'Easy Returns': '/pages/refund-policy', 'Shipping Policy': '/pages/refund-policy', 'Payment Methods': '/pages/faq', 'FAQ': '/pages/faq', 'Contact Us': '/contact-us',
    'About Us': '/pages/about-us', 'Blog': '/blogs', 'Terms & Conditions': '/pages/terms-conditions', 'Privacy Policy': '/pages/privacy-policy', 'Return & Refund Policy': '/pages/refund-policy', 'Become a Seller': '/admin/login',
};

function Footer() {
    const { data: master } = useGetMasterQuery();
    const { data: home } = useGetHomeQuery();
    const company = ['About Us', 'Blog', 'Terms & Conditions', 'Privacy Policy', 'Return & Refund Policy', ...(master?.data?.multi_vendor ? ['Become a Seller'] : [])];
    const cols = [
        ['Shop', ['All Products', 'Digital Products', 'Top Rated Products', 'Best Deals']],
        ['Customer Service', ['Help Center', 'Easy Returns', 'Shipping Policy', 'Payment Methods', 'FAQ', 'Contact Us']],
        ['Company', company],
    ];
    const phone = master?.data?.mobile || '+880123456789';
    const email = master?.data?.email || 'admin@example.com';
    return (
        <footer className="mt-16 bg-surface print:hidden">
            <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 md:grid-cols-4">
                <div><img src="/assets/logo.png" alt="" className="h-12" />
                    <p className="mt-3 text-sm text-muted">{t('The ultimate all-in-one solution for your eCommerce business worldwide.')}</p>
                    <p className="mt-3 text-sm">{phone}<br />{email}</p>
                    {(home?.social ?? []).length > 0 && <div className="mt-3 flex gap-3 text-sm">{home.social.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="text-primary">{s.title}</a>)}</div>}
                </div>
                {cols.map(([h, items]) => (
                    <div key={h}><h4 className="mb-3 font-semibold">{t(h)}</h4>
                        <ul className="space-y-2 text-sm text-muted">{items.map((i) => <li key={i}><Link to={footerLinks[i] || '/contact-us'} className="hover:text-primary">{t(i)}</Link></li>)}</ul></div>
                ))}
            </div>
            {master?.data?.show_download_app && <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-4 pb-8">
                <div><h4 className="mb-2 font-semibold">{t('Download Our App')}</h4>
                    <div className="flex gap-2"><a href={master.data.app_store_link || '#'}><img src="/assets/icons/app-store.png" alt={t('App Store')} className="h-10" /></a><a href={master.data.google_playstore_link || '#'}><img src="/assets/icons/play-store.png" alt={t('Google Play')} className="h-10" /></a></div></div>
                <div><h4 className="mb-2 font-semibold">{t('Accepted Payment Methods')}</h4><p className="text-sm text-muted">{t('Cash on delivery, cards, and mobile wallets')}</p></div>
            </div>}
            <div className="border-t border-line py-4 text-center text-sm text-muted">{t('© 2026 All right reserved by company')}</div>
        </footer>
    );
}

function MiniCart() {
    const cart = useSelector((s) => s.shop.cart);
    const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
    return (
        <Link to="/cart" aria-label={t('Open cart')} className="fixed right-0 top-1/2 z-20 block w-14 overflow-hidden rounded-l-lg border border-r-0 border-line bg-sa-surface text-center text-xs shadow-md print:hidden">
            <div className="py-2 text-primary"><Icon name="bag" fill className="mx-auto" /><div className="text-ink">{cart.reduce((a, i) => a + i.qty, 0)}</div></div>
            <div className="bg-primary py-1 font-semibold text-white">{money(total)}</div>
        </Link>
    );
}

export default function StoreLayout() {
    const code = useSelector((s) => s.shop.currency);
    const { data: master } = useGetMasterQuery();
    const current = (master?.data?.currencies ?? []).find((c) => c.name === code) ?? master?.data?.currencies?.[0];
    if (current) applyCurrency(current, master?.data?.currency?.position);
    return (
        <>
            <TopBar /><Header />
            <main className="mx-auto min-h-[60vh] max-w-[1320px] px-4"><Outlet key={`${code}-${master?.data?.currency?.position ?? 'prefix'}`} /></main>
            <Footer /><MiniCart />
        </>
    );
}
