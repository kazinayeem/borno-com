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

export const shopSlice = createSlice({
    name: 'shop',
    initialState: { cart: load('cart', []), wishlist: load('wishlist', []), currency: 'USD' },
    reducers: {
        addToCart: (s, { payload }) => {
            const row = s.cart.find((i) => i.id === payload.id);
            if (row) row.qty += 1; else s.cart.push({ id: payload.id, name: payload.name, price: payload.price, qty: 1 });
        },
        removeFromCart: (s, { payload }) => { s.cart = s.cart.filter((i) => i.id !== payload); },
        toggleWish: (s, { payload }) => {
            s.wishlist = s.wishlist.includes(payload) ? s.wishlist.filter((i) => i !== payload) : [...s.wishlist, payload];
        },
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
export const { addToCart, removeFromCart, toggleWish } = shopSlice.actions;
export const { push: pushToast, dismiss } = toastSlice.actions;
