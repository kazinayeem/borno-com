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

export const resolvePage = (pathname) => pages[pathname.replace(/\/+$/, '') || '/'] ?? null;

export const imgUrl = (v) => (!v ? null : v.startsWith('uploads/') ? `/storage/${v}` : v);

// Sidebar items visible to a seller (everything else is admin-only on the API too).
export const SELLER_MENU = ['Dashboard', 'Order', 'POS', 'Product'];
