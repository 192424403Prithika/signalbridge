export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'user' | 'guest' | 'admin';
  ai_consent: boolean;
  email_verified?: boolean;
  privacy_settings?: {
    data_sharing?: boolean;
    sensitive_categories_opt_in?: boolean;
    export_restricted?: boolean;
    is_synthetic_demo?: boolean;
  };
  created_at?: string;
}

export interface HealthProfile {
  id?: number;
  user_id?: number;
  preferred_name?: string;
  pronouns?: string;
  date_of_birth?: string;
  age_range?: string;
  biological_sex?: string;
  gender_identity?: string;
  cycle_tracking_enabled: boolean;
  average_cycle_length: number;
  typical_period_duration: number;
  pregnancy_status?: string;
  postpartum_status?: string;
  perimenopause_status?: string;
  allergies?: string;
  long_term_conditions?: string;
  emergency_contact?: string;
  consent_acknowledged: boolean;
}

export interface SymptomTaxonomy {
  id: number;
  name: string;
  category: string;
  description?: string;
  is_custom: boolean;
  urgency_flag: boolean;
  is_active?: boolean;
}

export interface ContextItem {
  context_type: string;
  value: string;
  notes?: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface SymptomEntry {
  id: number;
  user_id: number;
  symptom_id: number;
  symptom_name: string;
  symptom_category: string;
  recorded_at: string;
  onset_date: string;
  onset_time?: string;
  end_date?: string;
  end_time?: string;
  duration_minutes?: number;
  severity?: number;
  body_location?: string;
  notes?: string;
  source_type: 'structured' | 'natural_language' | 'imported';
  ai_extracted: boolean;
  user_confirmed: boolean;
  privacy_category: string;
  cycle_phase?: string;
  contexts?: ContextItem[];
  tags?: Tag[];
  safety_urgency_alert?: boolean;
  edit_history?: Array<{
    timestamp: string;
    action: string;
    previous_state?: any;
  }>;
}

export interface ExtractedProposal {
  symptom_name: string;
  category?: string;
  onset_date: string;
  onset_time?: string;
  duration_minutes?: number;
  severity?: number;
  body_location?: string;
  impact?: string;
  suggested_tags: string[];
  context_factors: ContextItem[];
  confidence_score: number;
  original_snippet: string;
  disclaimer: string;
}

export interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  prescriber?: string;
  purpose?: string;
  notes?: string;
  is_active: boolean;
}

export interface MedicationLog {
  id: number;
  medication_id: number;
  medication_name: string;
  taken_at: string;
  status: 'taken' | 'missed' | 'skipped';
  side_effects?: string;
  perceived_effectiveness?: string;
  notes?: string;
}

export interface Cycle {
  id: number;
  period_start_date: string;
  period_end_date?: string;
  flow_intensity: 'light' | 'medium' | 'heavy' | 'spotting';
  cycle_length?: number;
  notes?: string;
}

export interface CyclePrediction {
  predicted_next_period_start?: string;
  predicted_next_period_end?: string;
  predicted_ovulation_date?: string;
  cycle_length_average?: number;
  confidence: string;
  uncertainty_notice: string;
}

export interface Insight {
  id: number;
  insight_type: string;
  title: string;
  description: string;
  evidence_entry_ids: number[];
  calculation_metadata: Record<string, any>;
  confidence_level: 'low evidence' | 'moderate evidence' | 'high evidence' | 'insufficient data';
  status: 'active' | 'dismissed' | 'saved_to_report';
  created_at: string;
}

export interface EvidenceDetail {
  insight_id: number;
  title: string;
  description: string;
  contributing_records: Array<{
    id: number;
    symptom: string;
    onset_date: string;
    onset_time?: string;
    severity?: number;
    duration_minutes?: number;
    body_location?: string;
    notes?: string;
  }>;
  sample_size: number;
  calculation_formula: string;
  excluded_records_count: number;
  exclusion_reason?: string;
  missing_data_summary: string;
  confidence_level: string;
  disclaimer: string;
}

export interface DataQualityIssue {
  id: number;
  user_id: number;
  issue_type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  affected_entry_ids: number[];
  suggested_action: string;
  status: 'open' | 'resolved' | 'ignored';
  created_at: string;
}

export interface Report {
  id: number;
  title: string;
  date_range_start: string;
  date_range_end: string;
  primary_concerns?: string;
  selected_sections: string[];
  generated_content: any;
  questions_for_clinician?: string;
  status: 'draft' | 'finalized';
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  clinician_name: string;
  specialty?: string;
  appointment_date: string;
  location?: string;
  top_concerns?: string;
  questions_to_ask?: string;
  pre_visit_checklist: Record<string, any>;
  post_visit_notes?: string;
  tests_ordered?: string;
  referrals?: string;
  treatment_plan?: string;
  follow_up_date?: string;
  personal_notes?: string;
}

export interface AnalyticsOverview {
  date_range: { start: string; end: string };
  total_records_in_period: number;
  total_all_time_records: number;
  symptom_frequency: Array<{
    symptom_name: string;
    category: string;
    frequency_rate: number;
    frequency_percentage: number;
    distinct_days_count: number;
    total_records_count: number;
    period_total_days: number;
    evidence_entry_ids: number[];
    calculation_formula: string;
    limitations: string;
    confidence_level: string;
  }>;
  severity_metrics: {
    has_data: boolean;
    sample_size: number;
    excluded_count: number;
    average?: number;
    median?: number;
    min?: number;
    max?: number;
    latest?: number;
    latest_date?: string;
    trend: string;
    contributing_entry_ids?: number[];
  };
  duration_metrics: {
    has_data: boolean;
    sample_size: number;
    unknown_count: number;
    average_minutes?: number;
    median_minutes?: number;
    shortest_minutes?: number;
    longest_minutes?: number;
  };
  flare_ups: Array<{
    symptom_name: string;
    status: string;
    start_date?: string;
    end_date?: string;
    active_days?: number;
    window_average_severity?: number;
    baseline_severity?: number;
    elevation?: number;
    evidence_entry_ids?: number[];
    rule?: string;
    message?: string;
    disclaimer?: string;
  }>;
  correlations: Array<{
    symptom: string;
    context: string;
    both_days_count: number;
    total_context_days: number;
    conditional_probability: number;
    percentage: number;
    evidence_entry_ids: number[];
    formula: string;
    disclaimer: string;
  }>;
  period_comparison: {
    period1_label: string;
    period2_label: string;
    period1_records: number;
    period2_records: number;
    period1_avg_severity?: number;
    period2_avg_severity?: number;
    severity_absolute_change?: number;
    severity_percentage_change?: number;
    interpretation: string;
    evidence_p1_ids: number[];
    evidence_p2_ids: number[];
  };
  baseline_comparison: {
    baseline_status: string;
    baseline_sample_size: number;
    baseline_average_severity?: number;
    current_period_average_severity?: number;
    difference?: number;
  };
  missing_data_summary: {
    missing_severity_entries: number;
    missing_duration_entries: number;
    notes: string;
  };
  disclaimer: string;
}
