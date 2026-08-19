import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        const storedUser = localStorage.getItem('adminUser');

        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
            // Verify token with backend
            api.get('/auth/me')
                .then(res => {
                    setUser(res.data.user);
                    localStorage.setItem('adminUser', JSON.stringify(res.data.user));
                })
                .catch(() => {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    // ✅ Login
    const login = async (email, password) => {
        try {
            setError(null);
            const res = await api.post('/auth/login', { email, password });
            const { token, user } = res.data;

            // Only allow admin or store_manager roles
            if (user.role !== 'admin' && user.role !== 'store_manager') {
                return { 
                    success: false, 
                    error: 'Access denied. Admin privileges required.' 
                };
            }

            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminUser', JSON.stringify(user));
            setUser(user);
            return { success: true, user };
        } catch (err) {
            const message = err.response?.data?.error || 'Login failed';
            setError(message);
            return { success: false, error: message };
        }
    };

    // ✅ Logout
    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setUser(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStoreManager: user?.role === 'store_manager',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};