import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { LANGS, setCurrentLang } from './i18n';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Toasts } from './components/ui';
import StoreLayout from './components/StoreLayout';
import Home from './pages/shop/Home';
import Products from './pages/shop/Products';
import ProductDetail from './pages/shop/ProductDetail';
import Shops from './pages/shop/Shops';
import Cart from './pages/shop/Cart';
import CustomerLogin from './pages/shop/Login';
import Checkout from './pages/shop/Checkout';
import OrderSuccess from './pages/shop/OrderSuccess';
import RequireCustomer from './components/RequireCustomer';
import { AccountAddresses, AccountHome, AccountLayout, AccountOrderDetail, AccountOrders, AccountProfile, Wishlist } from './pages/shop/account/Account';
import Brands from './pages/shop/Brands';
import Blogs from './pages/shop/Blogs';
import BlogDetail from './pages/shop/BlogDetail';
import CollectionPage from './pages/shop/CollectionPage';
import Contact from './pages/shop/Contact';
import CmsPage from './pages/shop/Page';
const AdminRoutes = React.lazy(() => import('./pages/admin/AdminRoutes').then((m) => ({ default: m.AdminRoutes })));
const ShopRoutes = React.lazy(() => import('./pages/admin/AdminRoutes').then((m) => ({ default: m.ShopRoutes })));
import { useGetMasterQuery } from './app/api';
import { t } from './i18n';

export default function App() {
    const lang = useSelector((s) => s.ui.lang);
    const theme = useSelector((s) => s.ui.theme);
    const { data: master } = useGetMasterQuery();
    setCurrentLang(lang);   // set before children render, so every t() call in this render pass uses the new language
    useEffect(() => {
        const l = LANGS.find((x) => x.code === lang) ?? LANGS[0];
        const root = document.documentElement;
        root.lang = l.code;
        root.dir = l.dir;                 // Arabic flips the whole layout to right-to-left
        root.dataset.theme = theme;
        const primary = master?.data?.theme_colors?.primary;
        const secondary = master?.data?.theme_colors?.secondary;
        if (primary) { root.style.setProperty('--theme-primary', primary); root.style.setProperty('--color-primary', primary); }
        if (secondary) root.style.setProperty('--theme-secondary', secondary);
        const brand = master?.data;
        if (brand?.app_title || brand?.app_name) document.title = brand.app_title || brand.app_name;
        const icon = document.querySelector('link[rel="icon"]');
        if (icon && brand?.favicon) icon.href = brand.favicon;
    }, [lang, theme, master]);
    return (
        // key={lang}: switching language remounts the tree so every string re-renders (data stays in the RTK cache).
        <React.Fragment key={lang}>
            <Routes>
                <Route element={<StoreLayout />}>
                    <Route index element={<Home />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products/:id/details" element={<ProductDetail />} />
                    <Route path="shops" element={<Shops />} />
                    <Route path="brands" element={<Brands />} />
                    <Route path="blogs" element={<Blogs />} />
                    <Route path="blogs/:id" element={<BlogDetail />} />
                    <Route path="collections/:slug" element={<CollectionPage />} />
                    <Route path="contact-us" element={<Contact />} />
                    <Route path="pages/:slug" element={<CmsPage />} />
                    <Route path="best-deal" element={<Navigate to="/products?sort=price_asc" replace />} />
                    <Route path="most-popular" element={<Navigate to="/products?sort=rating" replace />} />
                    <Route path="flash-sale/:slug" element={<Navigate to="/products?flash=1" replace />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="login" element={<CustomerLogin />} />
                    <Route path="wishlist" element={<Wishlist />} />
                    <Route path="checkout" element={<RequireCustomer><Checkout /></RequireCustomer>} />
                    <Route path="order-success" element={<RequireCustomer><OrderSuccess /></RequireCustomer>} />
                    <Route path="account" element={<RequireCustomer><AccountLayout /></RequireCustomer>}>
                        <Route index element={<AccountHome />} />
                        <Route path="orders" element={<AccountOrders />} />
                        <Route path="orders/:id" element={<AccountOrderDetail />} />
                        <Route path="addresses" element={<AccountAddresses />} />
                        <Route path="profile" element={<AccountProfile />} />
                    </Route>
                    <Route path="*" element={<p className="py-20 text-center">{t('Page not found')}</p>} />
                </Route>
                <Route path="admin/*" element={<React.Suspense fallback={null}><AdminRoutes /></React.Suspense>} />
                <Route path="shop/*" element={<React.Suspense fallback={null}><ShopRoutes /></React.Suspense>} />
            </Routes>
            <Toasts />
        </React.Fragment>
    );
}
