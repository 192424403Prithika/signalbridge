import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, DataQualityIssue
from app.schemas import DataQualityIssueOut
from app.services.auth_service import get_current_user
from app.services.data_quality_engine import DataQualityEngine

router = APIRouter(prefix="/data-quality", tags=["Data Quality Center"])

@router.get("", response_model=List[DataQualityIssueOut])
def get_data_quality_issues(
    status: str = "open",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DataQualityIssue).filter(DataQualityIssue.user_id == current_user.id)
    if status != "all":
        query = query.filter(DataQualityIssue.status == status)

    issues = query.order_by(DataQualityIssue.created_at.desc()).all()
    results = []
    for issue in issues:
        entry_ids = []
        try:
            entry_ids = json.loads(issue.affected_entry_ids or "[]")
        except Exception:
            pass

        results.append({
            "id": issue.id,
            "user_id": issue.user_id,
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "description": issue.description,
            "affected_entry_ids": entry_ids,
            "suggested_action": issue.suggested_action,
            "status": issue.status,
            "created_at": issue.created_at
        })
    return results

@router.post("/scan")
def trigger_quality_scan(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    DataQualityEngine.scan_user_data(db, current_user.id)
    open_count = db.query(DataQualityIssue).filter(
        DataQualityIssue.user_id == current_user.id,
        DataQualityIssue.status == "open"
    ).count()
    return {"message": "Data quality scan completed.", "open_issues_count": open_count}

@router.post("/{issue_id}/resolve")
def resolve_issue(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(DataQualityIssue).filter(
        DataQualityIssue.id == issue_id,
        DataQualityIssue.user_id == current_user.id
    ).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Data quality issue not found.")

    issue.status = "resolved"
    db.commit()
    return {"message": "Data quality issue marked as resolved."}

@router.post("/{issue_id}/ignore")
def ignore_issue(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(DataQualityIssue).filter(
        DataQualityIssue.id == issue_id,
        DataQualityIssue.user_id == current_user.id
    ).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Data quality issue not found.")

    issue.status = "ignored"
    db.commit()
    return {"message": "Data quality issue marked as intentional/ignored."}
