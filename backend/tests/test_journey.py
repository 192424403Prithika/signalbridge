import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_full_user_journey():
    client = TestClient(app, base_url="http://testserver/api/v1")

    # 1. Demo Login
    demo_res = client.post("/auth/demo")
    assert demo_res.status_code == 200, f"Demo login failed: {demo_res.text}"
    token = demo_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Entries listing
    entries_res = client.get("/symptoms/entries", headers=headers)
    assert entries_res.status_code == 200
    entries = entries_res.json()
    assert len(entries) >= 5, "Expected synthetic records for demo user"

    # 3. Create structured entry with urgency check
    entry_payload = {
        "symptom_name": "Pelvic Cramps",
        "onset_date": "2026-04-10",
        "onset_time": "14:00",
        "duration_minutes": 120,
        "severity": 6,
        "body_location": "Lower pelvis",
        "notes": "Verified test entry from automated journey check",
        "source_type": "structured",
        "user_confirmed": True,
        "contexts": [{"context_type": "stress", "value": "high"}]
    }
    create_res = client.post("/symptoms/entries", json=entry_payload, headers=headers)
    assert create_res.status_code == 200
    entry_id = create_res.json()["id"]

    # 4. Natural Language NLP extraction
    nlp_res = client.post("/ai/extract", json={"text": "I had strong cramps and bloating yesterday evening for 4 hours and could not sleep."}, headers=headers)
    assert nlp_res.status_code == 200
    nlp_data = nlp_res.json()
    assert len(nlp_data["proposals"]) >= 2, "Failed to extract symptoms"

    # 5. Analytics Overview
    analytics_res = client.get("/analytics/overview", headers=headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert "symptom_frequency" in analytics
    assert "severity_metrics" in analytics
    assert "period_comparison" in analytics
    assert "flare_ups" in analytics

    # 6. Data Quality scan
    dq_res = client.get("/data-quality", headers=headers)
    assert dq_res.status_code == 200
    assert len(dq_res.json()) > 0, "Data quality engine should flag anomalies"

    # 7. Generate Consultation Report & Export PDF/HTML
    rep_payload = {
        "title": "Test Consultation Report",
        "date_range_start": "2026-01-01",
        "date_range_end": "2026-04-20",
        "primary_concerns": "Intermittent cramps and fatigue",
        "questions_for_clinician": "Could this be hormonal fluctuation?"
    }
    rep_res = client.post("/reports/generate", json=rep_payload, headers=headers)
    assert rep_res.status_code == 200
    report_id = rep_res.json()["id"]
    html_res = client.get(f"/reports/{report_id}/export/html", headers=headers)
    pdf_res = client.get(f"/reports/{report_id}/export/pdf", headers=headers)
    assert html_res.status_code == 200 and "SignalBridge" in html_res.text
    assert pdf_res.status_code == 200 and pdf_res.content.startswith(b"%PDF")

    # 8. User Data Export (JSON & CSV)
    json_exp = client.get("/user/export/json", headers=headers)
    csv_exp = client.get("/user/export/csv", headers=headers)
    assert json_exp.status_code == 200 and "symptom_entries" in json_exp.json()
    assert csv_exp.status_code == 200 and "Entry ID" in csv_exp.text

    # 9. Admin privacy check
    admin_login = client.post("/auth/login", json={"email": "admin@signalbridge.health", "password": "AdminPass123!"})
    admin_token = admin_login.json()["access_token"]
    admin_metrics = client.get("/admin/metrics", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_metrics.status_code == 200
    assert "Strictly anonymized aggregate metrics" in admin_metrics.json()["privacy_notice"]
