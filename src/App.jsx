// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute, AdminRoute } from './components/Shared/ProtectedRoute';

// Landing
import Landing from './components/Landing/Landing';

// User
import UserDashboard from './components/User/UserDashboard';
import EventRegistration from './components/User/EventRegistration';
import MyPayments from './components/User/MyPayments';
import UserProfile from './components/User/UserProfile';
import DigitalCard from './components/User/DigitalCard';

// Admin
import AdminDashboard from './components/Admin/AdminDashboard';
import EventManagement from './components/Admin/EventManagement';
import NewsManagement from './components/Admin/NewsManagement';
import UserManagement from './components/Admin/UserManagement';
import PaymentApproval from './components/Admin/PaymentApproval';
import Financials from './components/Admin/Financials';
import AdminManagement from './components/Admin/AdminManagement';

import './index.css';

/* ── Post-login smart redirect based on role ── */
function AppRedirect() {
  const { currentUser, userProfile, loading } = useAuth();

  // Auth context still initialising
  if (loading) return null;

  // Not logged in at all - go to landing
  if (!currentUser) return <Navigate to="/" replace />;

  // Logged in but profile not fetched from DB yet — wait
  if (!userProfile) return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'radial-gradient(ellipse at 30% 20%, #3d0a0a 0%, #1a0505 40%, #0a0202 100%)',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(201,168,76,0.2)',
        borderTop: '3px solid #C9A84C',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Profile loaded — route by role
  if (userProfile.role === 'admin' || userProfile.role === 'superAdmin')
    return <Navigate to="/admin" replace />;

  // Regular user
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public - Landing page accessible to everyone */}
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />

          {/* Post-login redirect hub - only use this for explicit redirects */}
          <Route path="/app" element={<AppRedirect />} />

          {/* User routes - require authentication */}
          
          <Route path="/my-payments" element={<ProtectedRoute><MyPayments /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/my-card" element={<ProtectedRoute><DigitalCard /></ProtectedRoute>} />

          {/* Admin routes - require admin role */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/events" element={<AdminRoute><EventManagement /></AdminRoute>} />
          <Route path="/admin/news" element={<AdminRoute><NewsManagement /></AdminRoute>} />
          <Route path="/admin/registrations" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="/admin/payments" element={<AdminRoute><PaymentApproval /></AdminRoute>} />
          <Route path="/admin/financials" element={<AdminRoute><Financials /></AdminRoute>} />
          <Route path="/admin/admin-management" element={<AdminRoute><AdminManagement /></AdminRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#4A0A12',
              color: '#F5E6C0',
              border: '1px solid rgba(201,168,76,0.3)',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '0.85rem',
            },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#4A0A12' } },
            error:   { iconTheme: { primary: '#FF6B6B', secondary: '#4A0A12' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}