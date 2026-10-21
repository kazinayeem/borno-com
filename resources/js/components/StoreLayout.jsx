import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetCategoriesQuery } from '../app/api';
import { Icon, Img, money } from './ui';

const nav = [['/', 'Home'], ['/products', 'Products'], ['/shops', 'Shops'], ['/brands', 'Brands'], ['/contact-us', 'Contact'], ['/blogs', 'Blogs']];

function TopBar() {
    return (
        <div className="border-b border-line text-[13px] text-ink print:hidden">
            <div className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2"><Icon name="truck" size={14} className="text-primary" /> Free Delivery on orders over $999.00</span>
                <div className="hidden items-center gap-6 md:flex">
                    <Link to="/products?flash=1">Daily Deals</Link><Link to="/contact-us">Easy Returns</Link><Link to="/contact-us">Help Center</Link>
                </div>
                <div className="flex items-center gap-4"><span className="hidden sm:inline">EN</span><span>$ USD</span><Icon name="moon" size={15} /></div>
            </div>
        </div>
    );
}

function CategoryMenu() {
    const { data = [] } = useGetCategoriesQuery();
    const [open, setOpen] = useState(false);
    return (
        <div className="relative" onMouseLeave={() => setOpen(false)}>
            <button onClick={() => setOpen(!open)} onMouseEnter={() => setOpen(true)} className="btn-primary !px-4 !py-2.5">
                <Icon name="menu" size={16} /> All Categories <Icon name="chevron" size={14} />
            </button>
            {open && (
                <ul className="card absolute left-0 top-full z-30 w-64 p-2 shadow-lg">
                    {data.map((c) => (
                        <li key={c.id}><Link onClick={() => setOpen(false)} to={`/products?category_slug=${c.slug}`} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-primary-soft"><span className="flex items-center gap-2"><Img src={c.image_url} alt="" className="h-5 w-5 rounded object-cover" />{c.name}</span><Icon name="right" size={14} /></Link></li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function Header() {
    const [q, setQ] = useState('');
    const navigate = useNavigate();
    const { cart, wishlist } = useSelector((s) => s.shop);
    const signedIn = useSelector((s) => !!s.customer.token);
    const qtyInCart = cart.reduce((a, i) => a + i.qty, 0);
    const submit = (e) => { e.preventDefault(); navigate(`/products?search=${encodeURIComponent(q)}`); };
    return (
        <header className="mx-auto max-w-[1320px] px-4 print:hidden">
            <div className="flex items-center gap-4 py-4">
                <Link to="/"><img src="/assets/logo.png" alt="ReadyEcommerce" className="h-12 w-auto" /></Link>
                <form onSubmit={submit} className="mx-auto flex w-full max-w-xl overflow-hidden rounded-md border border-line shadow-sm">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for products, brands and more..." className="min-w-0 flex-1 px-4 py-2.5 text-sm outline-none" />
                    <button className="bg-primary px-5 text-white" aria-label="Search"><Icon name="search" /></button>
                </form>
                <div className="ml-auto flex items-center gap-3">
                    {[['heart', wishlist.length, '/wishlist'], ['bag', qtyInCart, '/cart']].map(([i, n, to]) => (
                        <Link key={i} to={to} className="relative grid h-10 w-10 place-items-center rounded-full border border-line"><Icon name={i} />
                            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">{n}</span></Link>
                    ))}
                    <Link to={signedIn ? '/account' : '/login'} className="grid h-10 w-10 place-items-center rounded-full border border-line" aria-label={signedIn ? 'My account' : 'Sign in'}><Icon name="user" /></Link>
                </div>
            </div>
            <div className="flex items-center gap-8 pb-3">
                <CategoryMenu />
                <nav className="flex gap-6 overflow-x-auto text-[15px]">
                    {nav.map(([to, label]) => (
                        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `whitespace-nowrap border-b-2 pb-1 ${isActive ? 'border-primary text-primary' : 'border-transparent hover:text-primary'}`}>{label}</NavLink>
                    ))}
                </nav>
            </div>
        </header>
    );
}

function Footer() {
    const cols = [
        ['Shop', ['All Products', 'Digital Products', 'Top Rated Products', 'Best Deals']],
        ['Customer Service', ['Help Center', 'Easy Returns', 'Shipping Policy', 'Payment Methods', 'FAQ', 'Contact Us']],
        ['Company', ['About Us', 'Blog', 'Terms & Conditions', 'Privacy Policy', 'Return & Refund Policy', 'Become a Seller']],
    ];
    return (
        <footer className="mt-16 bg-surface print:hidden">
            <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 md:grid-cols-4">
                <div><img src="/assets/logo.png" alt="" className="h-12" />
                    <p className="mt-3 text-sm text-muted">The ultimate all-in-one solution for your eCommerce business worldwide.</p>
                    <p className="mt-3 text-sm">+880123456789<br />admin@example.com</p></div>
                {cols.map(([h, items]) => (
                    <div key={h}><h4 className="mb-3 font-semibold">{h}</h4>
                        <ul className="space-y-2 text-sm text-muted">{items.map((i) => <li key={i}><Link to="/contact-us" className="hover:text-primary">{i}</Link></li>)}</ul></div>
                ))}
            </div>
            <div className="border-t border-line py-4 text-center text-sm text-muted">© 2026 All right reserved by company</div>
        </footer>
    );
}

function MiniCart() {
    const cart = useSelector((s) => s.shop.cart);
    const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
    return (
        <Link to="/cart" aria-label="Open cart" className="fixed right-0 top-1/2 z-20 block w-14 overflow-hidden rounded-l-lg border border-r-0 border-line bg-sa-surface text-center text-xs shadow-md print:hidden">
            <div className="py-2 text-primary"><Icon name="bag" fill className="mx-auto" /><div className="text-ink">{cart.reduce((a, i) => a + i.qty, 0)}</div></div>
            <div className="bg-primary py-1 font-semibold text-white">{money(total)}</div>
        </Link>
    );
}

export default function StoreLayout() {
    return (
        <>
            <TopBar /><Header />
            <main className="mx-auto min-h-[60vh] max-w-[1320px] px-4"><Outlet /></main>
            <Footer /><MiniCart />
        </>
    );
}
