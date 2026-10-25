import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Symptom, SymptomEntry, EntryContext, Tag
from app.schemas import (
    SymptomOut, SymptomCreate, SymptomEntryCreate, SymptomEntryUpdate, SymptomEntryOut
)
from app.services.auth_service import get_current_user, log_audit_event
from app.services.data_quality_engine import DataQualityEngine

router = APIRouter(prefix="/symptoms", tags=["Symptoms & Journal"])

@router.get("/taxonomy", response_model=List[SymptomOut])
def get_taxonomy(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Symptom).filter(Symptom.is_active == True)
    if category:
        query = query.filter(Symptom.category == category)
    return query.all()

@router.post("/taxonomy", response_model=SymptomOut)
def create_custom_symptom(
    sym_in: SymptomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Symptom).filter(Symptom.name.ilike(sym_in.name)).first()
    if existing:
        return existing

    custom_sym = Symptom(
        name=sym_in.name,
        category=sym_in.category,
        description=sym_in.description,
        is_custom=True,
        created_by_user_id=current_user.id,
        urgency_flag=sym_in.urgency_flag
    )
    db.add(custom_sym)
    db.commit()
    db.refresh(custom_sym)
    return custom_sym

@router.get("/entries")
def get_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    symptom_id: Optional[int] = None,
    severity_min: Optional[int] = None,
    severity_max: Optional[int] = None,
    cycle_phase: Optional[str] = None,
    privacy_category: Optional[str] = None,
    user_confirmed_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SymptomEntry).filter(SymptomEntry.user_id == current_user.id)

    if start_date:
        query = query.filter(SymptomEntry.onset_date >= start_date)
    if end_date:
        query = query.filter(SymptomEntry.onset_date <= end_date)
    if symptom_id:
        query = query.filter(SymptomEntry.symptom_id == symptom_id)
    if severity_min is not None:
        query = query.filter(SymptomEntry.severity >= severity_min)
    if severity_max is not None:
        query = query.filter(SymptomEntry.severity <= severity_max)
    if cycle_phase:
        query = query.filter(SymptomEntry.cycle_phase == cycle_phase)
    if privacy_category:
        query = query.filter(SymptomEntry.privacy_category == privacy_category)
    if user_confirmed_only:
        query = query.filter(SymptomEntry.user_confirmed == True)

    entries = query.order_by(SymptomEntry.onset_date.desc(), SymptomEntry.onset_time.desc()).all()

    results = []
    for e in entries:
        results.append({
            "id": e.id,
            "user_id": e.user_id,
            "symptom_id": e.symptom_id,
            "symptom_name": e.symptom.name,
            "symptom_category": e.symptom.category,
            "recorded_at": e.recorded_at,
            "onset_date": e.onset_date,
            "onset_time": e.onset_time,
            "end_date": e.end_date,
            "end_time": e.end_time,
            "duration_minutes": e.duration_minutes,
            "severity": e.severity,
            "body_location": e.body_location,
            "notes": e.notes,
            "source_type": e.source_type,
            "ai_extracted": e.ai_extracted,
            "user_confirmed": e.user_confirmed,
            "privacy_category": e.privacy_category,
            "cycle_phase": e.cycle_phase,
            "created_at": e.created_at,
            "updated_at": e.updated_at,
            "contexts": [{"context_type": c.context_type, "value": c.value, "notes": c.notes} for c in e.contexts],
            "tags": [{"id": t.id, "name": t.name, "color": t.color} for t in e.tags],
            "safety_urgency_alert": e.symptom.urgency_flag
        })
    return results

