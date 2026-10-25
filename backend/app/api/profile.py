import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, HealthProfile
from app.schemas import HealthProfileUpdate, HealthProfileOut, PrivacySettingsUpdate
from app.services.auth_service import get_current_user, log_audit_event

router = APIRouter(prefix="/profile", tags=["Health Profile & Privacy"])

@router.get("", response_model=HealthProfileOut)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("", response_model=HealthProfileOut)
def update_profile(
    profile_data: HealthProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)

    update_dict = profile_data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(profile, key, val)

    db.commit()
    db.refresh(profile)
    log_audit_event(db, current_user.id, "PROFILE_UPDATED", "HealthProfile", profile.id)
    return profile

@router.put("/privacy")
def update_privacy_settings(
    settings_in: PrivacySettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.ai_consent = settings_in.ai_consent
    current_user.privacy_settings_json = json.dumps({
        "data_sharing": settings_in.data_sharing,
        "sensitive_categories_opt_in": settings_in.sensitive_categories_opt_in,
        "export_restricted": settings_in.export_restricted
    })
    db.commit()
    log_audit_event(db, current_user.id, "PRIVACY_SETTINGS_UPDATED", "User", current_user.id)
    return {
        "message": "Privacy settings updated.",
        "ai_consent": current_user.ai_consent,
        "privacy_settings": json.loads(current_user.privacy_settings_json)
    }
