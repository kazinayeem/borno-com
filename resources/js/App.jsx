import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { Toasts } from './components/ui';
import StoreLayout from './components/StoreLayout';
import Home from './pages/shop/Home';
import Products from './pages/shop/Products';
import ProductDetail from './pages/shop/ProductDetail';
import Shops from './pages/shop/Shops';
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

const AdminResource = () => {
    const { res } = useParams();
    return resources[res] ? <Resource res={res} /> : <GenericPage />;
};

export default function App() {
    return (
        <>
            <Routes>
                <Route element={<StoreLayout />}>
                    <Route index element={<Home />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products/:id/details" element={<ProductDetail />} />
                    <Route path="shops" element={<Shops />} />
                    <Route path="brands" element={<Brands />} />
                    <Route path="blogs" element={<Blogs />} />
                    <Route path="contact-us" element={<Contact />} />
                    <Route path="*" element={<p className="py-20 text-center">Page not found</p>} />
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
        </>
    );
}
