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
    tagTypes: ['Profile', 'MyShop', 'Gateways', 'Chats', 'Gallery', 'Rec', 'Group', 'Admin', 'Messages', 'Orders', 'Settings', 'Pos', 'PosCustomers', 'PosSales', 'PosDrafts'],
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
        getRiders: b.query({ query: () => '/admin/riders-with-load', providesTags: ['Orders'] }),
        getCustomers: b.query({ query: (params) => ({ url: '/admin/customers', params }) }),
        uploadImage: b.mutation({ query: (file) => { const body = new FormData(); body.append('file', file); return { url: '/admin/uploads', method: 'POST', body }; } }),
        getSettings: b.query({ query: () => '/admin/settings', providesTags: ['Settings'] }),
        saveSettings: b.mutation({ query: (body) => ({ url: '/admin/settings', method: 'PUT', body }), invalidatesTags: ['Settings'] }),
        posProducts: b.query({ query: (params) => ({ url: '/admin/pos/products', params }), providesTags: ['Pos'] }),
        posCustomers: b.query({ query: (search) => ({ url: '/admin/pos/customers', params: { search } }), providesTags: ['PosCustomers'] }),
        posAddCustomer: b.mutation({ query: (body) => ({ url: '/admin/pos/customers', method: 'POST', body }), invalidatesTags: ['PosCustomers'] }),
        posQuote: b.mutation({ query: (body) => ({ url: '/admin/pos/quote', method: 'POST', body }) }),
        posCheckout: b.mutation({ query: (body) => ({ url: '/admin/pos/checkout', method: 'POST', body }), invalidatesTags: ['Pos', 'PosSales', 'Orders', 'Admin'] }),
        posSales: b.query({ query: (page = 1) => ({ url: '/admin/pos/sales', params: { page } }), providesTags: ['PosSales'] }),
        posDrafts: b.query({ query: (page = 1) => ({ url: '/admin/pos/drafts', params: { page } }), providesTags: ['PosDrafts'] }),
        posSaveDraft: b.mutation({ query: (body) => ({ url: '/admin/pos/drafts', method: 'POST', body }), invalidatesTags: ['PosDrafts'] }),
        posDeleteDraft: b.mutation({ query: (id) => ({ url: `/admin/pos/drafts/${id}`, method: 'DELETE' }), invalidatesTags: ['PosDrafts'] }),
        // generic spec-driven resources (records table)
        recList: b.query({ query: ({ res, ...params }) => ({ url: `/admin/r/${res}`, params }), providesTags: (_r, _e, { res }) => [{ type: 'Rec', id: res }] }),
        recGet: b.query({ query: ({ res, id }) => `/admin/r/${res}/${id}`, providesTags: (_r, _e, { res, id }) => [{ type: 'Rec', id: `${res}-${id}` }] }),
        recSave: b.mutation({
            query: ({ res, id, ...body }) => ({ url: `/admin/r/${res}${id ? `/${id}` : ''}`, method: id ? 'PUT' : 'POST', body }),
            invalidatesTags: (_r, _e, { res, id }) => [{ type: 'Rec', id: res }, { type: 'Rec', id: `${res}-${id}` }],
        }),
        recDelete: b.mutation({ query: ({ res, id }) => ({ url: `/admin/r/${res}/${id}`, method: 'DELETE' }), invalidatesTags: (_r, _e, { res }) => [{ type: 'Rec', id: res }] }),
        recToggle: b.mutation({ query: ({ res, id, field }) => ({ url: `/admin/r/${res}/${id}/toggle`, method: 'PATCH', params: field ? { field } : undefined }), invalidatesTags: (_r, _e, { res }) => [{ type: 'Rec', id: res }] }),
        getLookup: b.query({ query: (res) => `/admin/lookup/${res}` }),
        getGroup: b.query({ query: (key) => `/admin/settings-group/${key}`, providesTags: (_r, _e, key) => [{ type: 'Group', id: key }] }),
        saveGroup: b.mutation({ query: ({ key, ...body }) => ({ url: `/admin/settings-group/${key}`, method: 'PUT', body }), invalidatesTags: (_r, _e, { key }) => [{ type: 'Group', id: key }] }),
        approveProduct: b.mutation({ query: (id) => ({ url: `/admin/products/${id}/approve`, method: 'PATCH' }), invalidatesTags: ['Admin'] }),
        // custom screens
        reportAnalytics: b.query({ query: (params) => ({ url: '/admin/reports/analytics', params }) }),
        earningSummary: b.query({ query: () => '/admin/reports/earning-summary' }),
        preorderStats: b.query({ query: () => '/admin/reports/preorder' }),
        getProfile: b.query({ query: () => '/admin/profile', providesTags: ['Profile'] }),
        saveProfile: b.mutation({ query: (body) => ({ url: '/admin/profile', method: 'PUT', body }), invalidatesTags: ['Profile'] }),
        changePassword: b.mutation({ query: (body) => ({ url: '/admin/profile/password', method: 'PUT', body }) }),
        getMyShop: b.query({ query: () => '/admin/my-shop', providesTags: ['MyShop'] }),
        saveMyShop: b.mutation({ query: (body) => ({ url: '/admin/my-shop', method: 'PUT', body }), invalidatesTags: ['MyShop'] }),
        getGateways: b.query({ query: () => '/admin/gateways', providesTags: ['Gateways'] }),
        saveGateway: b.mutation({ query: ({ id, ...body }) => ({ url: `/admin/gateways/${id}`, method: 'PUT', body }), invalidatesTags: ['Gateways'] }),
        chatUsers: b.query({ query: () => '/admin/chats', providesTags: ['Chats'] }),
        chatMessages: b.query({ query: (id) => `/admin/chats/${id}`, providesTags: (_r, _e, id) => [{ type: 'Chats', id }] }),
        chatSend: b.mutation({ query: ({ id, body }) => ({ url: `/admin/chats/${id}`, method: 'POST', body: { body } }), invalidatesTags: (_r, _e, { id }) => [{ type: 'Chats', id }, 'Chats'] }),
        pushSend: b.mutation({ query: (body) => ({ url: '/admin/push-notifications', method: 'POST', body }), invalidatesTags: [{ type: 'Rec', id: 'customer_notifications' }] }),
        importProducts: b.mutation({ query: (body) => ({ url: '/admin/products-import', method: 'POST', body }), invalidatesTags: ['Admin'] }),
        getGallery: b.query({ query: () => '/admin/gallery', providesTags: ['Gallery'] }),
        deleteImage: b.mutation({ query: (name) => ({ url: `/admin/gallery/${name}`, method: 'DELETE' }), invalidatesTags: ['Gallery'] }),
        getOptions: b.query({ query: () => '/admin/options' }),
        adminGet: b.query({ query: ({ res, id }) => `/admin/${res}/${id}`, providesTags: (_r, _e, { res, id }) => [{ type: 'Admin', id: `${res}-${id}` }] }),
        getMessages: b.query({ query: (page = 1) => ({ url: '/admin/messages', params: { page } }), providesTags: ['Messages'] }),
        markMessage: b.mutation({ query: (id) => ({ url: `/admin/messages/${id}/read`, method: 'PATCH' }), invalidatesTags: ['Messages', 'Admin'] }),
    }),
});

