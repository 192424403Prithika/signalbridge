import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.services.analytics_engine import AnalyticsEngine
from app.models import SymptomEntry, Symptom, User, DataQualityIssue
from app.database import SessionLocal, Base, engine

client = TestClient(app)

class MockSymptom:
    def __init__(self, name, category="General"):
        self.name = name
        self.category = category

class MockEntry:
    def __init__(self, id, name, onset_date, severity=None, duration=None, contexts=None, user_id=1):
        self.id = id
        self.user_id = user_id
        self.symptom = MockSymptom(name)
        self.onset_date = onset_date
        self.onset_time = "10:00"
        self.severity = severity
        self.duration_minutes = duration
        self.contexts = contexts or []

def test_flare_up_baseline_isolation():
    """
    Candidate flare-up records must be strictly excluded from the baseline used
    to evaluate that window.
    """
    entries = []
    # 10 baseline records with severity 3
    for day in range(1, 11):
        d_str = f"2026-01-{day:02d}"
        entries.append(MockEntry(day, "Pelvic Pain", d_str, severity=3))

    # Candidate flare-up window (3 days in 7-day window with elevated severity 8)
    entries.append(MockEntry(101, "Pelvic Pain", "2026-01-20", severity=8))
    entries.append(MockEntry(102, "Pelvic Pain", "2026-01-21", severity=8))
    entries.append(MockEntry(103, "Pelvic Pain", "2026-01-22", severity=8))

    flare_ups = AnalyticsEngine.detect_flare_ups(entries, min_baseline_records=10)
    detected = [f for f in flare_ups if f.get("status") == "detected"]
    assert len(detected) == 1
    flare = detected[0]
    assert flare["symptom_name"] == "Pelvic Pain"
    assert flare["window_average_severity"] == 8.0
    assert flare["baseline_severity"] == 3.0
    assert flare["baseline_sample_size"] == 10
    assert flare["elevation"] == 5.0
    assert "Exploratory application rule" in flare["rule_type"]

def test_flare_up_insufficient_baseline_state():
    """
    When total historical records outside candidate window are < min_baseline_records,
    it must return an explicit 'insufficient_data' state, NOT 'no_flare_up'.
    """
    # Only 4 records total
    entries = [
        MockEntry(1, "Migraine", "2026-02-01", severity=7),
        MockEntry(2, "Migraine", "2026-02-02", severity=8),
        MockEntry(3, "Migraine", "2026-02-03", severity=9),
        MockEntry(4, "Migraine", "2026-02-15", severity=3),
    ]
    flare_ups = AnalyticsEngine.detect_flare_ups(entries, min_baseline_records=10)
    assert len(flare_ups) == 1
    assert flare_ups[0]["status"] == "insufficient_data"
    assert "Not enough baseline data" in flare_ups[0]["message"] or "insufficient" in flare_ups[0]["message"]

def test_period_comparison_zero_vs_missing():
    """
    Explicitly distinguishes valid 0.0 severity from missing data (None).
    """
    p1 = [MockEntry(1, "Nausea", "2026-03-10", severity=0)]
    p2 = [MockEntry(2, "Nausea", "2026-03-01", severity=0)]
    comp = AnalyticsEngine.compare_periods(p1, p2)
    assert comp["period1_avg_severity"] == 0.0
    assert comp["period2_avg_severity"] == 0.0
    assert comp["severity_absolute_change"] == 0.0
    assert comp["severity_percentage_change"] == 0.0
    assert "Both periods maintained average severity of 0.0" in comp["interpretation"]

    # When missing data (None)
    p3 = [MockEntry(3, "Nausea", "2026-03-15", severity=None)]
    comp_missing = AnalyticsEngine.compare_periods(p3, p2)
    assert comp_missing["period1_avg_severity"] is None
    assert comp_missing["period2_avg_severity"] == 0.0
    assert "current period has no severity records" in comp_missing["interpretation"]

def test_consultation_readiness_checklist_formula():
    """
    Readiness completeness percentage must have clear formula:
    completed_criteria / total_criteria * 100
    """
    entries = [
        MockEntry(1, "Backache", "2026-01-01", severity=5),
        MockEntry(2, "Backache", "2026-01-02", severity=6),
        MockEntry(3, "Backache", "2026-01-03", severity=7),
    ]
    readiness = AnalyticsEngine.calculate_consultation_readiness(
        entries=entries,
        medications=[],
        cycles=[],
        quality_issues=[],
        profile=None,
        reports=[]
    )
    assert "completeness_percentage" in readiness
    assert "checklist" in readiness
    assert "disclaimer" in readiness
    assert readiness["total_criteria_count"] == 7
    expected_pct = round((readiness["completed_criteria_count"] / 7) * 100)
    assert readiness["completeness_percentage"] == expected_pct
    assert "Consultation Readiness measures the organization" in readiness["disclaimer"]

def test_dynamic_insights_generation():
    """
    Dynamic insights must return transparent calculation metadata, formula,
    and distinct day counts.
    """
    entries = [
        MockEntry(1, "Pelvic Cramps", "2026-01-01", severity=6),
        MockEntry(2, "Pelvic Cramps", "2026-01-01", severity=7),  # 2nd entry on same day
        MockEntry(3, "Pelvic Cramps", "2026-01-05", severity=5),
    ]
    insights = AnalyticsEngine.generate_dynamic_insights(entries, "2026-01-01", "2026-01-10")
    assert len(insights) > 0
    freq_insight = next(i for i in insights if i["insight_type"] == "frequency")
    assert freq_insight["calculation_metadata"]["distinct_days_count"] == 2
    assert freq_insight["calculation_metadata"]["total_records_count"] == 3
    assert 1 in freq_insight["evidence_entry_ids"]
    assert 2 in freq_insight["evidence_entry_ids"]

def test_date_range_validation_endpoint():
    """
    API endpoint /analytics/overview must validate date format and reversed dates.
    """
    login_res = client.post("/api/v1/auth/demo")
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Invalid date format
    bad_date_res = client.get("/api/v1/analytics/overview?start_date=2026-99-99", headers=headers)
    assert bad_date_res.status_code == 400
    assert "Invalid start_date format" in bad_date_res.json()["detail"]

    # Reversed dates
    reversed_res = client.get(
        "/api/v1/analytics/overview?start_date=2026-05-10&end_date=2026-05-01",
        headers=headers
    )
    assert reversed_res.status_code == 400
    assert "Reversed date range" in reversed_res.json()["detail"]

def test_consultation_readiness_endpoint():
    """
    GET /analytics/readiness returns structured checklist and score.
    """
    login_res = client.post("/api/v1/auth/demo")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/analytics/readiness", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "readiness_tier" in data
    assert "completeness_percentage" in data
    assert "checklist" in data
    assert len(data["checklist"]) == 7
