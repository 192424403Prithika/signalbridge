import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Appointment
from app.schemas import AppointmentCreate, AppointmentUpdate, AppointmentOut
from app.services.auth_service import get_current_user, log_audit_event

router = APIRouter(prefix="/appointments", tags=["Appointment Preparation & Post-Visit Notes"])

@router.get("", response_model=List[AppointmentOut])
def get_appointments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    apps = db.query(Appointment).filter(Appointment.user_id == current_user.id).order_by(Appointment.appointment_date.desc()).all()
    results = []
    for a in apps:
        checklist = {}
        try:
            checklist = json.loads(a.pre_visit_checklist_json or "{}")
        except Exception:
            pass

        results.append({
            "id": a.id,
            "user_id": a.user_id,
            "clinician_name": a.clinician_name,
            "specialty": a.specialty,
            "appointment_date": a.appointment_date,
            "location": a.location,
            "top_concerns": a.top_concerns,
            "questions_to_ask": a.questions_to_ask,
            "pre_visit_checklist": checklist,
            "post_visit_notes": a.post_visit_notes,
            "tests_ordered": a.tests_ordered,
            "referrals": a.referrals,
            "treatment_plan": a.treatment_plan,
            "follow_up_date": a.follow_up_date,
            "personal_notes": a.personal_notes,
            "created_at": a.created_at
        })
    return results

@router.post("", response_model=AppointmentOut)
def create_appointment(
    app_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointment = Appointment(
        user_id=current_user.id,
        clinician_name=app_in.clinician_name,
        specialty=app_in.specialty,
        appointment_date=app_in.appointment_date,
        location=app_in.location,
        top_concerns=app_in.top_concerns,
        questions_to_ask=app_in.questions_to_ask,
        pre_visit_checklist_json=json.dumps(app_in.pre_visit_checklist or {})
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    log_audit_event(db, current_user.id, "APPOINTMENT_CREATED", "Appointment", appointment.id)

    return {
        "id": appointment.id,
        "user_id": appointment.user_id,
        "clinician_name": appointment.clinician_name,
        "specialty": appointment.specialty,
        "appointment_date": appointment.appointment_date,
        "location": appointment.location,
        "top_concerns": appointment.top_concerns,
        "questions_to_ask": appointment.questions_to_ask,
        "pre_visit_checklist": app_in.pre_visit_checklist or {},
        "post_visit_notes": None,
        "tests_ordered": None,
        "referrals": None,
        "treatment_plan": None,
        "follow_up_date": None,
        "personal_notes": None,
        "created_at": appointment.created_at
    }

@router.put("/{app_id}", response_model=AppointmentOut)
def update_appointment(
    app_id: int,
    app_update: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    a = db.query(Appointment).filter(Appointment.id == app_id, Appointment.user_id == current_user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    update_dict = app_update.model_dump(exclude_unset=True)
    if "pre_visit_checklist" in update_dict:
        a.pre_visit_checklist_json = json.dumps(update_dict.pop("pre_visit_checklist") or {})

    for field, val in update_dict.items():
        setattr(a, field, val)

    db.commit()
    db.refresh(a)
    log_audit_event(db, current_user.id, "APPOINTMENT_UPDATED", "Appointment", a.id)

    checklist = {}
    try:
        checklist = json.loads(a.pre_visit_checklist_json or "{}")
    except Exception:
        pass

    return {
        "id": a.id,
        "user_id": a.user_id,
        "clinician_name": a.clinician_name,
        "specialty": a.specialty,
        "appointment_date": a.appointment_date,
        "location": a.location,
        "top_concerns": a.top_concerns,
        "questions_to_ask": a.questions_to_ask,
        "pre_visit_checklist": checklist,
        "post_visit_notes": a.post_visit_notes,
        "tests_ordered": a.tests_ordered,
        "referrals": a.referrals,
        "treatment_plan": a.treatment_plan,
        "follow_up_date": a.follow_up_date,
        "personal_notes": a.personal_notes,
        "created_at": a.created_at
    }

@router.delete("/{app_id}")
def delete_appointment(app_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Appointment).filter(Appointment.id == app_id, Appointment.user_id == current_user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    db.delete(a)
    db.commit()
    log_audit_event(db, current_user.id, "APPOINTMENT_DELETED", "Appointment", app_id)
    return {"message": "Appointment deleted."}
