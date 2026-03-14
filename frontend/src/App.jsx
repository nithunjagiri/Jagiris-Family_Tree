import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FamilyMembers from './pages/FamilyMembers';
import AddMemberForm from './pages/AddMemberForm';
import PhotoGallery from './pages/PhotoGallery';
import UploadPhotoForm from './pages/UploadPhotoForm';
import Events from './pages/Events';
import FamilyTree from './pages/FamilyTree';
import MemberProfile from './pages/MemberProfile';

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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="family-members" element={<FamilyMembers />} />
        <Route path="family-members/add" element={<AddMemberForm />} />
        <Route path="family-members/edit/:id" element={<AddMemberForm />} />
        <Route path="family-members/:id" element={<MemberProfile />} />
        <Route path="gallery" element={<PhotoGallery />} />
        <Route path="gallery/upload" element={<UploadPhotoForm />} />
        <Route path="events" element={<Events />} />
        <Route path="family-tree" element={<FamilyTree />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