export const {
    useGetHomeQuery, useGetCategoriesQuery, useGetProductsQuery, useGetProductQuery, useGetShopsQuery, useGetBrandsQuery, useGetBlogsQuery,
    useSendContactMutation, useLoginMutation, useLogoutMutation, useGetDashboardQuery, useAdminListQuery,
    useAdminSaveMutation, useAdminDeleteMutation, useGetMessagesQuery, useGetOptionsQuery, useReportAnalyticsQuery, useEarningSummaryQuery, usePreorderStatsQuery, useGetProfileQuery, useSaveProfileMutation, useChangePasswordMutation, useGetMyShopQuery, useSaveMyShopMutation, useGetGatewaysQuery, useSaveGatewayMutation, useChatUsersQuery, useChatMessagesQuery, useChatSendMutation, usePushSendMutation, useImportProductsMutation, useGetGalleryQuery, useDeleteImageMutation, useRecListQuery, useRecGetQuery, useRecSaveMutation, useRecDeleteMutation, useRecToggleMutation, useGetLookupQuery, useGetGroupQuery, useSaveGroupMutation, useApproveProductMutation, useGetSettingsQuery, useSaveSettingsMutation, usePosProductsQuery, usePosCustomersQuery, usePosAddCustomerMutation, usePosQuoteMutation, usePosCheckoutMutation, usePosSalesQuery, usePosDraftsQuery, usePosSaveDraftMutation, usePosDeleteDraftMutation, useUploadImageMutation, useAdminGetQuery, useGetOrdersQuery, useGetRidersQuery, useGetOrderQuery, useUpdateOrderMutation, useGetCustomersQuery, useMarkMessageMutation,
} = api;

export const errorMessage = (e) => e?.data?.message || (e?.status === 'FETCH_ERROR' ? 'Network error. Please try again.' : 'Something went wrong.');
