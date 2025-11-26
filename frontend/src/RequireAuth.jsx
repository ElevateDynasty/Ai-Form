import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children, redirectTo = "/auth" }){
  const { isAuthenticated } = useAuth();
  const loc = useLocation();
  if(!isAuthenticated){
    return <Navigate to={redirectTo} state={{ from: loc }} replace />;
  }
  return children;
}
