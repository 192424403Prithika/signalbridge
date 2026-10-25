import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Insight, SymptomEntry
from app.schemas import InsightOut, EvidenceDetail
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/insights", tags=["Insights & Evidence"])

@router.get("", response_model=List[InsightOut])
def list_insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insights = db.query(Insight).filter(
        Insight.user_id == current_user.id,
        Insight.status != "dismissed"
    ).order_by(Insight.created_at.desc()).all()

    results = []
    for i in insights:
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
    return results

@router.get("/{insight_id}/evidence")
def get_insight_evidence(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insight = db.query(Insight).filter(Insight.id == insight_id, Insight.user_id == current_user.id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found.")

    entry_ids = []
    try:
        entry_ids = json.loads(insight.evidence_entry_ids or "[]")
    except Exception:
        pass

    calc_meta = {}
    try:
        calc_meta = json.loads(insight.calculation_metadata_json or "{}")
    except Exception:
        pass

    # Retrieve contributing records
    contributing_records = []
    if entry_ids:
        entries = db.query(SymptomEntry).filter(SymptomEntry.id.in_(entry_ids)).all()
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

    return {
        "insight_id": insight.id,
        "title": insight.title,
        "description": insight.description,
        "contributing_records": contributing_records,
        "sample_size": len(contributing_records),
        "calculation_formula": calc_meta.get("formula", "Empirical aggregation over verified user entries"),
        "excluded_records_count": calc_meta.get("excluded_count", 0),
        "exclusion_reason": calc_meta.get("exclusion_reason", "Records with missing or null severity rating"),
        "missing_data_summary": calc_meta.get("missing_summary", "Days without logs cannot be verified as symptom-free."),
        "confidence_level": insight.confidence_level,
        "disclaimer": "This insight represents a mathematical pattern in your personal records. It is not a medical diagnosis or disease prediction."
    }

@router.post("/{insight_id}/dismiss")
def dismiss_insight(insight_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insight = db.query(Insight).filter(Insight.id == insight_id, Insight.user_id == current_user.id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found.")

    insight.status = "dismissed"
    db.commit()
    return {"message": "Insight dismissed."}

@router.post("/{insight_id}/save-to-report")
def save_insight_to_report(insight_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insight = db.query(Insight).filter(Insight.id == insight_id, Insight.user_id == current_user.id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found.")

    insight.status = "saved_to_report"
    db.commit()
    return {"message": "Insight saved to consultation report draft."}
