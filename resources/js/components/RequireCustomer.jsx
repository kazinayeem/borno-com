import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Sends signed-out visitors to /login and brings them back afterwards.
export default function RequireCustomer({ children }) {
    const token = useSelector((s) => s.customer.token);
    const loc = useLocation();
    if (!token) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
    return children;
}
