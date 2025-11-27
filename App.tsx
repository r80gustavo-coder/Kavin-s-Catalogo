import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { UserRole } from './types';
import Navbar from './components/Navbar';
import Catalog from './pages/Catalog';
import Login from './pages/Login';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminProductForm from './pages/AdminProductForm';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode, roles: UserRole[] }> = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes */}
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <AdminUserManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/products" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <AdminProductForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/products/edit/:id" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <AdminProductForm />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;