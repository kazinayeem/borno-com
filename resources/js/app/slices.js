import { createSlice, nanoid } from '@reduxjs/toolkit';

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

export const authSlice = createSlice({
    name: 'auth',
    initialState: { token: load('token', null), user: load('user', null) },
    reducers: {
        loggedIn: (s, { payload }) => { s.token = payload.token; s.user = payload.user; },
        loggedOut: (s) => { s.token = null; s.user = null; },
    },
});

// Storefront customer session (kept separate from the staff session used by /admin).
// Language and theme are shared by the storefront and the admin, and survive reloads.
const readPref = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
export const uiSlice = createSlice({
    name: 'ui',
    initialState: { lang: ['en', 'bn', 'ar'].includes(readPref('lang')) ? readPref('lang') : 'en', theme: readPref('theme') === 'dark' ? 'dark' : 'light' },
    reducers: {
        setLang: (s, { payload }) => { if (['en', 'bn', 'ar'].includes(payload)) s.lang = payload; },
        toggleTheme: (s) => { s.theme = s.theme === 'dark' ? 'light' : 'dark'; },
    },
});

export const customerSlice = createSlice({
    name: 'customer',
    initialState: { token: load('ctoken', null), user: load('cuser', null) },
    reducers: {
        customerLoggedIn: (s, { payload }) => { s.token = payload.token; s.user = payload.user; },
        customerUpdated: (s, { payload }) => { s.user = payload; },
        customerLoggedOut: (s) => { s.token = null; s.user = null; },
    },
});

export const cartKey = (item) => item.key || `${item.id}-${item.color_id || 0}-${item.size_id || 0}`;

export const shopSlice = createSlice({
    name: 'shop',
    initialState: { cart: load('cart', []), wishlist: load('wishlist', []), currency: readPref('currency') || 'USD' },
    reducers: {
        // payload: product row (+ optional qty, color, size). The same product in two colors is two lines.
        addToCart: (s, { payload }) => {
            const add = payload.qty ?? 1;
            const max = payload.stock ?? Infinity;
            const colorId = payload.color_id || null;
            const sizeId = payload.size_id || null;
            const key = `${payload.id}-${colorId || 0}-${sizeId || 0}`;
            const row = s.cart.find((i) => cartKey(i) === key);
            if (row) { row.qty = Math.min(row.qty + add, max); row.stock = payload.stock ?? row.stock; row.price = payload.price; row.image = payload.image_url ?? row.image; row.key = key; }
            else s.cart.push({ key, id: payload.id, name: payload.name, price: payload.price, qty: Math.min(add, max), stock: payload.stock, image: payload.image_url ?? null, color_id: colorId, size_id: sizeId, color: payload.color || null, size: payload.size || null, color_code: payload.color_code || null });
        },
        setCartQty: (s, { payload: { key, qty } }) => {
            const row = s.cart.find((i) => cartKey(i) === key);
            if (row) row.qty = Math.max(1, Math.min(Number(qty) || 1, row.stock ?? 100));
        },
        removeFromCart: (s, { payload }) => { s.cart = s.cart.filter((i) => cartKey(i) !== payload); },
        clearCart: (s) => { s.cart = []; },
        toggleWish: (s, { payload }) => {
            s.wishlist = s.wishlist.includes(payload) ? s.wishlist.filter((i) => i !== payload) : [...s.wishlist, payload];
        },
        setCurrency: (s, { payload }) => { s.currency = payload; },
    },
});

export const toastSlice = createSlice({
    name: 'toast',
    initialState: [],
    reducers: {
        push: { reducer: (s, { payload }) => { s.push(payload); }, prepare: (message, type = 'success') => ({ payload: { id: nanoid(), message, type } }) },
        dismiss: (s, { payload }) => s.filter((t) => t.id !== payload),
    },
});

export const { loggedIn, loggedOut } = authSlice.actions;
export const { setLang, toggleTheme } = uiSlice.actions;
export const { customerLoggedIn, customerUpdated, customerLoggedOut } = customerSlice.actions;
export const { addToCart, setCartQty, removeFromCart, clearCart, toggleWish, setCurrency } = shopSlice.actions;
export const { push: pushToast, dismiss } = toastSlice.actions;
