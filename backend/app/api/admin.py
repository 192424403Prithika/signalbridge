from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import User, Symptom, SymptomEntry
from app.schemas import SymptomCreate, SymptomOut
from app.services.auth_service import get_current_admin

router = APIRouter(prefix="/admin", tags=["Administrator Operations (Privacy-Preserved)"])

# Feature flags store in memory / config
FEATURE_FLAGS = {
    "natural_language_ai_extraction": True,
    "cycle_tracking_module": True,
    "pdf_export_service": True,
    "advanced_flare_up_detection": True,
    "dark_mode": True
}

@router.get("/metrics")
def get_aggregate_metrics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Returns ANONYMIZED aggregate metrics only.
    Administrators are strictly prohibited from reading users' private symptom entries.
    """
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_entries_count = db.query(SymptomEntry).count()

    # Aggregate count per symptom category (no personal data)
    category_counts = (
        db.query(Symptom.category, func.count(SymptomEntry.id))
        .join(SymptomEntry, Symptom.id == SymptomEntry.symptom_id)
        .group_by(Symptom.category)
        .all()
    )

    return {
        "privacy_notice": "Strictly anonymized aggregate metrics. No identifiable patient health records are accessible.",
        "total_registered_users": total_users,
        "total_active_users": active_users,
        "total_symptom_entries_logged": total_entries_count,
        "entries_by_category_aggregate": [
            {"category": cat, "logged_count": count} for cat, count in category_counts
        ]
    }

@router.get("/feature-flags")
def get_feature_flags(admin: User = Depends(get_current_admin)):
    return FEATURE_FLAGS

@router.post("/feature-flags/{flag_name}/toggle")
def toggle_feature_flag(flag_name: str, admin: User = Depends(get_current_admin)):
    if flag_name not in FEATURE_FLAGS:
        raise HTTPException(status_code=404, detail="Feature flag not found.")
    FEATURE_FLAGS[flag_name] = not FEATURE_FLAGS[flag_name]
    return {"flag": flag_name, "enabled": FEATURE_FLAGS[flag_name]}

@router.get("/taxonomy", response_model=List[SymptomOut])
def get_admin_taxonomy(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(Symptom).all()

@router.post("/taxonomy", response_model=SymptomOut)
def add_admin_taxonomy(sym_in: SymptomCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    existing = db.query(Symptom).filter(Symptom.name.ilike(sym_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Symptom already exists in taxonomy.")

    sym = Symptom(
        name=sym_in.name,
        category=sym_in.category,
        description=sym_in.description,
        is_custom=False,
        urgency_flag=sym_in.urgency_flag
    )
    db.add(sym)
    db.commit()
    db.refresh(sym)
    return sym

@router.put("/taxonomy/{sym_id}/toggle-active")
def toggle_symptom_active(sym_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    sym = db.query(Symptom).filter(Symptom.id == sym_id).first()
    if not sym:
        raise HTTPException(status_code=404, detail="Symptom not found.")
    sym.is_active = not sym.is_active
    db.commit()
    return {"id": sym.id, "name": sym.name, "is_active": sym.is_active}
