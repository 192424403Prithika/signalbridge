import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
)
from sqlalchemy.orm import relationship
from app.database import Base

# Many-to-many association table for SymptomEntry and Tag
entry_tags = Table(
    'entry_tags',
    Base.metadata,
    Column('symptom_entry_id', Integer, ForeignKey('symptom_entries.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="user")  # "user", "guest", "admin"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    privacy_settings_json = Column(Text, default='{"data_sharing":false,"sensitive_categories_opt_in":false,"export_restricted":false}')
    ai_consent = Column(Boolean, default=False)

    # Relationships
    profile = relationship("HealthProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    symptom_entries = relationship("SymptomEntry", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="user", cascade="all, delete-orphan")
    cycles = relationship("Cycle", back_populates="user", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="user", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="user", cascade="all, delete-orphan")
    data_quality_issues = relationship("DataQualityIssue", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class HealthProfile(Base):
    __tablename__ = "health_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    preferred_name = Column(String(100), nullable=True)
    pronouns = Column(String(50), nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    age_range = Column(String(50), nullable=True)
    biological_sex = Column(String(50), nullable=True)
    gender_identity = Column(String(50), nullable=True)
    cycle_tracking_enabled = Column(Boolean, default=False)
    average_cycle_length = Column(Integer, default=28)
    typical_period_duration = Column(Integer, default=5)
    pregnancy_status = Column(String(100), nullable=True)
    postpartum_status = Column(String(100), nullable=True)
    perimenopause_status = Column(String(100), nullable=True)
    allergies = Column(Text, nullable=True)
    long_term_conditions = Column(Text, nullable=True)
    emergency_contact = Column(Text, nullable=True)
    consent_acknowledged = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profile")

class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, index=True, nullable=False)
    category = Column(String(100), nullable=False)  # Pain, Digestive, Menstrual, Mood, Sleep, Neurological, Systemic, Skin
    description = Column(Text, nullable=True)
    is_custom = Column(Boolean, default=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    urgency_flag = Column(Boolean, default=False)  # For neutral safety reminder if entered

    entries = relationship("SymptomEntry", back_populates="symptom")

class SymptomEntry(Base):
    __tablename__ = "symptom_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False, index=True)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)
    onset_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    onset_time = Column(String(10), nullable=True)   # HH:MM
    end_date = Column(String(10), nullable=True)     # YYYY-MM-DD
    end_time = Column(String(10), nullable=True)     # HH:MM
    duration_minutes = Column(Integer, nullable=True)
    severity = Column(Integer, nullable=True)         # 0-10 scale
    body_location = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    source_type = Column(String(50), default="structured")  # structured, natural_language, imported
    ai_extracted = Column(Boolean, default=False)
    user_confirmed = Column(Boolean, default=True)
    privacy_category = Column(String(50), default="standard")  # standard, sensitive, confidential
    cycle_phase = Column(String(50), nullable=True)            # menstrual, follicular, ovulation, luteal
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    edit_history_json = Column(Text, default="[]")

    user = relationship("User", back_populates="symptom_entries")
    symptom = relationship("Symptom", back_populates="entries")
    contexts = relationship("EntryContext", back_populates="symptom_entry", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=entry_tags, back_populates="entries")
    attachments = relationship("Attachment", back_populates="symptom_entry")

class EntryContext(Base):
    __tablename__ = "entry_context"

    id = Column(Integer, primary_key=True, index=True)
    symptom_entry_id = Column(Integer, ForeignKey("symptom_entries.id", ondelete="CASCADE"), nullable=False)
    context_type = Column(String(50), nullable=False)  # sleep, stress, exercise, diet, alcohol, caffeine, travel, medication_change, other
    value = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)

    symptom_entry = relationship("SymptomEntry", back_populates="contexts")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(100), nullable=False)
    color = Column(String(30), default="#d75f75")

    user = relationship("User", back_populates="tags")
    entries = relationship("SymptomEntry", secondary=entry_tags, back_populates="tags")

class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=True)
    prescriber = Column(String(150), nullable=True)
    purpose = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="medications")
    logs = relationship("MedicationLog", back_populates="medication", cascade="all, delete-orphan")

class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    taken_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="taken")  # taken, missed, skipped
    side_effects = Column(Text, nullable=True)
    perceived_effectiveness = Column(String(50), nullable=True)  # none, slight, moderate, significant
    notes = Column(Text, nullable=True)

    medication = relationship("Medication", back_populates="logs")

class Cycle(Base):
    __tablename__ = "cycles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    period_start_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    period_end_date = Column(String(10), nullable=True)      # YYYY-MM-DD
    flow_intensity = Column(String(50), default="medium")   # light, medium, heavy, spotting
    cycle_length = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="cycles")

class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symptom_entry_id = Column(Integer, ForeignKey("symptom_entries.id", ondelete="SET NULL"), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    storage_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_sensitive = Column(Boolean, default=False)

    user = relationship("User", back_populates="attachments")
    symptom_entry = relationship("SymptomEntry", back_populates="attachments")

class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    insight_type = Column(String(50), nullable=False)  # frequency, severity_trend, flare_up, correlation, baseline
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    evidence_entry_ids = Column(Text, default="[]")  # JSON string of list of IDs
    calculation_metadata_json = Column(Text, default="{}")  # formula, sample size, missing, exclusions
    confidence_level = Column(String(50), default="moderate evidence")  # low evidence, moderate evidence, high evidence, insufficient data
    status = Column(String(50), default="active")  # active, dismissed, saved_to_report
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="insights")

class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    issue_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="warning")  # info, warning, critical
    description = Column(Text, nullable=False)
    affected_entry_ids = Column(Text, default="[]")  # JSON string of IDs
    suggested_action = Column(Text, nullable=False)
    status = Column(String(20), default="open")  # open, resolved, ignored
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="data_quality_issues")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    date_range_start = Column(String(10), nullable=False)
    date_range_end = Column(String(10), nullable=False)
    primary_concerns = Column(Text, nullable=True)
    selected_sections_json = Column(Text, default="{}")
    generated_content_json = Column(Text, default="{}")
    questions_for_clinician = Column(Text, nullable=True)
    status = Column(String(20), default="draft")  # draft, finalized
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reports")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    clinician_name = Column(String(150), nullable=False)
    specialty = Column(String(100), nullable=True)
    appointment_date = Column(String(20), nullable=False)  # YYYY-MM-DD HH:MM
    location = Column(String(255), nullable=True)
    top_concerns = Column(Text, nullable=True)
    questions_to_ask = Column(Text, nullable=True)
    pre_visit_checklist_json = Column(Text, default="{}")
    post_visit_notes = Column(Text, nullable=True)
    tests_ordered = Column(Text, nullable=True)
    referrals = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    follow_up_date = Column(String(10), nullable=True)
    personal_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="appointments")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=True)
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
