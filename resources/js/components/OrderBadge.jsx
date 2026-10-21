import React from 'react';
import { t } from '../i18n';

export const ORDER_STATUSES = ['pending', 'confirm', 'processing', 'pickup', 'on_the_way', 'delivered', 'cancelled'];
export const statusLabel = (s) => t({ on_the_way: 'On The Way' }[s] ?? (s ? s[0].toUpperCase() + s.slice(1) : ''));
const tone = { pending: 'bg-amber-100 text-amber-700', confirm: 'bg-violet-100 text-violet-700', processing: 'bg-sky-100 text-sky-700', pickup: 'bg-teal-100 text-teal-700', on_the_way: 'bg-indigo-100 text-indigo-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };

export const OrderBadge = ({ status }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[status] ?? 'bg-gray-100 text-gray-700'}`}>{statusLabel(status)}</span>;
