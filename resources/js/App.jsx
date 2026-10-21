import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { LANGS, setCurrentLang } from './i18n';
import { Route, Routes, useParams } from 'react-router-dom';
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
import Contact from './pages/shop/Contact';
import Login from './pages/admin/Login';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Resource, { resources } from './pages/admin/Resource';
import Orders from './pages/admin/Orders';
import Customers from './pages/admin/Customers';
import { CategoryForm, ProductForm, ShopForm } from './pages/admin/forms';
import Settings from './pages/admin/Settings';
import { Pos, PosDrafts, PosSales } from './pages/admin/Pos';
import { OrderDetail, OrderDocument } from './pages/admin/OrderDetail';
import GenericPage from './pages/admin/GenericPages';
import Messages from './pages/admin/Messages';
import { t } from './i18n';

const AdminResource = () => {
    const { res } = useParams();
    return resources[res] ? <Resource res={res} /> : <GenericPage />;
};

export default function App() {
    const lang = useSelector((s) => s.ui.lang);
    const theme = useSelector((s) => s.ui.theme);
    setCurrentLang(lang);   // set before children render, so every t() call in this render pass uses the new language
    useEffect(() => {
        const l = LANGS.find((x) => x.code === lang) ?? LANGS[0];
        const root = document.documentElement;
        root.lang = l.code;
        root.dir = l.dir;                 // Arabic flips the whole layout to right-to-left
        root.dataset.theme = theme;
    }, [lang, theme]);
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
                    <Route path="contact-us" element={<Contact />} />
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
                <Route path="admin/login" element={<Login />} />
                <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id/show" element={<OrderDetail />} />
                    <Route path="orders/:id/invoice" element={<OrderDocument kind="invoice" />} />
                    <Route path="orders/:id/slip" element={<OrderDocument kind="slip" />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="category/create" element={<CategoryForm />} />
                    <Route path="categories/:id/edit" element={<CategoryForm />} />
                    <Route path="shops/create" element={<ShopForm />} />
                    <Route path="shops/:id/edit" element={<ShopForm />} />
                    <Route path="product/create" element={<ProductForm />} />
                    <Route path="products/:id/edit" element={<ProductForm />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="pos" element={<Pos />} />
                    <Route path="pos/sales" element={<PosSales />} />
                    <Route path="pos/draft" element={<PosDrafts />} />
                    <Route path=":res" element={<AdminResource />} />
                    <Route path="*" element={<GenericPage />} />
                </Route>
                <Route path="shop" element={<AdminLayout />}>
                    <Route path="*" element={<GenericPage />} />
                </Route>
            </Routes>
            <Toasts />
        </React.Fragment>
    );
}
