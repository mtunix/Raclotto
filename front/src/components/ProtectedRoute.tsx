import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../AuthSlice';

interface ProtectedRouteProps {
    children: React.ReactElement;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
