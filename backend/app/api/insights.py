import json
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Insight, SymptomEntry
from app.schemas import InsightOut, EvidenceDetail
from app.services.auth_service import get_current_user
from app.services.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/insights", tags=["Insights & Evidence"])

@router.get("", response_model=List[InsightOut])
def list_insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch persisted DB insights for this user
    db_insights = db.query(Insight).filter(
        Insight.user_id == current_user.id,
        Insight.status != "dismissed"
    ).order_by(Insight.created_at.desc()).all()

    results = []
    seen_titles = set()

    for i in db_insights:
        ev_ids = []
        try:
            ev_ids = json.loads(i.evidence_entry_ids or "[]")
        except Exception:
            pass
        calc_meta = {}
        try:
            calc_meta = json.loads(i.calculation_metadata_json or "{}")
        except Exception:
            pass

        seen_titles.add(i.title)
        results.append({
            "id": i.id,
            "user_id": i.user_id,
            "insight_type": i.insight_type,
            "title": i.title,
            "description": i.description,
            "evidence_entry_ids": ev_ids,
            "calculation_metadata": calc_meta,
            "confidence_level": i.confidence_level,
            "status": i.status,
            "created_at": i.created_at
        })

    # 2. Compute dynamic evidence-based insights from user's actual records
    user_entries = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.user_id == current_user.id)
        .all()
    )

    if user_entries:
        dynamic_insights = AnalyticsEngine.generate_dynamic_insights(user_entries)
        for dyn in dynamic_insights:
            if dyn["title"] not in seen_titles:
                results.append({
                    "id": dyn["id"],
                    "user_id": current_user.id,
                    "insight_type": dyn["insight_type"],
                    "title": dyn["title"],
                    "description": dyn["description"],
                    "evidence_entry_ids": dyn["evidence_entry_ids"],
                    "calculation_metadata": dyn["calculation_metadata"],
                    "confidence_level": dyn["confidence_level"],
                    "status": dyn["status"],
                    "created_at": datetime.datetime.now(datetime.timezone.utc)
                })

    return results

@router.get("/{insight_id}/evidence")
def get_insight_evidence(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insight = db.query(Insight).filter(Insight.id == insight_id, Insight.user_id == current_user.id).first()

    entry_ids = []
    calc_meta = {}
    title = ""
    description = ""
    confidence_level = "moderate evidence"

    if insight:
        title = insight.title
        description = insight.description
        confidence_level = insight.confidence_level
        try:
            entry_ids = json.loads(insight.evidence_entry_ids or "[]")
        except Exception:
            pass
        try:
            calc_meta = json.loads(insight.calculation_metadata_json or "{}")
        except Exception:
            pass
    else:
        # Check dynamic insights
        user_entries = db.query(SymptomEntry).filter(SymptomEntry.user_id == current_user.id).all()
        dynamic_insights = AnalyticsEngine.generate_dynamic_insights(user_entries)
        matching_dyn = next((d for d in dynamic_insights if d["id"] == insight_id), None)
        if not matching_dyn:
            raise HTTPException(status_code=404, detail="Insight not found.")
        title = matching_dyn["title"]
        description = matching_dyn["description"]
        confidence_level = matching_dyn["confidence_level"]
        entry_ids = matching_dyn["evidence_entry_ids"]
        calc_meta = matching_dyn["calculation_metadata"]

    # Retrieve contributing records - STRICT USER ISOLATION
    contributing_records = []
    if entry_ids:
        entries = (
            db.query(SymptomEntry)
            .filter(
                SymptomEntry.id.in_(entry_ids),
                SymptomEntry.user_id == current_user.id
            )
            .all()
        )
        for e in entries:
            contributing_records.append({
                "id": e.id,
                "symptom": e.symptom.name,
                "onset_date": e.onset_date,
                "onset_time": e.onset_time,
                "severity": e.severity,
                "duration_minutes": e.duration_minutes,
                "body_location": e.body_location,
                "notes": e.notes
            })

    distinct_days = len(set(r["onset_date"] for r in contributing_records))

    return {
        "insight_id": insight_id,
        "title": title,
        "description": description,
        "contributing_records": contributing_records,
        "sample_size": len(contributing_records),
        "distinct_days_count": distinct_days,
        "calculation_formula": calc_meta.get("formula", "Empirical aggregation over verified user entries"),
        "resulting_statistic": calc_meta.get("resulting_statistic"),
        "comparison_values": calc_meta.get("comparison_values"),
        "excluded_records_count": calc_meta.get("excluded_count", 0),
        "exclusion_reason": calc_meta.get("exclusion_reason", "Records with missing or null severity rating"),
        "missing_data_summary": calc_meta.get("missing_summary", "Days without logs cannot be verified as symptom-free."),
        "confidence_level": confidence_level,
        "disclaimer": (
            "This insight represents a mathematical pattern in your personal records. "
            "It is not a medical diagnosis, disease prediction, or clinical prognosis. "
            "Association does not establish causation."
        )
    }

@router.post("/{insight_id}/dismiss")
def dismiss_insight(insight_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insight = db.query(Insight).filter(Insight.id == insight_id, Insight.user_id == current_user.id).first()
    if insight:
        insight.status = "dismissed"
        db.commit()
    return {"message": "Insight dismissed."}

@router.post("/{insight_id}/save-to-report")
def save_insight_to_report(insight_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insight = db.query(Insight).filter(Insight.id == insight_id, Insight.user_id == current_user.id).first()
    if insight:
        insight.status = "saved_to_report"
        db.commit()
    return {"message": "Insight saved to consultation report draft."}
