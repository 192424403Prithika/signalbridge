import {
  User, HealthProfile, SymptomTaxonomy, SymptomEntry, ExtractedProposal,
  Medication, MedicationLog, Cycle, CyclePrediction, Insight, EvidenceDetail,
  DataQualityIssue, Report, Appointment, AnalyticsOverview
} from '../types';

let rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
if (rawApiUrl && !rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
  rawApiUrl = `https://${rawApiUrl}`;
}
export const API_BASE_URL = rawApiUrl;
const BASE_URL = `${API_BASE_URL}/api/v1`;

export function getToken(): string | null {
  return localStorage.getItem('signalbridge_token');
}

export function getExportUrl(path: string): string {
  const token = getToken();
  const sep = path.includes('?') ? '&' : '?';
  const tokenParam = token ? `${sep}token=${encodeURIComponent(token)}` : '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}${tokenParam}`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  // If response is 204 or empty
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {} as T;
}

// --- API Service Methods ---

export const api = {
  getExportUrl,

  // Auth
  login: (credentials: any) =>
    apiRequest<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  demoLogin: () =>
    apiRequest<{ access_token: string; user: User }>('/auth/demo', {
      method: 'POST',
    }),

  signup: (userData: any) =>
    apiRequest<{ access_token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getMe: () => apiRequest<User>('/auth/me'),

  changePassword: (passwords: { old_password: string; new_password: string }) =>
    apiRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    }),

  deleteAccount: () =>
    apiRequest<{ message: string }>('/auth/delete-account', {
      method: 'POST',
    }),

  // Profile
  getProfile: () => apiRequest<HealthProfile>('/profile'),

  updateProfile: (profile: Partial<HealthProfile>) =>
    apiRequest<HealthProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  updatePrivacy: (settings: { data_sharing: boolean; sensitive_categories_opt_in: boolean; export_restricted: boolean; ai_consent: boolean }) =>
    apiRequest<any>('/profile/privacy', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Symptoms & Journal
  getTaxonomy: (category?: string) =>
    apiRequest<SymptomTaxonomy[]>(category ? `/symptoms/taxonomy?category=${encodeURIComponent(category)}` : '/symptoms/taxonomy'),

  createCustomSymptom: (symptom: { name: string; category: string; description?: string; urgency_flag?: boolean }) =>
    apiRequest<SymptomTaxonomy>('/symptoms/taxonomy', {
      method: 'POST',
      body: JSON.stringify(symptom),
    }),

  getEntries: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const qs = query.toString();
    return apiRequest<SymptomEntry[]>(qs ? `/symptoms/entries?${qs}` : '/symptoms/entries');
  },

  createEntry: (entry: any) =>
    apiRequest<{ id: number; symptom_name: string; severity?: number; safety_urgency_alert?: boolean; safety_notice?: string }>('/symptoms/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  getEntryDetail: (id: number) => apiRequest<SymptomEntry>(`/symptoms/entries/${id}`),

  updateEntry: (id: number, entry: any) =>
    apiRequest<{ message: string; id: number }>(`/symptoms/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    }),

  confirmAiEntry: (id: number) =>
    apiRequest<{ message: string }>(`/symptoms/entries/${id}/confirm`, {
      method: 'POST',
    }),

  deleteEntry: (id: number) =>
    apiRequest<{ message: string }>(`/symptoms/entries/${id}`, {
      method: 'DELETE',
    }),

  // AI NLP Extraction
  extractNlp: (text: string) =>
    apiRequest<{ proposals: ExtractedProposal[]; raw_text: string; extracted_count: number; disclaimer: string }>('/ai/extract', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Analytics
  getAnalyticsOverview: (startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.append('start_date', startDate);
    if (endDate) query.append('end_date', endDate);
    const qs = query.toString();
    return apiRequest<AnalyticsOverview>(qs ? `/analytics/overview?${qs}` : '/analytics/overview');
  },

  getFlareUps: () => apiRequest<{ flare_ups: any[]; methodology: string }>('/analytics/flare-ups'),
  getCorrelations: () => apiRequest<{ correlations: any[]; disclaimer: string }>('/analytics/correlations'),

  // Insights & Evidence
  getInsights: () => apiRequest<Insight[]>('/insights'),
  getEvidence: (id: number) => apiRequest<EvidenceDetail>(`/insights/${id}/evidence`),
  dismissInsight: (id: number) => apiRequest<{ message: string }>(`/insights/${id}/dismiss`, { method: 'POST' }),
  saveInsightToReport: (id: number) => apiRequest<{ message: string }>(`/insights/${id}/save-to-report`, { method: 'POST' }),

  // Data Quality
  getDataQualityIssues: (status = 'open') =>
    apiRequest<DataQualityIssue[]>(`/data-quality?status=${status}`),
  triggerQualityScan: () => apiRequest<{ message: string; open_issues_count: number }>('/data-quality/scan', { method: 'POST' }),
  resolveQualityIssue: (id: number) => apiRequest<{ message: string }>(`/data-quality/${id}/resolve`, { method: 'POST' }),
  ignoreQualityIssue: (id: number) => apiRequest<{ message: string }>(`/data-quality/${id}/ignore`, { method: 'POST' }),

  // Medications
  getMedications: () => apiRequest<Medication[]>('/medications'),
  addMedication: (med: any) => apiRequest<Medication>('/medications', { method: 'POST', body: JSON.stringify(med) }),
  updateMedication: (id: number, med: any) => apiRequest<Medication>(`/medications/${id}`, { method: 'PUT', body: JSON.stringify(med) }),
  deleteMedication: (id: number) => apiRequest<{ message: string }>(`/medications/${id}`, { method: 'DELETE' }),
  getMedicationLogs: (medicationId?: number) =>
    apiRequest<MedicationLog[]>(medicationId ? `/medications/logs?medication_id=${medicationId}` : '/medications/logs'),
  logMedicationDose: (logData: any) =>
    apiRequest<MedicationLog>('/medications/logs', { method: 'POST', body: JSON.stringify(logData) }),

  // Cycles
  getCycles: () => apiRequest<Cycle[]>('/cycles'),
  recordCycle: (cycle: any) => apiRequest<Cycle>('/cycles', { method: 'POST', body: JSON.stringify(cycle) }),
  deleteCycle: (id: number) => apiRequest<{ message: string }>(`/cycles/${id}`, { method: 'DELETE' }),
  getCyclePrediction: () => apiRequest<CyclePrediction>('/cycles/prediction'),

  // Reports
  generateReport: (reportData: any) => apiRequest<Report>('/reports/generate', { method: 'POST', body: JSON.stringify(reportData) }),
  getReports: () => apiRequest<Report[]>('/reports'),
  getReport: (id: number) => apiRequest<Report>(`/reports/${id}`),
  deleteReport: (id: number) => apiRequest<{ message: string }>(`/reports/${id}`, { method: 'DELETE' }),

  // Appointments
  getAppointments: () => apiRequest<Appointment[]>('/appointments'),
  createAppointment: (app: any) => apiRequest<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(app) }),
  updateAppointment: (id: number, app: any) => apiRequest<Appointment>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(app) }),
  deleteAppointment: (id: number) => apiRequest<{ message: string }>(`/appointments/${id}`, { method: 'DELETE' }),

  // Admin
  getAdminMetrics: () => apiRequest<any>('/admin/metrics'),
  getAdminFlags: () => apiRequest<Record<string, boolean>>('/admin/feature-flags'),
  toggleAdminFlag: (flagName: string) => apiRequest<{ flag: string; enabled: boolean }>(`/admin/feature-flags/${flagName}/toggle`, { method: 'POST' }),
  getAdminTaxonomy: () => apiRequest<SymptomTaxonomy[]>('/admin/taxonomy'),
  toggleTaxonomyActive: (id: number) => apiRequest<{ id: number; is_active: boolean }>(`/admin/taxonomy/${id}/toggle-active`, { method: 'PUT' }),
};
