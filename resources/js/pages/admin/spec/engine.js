import spec from './spec.json';

export const { menu, pages } = spec;

// Resources that have their own tables/pages in this app (everything else is served by the generic engine).
const OWN = new Set(['categories', 'subcategories', 'brands', 'colors', 'sizes', 'units', 'shops', 'products', 'shop_products', 'customers', 'riders', 'orders', 'coupons', 'flash_sales', 'currencies', 'vat_taxes', 'blogs', 'pos_sales', 'pos_drafts']);
export const isGenericResource = (r) => !!r && !OWN.has(r);

// Spec path -> the route of the hand-built page that already covers it.
export const BUILT = {
    '/admin': '/admin', '/admin/orders': '/admin/orders',
    '/shop/pos': '/admin/pos', '/shop/pos/sales': '/admin/pos/sales', '/shop/pos/draft': '/admin/pos/draft',
    '/admin/categories': '/admin/categories', '/admin/category/create': '/admin/category/create',
    '/admin/subcategories': '/admin/subcategories', '/admin/subcategory/create': '/admin/subcategories',
    '/shop/products': '/admin/products', '/shop/product/create': '/admin/product/create', '/shop/digital-product/create': '/admin/product/create',
    '/admin/brands': '/admin/brands', '/admin/colors': '/admin/colors', '/admin/sizes': '/admin/sizes', '/admin/units': '/admin/units',
    '/admin/flash-sales': '/admin/flash-sales', '/admin/coupons': '/admin/coupons',
    '/admin/blogs': '/admin/blogs', '/admin/blog/create': '/admin/blogs',
    '/admin/customers': '/admin/customers', '/admin/riders': '/admin/riders', '/admin/riders/create': '/admin/riders',
    '/admin/shops': '/admin/shops', '/admin/shops/create': '/admin/shops/create',
    '/admin/currencies': '/admin/currencies', '/admin/vat-taxes': '/admin/vat-taxes',
    '/admin/generale-setting': '/admin/settings',
    '/admin/products?status=pending': '/admin/products?status=pending', '/admin/products?status=update': '/admin/products?status=update', '/admin/products?status=accepted': '/admin/products?status=accepted',
};
export const toRoute = (p) => BUILT[p] ?? p;
export const stripQuery = (p) => p.split('?')[0];

export function parseField(def) {
    const [name, typeStar, ...rest] = def.split(':');
    let label = rest.join(':');
    let resource = null;
    let options = null;
    let m;
    if ((m = label.match(/^(.*)@(\w+)$/))) { label = m[1]; resource = m[2]; } else if ((m = label.match(/^(.*)\[(.*)\]$/))) { label = m[1]; options = m[2].split('|'); }
    return { name, type: typeStar.replace('*', ''), required: typeStar.endsWith('*'), label, resource, options };
}
export function parseColumn(def) {
    const [key, type, ...rest] = def.split(':');
    return { key, type, label: rest.join(':') };
}

// Shop URLs that reuse an admin spec page (same columns and form, seller-scoped on the API).
const SHOP_ALIAS = {
    '/shop/return-orders': '/admin/return-orders',
    '/shop/withdraw': '/admin/withdraws',
    '/shop/employees': '/admin/employees',
    '/shop/employee/create': '/admin/employee/create',
};
export const resolvePage = (pathname) => {
    const path = pathname.replace(/\/+$/, '') || '/';
    return pages[SHOP_ALIAS[path] ?? path] ?? null;
};

export const imgUrl = (v) => (!v ? null : v.startsWith('uploads/') ? `/storage/${v}` : v);

// Seller sidebar, in the same order as the ReadyEcommerce shop portal.
export const shopMenu = [
    { label: 'Dashboard', icon: 'home', path: '/shop' },
    { label: 'All Orders', icon: 'cart', children: [['All', '/shop/orders'], ['Pending', '/shop/orders?status=pending'], ['Confirm', '/shop/orders?status=confirm'], ['Processing', '/shop/orders?status=processing'], ['Pickup', '/shop/orders?status=pickup'], ['On The Way', '/shop/orders?status=on_the_way'], ['Delivered', '/shop/orders?status=delivered'], ['Cancelled', '/shop/orders?status=cancelled']] },
    { label: 'Pre-orders', icon: 'gift', addon: true, children: [['Analytics', '/shop/pre-order/analytics'], ['Order List', '/shop/pre-orders'], ['Product List', '/shop/pre-orders/products/list'], ['Add Product', '/shop/pre-orders/products/create'], ['Commission', '/shop/pre-order/commission-list'], ['Profit Report', '/shop/pre-order/profit-report']] },
    { label: 'POS', icon: 'pos', children: [['POS', '/shop/pos'], ['POS Sales History', '/shop/pos/sales'], ['POS Draft', '/shop/pos/draft']] },
    { label: 'Refund', icon: 'refund', path: '/shop/return-orders' },
    { label: 'Messages', icon: 'chat', path: '/shop/customer-chats' },
    { label: 'Category', icon: 'grid', children: [['Category', '/shop/categories'], ['Sub Category', '/shop/subcategories']] },
    { label: 'Product', icon: 'box', children: [['All Product', '/shop/products'], ['Add Product', '/shop/product/create'], ['Add Digital Product', '/shop/digital-product/create']] },
    { label: 'Product Variant', icon: 'box', children: [['Brand', '/shop/brands'], ['Color', '/shop/colors'], ['Size', '/shop/sizes'], ['Unit', '/shop/units']] },
    { label: 'Purchase', icon: 'gift', addon: true, children: [['Stock Report', '/shop/purchase/stock-summary'], ['Add New Purchase', '/shop/purchase/create'], ['Purchase Invoices', '/shop/purchase'], ['Purchase Summary', '/shop/purchase/summary'], ['Purchase Returns', '/shop/purchase-return'], ['Add Purchase Return', '/shop/purchase-return/create']] },
    { label: 'Promotion', icon: 'megaphone', children: [['Flash Deals', '/shop/flash-sale'], ['Banner Setup', '/shop/banners'], ['Promo Code', '/shop/vouchers']] },
    { label: 'Report', icon: 'chart', children: [['Analytics', '/shop/reports/analytics'], ['Report', '/shop/reports/sale-product'], ['Earning Summary', '/shop/earning-summary'], ['Commission List', '/shop/commission-list'], ['PayOut', '/shop/pay-out']] },
    { label: 'Employee', icon: 'users', children: [['Employees', '/shop/employees'], ['Add Employee', '/shop/employee/create']] },
    { label: 'Suppliers', icon: 'user', children: [['List Of Suppliers', '/shop/supplier'], ['Add New Supplier', '/shop/supplier/create']] },
    { label: 'My Shop', icon: 'store', path: '/shop/profile' },
    { label: 'Withdraws', icon: 'wallet', path: '/shop/withdraw' },
    { label: 'Import/Export', icon: 'swap', children: [['Product Export', '/shop/bulk-product-export'], ['Product Import', '/shop/bulk-product-import'], ['Gallery Import', '/shop/gallery']] },
];
export const SELLER_MENU = shopMenu.map((m) => m.label);
