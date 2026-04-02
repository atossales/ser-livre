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

// Interceptor: tenta refresh automático de token; se falhar, redireciona ao login
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Encadeia requisições enquanto o refresh está em progresso
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('serlivre_refresh');
        if (refreshToken) {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          if (data.token) {
            localStorage.setItem('serlivre_token', data.token);
            if (data.refreshToken) localStorage.setItem('serlivre_refresh', data.refreshToken);
            api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
            processQueue(null, data.token);
            originalRequest.headers.Authorization = `Bearer ${data.token}`;
            return api(originalRequest);
          }
        }
      } catch (_err) {
        processQueue(_err, null);
      } finally {
        isRefreshing = false;
      }

      // Refresh falhou — logout e redireciona
      localStorage.removeItem('serlivre_token');
      localStorage.removeItem('serlivre_refresh');
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

// ── Reports ──
export const getCohortReport = () => api.get('/reports/cohort');

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

// ── Alerts ──
export const resolveAlert = (id) => api.patch(`/alerts/${id}/resolve`);

// ── Appointments ──
export const getAppointments = () => api.get('/appointments');
export const createAppointment = (data) => api.post('/appointments', data);
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`);

// ── WhatsApp ──
export const sendWhatsAppMsg = (data) => api.post('/whatsapp/send', data);
export const getWhatsAppStatus = () => api.get('/whatsapp/status');

// ── Message Templates ──
export const getMessageTemplates = () => api.get('/messages/templates');
export const createMessageTemplate = (data) => api.post('/messages/templates', data);
export const updateMessageTemplate = (id, data) => api.put(`/messages/templates/${id}`, data);
export const deleteMessageTemplate = (id) => api.delete(`/messages/templates/${id}`);
export const generateMessage = (data) => api.post('/messages/generate', data);

// ── Messages (chat interno) ──
export const getMessages = (patientId) => api.get('/messages', { params: patientId ? { patientId } : {} });
export const sendMessage = (data) => api.post('/messages', data);

// ── Circunferências ──
export const saveCircumference = (data) => api.post('/circumferences', data);
export const getCircumferences = (cycleId) => api.get(`/circumferences/${cycleId}`);

// ── Staff / Equipe ──
export const getStaff = () => api.get('/staff');
export const updateUserProfile = (id, data) => api.put(`/users/${id}/profile`, data);
export const updateUserEmail = (id, data) => api.put(`/users/${id}/email`, data);
export const updateUserPassword = (id, data) => api.put(`/users/${id}/password`, data);
export const updateStaffRole = (id, role) => api.put(`/users/${id}/role`, { role });
export const deleteStaff = (id) => api.delete(`/users/${id}`);

// ── Activity Log ──
export const getActivity = () => api.get('/activity');
export const logActivity = (data) => api.post('/activity', data);

// ── Automations ──
export const getAutomations = () => api.get('/automations');
export const updateAutomation = (id, data) => api.put(`/automations/${id}`, data);
export const toggleAutomation = (id) => api.patch(`/automations/${id}/toggle`);
export const getAutomationLogs = (id) => api.get(`/automations/${id}/logs`);
export const setPatientWeighDay = (id, weighDay) => api.patch(`/patients/${id}/weigh-day`, { weighDay });

// ── MedX ──
export const searchMedx = (q) => api.get('/medx/search', { params: { q } });
export const getMedxPatient = (id) => api.get(`/medx/patient/${id}`);
export const setPatientOverride = (ruleId, patientId, data) => api.put(`/automations/${ruleId}/patient-overrides`, { patientId, ...data });

export default api;
