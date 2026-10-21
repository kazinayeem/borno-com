import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetCategoriesQuery, useGetHomeQuery, useGetMasterQuery } from '../app/api';
import { setCurrency, setLang, toggleTheme } from '../app/slices';
import { applyCurrency, Icon, Img, money } from './ui';
import { LANGS, t } from '../i18n';

const nav = [['/', 'Home'], ['/products', 'Products'], ['/shops', 'Shops'], ['/brands', 'Brands'], ['/contact-us', 'Contact'], ['/blogs', 'Blogs']];

/** Small dropdown: opens on hover (mouse) or tap/click, closes on outside click, Escape or after a choice. */
function Dropdown({ label, button, children }) {
    const [open, setOpen] = useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
        if (!open) return undefined;
        const out = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        const esc = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', out); document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); };
    }, [open]);
    return (
        <div ref={ref} className="relative" onMouseEnter={(e) => e.pointerType !== 'touch' && setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-primary-soft hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{button} <Icon name="chevron" size={12} className={`transition ${open ? 'rotate-180' : ''}`} /></button>
            {open && <ul role="listbox" className="card absolute end-0 top-full z-50 w-40 p-1 shadow-lg">{typeof children === 'function' ? children(() => setOpen(false)) : children}</ul>}
        </div>
    );
}
const Option = ({ active, onClick, children }) => (
    <li role="option" aria-selected={active}><button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded px-3 py-2 text-start transition hover:bg-primary-soft hover:text-primary ${active ? 'font-semibold text-primary' : ''}`}>{children}{active && <span aria-hidden="true">✓</span>}</button></li>
);

function TopBar() {
    const dispatch = useDispatch();
    const lang = useSelector((s) => s.ui.lang);
    const theme = useSelector((s) => s.ui.theme);
    const code = useSelector((s) => s.shop.currency);
    const { data: master } = useGetMasterQuery();
    const currencies = master?.data?.currencies ?? [];
    const currentCur = currencies.find((c) => c.name === code) ?? currencies[0];
    const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];
    const dark = theme === 'dark';
    return (
        <div className="border-b border-line text-[13px] text-ink print:hidden">
            <div className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-1.5">
                <span className="flex items-center gap-2"><Icon name="truck" size={14} className="text-primary" /> {t('Free Delivery on orders over $999.00')}</span>
                <div className="hidden items-center gap-6 md:flex">
                    <Link className="hover:text-primary" to="/best-deal">{t('Daily Deals')}</Link><Link className="hover:text-primary" to="/pages/refund-policy">{t('Easy Returns')}</Link><Link className="hover:text-primary" to="/contact-us">{t('Help Center')}</Link>
                </div>
                <div className="flex items-center gap-1">
                    <Dropdown label={t('Language')} button={current.short}>
                        {(close) => LANGS.map((l) => <Option key={l.code} active={l.code === lang} onClick={() => { dispatch(setLang(l.code)); close(); }}>{l.name}</Option>)}
                    </Dropdown>
                    <Dropdown label={t('Currency')} button={currentCur ? `${currentCur.symbol} ${currentCur.name}` : t('$ USD')}>
                        {(close) => currencies.map((c) => <Option key={c.name} active={currentCur?.name === c.name} onClick={() => { dispatch(setCurrency(c.name)); close(); }}>{c.symbol} {c.name}</Option>)}
                    </Dropdown>
                    <button type="button" role="switch" aria-checked={dark} aria-label={dark ? t('Switch to Light') : t('Switch to Dark')} title={dark ? t('Switch to Light') : t('Switch to Dark')} onClick={() => dispatch(toggleTheme())}
                        className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-primary-soft hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><Icon name={dark ? 'sun' : 'moon'} size={16} /></button>
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
            <button onClick={() => setOpen(!open)} onMouseEnter={() => setOpen(true)} className="btn-primary h-11 w-[228px] justify-between !rounded-md !px-4">
                <span className="flex items-center gap-2"><Icon name="menu" size={16} /> {t('All Categories')}</span> <Icon name="chevron" size={14} />
            </button>
            {open && (
                <ul className="card absolute start-0 top-full z-30 w-64 p-2 shadow-lg">
                    {data.filter((c) => c.image_url).map((c) => (
                        <li key={c.id}><Link onClick={() => setOpen(false)} to={`/products?category_slug=${c.slug}`} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-primary-soft"><span className="flex items-center gap-2"><Img src={c.image_url} alt="" className="h-5 w-5 rounded object-cover" />{(lang === 'ar' && c.name_ar) || c.name}</span><Icon name="right" size={14} /></Link></li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function BrandImg({ src, name, className }) {
    return <img src={src || '/assets/logo.png'} alt={name || t('ReadyEcommerce')} className={className} />;
}

function Header() {
    const { data: master } = useGetMasterQuery();
    const theme = useSelector((s) => s.ui.theme);
    const brand = master?.data;
    const logo = theme === 'dark' ? (brand?.web_dark_logo || brand?.web_logo) : brand?.web_logo;
    const links = nav.filter(([to]) => to !== '/shops' || brand?.multi_vendor);
    const [q, setQ] = useState('');
    const navigate = useNavigate();
    const { cart, wishlist } = useSelector((s) => s.shop);
    const signedIn = useSelector((s) => !!s.customer.token);
    const qtyInCart = cart.reduce((a, i) => a + i.qty, 0);
    const submit = (e) => { e.preventDefault(); navigate(`/products?search=${encodeURIComponent(q)}`); };
    return (
        <div className="sticky top-0 z-40 border-b border-line bg-sa-surface shadow-sm print:static print:hidden">
        <header className="mx-auto max-w-[1320px] px-4">
            <div className="flex items-center gap-4 py-4">
                <Link to="/" aria-label={brand?.app_name || t('ReadyEcommerce')}><BrandImg src={logo} name={brand?.app_name} className="h-12 w-auto max-w-[200px] object-contain" /></Link>
                <form onSubmit={submit} className="mx-auto flex w-full max-w-xl overflow-hidden rounded-md border border-line shadow-sm">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search for products, brands and more...')} className="min-w-0 flex-1 px-4 py-2.5 text-sm outline-none" />
                    <button className="bg-primary px-5 text-white" aria-label={t('Search')}><Icon name="search" /></button>
                </form>
                <div className="ms-auto flex items-center gap-3">
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
        </div>
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
    const d = master?.data;
    if (d && d.web_show_footer === false) return null;
    const phone = d?.mobile || '+880123456789';
    const email = d?.email || 'admin@example.com';
    const year = new Date().getFullYear();
    return (
        <footer className="mt-16 bg-surface print:hidden">
            <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 md:grid-cols-4">
                <div><BrandImg src={d?.web_footer_logo || d?.web_logo} name={d?.app_name} className="h-12 w-auto max-w-[200px] object-contain" />
                    <p className="mt-3 text-sm font-semibold">{d?.company_name || d?.app_name || t('ReadyEcommerce')}</p>
                    {d?.app_name && d?.company_name && d.app_name !== d.company_name && <p className="text-sm text-muted">{d.app_name}</p>}
                    <p className="mt-3 text-sm text-muted">{d?.web_footer_text || t('The ultimate all-in-one solution for your eCommerce business worldwide.')}</p>
                    <p className="mt-3 text-sm">{phone}<br />{email}</p>
                    {(d?.address) && <p className="mt-1 text-sm text-muted">{d.address}</p>}
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
                <div><h4 className="mb-2 font-semibold">{t('Accepted Payment Methods')}</h4>
                    {d?.footer_payment_img ? <img src={d.footer_payment_img} alt={t('Accepted Payment Methods')} className="h-10 max-w-[220px] object-contain" /> : <p className="text-sm text-muted">{t('Cash on delivery, cards, and mobile wallets')}</p>}
                    {d?.footer_qrcode && <img src={d.footer_qrcode} alt={t('Scan the QR')} className="mt-3 h-20 w-20 object-contain" />}
                </div>
            </div>}
            <div className="border-t border-line py-4 text-center text-sm text-muted">{t('© {year} {name}', { year, name: d?.company_name || d?.app_name || t('ReadyEcommerce') })}</div>
        </footer>
    );
}

function MiniCart() {
    const cart = useSelector((s) => s.shop.cart);
    const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
    return (
        <Link to="/cart" aria-label={t('Open cart')} className="fixed end-0 top-1/2 z-20 block w-14 overflow-hidden rounded-s-lg border border-e-0 border-line bg-sa-surface text-center text-xs shadow-md print:hidden">
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
