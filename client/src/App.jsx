import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Accounts from './pages/Accounts';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Payslips from './pages/Payslips';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import Compliance from './pages/Compliance';
import Landing from './pages/Landing';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading Egotech Portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Owner has universal access to all routes
  if (allowedRoles && role !== 'owner' && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />

            {/* Platform Owner Route */}
            <Route
              path="clients"
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <Clients />
                </ProtectedRoute>
              }
            />

            {/* User Logins & Accounts Route */}
            <Route
              path="accounts"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin']}>
                  <Accounts />
                </ProtectedRoute>
              }
            />

            {/* HR / Admin Routes */}
            <Route
              path="employees"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees/:id"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                  <EmployeeDetail />
                </ProtectedRoute>
              }
            />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="expenses" element={<Expenses />} />
            <Route
              path="payroll"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                  <Payroll />
                </ProtectedRoute>
              }
            />
            <Route path="payslips" element={<Payslips />} />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route path="compliance" element={<Compliance />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </AuthProvider>
);
}
