import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Store from './pages/Store';
import StoreDetail from './pages/StoreDetail';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Zones from './pages/Zones';
import ZoneAssigner from './pages/ZoneAssigner';
import RiderDetail from './pages/RiderDetail';
import Riders from './pages/Riders';
import AdminOffers from './pages/AdminOffers'; // ✅ Import offers page

function NavBar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white shadow-md px-6 py-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">🏪 Admin Panel</h1>
        <div className="flex items-center gap-6">
          <a href="/" className="text-gray-600 hover:text-blue-600">Stores</a>
          <a href="/products" className="text-gray-600 hover:text-blue-600">Products</a>
          <a href="/orders" className="text-gray-600 hover:text-blue-600">Orders</a>
          <a href="/riders" className="text-gray-600 hover:text-blue-600">Riders</a>
          <a href="/offers" className="text-gray-600 hover:text-blue-600">🎯 Offers</a> {/* ✅ Added */}
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">👋 {user?.name}</span>
          <button
            onClick={logout}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      {isAuthenticated && <NavBar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Store />
          </ProtectedRoute>
        } />
        <Route path="/store/:id" element={
          <ProtectedRoute>
            <StoreDetail />
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="/zones/assign" element={
          <ProtectedRoute><ZoneAssigner /></ProtectedRoute>
        } />
        <Route path="/zones" element={
          <ProtectedRoute><Zones /></ProtectedRoute>
        } />
        <Route path="/riders" element={
          <ProtectedRoute><Riders /></ProtectedRoute>
        } />
        <Route path="/offers" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminOffers />
          </ProtectedRoute>
        } /> {/* ✅ Protected admin only */}
        <Route path="/riders/:id" element={
          <ProtectedRoute><RiderDetail /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;