@router.post("/entries")
def create_entry(
    entry_in: SymptomEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Resolve symptom by ID or name
    symptom = None
    if entry_in.symptom_id:
        symptom = db.query(Symptom).filter(Symptom.id == entry_in.symptom_id).first()
    elif entry_in.symptom_name:
        symptom = db.query(Symptom).filter(Symptom.name.ilike(entry_in.symptom_name)).first()
        if not symptom:
            symptom = Symptom(name=entry_in.symptom_name, category="General", is_custom=True, created_by_user_id=current_user.id)
            db.add(symptom)
            db.commit()
            db.refresh(symptom)

    if not symptom:
        raise HTTPException(status_code=400, detail="Valid symptom ID or symptom name is required.")

    # Check for safety urgency (e.g., severe sudden chest pain or acute dyspnea)
    safety_urgency_alert = symptom.urgency_flag

    entry = SymptomEntry(
        user_id=current_user.id,
        symptom_id=symptom.id,
        onset_date=entry_in.onset_date,
        onset_time=entry_in.onset_time,
        end_date=entry_in.end_date,
        end_time=entry_in.end_time,
        duration_minutes=entry_in.duration_minutes,
        severity=entry_in.severity,
        body_location=entry_in.body_location,
        notes=entry_in.notes,
        source_type=entry_in.source_type,
        ai_extracted=entry_in.ai_extracted,
        user_confirmed=entry_in.user_confirmed,
        privacy_category=entry_in.privacy_category,
        cycle_phase=entry_in.cycle_phase,
        edit_history_json=json.dumps([{
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "created",
            "source": entry_in.source_type
        }])
    )
    db.add(entry)
    db.flush()

    # Add contexts
    for ctx in entry_in.contexts:
        c_obj = EntryContext(
            symptom_entry_id=entry.id,
            context_type=ctx.context_type,
            value=ctx.value,
            notes=ctx.notes
        )
        db.add(c_obj)

    # Add tags
    for tag_name in entry_in.tag_names:
        tag_obj = db.query(Tag).filter(Tag.name == tag_name, Tag.user_id == current_user.id).first()
        if not tag_obj:
            tag_obj = Tag(user_id=current_user.id, name=tag_name, color="#d75f75")
            db.add(tag_obj)
            db.flush()
        entry.tags.append(tag_obj)

    db.commit()
    db.refresh(entry)

    # Rescan data quality asynchronously or inline
    DataQualityEngine.scan_user_data(db, current_user.id)
    log_audit_event(db, current_user.id, "ENTRY_CREATED", "SymptomEntry", entry.id)

    response_data = {
        "id": entry.id,
        "symptom_name": symptom.name,
        "severity": entry.severity,
        "onset_date": entry.onset_date,
        "safety_urgency_alert": safety_urgency_alert,
        "safety_notice": (
            "Safety reminder: You have entered symptoms associated with acute discomfort. "
            "SignalBridge does not diagnose or assess clinical severity. If you are experiencing "
            "severe, sudden, or worsening symptoms, please seek prompt evaluation from an emergency "
            "department or qualified healthcare professional."
        ) if safety_urgency_alert else None
    }
    return response_data

@router.get("/entries/{entry_id}")
def get_entry_detail(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = db.query(SymptomEntry).filter(SymptomEntry.id == entry_id, SymptomEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found.")

    edit_history = []
    try:
        edit_history = json.loads(entry.edit_history_json or "[]")
    except Exception:
        pass

    return {
        "id": entry.id,
        "symptom_id": entry.symptom_id,
        "symptom_name": entry.symptom.name,
        "symptom_category": entry.symptom.category,
        "onset_date": entry.onset_date,
        "onset_time": entry.onset_time,
        "end_date": entry.end_date,
        "end_time": entry.end_time,
        "duration_minutes": entry.duration_minutes,
        "severity": entry.severity,
        "body_location": entry.body_location,
        "notes": entry.notes,
        "source_type": entry.source_type,
        "ai_extracted": entry.ai_extracted,
        "user_confirmed": entry.user_confirmed,
        "privacy_category": entry.privacy_category,
        "cycle_phase": entry.cycle_phase,
        "contexts": [{"context_type": c.context_type, "value": c.value, "notes": c.notes} for c in entry.contexts],
        "tags": [{"id": t.id, "name": t.name, "color": t.color} for t in entry.tags],
        "edit_history": edit_history,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at
    }

@router.put("/entries/{entry_id}")
def update_entry(
    entry_id: int,
    entry_update: SymptomEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(SymptomEntry).filter(SymptomEntry.id == entry_id, SymptomEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found.")

    old_state = {
        "onset_date": entry.onset_date,
        "severity": entry.severity,
        "notes": entry.notes
    }

    update_dict = entry_update.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if field not in ["contexts", "tag_names"]:
            setattr(entry, field, val)

    # Append to edit history
    history = []
    try:
        history = json.loads(entry.edit_history_json or "[]")
    except Exception:
        pass
    history.append({
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "action": "updated",
        "previous_state": old_state
    })
    entry.edit_history_json = json.dumps(history)

    db.commit()
    db.refresh(entry)
    DataQualityEngine.scan_user_data(db, current_user.id)
    log_audit_event(db, current_user.id, "ENTRY_UPDATED", "SymptomEntry", entry.id)
    return {"message": "Entry updated successfully.", "id": entry.id}

@router.post("/entries/{entry_id}/confirm")
def confirm_ai_entry(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Confirms an AI-extracted entry after user review.
    """
    entry = db.query(SymptomEntry).filter(SymptomEntry.id == entry_id, SymptomEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found.")

    entry.user_confirmed = True
    db.commit()
    DataQualityEngine.scan_user_data(db, current_user.id)
    log_audit_event(db, current_user.id, "AI_ENTRY_CONFIRMED", "SymptomEntry", entry.id)
    return {"message": "AI entry reviewed and confirmed by user."}

@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = db.query(SymptomEntry).filter(SymptomEntry.id == entry_id, SymptomEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found.")

    db.delete(entry)
    db.commit()
    DataQualityEngine.scan_user_data(db, current_user.id)
    log_audit_event(db, current_user.id, "ENTRY_DELETED", "SymptomEntry", entry_id)
    return {"message": f"Entry {entry_id} deleted."}
