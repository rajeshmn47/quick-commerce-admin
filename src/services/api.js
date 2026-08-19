import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// 🔐 Request Interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 🔄 Response Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with error
            if (error.response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                //window.location.href = '/login';
            }
            return Promise.reject(error);
        }
        if (error.request) {
            // Request made but no response
            console.error('No response from server:', error.request);
            return Promise.reject(new Error('Network error. Please check your connection.'));
        }
        return Promise.reject(error);
    }
);

export default api;