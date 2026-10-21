import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
        headers.set('Accept', 'application/json');
        const token = getState().auth.token;
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return headers;
    },
});

// Central place for 401 handling: drop the session and let the guard redirect.
const baseQueryWithAuth = async (args, api, extra) => {
    const result = await baseQuery(args, api, extra);
    if (result.error?.status === 401 && api.getState().auth.token) {
        api.dispatch({ type: 'auth/loggedOut' });
    }
    return result;
};

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithAuth,
    tagTypes: ['Admin', 'Messages', 'Orders'],
    endpoints: (b) => ({
        // storefront
        getHome: b.query({ query: () => '/home' }),
        getCategories: b.query({ query: () => '/categories' }),
        getProducts: b.query({ query: (params) => ({ url: '/products', params }) }),
        getProduct: b.query({ query: (id) => `/products/${id}` }),
        getShops: b.query({ query: (page = 1) => ({ url: '/shops', params: { page } }) }),
        getBrands: b.query({ query: (params) => ({ url: '/brands', params }) }),
        getBlogs: b.query({ query: (params) => ({ url: '/blogs', params }) }),
        sendContact: b.mutation({ query: (body) => ({ url: '/contact', method: 'POST', body }) }),
        // auth
        login: b.mutation({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
        logout: b.mutation({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
        // admin
        getDashboard: b.query({ query: () => '/admin/dashboard', providesTags: ['Admin'] }),
        adminList: b.query({
            query: ({ res, ...params }) => ({ url: `/admin/${res}`, params }),
            providesTags: (_r, _e, { res }) => [{ type: 'Admin', id: res }],
        }),
        adminSave: b.mutation({
            query: ({ res, id, ...body }) => ({ url: `/admin/${res}${id ? `/${id}` : ''}`, method: id ? 'PUT' : 'POST', body }),
            invalidatesTags: (_r, _e, { res, id }) => [{ type: 'Admin', id: res }, { type: 'Admin', id: `${res}-${id}` }, 'Admin'],
        }),
        adminDelete: b.mutation({
            query: ({ res, id }) => ({ url: `/admin/${res}/${id}`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, { res }) => [{ type: 'Admin', id: res }, 'Admin'],
        }),
        getOrders: b.query({ query: (params) => ({ url: '/admin/orders', params }), providesTags: ['Orders'] }),
        getOrder: b.query({ query: (id) => `/admin/orders/${id}`, providesTags: ['Orders'] }),
        updateOrder: b.mutation({ query: ({ id, ...body }) => ({ url: `/admin/orders/${id}`, method: 'PATCH', body }), invalidatesTags: ['Orders', 'Admin'] }),
        getCustomers: b.query({ query: (params) => ({ url: '/admin/customers', params }) }),
        uploadImage: b.mutation({ query: (file) => { const body = new FormData(); body.append('file', file); return { url: '/admin/uploads', method: 'POST', body }; } }),
        getOptions: b.query({ query: () => '/admin/options' }),
        adminGet: b.query({ query: ({ res, id }) => `/admin/${res}/${id}`, providesTags: (_r, _e, { res, id }) => [{ type: 'Admin', id: `${res}-${id}` }] }),
        getMessages: b.query({ query: (page = 1) => ({ url: '/admin/messages', params: { page } }), providesTags: ['Messages'] }),
        markMessage: b.mutation({ query: (id) => ({ url: `/admin/messages/${id}/read`, method: 'PATCH' }), invalidatesTags: ['Messages', 'Admin'] }),
    }),
});

export const {
    useGetHomeQuery, useGetCategoriesQuery, useGetProductsQuery, useGetProductQuery, useGetShopsQuery, useGetBrandsQuery, useGetBlogsQuery,
    useSendContactMutation, useLoginMutation, useLogoutMutation, useGetDashboardQuery, useAdminListQuery,
    useAdminSaveMutation, useAdminDeleteMutation, useGetMessagesQuery, useGetOptionsQuery, useUploadImageMutation, useAdminGetQuery, useGetOrdersQuery, useGetOrderQuery, useUpdateOrderMutation, useGetCustomersQuery, useMarkMessageMutation,
} = api;

export const errorMessage = (e) => e?.data?.message || (e?.status === 'FETCH_ERROR' ? 'Network error. Please try again.' : 'Something went wrong.');
