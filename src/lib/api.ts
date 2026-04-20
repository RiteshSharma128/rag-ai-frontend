import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any) => {
  failedQueue.forEach(({ resolve, reject }) => { if (error) reject(error); else resolve(null); });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then(() => api(orig)).catch((e) => Promise.reject(e));
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(orig);
      } catch (e) {
        processQueue(e);
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(e);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (d: FormData) => api.put('/auth/update-profile', d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (d: any) => api.put('/auth/change-password', d),
};

export const documentsAPI = {
  upload: (fd: FormData) => api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: () => api.get('/documents'),
  getOne: (id: string) => api.get(`/documents/${id}`),
  getStatus: (id: string) => api.get(`/documents/${id}/status`),
  update: (id: string, d: any) => api.put(`/documents/${id}`, d),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export const chatsAPI = {
  create: (d: any) => api.post('/chats', d),
  getAll: () => api.get('/chats'),
  getOne: (id: string) => api.get(`/chats/${id}`),
  sendMessage: (id: string, content: string) => api.post(`/chats/${id}/message`, { content }),
  updateTitle: (id: string, title: string) => api.put(`/chats/${id}/title`, { title }),
  archive: (id: string) => api.put(`/chats/${id}/archive`),
  delete: (id: string) => api.delete(`/chats/${id}`),
};

export const meetingsAPI = {
  create: (title: string) => api.post('/meetings', { title }),
  getAll: () => api.get('/meetings'),
  getOne: (roomId: string) => api.get(`/meetings/${roomId}`),
  join: (roomId: string) => api.post(`/meetings/${roomId}/join`),
  end: (roomId: string) => api.post(`/meetings/${roomId}/end`),
  addTranscript: (id: string, d: any) => api.post(`/meetings/${id}/transcript`, d),
  analyze: (id: string) => api.post(`/meetings/${id}/analyze`),
  getSummary: (id: string) => api.get(`/meetings/${id}/summary`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTeam: () => api.get('/analytics/team'),
  getProductivity: () => api.get('/analytics/productivity'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getOnline: () => api.get('/users/online'),
  changeRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export default api;

// Aliases for backward compatibility with existing pages
export const meetingAPI = meetingsAPI;
export const documentAPI = documentsAPI;
export const chatAPI = chatsAPI;
