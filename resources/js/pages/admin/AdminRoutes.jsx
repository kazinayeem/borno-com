import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import Login from './Login';
import AdminLayout from './AdminLayout';
import Dashboard from './Dashboard';
import Resource, { resources } from './Resource';
import Orders from './Orders';
import Customers from './Customers';
import { CategoryForm, ProductForm, ShopForm } from './forms';
import Settings from './Settings';
import { Pos, PosDrafts, PosSales } from './Pos';
import { OrderDetail, OrderDocument } from './OrderDetail';
import GenericPage from './GenericPages';
import ShopCatalog from './ShopCatalog';
import Messages from './Messages';
import Collections from './Collections';
import CustomerDetail from './CustomerDetail';
import EmailTemplates from './EmailTemplates';
import { ActivityLogs, Roles, Staff } from './Access';

const AdminResource = () => {
    const { res } = useParams();
    return resources[res] ? <Resource res={res} /> : <GenericPage />;
};

export function AdminRoutes() {
    return (
        <Routes>
                <Route path="login" element={<Login />} />
                <Route element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id/show" element={<OrderDetail />} />
                    <Route path="orders/:id/invoice" element={<OrderDocument kind="invoice" />} />
                    <Route path="orders/:id/slip" element={<OrderDocument kind="slip" />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="customers/:id" element={<CustomerDetail />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="collections" element={<Collections />} />
                    <Route path="roles" element={<Roles />} />
                    <Route path="staff" element={<Staff />} />
                    <Route path="employees" element={<Staff />} />
                    <Route path="employee/create" element={<Staff />} />
                    <Route path="activity-logs" element={<ActivityLogs />} />
                    <Route path="email-templates" element={<EmailTemplates />} />
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
        </Routes>
    );
}

export function ShopRoutes() {
    return (
        <Routes>
                <Route element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:status" element={<Orders />} />
                    <Route path="orders/:id/invoice" element={<OrderDocument kind="invoice" />} />
                    <Route path="pos" element={<Pos />} />
                    <Route path="pos/sales" element={<PosSales />} />
                    <Route path="pos/draft" element={<PosDrafts />} />
                    <Route path="products" element={<Resource res="products" />} />
                    <Route path="product/create" element={<ProductForm />} />
                    <Route path="digital-product/create" element={<ProductForm />} />
                    <Route path="categories" element={<ShopCatalog res="categories" />} />
                    <Route path="subcategories" element={<ShopCatalog res="subcategories" />} />
                    <Route path="brands" element={<ShopCatalog res="brands" />} />
                    <Route path="colors" element={<ShopCatalog res="colors" />} />
                    <Route path="sizes" element={<ShopCatalog res="sizes" />} />
                    <Route path="units" element={<ShopCatalog res="units" />} />
                    <Route path="flash-sale" element={<ShopCatalog res="flash-sales" />} />
                    <Route path="banners" element={<ShopCatalog res="banners" />} />
                    <Route path="vouchers" element={<ShopCatalog res="coupons" />} />
                    <Route path="*" element={<GenericPage />} />
                </Route>
        </Routes>
    );
}
