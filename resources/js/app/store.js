import { setupListeners } from '@reduxjs/toolkit/query';
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import { authSlice, customerSlice, shopSlice, toastSlice, uiSlice } from './slices';

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        auth: authSlice.reducer,
        customer: customerSlice.reducer,
        ui: uiSlice.reducer,
        shop: shopSlice.reducer,
        toast: toastSlice.reducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
});
setupListeners(store.dispatch);   // with refetchOnFocus: a tab left open picks up admin changes (currency, theme colors…) when you come back to it

// Persist the slices that should survive a reload.
store.subscribe(() => {
    const { auth, customer, shop, ui } = store.getState();
    try {
        localStorage.setItem('token', JSON.stringify(auth.token));
        localStorage.setItem('user', JSON.stringify(auth.user));
        localStorage.setItem('lang', ui.lang);
        localStorage.setItem('theme', ui.theme);
        localStorage.setItem('ctoken', JSON.stringify(customer.token));
        localStorage.setItem('cuser', JSON.stringify(customer.user));
        localStorage.setItem('cart', JSON.stringify(shop.cart));
        localStorage.setItem('wishlist', JSON.stringify(shop.wishlist));
        localStorage.setItem('currency', shop.currency);
        localStorage.setItem('currency_chosen', shop.currency ? '1' : '0');
    } catch { /* storage unavailable */ }
});
