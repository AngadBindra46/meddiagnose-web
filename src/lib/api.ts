import axios from 'axios';

// Resolved at REQUEST time (not build time) so production builds work on localhost
function getApiBase(): string {
  if (typeof window === 'undefined') return '/api/v1';
  const origin = window.location.origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
  }
  return import.meta.env.VITE_API_BASE_URL || '/api/v1';
}

const api = axios.create({ timeout: 30000 });

api.interceptors.request.use((config) => {
  config.baseURL = getApiBase();
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login?session_expired=1';
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  updateMe: (data: {
    full_name?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    allergies?: string;
    phone?: string;
    weight_kg?: number;
    onboarding_completed?: boolean;
  }) => api.patch('/auth/me', data),
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    allergies?: string;
    phone?: string;
    weight_kg?: number;
  }) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const patientApi = {
  list: (params: Record<string, any>) => api.get('/patients', { params }),
  get: (id: number) => api.get(`/patients/${id}`),
};

export interface DoctorSummary {
  id: number;
  email: string;
  full_name: string;
}

export const doctorApi = {
  list: (params?: { search?: string }) => api.get<DoctorSummary[]>('/doctors', { params }),
  getLinked: () => api.get<DoctorSummary | null>('/doctors/linked'),
  link: (doctorId: number) => api.post('/doctors/link', { doctor_id: doctorId }),
  unlink: () => api.delete('/doctors/link'),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params: Record<string, any>) => api.get('/admin/users', { params }),
  toggleActive: (id: number) => api.put(`/admin/users/${id}/toggle-active`),
  changeRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, null, { params: { role } }),
  diagnoses: (params: Record<string, any>) => api.get('/admin/diagnoses', { params }),
  diseaseDistribution: (days: number) => api.get('/admin/analytics/disease-distribution', { params: { days } }),
  dailyTrend: (days: number) => api.get('/admin/analytics/daily-trend', { params: { days } }),
  confidenceDistribution: () => api.get('/admin/analytics/confidence-distribution'),
  patients: (params: Record<string, any>) => api.get('/admin/patients', { params }),
  patientDetail: (id: number) => api.get(`/admin/patients/${id}`),
  patientDiagnoses: (id: number, params: Record<string, any>) => api.get(`/admin/patients/${id}/diagnoses`, { params }),
  genderDisease: (days: number) => api.get('/admin/analytics/gender-disease', { params: { days } }),
  topMedications: (days: number) => api.get('/admin/analytics/top-medications', { params: { days } }),
  severityByGender: (days: number) => api.get('/admin/analytics/severity-by-gender', { params: { days } }),
};

export interface DiagnosisVitals {
  systolic?: number;
  diastolic?: number;
  spo2?: number;
  heartRate?: number;
  temperature?: number;  // °F
  respiratoryRate?: number;
  bloodSugar?: number;   // mg/dL
  weightKg?: number;
  painLevel?: number;    // 0-10
  ecgNotes?: string;
}

