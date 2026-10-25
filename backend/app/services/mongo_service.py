import datetime
import json
from typing import Optional, Dict, Any, List
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


# --- USER MANAGEMENT ---

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


# --- SYMPTOM ENTRIES ---

def save_mongo_entry(entry_dict: Dict[str, Any]):
    """Persists a symptom entry into MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        col = db["symptom_entries"]
        filter_query = {
            "user_email": entry_dict["user_email"],
            "onset_date": entry_dict["onset_date"],
            "symptom_name": entry_dict["symptom_name"],
            "onset_time": entry_dict.get("onset_time", "")
        }
        col.update_one(filter_query, {"$set": entry_dict}, upsert=True)
    except Exception as e:
        print(f"[MongoDB] Failed to persist symptom entry: {e}")

def delete_mongo_entry(user_email: str, entry_id: int, onset_date: Optional[str] = None, symptom_name: Optional[str] = None):
    """Deletes a symptom entry from MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        col = db["symptom_entries"]
        query: Dict[str, Any] = {"user_email": user_email}
        if entry_id:
            query["sql_id"] = entry_id
        elif onset_date and symptom_name:
            query["onset_date"] = onset_date
            query["symptom_name"] = symptom_name
        col.delete_one(query)
    except Exception as e:
        print(f"[MongoDB] Failed to delete symptom entry: {e}")


# --- MENSTRUAL CYCLES ---

def save_mongo_cycle(cycle_dict: Dict[str, Any]):
    """Persists a cycle entry into MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        col = db["cycles"]
        filter_query = {
            "user_email": cycle_dict["user_email"],
            "period_start_date": cycle_dict["period_start_date"]
        }
        col.update_one(filter_query, {"$set": cycle_dict}, upsert=True)
    except Exception as e:
        print(f"[MongoDB] Failed to persist cycle: {e}")

def delete_mongo_cycle(user_email: str, period_start_date: str):
    """Deletes a cycle entry from MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        col = db["cycles"]
        col.delete_one({"user_email": user_email, "period_start_date": period_start_date})
    except Exception as e:
        print(f"[MongoDB] Failed to delete cycle: {e}")


# --- MEDICATIONS ---

def save_mongo_medication(med_dict: Dict[str, Any]):
    """Persists a medication into MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        col = db["medications"]
        filter_query = {
            "user_email": med_dict["user_email"],
            "name": med_dict["name"]
        }
        col.update_one(filter_query, {"$set": med_dict}, upsert=True)
    except Exception as e:
        print(f"[MongoDB] Failed to persist medication: {e}")

def delete_mongo_medication(user_email: str, name: str):
    """Deletes a medication from MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        col = db["medications"]
        col.delete_one({"user_email": user_email, "name": name})
    except Exception as e:
        print(f"[MongoDB] Failed to delete medication: {e}")


# --- CONSULTATION REPORTS ---

