import datetime
from typing import Optional, Dict, Any
from pymongo import MongoClient
from app.config import settings

_mongo_client: Optional[MongoClient] = None
_mongo_db = None

def get_mongo_db():
    global _mongo_client, _mongo_db
    if not settings.MONGODB_URI:
        return None
    if _mongo_db is None:
        try:
            _mongo_client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=4000,
                connectTimeoutMS=4000
            )
            _mongo_db = _mongo_client.get_database("signalbridge")
        except Exception as e:
            print(f"[MongoDB] Connection initialization warning: {e}")
            return None
    return _mongo_db

def save_mongo_user(user_dict: Dict[str, Any]):
    """Saves or updates a user in MongoDB Atlas for persistent cloud storage."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        users_col = db["users"]
        doc = {
            "email": user_dict["email"],
            "hashed_password": user_dict["hashed_password"],
            "full_name": user_dict["full_name"],
            "role": user_dict.get("role", "user"),
            "is_active": user_dict.get("is_active", True),
            "email_verified": user_dict.get("email_verified", False),
            "ai_consent": user_dict.get("ai_consent", False),
            "privacy_settings_json": user_dict.get("privacy_settings_json", "{}"),
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        users_col.update_one({"email": doc["email"]}, {"$set": doc}, upsert=True)
    except Exception as e:
        print(f"[MongoDB] Failed to persist user {user_dict.get('email')}: {e}")

def find_mongo_user(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user document from MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return None
    try:
        users_col = db["users"]
        return users_col.find_one({"email": email})
    except Exception as e:
        print(f"[MongoDB] Failed to query user {email}: {e}")
        return None

def sync_all_mongo_users(sql_session):
    """Synchronizes all registered accounts from MongoDB Atlas into the active SQL database."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        from app.models import User, HealthProfile
        users_col = db["users"]
        all_users = list(users_col.find({}))
        if not all_users:
            return

        synced_count = 0
        for u in all_users:
            email = u.get("email")
            if not email:
                continue
            existing = sql_session.query(User).filter(User.email == email).first()
            if not existing:
                new_user = User(
                    email=email,
                    hashed_password=u.get("hashed_password", ""),
                    full_name=u.get("full_name", email.split("@")[0]),
                    role=u.get("role", "user"),
                    is_active=u.get("is_active", True),
                    email_verified=u.get("email_verified", False),
                    ai_consent=u.get("ai_consent", False),
                    privacy_settings_json=u.get("privacy_settings_json", "{}")
                )
                sql_session.add(new_user)
                sql_session.flush()

                # Ensure HealthProfile exists
                if not sql_session.query(HealthProfile).filter(HealthProfile.user_id == new_user.id).first():
                    profile = HealthProfile(user_id=new_user.id, consent_acknowledged=True)
                    sql_session.add(profile)
                synced_count += 1

        if synced_count > 0:
            sql_session.commit()
            print(f"[MongoDB] Successfully synced {synced_count} persistent accounts from MongoDB Atlas!")
    except Exception as e:
        print(f"[MongoDB] User sync warning: {e}")
        sql_session.rollback()