export const diagnosisApi = {
  sampleCases: () => api.get<{ cases: { name: string; symptoms: string; clinical_notes: string; report_content: string }[] }>('/diagnoses/sample'),
  sampleCase: (index: number) => api.get<{ name: string; symptoms: string; clinical_notes: string; report_content: string }>(`/diagnoses/sample/${index}`),
  fetchFromUrl: (url: string) => api.get<{ symptoms: string; clinical_notes: string; report_content: string }>('/diagnoses/sample/fetch-url', { params: { url } }),
  analyze: (
    symptoms: string,
    clinicalNotes: string,
    files: File[],
    modelSize?: '4b' | '27b',
    vitals?: DiagnosisVitals,
    patientId?: number
  ) => {
    const fd = new FormData();
    fd.append('symptoms', symptoms);
    fd.append('clinical_notes', clinicalNotes);
    files.forEach((f) => fd.append('files', f));
    if (modelSize) fd.append('model_size', modelSize);
    if (patientId != null) fd.append('patient_id', String(patientId));
    if (vitals) {
      if (vitals.systolic != null) fd.append('vitals_systolic', String(vitals.systolic));
      if (vitals.diastolic != null) fd.append('vitals_diastolic', String(vitals.diastolic));
      if (vitals.spo2 != null) fd.append('vitals_spo2', String(vitals.spo2));
      if (vitals.heartRate != null) fd.append('vitals_heart_rate', String(vitals.heartRate));
      if (vitals.temperature != null) fd.append('vitals_temperature', String(vitals.temperature));
      if (vitals.respiratoryRate != null) fd.append('vitals_respiratory_rate', String(vitals.respiratoryRate));
      if (vitals.bloodSugar != null) fd.append('vitals_blood_sugar', String(vitals.bloodSugar));
      if (vitals.weightKg != null) fd.append('vitals_weight_kg', String(vitals.weightKg));
      if (vitals.painLevel != null) fd.append('vitals_pain_level', String(vitals.painLevel));
      if (vitals.ecgNotes) fd.append('vitals_ecg_notes', vitals.ecgNotes);
    }
    return api.post('/diagnoses/analyze', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  list: (params: Record<string, any>) => api.get('/diagnoses', { params }),
};

export const medicationApi = {
  identify: (medications: string[], extra?: {
    symptoms?: string;
    temperature_f?: number | null;
    systolic_bp?: number | null;
    diastolic_bp?: number | null;
    heart_rate?: number | null;
    spo2?: number | null;
    blood_sugar?: number | null;
    respiratory_rate?: number | null;
  }) =>
    api.post('/medications/identify', { medications, ...extra }),
};

export const pharmacyApi = {
  nearby: (medications: string[], latitude?: number, longitude?: number, radius_km = 50) =>
    api.post('/pharmacies/nearby', { medications, latitude, longitude, radius_km }),
};

export const healthAlertsApi = {
  list: (params?: { status?: string; severity?: string; limit?: number }) =>
    api.get('/health-alerts/', { params }),
  acknowledge: (alertId: number) => api.post(`/health-alerts/${alertId}/acknowledge`),
  acknowledgeAll: () => api.post('/health-alerts/acknowledge-all'),
  summary: () => api.get('/health-alerts/summary'),
};

export const healthTrackerApi = {
  create: (data: Record<string, unknown>) => api.post('/health-tracker/', data),
  list: (page = 1, perPage = 20) => api.get('/health-tracker/', { params: { page, per_page: perPage } }),
  get: (id: number) => api.get(`/health-tracker/${id}`),
  remove: (id: number) => api.delete(`/health-tracker/${id}`),
  compare: (id1: number, id2: number) => api.get('/health-tracker/compare', { params: { report_id_1: id1, report_id_2: id2 } }),
  latestComparison: () => api.get('/health-tracker/latest-comparison'),
  trends: (metrics?: string[]) => api.get('/health-tracker/trends', { params: { metrics: metrics?.join(',') || '' } }),
  status: (id: number) => api.get(`/health-tracker/${id}/status`),
};

export const fitnessApi = {
  dashboard: () => api.get('/fitness/dashboard'),
  createLog: (data: Record<string, unknown>) => api.post('/fitness/logs', data),
  listLogs: (page = 1, perPage = 30, days = 30) => api.get('/fitness/logs', { params: { page, per_page: perPage, days } }),
  getLog: (id: number) => api.get(`/fitness/logs/${id}`),
  deleteLog: (id: number) => api.delete(`/fitness/logs/${id}`),
  getGoals: () => api.get('/fitness/goals'),
  upsertGoals: (data: Record<string, unknown>) => api.put('/fitness/goals', data),
};

export const insuranceApi = {
  providers: () => api.get('/insurance/providers'),
  policies: () => api.get('/insurance/policies'),
  createPolicy: (data: Record<string, unknown>) => api.post('/insurance/policies', data),
  getPolicy: (id: number) => api.get(`/insurance/policies/${id}`),
  deactivatePolicy: (id: number) => api.delete(`/insurance/policies/${id}`),
  bills: (policyId?: number) => api.get('/insurance/bills', { params: policyId ? { policy_id: policyId } : {} }),
  createBill: (data: Record<string, unknown>) => api.post('/insurance/bills', data),
  claims: (params?: { policy_id?: number; status?: string }) => api.get('/insurance/claims', { params }),
  createClaim: (data: { policy_id: number; bill_id: number; claim_type: string }) => api.post('/insurance/claims', data),
  submitClaim: (claimId: number) => api.post(`/insurance/claims/${claimId}/submit`),
};

export const wearableApi = {
  connections: () => api.get('/wearables/connections'),
  connect: (provider: string) => api.post(`/wearables/connect/${provider}`),
  disconnect: (provider: string) => api.post(`/wearables/disconnect/${provider}`),
  sync: (provider: string, days = 7) => api.post(`/wearables/sync/${provider}`, null, { params: { days } }),
  syncAll: (days = 7) => api.post('/wearables/sync-all', null, { params: { days } }),
  liveVitals: () => api.get('/wearables/live'),
};

export const healthApi = {
  check: () => {
    const base = getApiBase();
    const root = base.startsWith('http') ? base.replace(/\/api\/v1\/?$/, '') : '';
    return axios.get(root ? `${root}/health` : '/health');
  },
  metrics: () => {
    const base = getApiBase();
    const root = base.startsWith('http') ? base.replace(/\/api\/v1\/?$/, '') : '';
    return axios.get(root ? `${root}/metrics` : '/metrics', { responseType: 'text' });
  },
};

export default api;