def save_mongo_report(report_dict: Dict[str, Any]):
    """Persists a consultation report into MongoDB Atlas."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        col = db["reports"]
        filter_query = {
            "user_email": report_dict["user_email"],
            "title": report_dict["title"],
            "date_range_start": report_dict["date_range_start"],
            "date_range_end": report_dict["date_range_end"]
        }
        col.update_one(filter_query, {"$set": report_dict}, upsert=True)
    except Exception as e:
        print(f"[MongoDB] Failed to persist report: {e}")


# --- DATA RESTORATION / SYNC ---

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

def sync_all_mongo_data(sql_session):
    """
    Complete synchronization from MongoDB Atlas into the active local database on startup.
    Restores Users, Symptom Entries, Cycles, Medications, and Reports.
    """
    db = get_mongo_db()
    if db is None:
        return

    # 1. Sync Users first
    sync_all_mongo_users(sql_session)

    try:
        from app.models import User, Symptom, SymptomEntry, SymptomContext, Tag, Cycle, Medication, Report

        # Map user emails to sql user IDs
        users_map = {u.email: u.id for u in sql_session.query(User).all()}

        # 2. Sync Symptom Entries
        entries_col = db["symptom_entries"]
        all_entries = list(entries_col.find({}))
        entries_synced = 0

        for edoc in all_entries:
            user_email = edoc.get("user_email")
            user_id = users_map.get(user_email)
            if not user_id:
                continue

            symptom_name = edoc.get("symptom_name")
            if not symptom_name:
                continue

            symptom = sql_session.query(Symptom).filter(Symptom.name == symptom_name).first()
            if not symptom:
                symptom = Symptom(
                    name=symptom_name,
                    category=edoc.get("symptom_category", "General"),
                    is_custom=True
                )
                sql_session.add(symptom)
                sql_session.flush()

            # Check if entry already exists
            existing = sql_session.query(SymptomEntry).filter(
                SymptomEntry.user_id == user_id,
                SymptomEntry.onset_date == edoc.get("onset_date"),
                SymptomEntry.symptom_id == symptom.id,
                SymptomEntry.onset_time == edoc.get("onset_time")
            ).first()

            if not existing:
                entry = SymptomEntry(
                    user_id=user_id,
                    symptom_id=symptom.id,
                    onset_date=edoc.get("onset_date"),
                    onset_time=edoc.get("onset_time"),
                    end_date=edoc.get("end_date"),
                    end_time=edoc.get("end_time"),
                    duration_minutes=edoc.get("duration_minutes"),
                    severity=edoc.get("severity"),
                    body_location=edoc.get("body_location"),
                    notes=edoc.get("notes"),
                    source_type=edoc.get("source_type", "structured"),
                    ai_extracted=edoc.get("ai_extracted", False),
                    user_confirmed=edoc.get("user_confirmed", True),
                    privacy_category=edoc.get("privacy_category", "standard"),
                    cycle_phase=edoc.get("cycle_phase")
                )
                sql_session.add(entry)
                sql_session.flush()

                # Add contexts
                for ctx in edoc.get("contexts", []):
                    c_obj = SymptomContext(
                        symptom_entry_id=entry.id,
                        context_type=ctx.get("context_type", ""),
                        value=ctx.get("value", ""),
                        notes=ctx.get("notes")
                    )
                    sql_session.add(c_obj)

                # Add tags
                for tag_name in edoc.get("tags", []):
                    tag = sql_session.query(Tag).filter(Tag.name == tag_name, Tag.user_id == user_id).first()
                    if not tag:
                        tag = Tag(name=tag_name, user_id=user_id)
                        sql_session.add(tag)
                        sql_session.flush()
                    entry.tags.append(tag)

                entries_synced += 1

        # 3. Sync Cycles
        cycles_col = db["cycles"]
        all_cycles = list(cycles_col.find({}))
        cycles_synced = 0

        for cdoc in all_cycles:
            user_id = users_map.get(cdoc.get("user_email"))
            if not user_id:
                continue

            existing_cycle = sql_session.query(Cycle).filter(
                Cycle.user_id == user_id,
                Cycle.period_start_date == cdoc.get("period_start_date")
            ).first()

            if not existing_cycle:
                new_cycle = Cycle(
                    user_id=user_id,
                    period_start_date=cdoc.get("period_start_date"),
                    period_end_date=cdoc.get("period_end_date"),
                    flow_intensity=cdoc.get("flow_intensity", "medium"),
                    cycle_length=cdoc.get("cycle_length"),
                    notes=cdoc.get("notes")
                )
                sql_session.add(new_cycle)
                cycles_synced += 1

        # 4. Sync Medications
        meds_col = db["medications"]
        all_meds = list(meds_col.find({}))
        meds_synced = 0

        for mdoc in all_meds:
            user_id = users_map.get(mdoc.get("user_email"))
            if not user_id:
                continue

            existing_med = sql_session.query(Medication).filter(
                Medication.user_id == user_id,
                Medication.name == mdoc.get("name")
            ).first()

            if not existing_med:
                new_med = Medication(
                    user_id=user_id,
                    name=mdoc.get("name"),
                    dosage=mdoc.get("dosage"),
                    frequency=mdoc.get("frequency"),
                    start_date=mdoc.get("start_date"),
                    end_date=mdoc.get("end_date"),
                    prescriber=mdoc.get("prescriber"),
                    purpose=mdoc.get("purpose"),
                    notes=mdoc.get("notes"),
                    is_active=mdoc.get("is_active", True)
                )
                sql_session.add(new_med)
                meds_synced += 1

        # 5. Sync Reports
        reports_col = db["reports"]
        all_reports = list(reports_col.find({}))
        reports_synced = 0

        for rdoc in all_reports:
            user_id = users_map.get(rdoc.get("user_email"))
            if not user_id:
                continue

            existing_rep = sql_session.query(Report).filter(
                Report.user_id == user_id,
                Report.title == rdoc.get("title"),
                Report.date_range_start == rdoc.get("date_range_start")
            ).first()

            if not existing_rep:
                new_rep = Report(
                    user_id=user_id,
                    title=rdoc.get("title"),
                    date_range_start=rdoc.get("date_range_start"),
                    date_range_end=rdoc.get("date_range_end"),
                    primary_concerns=rdoc.get("primary_concerns"),
                    selected_sections_json=rdoc.get("selected_sections_json", "[]"),
                    generated_content_json=rdoc.get("generated_content_json", "{}"),
                    questions_for_clinician=rdoc.get("questions_for_clinician"),
                    status=rdoc.get("status", "draft")
                )
                sql_session.add(new_rep)
                reports_synced += 1

        sql_session.commit()
        if entries_synced or cycles_synced or meds_synced or reports_synced:
            print(
                f"[MongoDB] Restored cloud records: {entries_synced} symptom entries, "
                f"{cycles_synced} cycles, {meds_synced} medications, {reports_synced} reports."
            )
    except Exception as e:
        print(f"[MongoDB] Full data sync warning: {e}")
        sql_session.rollback()
