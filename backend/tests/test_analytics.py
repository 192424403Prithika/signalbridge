import pytest
from app.services.analytics_engine import AnalyticsEngine

class MockSymptom:
    def __init__(self, name, category="Pain"):
        self.name = name
        self.category = category

class MockEntry:
    def __init__(self, id, name, onset_date, severity=None, duration=None, contexts=None):
        self.id = id
        self.symptom = MockSymptom(name)
        self.onset_date = onset_date
        self.onset_time = "12:00"
        self.severity = severity
        self.duration_minutes = duration
        self.contexts = contexts or []

def test_frequency_calculation():
    entries = [
        MockEntry(1, "Pelvic Cramps", "2026-04-01"),
        MockEntry(2, "Pelvic Cramps", "2026-04-01"),  # Same day, second entry
        MockEntry(3, "Pelvic Cramps", "2026-04-05"),
        MockEntry(4, "Bloating", "2026-04-02")
    ]
    # Period 2026-04-01 to 2026-04-10 = 10 days
    freq = AnalyticsEngine.calculate_frequency(entries, "2026-04-01", "2026-04-10")

    cramps_item = next(f for f in freq if f["symptom_name"] == "Pelvic Cramps")
    assert cramps_item["distinct_days_count"] == 2
    assert cramps_item["period_total_days"] == 10
    assert cramps_item["frequency_rate"] == 0.2
    assert cramps_item["frequency_percentage"] == 20.0
    assert 1 in cramps_item["evidence_entry_ids"]
    assert 2 in cramps_item["evidence_entry_ids"]

def test_severity_metrics_exclusion():
    entries = [
        MockEntry(1, "Headache", "2026-04-01", severity=4),
        MockEntry(2, "Headache", "2026-04-02", severity=8),
        MockEntry(3, "Headache", "2026-04-03", severity=None),  # Missing severity
    ]
    sev = AnalyticsEngine.calculate_severity_metrics(entries)
    assert sev["has_data"] is True
    assert sev["sample_size"] == 2
    assert sev["excluded_count"] == 1
    assert sev["average"] == 6.0
    assert sev["median"] == 6.0
    assert sev["min"] == 4
    assert sev["max"] == 8

def test_duration_unknown_handling():
    entries = [
        MockEntry(1, "Fatigue", "2026-04-01", duration=120),
        MockEntry(2, "Fatigue", "2026-04-02", duration=None),  # Unknown duration
    ]
    dur = AnalyticsEngine.calculate_duration_metrics(entries)
    assert dur["has_data"] is True
    assert dur["sample_size"] == 1
    assert dur["unknown_count"] == 1
    assert dur["average_minutes"] == 120.0
    assert "labeled 'unknown', not zero" in dur["calculation_notes"]

def test_period_comparison():
    p1 = [
        MockEntry(1, "Headache", "2026-04-10", severity=8),
        MockEntry(2, "Headache", "2026-04-12", severity=6)
    ]
    p2 = [
        MockEntry(3, "Headache", "2026-04-01", severity=4),
        MockEntry(4, "Headache", "2026-04-03", severity=4)
    ]
    comp = AnalyticsEngine.compare_periods(p1, p2)
    assert comp["period1_avg_severity"] == 7.0
    assert comp["period2_avg_severity"] == 4.0
    assert comp["severity_absolute_change"] == 3.0
    assert comp["severity_percentage_change"] == 75.0
