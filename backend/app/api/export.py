import io
import csv
import json
import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User, HealthProfile, SymptomEntry, Medication, Cycle, Appointment, Report, AuditLog
)
from app.services.auth_service import get_current_user, log_audit_event

router = APIRouter(prefix="/user/export", tags=["User Data Portability & Export"])

@router.get("/json")
def export_user_data_json(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    entries = db.query(SymptomEntry).filter(SymptomEntry.user_id == current_user.id).all()
    medications = db.query(Medication).filter(Medication.user_id == current_user.id).all()
    cycles = db.query(Cycle).filter(Cycle.user_id == current_user.id).all()
    appointments = db.query(Appointment).filter(Appointment.user_id == current_user.id).all()
    reports = db.query(Report).filter(Report.user_id == current_user.id).all()
    audit_logs = db.query(AuditLog).filter(AuditLog.user_id == current_user.id).all()

    payload = {
        "export_metadata": {
            "app": "SignalBridge",
            "version": "1.0",
            "user_id": current_user.id,
            "user_email": current_user.email,
            "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        },
        "profile": {
            "preferred_name": profile.preferred_name if profile else None,
            "pronouns": profile.pronouns if profile else None,
            "age_range": profile.age_range if profile else None,
            "biological_sex": profile.biological_sex if profile else None,
            "cycle_tracking_enabled": profile.cycle_tracking_enabled if profile else False,
            "allergies": profile.allergies if profile else None,
            "long_term_conditions": profile.long_term_conditions if profile else None
        },
        "symptom_entries": [
            {
                "id": e.id,
                "symptom": e.symptom.name,
                "category": e.symptom.category,
                "onset_date": e.onset_date,
                "onset_time": e.onset_time,
                "end_date": e.end_date,
                "duration_minutes": e.duration_minutes,
                "severity": e.severity,
                "body_location": e.body_location,
                "notes": e.notes,
                "source_type": e.source_type,
                "cycle_phase": e.cycle_phase,
                "contexts": [{"type": c.context_type, "value": c.value} for c in e.contexts],
                "tags": [t.name for t in e.tags]
            }
            for e in entries
        ],
        "medications": [
            {"id": m.id, "name": m.name, "dosage": m.dosage, "frequency": m.frequency, "start_date": m.start_date, "purpose": m.purpose}
            for m in medications
        ],
        "cycles": [
            {"start": c.period_start_date, "end": c.period_end_date, "flow": c.flow_intensity, "length": c.cycle_length}
            for c in cycles
        ],
        "appointments": [
            {"clinician": a.clinician_name, "specialty": a.specialty, "date": a.appointment_date, "location": a.location, "concerns": a.top_concerns}
            for a in appointments
        ],
        "audit_logs": [
            {"action": al.action, "entity": al.entity_type, "timestamp": str(al.created_at)}
            for al in audit_logs
        ]
    }

    log_audit_event(db, current_user.id, "DATA_EXPORTED_JSON", "User", current_user.id)
    headers = {"Content-Disposition": f"attachment; filename=SignalBridge_User_{current_user.id}_Export.json"}
    return Response(content=json.dumps(payload, indent=2), media_type="application/json", headers=headers)

@router.get("/csv")
def export_user_data_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entries = db.query(SymptomEntry).filter(SymptomEntry.user_id == current_user.id).order_by(SymptomEntry.onset_date.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Entry ID", "Onset Date", "Onset Time", "Symptom", "Category",
        "Severity (0-10)", "Duration (Minutes)", "Body Location", "Cycle Phase",
        "Source Type", "Contexts", "Tags", "Notes"
    ])

    for e in entries:
        ctx_str = "; ".join([f"{c.context_type}: {c.value}" for c in e.contexts])
        tags_str = ", ".join([t.name for t in e.tags])
        writer.writerow([
            e.id, e.onset_date, e.onset_time or "", e.symptom.name, e.symptom.category,
            e.severity if e.severity is not None else "", e.duration_minutes or "",
            e.body_location or "", e.cycle_phase or "", e.source_type,
            ctx_str, tags_str, e.notes or ""
        ])

    log_audit_event(db, current_user.id, "DATA_EXPORTED_CSV", "User", current_user.id)
    headers = {"Content-Disposition": f"attachment; filename=SignalBridge_Symptoms_{current_user.id}.csv"}
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)
