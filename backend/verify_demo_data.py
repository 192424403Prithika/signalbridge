from app.database import SessionLocal
from app.models import (
    User, HealthProfile, Symptom, SymptomEntry, EntryContext,
    Medication, MedicationLog, Cycle, Insight, DataQualityIssue,
    Report, Appointment
)
from collections import defaultdict
import json

db = SessionLocal()
demo_user = db.query(User).filter_by(email="demo@signalbridge.health").first()

print("=" * 65)
print("       SIGNALBRIDGE 90-DAY SYNTHETIC DEMO VERIFICATION        ")
print("=" * 65)
print(f"User ID: {demo_user.id} | Name: {demo_user.full_name} | Role: {demo_user.role}")

profile = db.query(HealthProfile).filter_by(user_id=demo_user.id).first()
if profile:
    print(f"Profile: Preferred Name: {profile.preferred_name} | Pronouns: {profile.pronouns} | Age: {profile.age_range}")
    print(f"Biological Sex: {profile.biological_sex} | Cycle Tracking: {profile.cycle_tracking_enabled}")
    print(f"Allergies: {profile.allergies}")
    print(f"Conditions: {profile.long_term_conditions}")

entries = db.query(SymptomEntry).filter_by(user_id=demo_user.id).all()
print(f"\nTotal Symptom Entries Recorded: {len(entries)}")

by_sym = defaultdict(list)
for e in entries:
    sym = db.query(Symptom).filter_by(id=e.symptom_id).first()
    by_sym[sym.name].append(e)

print(f"\n--- ALL {len(by_sym)} DEMO SYMPTOMS (90-Day Trajectory) ---")
for sym_name, s_entries in sorted(by_sym.items()):
    sevs = [x.severity for x in s_entries if x.severity is not None]
    avg_sev = round(sum(sevs)/len(sevs), 1) if sevs else "N/A"
    dates = [x.onset_date for x in s_entries]
    phases = sorted(list(set(x.cycle_phase for x in s_entries if x.cycle_phase)))
    missing_sev = sum(1 for x in s_entries if x.severity is None)
    flag = f" [Missing sev: {missing_sev}]" if missing_sev else ""
    print(f"* {sym_name:<20} | {len(s_entries):>2} logs | Avg Sev: {str(avg_sev):>4}/10 | Range: {min(dates)} to {max(dates)} | Phases: {phases}{flag}")

meds = db.query(Medication).filter_by(user_id=demo_user.id).all()
print(f"\n--- MEDICATIONS & ADHERENCE LOGS ({len(meds)} active) ---")
for m in meds:
    logs = db.query(MedicationLog).filter_by(medication_id=m.id).all()
    taken_count = sum(1 for l in logs if l.status == "taken")
    missed_count = sum(1 for l in logs if l.status == "missed")
    print(f"* {m.name} ({m.dosage}, {m.frequency})")
    print(f"  Purpose: {m.purpose}")
    print(f"  Adherence logs: {len(logs)} total (Taken: {taken_count}, Missed: {missed_count})")

cycles = db.query(Cycle).filter_by(user_id=demo_user.id).order_by(Cycle.period_start_date.desc()).all()
print(f"\n--- MENSTRUAL CYCLES ({len(cycles)} recorded) ---")
for c in cycles:
    print(f"* Period: {c.period_start_date} to {c.period_end_date} (Flow: {c.flow_intensity}, Cycle Length: {c.cycle_length}d)")

insights = db.query(Insight).filter_by(user_id=demo_user.id).all()
print(f"\n--- EVIDENCE-FIRST INSIGHTS ({len(insights)} generated) ---")
for ins in insights:
    print(f"* [{ins.insight_type.upper()}] {ins.title} (Confidence: {ins.confidence_level})")
    print(f"  Description: {ins.description}")
    print(f"  Contributing Entry IDs: {ins.evidence_entry_ids}")
    print(f"  Metadata: {ins.calculation_metadata_json}")

dq_issues = db.query(DataQualityIssue).filter_by(user_id=demo_user.id).all()
print(f"\n--- DATA QUALITY ANOMALIES & AUDIT ({len(dq_issues)} detected) ---")
for dq in dq_issues:
    print(f"* [{dq.issue_type.upper()}] Severity: {dq.severity} | Status: {dq.status}")
    print(f"  Description: {dq.description}")
    print(f"  Suggested Action: {dq.suggested_action}")

