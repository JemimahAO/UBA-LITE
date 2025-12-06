import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/authentication/sign-in';
    }
    return Promise.reject(error);
  }
);

export default api;

// Authentication APIs
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  getCurrentUser: () => api.get('/auth/me'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePreferences: (data) => api.patch('/auth/profile/preferences', data),
  changePassword: (data) => api.post('/auth/profile/change-password', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/auth/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Upload APIs
export const uploadAPI = {
  uploadFile: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },
  uploadTrainingFile: (file, logType, onProgress, fileFormat) => {
    const formData = new FormData();
    formData.append('file', file);

    const params = { log_type: logType };
    if (fileFormat) {
      params.file_format = fileFormat;
    }

    return api.post('/upload_file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },
  getUploads: () => api.get('/uploads'),
  deleteUpload: (id) => api.delete(`/uploads/${id}`),
  getUploadedFiles: () => api.get('/uploaded_files'),
};

// Model APIs
export const modelAPI = {
  trainModel: (data) => api.post('/train_model', data),
  getModels: () => api.get('/models'),
  getModel: (id) => api.get(`/models/${id}`),
  deleteModel: (id) => api.delete(`/models/${id}`),
  runDetectionOnStoredLogs: (payload) => api.post('/detect/logs', payload),
};

// Training utilities
export const trainingAPI = {
  getLogTypes: () => api.get('/log_types'),
};

// Detection APIs
export const detectionAPI = {
  runDetection: (data) => api.post('/detect/analyze', data),
  runDetectionOnStoredLogs: (payload) => api.post('/detect/logs', payload),
  getSessions: () => api.get('/detections/sessions'),
  updateStatus: (sessionId, payload) => api.patch(`/detections/sessions/${sessionId}/status`, payload),
  generateReport: (sessionId) => api.post(`/detections/sessions/${sessionId}/report`),
  getResults: (limit = 50) => api.get(`/results?limit=${limit}`),
  getResult: (id) => api.get(`/results/${id}`),
};

// Analytics APIs
export const analyticsAPI = {
  getStats: () => api.get('/analytics/stats'),
  getTrends: (days = 7) => api.get(`/analytics/trends?days=${days}`),
  getUserRiskScores: () => api.get('/analytics/user-risks'),
};
