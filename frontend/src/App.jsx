import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './context/AuthContext';
import { App as CapApp } from '@capacitor/app';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const Dashboard = lazy(() => import('./pages/Dashboard'));
import FamilyMembers from './pages/FamilyMembers';
import AddMemberForm from './pages/AddMemberForm';
import PhotoGallery from './pages/PhotoGallery';
import UploadPhotoForm from './pages/UploadPhotoForm';
import Events from './pages/Events';
import FamilyTree from './pages/FamilyTree';
import MemberProfile from './pages/MemberProfile';
import PlacesMap from './pages/PlacesMap';
import GlobalSearch from './pages/GlobalSearch';
import AccountPrivacy from './pages/AccountPrivacy';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AdminAudit from './pages/AdminAudit';
import AdminUsers from './pages/AdminUsers';
import AdminUserEdit from './pages/AdminUserEdit';
import AdminUserCreate from './pages/AdminUserCreate';
import AdminPortalLayout from './components/AdminPortalLayout';
import AdminAnnouncements from './pages/AdminAnnouncements';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';

function PrivateRoute({ children }) {
  const { isAuth, loading } = useAuth();
  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950"
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
          style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}
        />
      </div>
    );
  }
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, loading, isAuth } = useAuth();
  if (loading || !isAuth) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        return;
      }
      if (location.pathname === '/' || location.pathname === '/login') {
        CapApp.minimizeApp();
      } else if (canGoBack || window.history.length > 1) {
        navigate(-1);
      } else {
        CapApp.minimizeApp();
      }
    });
    return () => { listener.then((l) => l.remove()); };
  }, [navigate, location.pathname]);
}

function CaseInsensitiveRedirect() {
  const location = useLocation();
  const normalized = location.pathname.toLowerCase();
  if (location.pathname !== normalized) {
    return <Navigate to={`${normalized}${location.search}${location.hash}`} replace />;
  }
  return null;
}

export default function App() {
  useAndroidBackButton();

  return (
    <>
      <CaseInsensitiveRedirect />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route
          index
          element={
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </div>
              }
            >
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="family-members" element={<FamilyMembers />} />
        <Route path="family-members/add" element={<AddMemberForm />} />
        <Route path="family-members/edit/:id" element={<AddMemberForm />} />
        <Route path="family-members/:id" element={<MemberProfile />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:slug" element={<ReportDetail />} />
        <Route path="gallery" element={<PhotoGallery />} />
        <Route path="gallery/upload" element={<UploadPhotoForm />} />
        <Route path="events" element={<Events />} />
        <Route path="family-tree" element={<FamilyTree />} />
        <Route path="places" element={<PlacesMap />} />
        <Route path="search" element={<GlobalSearch />} />
        <Route path="contact" element={<ContactUs />} />
        <Route path="account" element={<AccountPrivacy />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminPortalLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users/new" element={<AdminUserCreate />} />
          <Route path="users/:id/edit" element={<AdminUserEdit />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
