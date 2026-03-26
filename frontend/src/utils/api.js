// ============================================================
// UTILITÁRIO DE API
//
// Centraliza todas as chamadas ao backend.
// Automaticamente adiciona o token JWT em cada requisição.
// ============================================================

import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Interceptor: adiciona o token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('serlivre_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: redireciona para login se token expirou
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('serlivre_token');
      localStorage.removeItem('serlivre_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);

// ── Patients ──
export const getPatients = () => api.get('/patients');
export const getPatient = (id) => api.get(`/patients/${id}`);
export const createPatient = (data) => api.post('/patients', data);

// ── Scores ──
export const saveScores = (data) => api.post('/scores', data);
export const getScores = (cycleId) => api.get(`/scores/${cycleId}`);

// ── Week Checks ──
export const saveWeekCheck = (data) => api.post('/weekchecks', data);
export const getWeekChecks = (cycleId) => api.get(`/weekchecks/${cycleId}`);

// ── Alerts ──
export const getAlerts = () => api.get('/alerts');

// ── Dashboard ──
export const getDashboard = () => api.get('/dashboard');

// ── Avatar ──
export const updateAvatar = (userId, file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return api.put(`/users/${userId}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ── Seed (só na primeira vez) ──
export const seed = () => api.post('/seed');

// ── Auth (novos) ──
export const acceptInvite = (token, password) => api.post('/auth/accept-invite', { token, password });
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post(`/auth/reset-password/${token}`, { password });

// ── Pacientes (novos) ──
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatient = (id) => api.delete(`/patients/${id}`);
export const bulkDeletePatients = (ids) => api.delete('/patients', { data: { ids } });
export const finishProgram = (id) => api.patch(`/patients/${id}/finish`);
export const restartProgram = (id) => api.patch(`/patients/${id}/restart`);

// ── Usuários ──
export const resendInvite = (userId) => api.post(`/users/${userId}/resend-invite`);

export default api;