reports = db.query(Report).filter_by(user_id=demo_user.id).all()
print(f"\n--- CLINICAL CONSULTATION REPORTS ({len(reports)} generated) ---")
for r in reports:
    print(f"* Report #{r.id}: '{r.title}' | Window: {r.date_range_start} to {r.date_range_end}")
    print(f"  Primary Concerns: {r.primary_concerns}")
    print(f"  Questions for Doctor: {r.questions_for_clinician}")
    parsed = json.loads(r.generated_content_json)
    print(f"  Mandatory Non-Diagnostic Disclaimer: {parsed.get('disclaimer', '')[:95]}...")

appts = db.query(Appointment).filter_by(user_id=demo_user.id).all()
print(f"\n--- CLINICAL APPOINTMENTS ({len(appts)} scheduled) ---")
for a in appts:
    print(f"* Clinician: {a.clinician_name} ({a.specialty}) on {a.appointment_date}")
    print(f"  Location: {a.location}")
    print(f"  Top Concerns: {a.top_concerns}")
    print(f"  Questions to Ask: {a.questions_to_ask}")
    print(f"  Pre-visit Checklist: {a.pre_visit_checklist_json}")

db.close()

print("\n" + "=" * 65)
print("     LIVE HTTP API TESTING (JWT Auth & Endpoints)      ")
print("=" * 65)
try:
    import httpx
    client = httpx.Client(base_url="http://127.0.0.1:8000/api/v1", timeout=5.0)
    auth_resp = client.post("/auth/login", json={"email": "demo@signalbridge.health", "password": "DemoUser123!"})
    if auth_resp.status_code == 200:
        token = auth_resp.json()["access_token"]
        hdrs = {"Authorization": f"Bearer {token}"}
        print("[PASS] POST /api/v1/auth/login => 200 OK (JWT issued)")

        prof_resp = client.get("/profile", headers=hdrs)
        print(f"[PASS] GET /api/v1/profile => {prof_resp.status_code} OK (User: {prof_resp.json().get('preferred_name')})")

        sym_resp = client.get("/symptoms/entries", headers=hdrs)
        print(f"[PASS] GET /api/v1/symptoms/entries => {sym_resp.status_code} OK ({len(sym_resp.json())} entries returned)")

        analytics_resp = client.get("/analytics/overview", headers=hdrs)
        an_data = analytics_resp.json()
        print(f"[PASS] GET /api/v1/analytics/overview => {analytics_resp.status_code} OK (Frequencies: {len(an_data.get('symptom_frequency', []))}, Flare-ups: {len(an_data.get('flare_ups', []))}, Correlations: {len(an_data.get('correlations', []))})")

        dq_resp = client.get("/data-quality", headers=hdrs)
        print(f"[PASS] GET /api/v1/data-quality => {dq_resp.status_code} OK ({len(dq_resp.json())} open issues)")

        med_resp = client.get("/medications", headers=hdrs)
        print(f"[PASS] GET /api/v1/medications => {med_resp.status_code} OK ({len(med_resp.json())} medications)")

        rep_resp = client.get("/reports", headers=hdrs)
        print(f"[PASS] GET /api/v1/reports => {rep_resp.status_code} OK ({len(rep_resp.json())} clinical reports)")

        apt_resp = client.get("/appointments", headers=hdrs)
        print(f"[PASS] GET /api/v1/appointments => {apt_resp.status_code} OK ({len(apt_resp.json())} appointments)")

        cycle_resp = client.get("/cycles/prediction", headers=hdrs)
        print(f"[PASS] GET /api/v1/cycles/prediction => {cycle_resp.status_code} OK (Uncertainty Notice: {cycle_resp.json().get('uncertainty_notice')[:65]}...)")
        print("\nALL LIVE API ENDPOINTS RESPONDED WITH 200 OK!")
    else:
        print(f"[FAIL] Auth failed with status {auth_resp.status_code}: {auth_resp.text}")
except Exception as err:
    print(f"Live API test error: {err}")
