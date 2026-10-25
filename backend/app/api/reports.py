import json
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Report, SymptomEntry, Medication, Cycle, DataQualityIssue
from app.schemas import ReportCreate, ReportOut
from app.services.auth_service import get_current_user, log_audit_event
from app.services.analytics_engine import AnalyticsEngine
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["Consultation Reports"])

@router.post("/generate", response_model=ReportOut)
def generate_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch records within date range
    entries = db.query(SymptomEntry).filter(
        SymptomEntry.user_id == current_user.id,
        SymptomEntry.onset_date >= report_in.date_range_start,
        SymptomEntry.onset_date <= report_in.date_range_end
    ).order_by(SymptomEntry.onset_date.asc()).all()

    medications = db.query(Medication).filter(Medication.user_id == current_user.id).all()
    cycles = db.query(Cycle).filter(Cycle.user_id == current_user.id).all()

    # Analytical computations
    freq_data = AnalyticsEngine.calculate_frequency(entries, report_in.date_range_start, report_in.date_range_end)
    sev_data = AnalyticsEngine.calculate_severity_metrics(entries)
    flare_ups = AnalyticsEngine.detect_flare_ups(entries)

    # Data quality limitations
    quality_issues = db.query(DataQualityIssue).filter(
        DataQualityIssue.user_id == current_user.id,
        DataQualityIssue.status == "open"
    ).all()
    dq_notes = [q.description for q in quality_issues]

    report_content = ReportGenerator.generate_report_content(
        user_name=current_user.full_name,
        date_range_start=report_in.date_range_start,
        date_range_end=report_in.date_range_end,
        primary_concerns=report_in.primary_concerns or "",
        questions_for_clinician=report_in.questions_for_clinician or "",
        symptom_entries=entries,
        frequency_data=freq_data,
        severity_data=sev_data,
        flare_ups=flare_ups,
        medications=medications,
        cycles=cycles,
        data_quality_notes=dq_notes
    )

    report = Report(
        user_id=current_user.id,
        title=report_in.title,
        date_range_start=report_in.date_range_start,
        date_range_end=report_in.date_range_end,
        primary_concerns=report_in.primary_concerns,
        questions_for_clinician=report_in.questions_for_clinician,
        selected_sections_json=json.dumps(report_in.selected_sections),
        generated_content_json=json.dumps(report_content),
        status="draft"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    log_audit_event(db, current_user.id, "REPORT_GENERATED", "Report", report.id)

    return {
        "id": report.id,
        "user_id": report.user_id,
        "title": report.title,
        "date_range_start": report.date_range_start,
        "date_range_end": report.date_range_end,
        "primary_concerns": report.primary_concerns,
        "selected_sections": report_in.selected_sections,
        "generated_content": report_content,
        "questions_for_clinician": report.questions_for_clinician,
        "status": report.status,
        "created_at": report.created_at,
        "updated_at": report.updated_at
    }

@router.get("", response_model=List[ReportOut])
def get_user_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.created_at.desc()).all()
    results = []
    for r in reports:
        sec = []
        try:
            sec = json.loads(r.selected_sections_json or "[]")
        except Exception:
            pass
        content = {}
        try:
            content = json.loads(r.generated_content_json or "{}")
        except Exception:
            pass

        results.append({
            "id": r.id,
            "user_id": r.user_id,
            "title": r.title,
            "date_range_start": r.date_range_start,
            "date_range_end": r.date_range_end,
            "primary_concerns": r.primary_concerns,
            "selected_sections": sec,
            "generated_content": content,
            "questions_for_clinician": r.questions_for_clinician,
            "status": r.status,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return results

@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")

    sec = []
    try:
        sec = json.loads(r.selected_sections_json or "[]")
    except Exception:
        pass
    content = {}
    try:
        content = json.loads(r.generated_content_json or "{}")
    except Exception:
        pass

    return {
        "id": r.id,
        "user_id": r.user_id,
        "title": r.title,
        "date_range_start": r.date_range_start,
        "date_range_end": r.date_range_end,
        "primary_concerns": r.primary_concerns,
        "selected_sections": sec,
        "generated_content": content,
        "questions_for_clinician": r.questions_for_clinician,
        "status": r.status,
        "created_at": r.created_at,
        "updated_at": r.updated_at
    }

@router.get("/{report_id}/export/html")
def export_report_html(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")

    content = json.loads(r.generated_content_json or "{}")
    html_output = ReportGenerator.generate_html_report(content)
    return Response(content=html_output, media_type="text/html")

@router.get("/{report_id}/export/pdf")
def export_report_pdf(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")

    content = json.loads(r.generated_content_json or "{}")
    pdf_bytes = ReportGenerator.generate_pdf_report(content)
    headers = {"Content-Disposition": f"attachment; filename=SignalBridge_Report_{report_id}.pdf"}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

@router.get("/{report_id}/export/text")
def export_report_text(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")

    content = json.loads(r.generated_content_json or "{}")
    text_lines = [
        f"SIGNALBRIDGE CLINICAL CONSULTATION REPORT",
        f"Patient: {content.get('patient_name')}",
        f"Period: {content.get('date_range', {}).get('start')} to {content.get('date_range', {}).get('end')}",
        f"Generated: {content.get('generated_at')}",
        "-" * 60,
        f"IMPORTANT DISCLAIMER:",
        content.get('disclaimer', ''),
        "-" * 60,
        f"1. PRIMARY CONCERNS:",
        content.get('primary_concerns', 'None stated'),
        "",
        f"2. QUESTIONS FOR HEALTHCARE PROFESSIONAL:",
        content.get('questions_for_clinician', 'None specified'),
        "",
        f"3. SYMPTOM FREQUENCY OVERVIEW:",
    ]
    for item in content.get('frequency_summary', []):
        text_lines.append(f" - {item.get('symptom_name')}: {item.get('distinct_days_count')} days ({item.get('frequency_percentage')}%)")

    text_lines.append("")
    text_lines.append("4. DATA LIMITATIONS & DISCLOSURES:")
    for lim in content.get('limitations', []):
        text_lines.append(f" * {lim}")

    return Response(content="\n".join(text_lines), media_type="text/plain")

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")
    db.delete(r)
    db.commit()
    log_audit_event(db, current_user.id, "REPORT_DELETED", "Report", report_id)
    return {"message": "Report deleted."}
