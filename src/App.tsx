import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { GatewayView } from './views/GatewayView';
import { PatientView } from './views/PatientView';
import { DashboardView } from './views/DashboardView';

export const App: React.FC = () => {
  const { currentUser, loading } = useAuth();

  const RequireAuth: React.FC<{ children: JSX.Element }> = ({ children }) => {
    if (loading) return null;
    return currentUser ? children : <Navigate to="/" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GatewayView onShowToast={() => {}} />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardView onShowToast={() => {}} />
            </RequireAuth>
          }
        />
        <Route
          path="/patient"
          element={
            <RequireAuth>
              <PatientView onShowToast={() => {}} />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
