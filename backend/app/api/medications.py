from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Medication, MedicationLog
from app.schemas import (
    MedicationCreate, MedicationOut, MedicationLogCreate, MedicationLogOut
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/medications", tags=["Medications & Supplements"])

@router.get("", response_model=List[MedicationOut])
def get_medications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Medication).filter(Medication.user_id == current_user.id).all()

@router.post("", response_model=MedicationOut)
def add_medication(
    med_in: MedicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    med = Medication(
        user_id=current_user.id,
        name=med_in.name,
        dosage=med_in.dosage,
        frequency=med_in.frequency,
        start_date=med_in.start_date,
        end_date=med_in.end_date,
        prescriber=med_in.prescriber,
        purpose=med_in.purpose,
        notes=med_in.notes,
        is_active=med_in.is_active
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

@router.put("/{med_id}", response_model=MedicationOut)
def update_medication(
    med_id: int,
    med_in: MedicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    med = db.query(Medication).filter(Medication.id == med_id, Medication.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")

    for field, val in med_in.model_dump().items():
        setattr(med, field, val)

    db.commit()
    db.refresh(med)
    return med

@router.delete("/{med_id}")
def delete_medication(med_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    med = db.query(Medication).filter(Medication.id == med_id, Medication.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")

    db.delete(med)
    db.commit()
    return {"message": "Medication deleted."}

@router.get("/logs", response_model=List[MedicationLogOut])
def get_medication_logs(
    medication_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MedicationLog).filter(MedicationLog.user_id == current_user.id)
    if medication_id:
        query = query.filter(MedicationLog.medication_id == medication_id)

    logs = query.order_by(MedicationLog.taken_at.desc()).all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "medication_id": l.medication_id,
            "medication_name": l.medication.name,
            "user_id": l.user_id,
            "taken_at": l.taken_at,
            "status": l.status,
            "side_effects": l.side_effects,
            "perceived_effectiveness": l.perceived_effectiveness,
            "notes": l.notes
        })
    return results

@router.post("/logs", response_model=MedicationLogOut)
def create_medication_log(
    log_in: MedicationLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    med = db.query(Medication).filter(Medication.id == log_in.medication_id, Medication.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")

    m_log = MedicationLog(
        medication_id=med.id,
        user_id=current_user.id,
        taken_at=log_in.taken_at or db.query(User).first().created_at.now(),
        status=log_in.status,
        side_effects=log_in.side_effects,
        perceived_effectiveness=log_in.perceived_effectiveness,
        notes=log_in.notes
    )
    db.add(m_log)
    db.commit()
    db.refresh(m_log)

    return {
        "id": m_log.id,
        "medication_id": m_log.medication_id,
        "medication_name": med.name,
        "user_id": m_log.user_id,
        "taken_at": m_log.taken_at,
        "status": m_log.status,
        "side_effects": m_log.side_effects,
        "perceived_effectiveness": m_log.perceived_effectiveness,
        "notes": m_log.notes
    }
