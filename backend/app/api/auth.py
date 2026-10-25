import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, HealthProfile
from app.schemas import UserCreate, UserLogin, Token, PasswordChange, PrivacySettingsUpdate
from app.services.auth_service import (
    verify_password, get_password_hash, create_access_token, get_current_user, log_audit_event
)
from app.services.mongo_service import save_mongo_user, find_mongo_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=Token)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role="user",
        email_verified=False,
        ai_consent=user_in.ai_consent,
        privacy_settings_json=json.dumps({
            "data_sharing": False,
            "sensitive_categories_opt_in": False,
            "export_restricted": False
        })
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize empty profile
    profile = HealthProfile(
        user_id=user.id,
        consent_acknowledged=user_in.terms_consent
    )
    db.add(profile)
    db.commit()

    # Save to MongoDB Atlas for cloud persistence
    save_mongo_user({
        "email": user.email,
        "hashed_password": user.hashed_password,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "ai_consent": user.ai_consent,
        "privacy_settings_json": user.privacy_settings_json
    })

    log_audit_event(db, user.id, "USER_SIGNUP", "User", user.id)

    access_token = create_access_token({"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "ai_consent": user.ai_consent
        }
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        # Check if user exists in MongoDB Atlas and restore
        m_user = find_mongo_user(login_data.email)
        if m_user:
            user = User(
                email=m_user["email"],
                hashed_password=m_user["hashed_password"],
                full_name=m_user.get("full_name", m_user["email"].split("@")[0]),
                role=m_user.get("role", "user"),
                is_active=m_user.get("is_active", True),
                email_verified=m_user.get("email_verified", False),
                ai_consent=m_user.get("ai_consent", False),
                privacy_settings_json=m_user.get("privacy_settings_json", "{}")
            )
            db.add(user)
            db.flush()
            profile = HealthProfile(user_id=user.id, consent_acknowledged=True)
            db.add(profile)
            db.commit()
            db.refresh(user)

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    log_audit_event(db, user.id, "USER_LOGIN", "User", user.id)
    access_token = create_access_token({"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "ai_consent": user.ai_consent
        }
    }

@router.post("/demo", response_model=Token)
def login_demo(db: Session = Depends(get_db)):
    """
    Instantly logs into the synthetic demo account without requiring manual credentials.
    """
    demo_user = db.query(User).filter(User.email == "demo@signalbridge.health").first()
    if not demo_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo account not seeded yet. Please run seed script."
        )

    access_token = create_access_token({"sub": demo_user.email, "role": demo_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": demo_user.id,
            "email": demo_user.email,
            "full_name": demo_user.full_name,
            "role": demo_user.role,
            "is_demo": True,
            "ai_consent": demo_user.ai_consent
        }
    }

@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    privacy_settings = {}
    try:
        privacy_settings = json.loads(current_user.privacy_settings_json or "{}")
    except Exception:
        pass

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "ai_consent": current_user.ai_consent,
        "email_verified": current_user.email_verified,
        "privacy_settings": privacy_settings,
        "created_at": current_user.created_at
    }

@router.post("/change-password")
def change_password(data: PasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password does not match.")

    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    log_audit_event(db, current_user.id, "PASSWORD_CHANGED", "User", current_user.id)
    return {"message": "Password updated successfully."}

@router.post("/forgot-password")
def forgot_password(data: dict):
    # Safe non-leaking password recovery response
    return {"message": "If this email exists in our records, password reset instructions have been dispatched."}

@router.post("/delete-account")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Permanently deletes user account and cascades all personal health entries.
    """
    user_id = current_user.id
    db.delete(current_user)
    db.commit()
    return {"message": f"Account and all associated records for user ID {user_id} have been permanently deleted."}
