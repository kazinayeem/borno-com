import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import { authSlice, customerSlice, shopSlice, toastSlice } from './slices';

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        auth: authSlice.reducer,
        customer: customerSlice.reducer,
        shop: shopSlice.reducer,
        toast: toastSlice.reducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
});

// Persist the slices that should survive a reload.
store.subscribe(() => {
    const { auth, customer, shop } = store.getState();
    try {
        localStorage.setItem('token', JSON.stringify(auth.token));
        localStorage.setItem('user', JSON.stringify(auth.user));
        localStorage.setItem('ctoken', JSON.stringify(customer.token));
        localStorage.setItem('cuser', JSON.stringify(customer.user));
        localStorage.setItem('cart', JSON.stringify(shop.cart));
        localStorage.setItem('wishlist', JSON.stringify(shop.wishlist));
    } catch { /* storage unavailable */ }
});
