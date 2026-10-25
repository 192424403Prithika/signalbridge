from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    ai_consent: bool = False
    terms_consent: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class PrivacySettingsUpdate(BaseModel):
    data_sharing: bool = False
    sensitive_categories_opt_in: bool = False
    export_restricted: bool = False
    ai_consent: bool = False

# --- Health Profile ---
class HealthProfileBase(BaseModel):
    preferred_name: Optional[str] = None
    pronouns: Optional[str] = None
    date_of_birth: Optional[str] = None
    age_range: Optional[str] = None
    biological_sex: Optional[str] = None
    gender_identity: Optional[str] = None
    cycle_tracking_enabled: bool = False
    average_cycle_length: int = 28
    typical_period_duration: int = 5
    pregnancy_status: Optional[str] = None
    postpartum_status: Optional[str] = None
    perimenopause_status: Optional[str] = None
    allergies: Optional[str] = None
    long_term_conditions: Optional[str] = None
    emergency_contact: Optional[str] = None
    consent_acknowledged: bool = True

class HealthProfileCreate(HealthProfileBase):
    pass

class HealthProfileUpdate(HealthProfileBase):
    pass

class HealthProfileOut(HealthProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Taxonomy / Symptom ---
class SymptomBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    urgency_flag: bool = False

class SymptomCreate(SymptomBase):
    pass

class SymptomOut(SymptomBase):
    id: int
    is_custom: bool
    is_active: bool
    created_by_user_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- Entry Context & Tags ---
class ContextItem(BaseModel):
    context_type: str
    value: str
    notes: Optional[str] = None

class TagBase(BaseModel):
    name: str
    color: str = "#d75f75"

class TagOut(TagBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- Symptom Entries ---
class SymptomEntryCreate(BaseModel):
    symptom_id: Optional[int] = None
    symptom_name: Optional[str] = None  # helper if selecting by name
    onset_date: str
    onset_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    severity: Optional[int] = Field(None, ge=0, le=10)
    body_location: Optional[str] = None
    notes: Optional[str] = None
    source_type: str = "structured"  # structured, natural_language, imported
    ai_extracted: bool = False
    user_confirmed: bool = True
    privacy_category: str = "standard"
    cycle_phase: Optional[str] = None
    contexts: List[ContextItem] = []
    tag_names: List[str] = []

class SymptomEntryUpdate(BaseModel):
    onset_date: Optional[str] = None
    onset_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    severity: Optional[int] = Field(None, ge=0, le=10)
    body_location: Optional[str] = None
    notes: Optional[str] = None
    user_confirmed: Optional[bool] = None
    privacy_category: Optional[str] = None
    cycle_phase: Optional[str] = None
    contexts: Optional[List[ContextItem]] = None
    tag_names: Optional[List[str]] = None

class SymptomEntryOut(BaseModel):
    id: int
    user_id: int
    symptom_id: int
    symptom_name: str
    symptom_category: str
    recorded_at: datetime
    onset_date: str
    onset_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    severity: Optional[int] = None
    body_location: Optional[str] = None
    notes: Optional[str] = None
    source_type: str
    ai_extracted: bool
    user_confirmed: bool
    privacy_category: str
    cycle_phase: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    contexts: List[Dict[str, Any]] = []
    tags: List[TagOut] = []
    edit_history: List[Dict[str, Any]] = []
    safety_urgency_alert: bool = False

    class Config:
        from_attributes = True

# --- Natural Language AI Extraction ---
class NLPExtractRequest(BaseModel):
    text: str

class ExtractedSymptomProposal(BaseModel):
    symptom_name: str
    category: Optional[str] = "General"
    onset_date: str
    onset_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    severity: Optional[int] = None
    body_location: Optional[str] = None
    impact: Optional[str] = None
    suggested_tags: List[str] = []
    context_factors: List[ContextItem] = []
    confidence_score: float = 0.85
    original_snippet: str
    disclaimer: str = "AI-generated suggestion — please review, edit, or reject before saving."

class NLPExtractResponse(BaseModel):
    proposals: List[ExtractedSymptomProposal]
    raw_text: str
    extracted_count: int
    disclaimer: str

# --- Medications ---
class MedicationBase(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: str
    end_date: Optional[str] = None
    prescriber: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class MedicationCreate(MedicationBase):
    pass

class MedicationOut(MedicationBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class MedicationLogCreate(BaseModel):
    medication_id: int
    taken_at: Optional[datetime] = None
    status: str = "taken"  # taken, missed, skipped
    side_effects: Optional[str] = None
    perceived_effectiveness: Optional[str] = None
    notes: Optional[str] = None

class MedicationLogOut(BaseModel):
    id: int
    medication_id: int
    medication_name: str
    user_id: int
    taken_at: datetime
    status: str
    side_effects: Optional[str]
    perceived_effectiveness: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True

# --- Cycles ---
class CycleBase(BaseModel):
    period_start_date: str
    period_end_date: Optional[str] = None
    flow_intensity: str = "medium"
    cycle_length: Optional[int] = None
    notes: Optional[str] = None

class CycleCreate(CycleBase):
    pass

class CycleOut(CycleBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class CyclePrediction(BaseModel):
    predicted_next_period_start: Optional[str] = None
    predicted_next_period_end: Optional[str] = None
    predicted_ovulation_date: Optional[str] = None
    cycle_length_average: Optional[float] = None
    confidence: str
    uncertainty_notice: str

# --- Insights & Evidence ---
class InsightOut(BaseModel):
    id: int
    user_id: int
    insight_type: str
    title: str
    description: str
    evidence_entry_ids: List[int]
    calculation_metadata: Dict[str, Any]
    confidence_level: str
    status: str
    created_at: datetime

class EvidenceDetail(BaseModel):
    insight_id: int
    insight_statement: str
    contributing_records: List[Dict[str, Any]]
    calculation_method: str
    sample_size: int
    excluded_records_count: int
    exclusion_reason: Optional[str] = None
    missing_data_summary: str
    confidence_level: str
    disclaimer: str

# --- Data Quality ---
class DataQualityIssueOut(BaseModel):
    id: int
    user_id: int
    issue_type: str
    severity: str
    description: str
    affected_entry_ids: List[int]
    suggested_action: str
    status: str
    created_at: datetime

# --- Reports ---
class ReportCreate(BaseModel):
    title: str
    date_range_start: str
    date_range_end: str
    primary_concerns: Optional[str] = None
    selected_sections: List[str] = [
        "patient_summary", "symptom_timeline", "trends", "medications", "cycles", "questions", "evidence_appendix"
    ]
    questions_for_clinician: Optional[str] = None

class ReportOut(BaseModel):
    id: int
    user_id: int
    title: str
    date_range_start: str
    date_range_end: str
    primary_concerns: Optional[str]
    selected_sections: List[str]
    generated_content: Dict[str, Any]
    questions_for_clinician: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

# --- Appointments ---
class AppointmentCreate(BaseModel):
    clinician_name: str
    specialty: Optional[str] = None
    appointment_date: str
    location: Optional[str] = None
    top_concerns: Optional[str] = None
    questions_to_ask: Optional[str] = None
    pre_visit_checklist: Optional[Dict[str, Any]] = None

class AppointmentUpdate(BaseModel):
    clinician_name: Optional[str] = None
    specialty: Optional[str] = None
    appointment_date: Optional[str] = None
    location: Optional[str] = None
    top_concerns: Optional[str] = None
    questions_to_ask: Optional[str] = None
    pre_visit_checklist: Optional[Dict[str, Any]] = None
    post_visit_notes: Optional[str] = None
    tests_ordered: Optional[str] = None
    referrals: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up_date: Optional[str] = None
    personal_notes: Optional[str] = None

class AppointmentOut(BaseModel):
    id: int
    user_id: int
    clinician_name: str
    specialty: Optional[str]
    appointment_date: str
    location: Optional[str]
    top_concerns: Optional[str]
    questions_to_ask: Optional[str]
    pre_visit_checklist: Dict[str, Any]
    post_visit_notes: Optional[str]
    tests_ordered: Optional[str]
    referrals: Optional[str]
    treatment_plan: Optional[str]
    follow_up_date: Optional[str]
    personal_notes: Optional[str]
    created_at: datetime

# --- Analytics Response Models ---
class AnalyticsOverview(BaseModel):
    date_range: Dict[str, str]
    total_records: int
    symptom_frequency: List[Dict[str, Any]]
    severity_metrics: Dict[str, Any]
    duration_metrics: Dict[str, Any]
    flare_ups: List[Dict[str, Any]]
    correlations: List[Dict[str, Any]]
    period_comparison: Dict[str, Any]
    baseline_comparison: Dict[str, Any]
    missing_data_summary: Dict[str, Any]
    disclaimer: str
