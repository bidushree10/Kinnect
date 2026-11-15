import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { GatewayView } from './views/GatewayView';
import { PatientView } from './views/PatientView';
import { DashboardView } from './views/DashboardView';
import { Toast, ToastMessage } from './components/common/Toast';

export const App: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({
      id: String(Date.now()),
      type,
      message,
    });
  };

  const RequireAuth: React.FC<{ children: JSX.Element }> = ({ children }) => {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center font-body">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0F5C5C] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#524E48] font-medium text-[16px]">Loading Kinnect...</p>
          </div>
        </div>
      );
    }
    return currentUser ? children : <Navigate to="/" replace />;
  };

  return (
    <BrowserRouter>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
      )}
      <Routes>
        <Route path="/" element={<GatewayView onShowToast={showToast} />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardView onShowToast={showToast} />
            </RequireAuth>
          }
        />
        <Route
          path="/patient"
          element={
            <RequireAuth>
              <PatientView onShowToast={showToast} />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
