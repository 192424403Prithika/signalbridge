import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SymptomEntry, Medication, Cycle, DataQualityIssue, HealthProfile, Report
from app.services.auth_service import get_current_user
from app.services.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/analytics", tags=["Deterministic Analytics"])

def parse_and_validate_dates(start_date: Optional[str], end_date: Optional[str]):
    today = datetime.date.today()
    if not end_date:
        d_end = today
        end_date = d_end.isoformat()
    else:
        try:
            d_end = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Expected YYYY-MM-DD."
            )

    if not start_date:
        d_start = today - datetime.timedelta(days=90)
        start_date = d_start.isoformat()
    else:
        try:
            d_start = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Expected YYYY-MM-DD."
            )

    if d_start > d_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reversed date range: start_date ({start_date}) must be on or before end_date ({end_date})."
        )

    return start_date, end_date, d_start, d_end

@router.get("/overview")
def get_analytics_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date, d_start, d_end = parse_and_validate_dates(start_date, end_date)

    all_user_entries = (
        db.query(SymptomEntry)
        .filter(SymptomEntry.user_id == current_user.id)
        .all()
    )

    # Filter for active period
    period_entries = [
        e for e in all_user_entries
        if start_date <= e.onset_date <= end_date
    ]

    # Prior period of equal duration for comparison
    duration_days = max(1, (d_end - d_start).days + 1)
    prior_end = d_start - datetime.timedelta(days=1)
    prior_start = prior_end - datetime.timedelta(days=duration_days - 1)

    prior_period_entries = [
        e for e in all_user_entries
        if prior_start.isoformat() <= e.onset_date <= prior_end.isoformat()
    ]

    # Deterministic calculations
    frequencies = AnalyticsEngine.calculate_frequency(all_user_entries, start_date, end_date)
    severity_metrics = AnalyticsEngine.calculate_severity_metrics(period_entries)
    duration_metrics = AnalyticsEngine.calculate_duration_metrics(period_entries)
    flare_ups = AnalyticsEngine.detect_flare_ups(all_user_entries)
    correlations = AnalyticsEngine.calculate_correlations(all_user_entries)
    period_comparison = AnalyticsEngine.compare_periods(
        period_entries,
        prior_period_entries,
        f"{start_date} to {end_date}",
        f"{prior_start.isoformat()} to {prior_end.isoformat()}"
    )

    # Personal baseline comparison (90 days prior)
    baseline_entries = [e for e in all_user_entries if e.onset_date < start_date]
    baseline_severity = AnalyticsEngine.calculate_severity_metrics(baseline_entries)
    baseline_status = "preliminary" if len(baseline_entries) < 10 else "established"

    # Missing data summary
    missing_severity_count = len([e for e in period_entries if e.severity is None])
    missing_duration_count = len([e for e in period_entries if e.duration_minutes is None])

    # Related records for consultation readiness
    medications = db.query(Medication).filter(Medication.user_id == current_user.id).all()
    cycles = db.query(Cycle).filter(Cycle.user_id == current_user.id).all()
    quality_issues = db.query(DataQualityIssue).filter(
        DataQualityIssue.user_id == current_user.id,
        DataQualityIssue.status == "open"
    ).all()
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    reports = db.query(Report).filter(Report.user_id == current_user.id).all()

    readiness = AnalyticsEngine.calculate_consultation_readiness(
        all_user_entries,
        medications,
        cycles,
        quality_issues,
        profile,
        reports
    )

    return {
        "date_range": {"start": start_date, "end": end_date},
        "total_records_in_period": len(period_entries),
        "total_all_time_records": len(all_user_entries),
        "symptom_frequency": frequencies,
        "severity_metrics": severity_metrics,
        "duration_metrics": duration_metrics,
        "flare_ups": flare_ups,
        "correlations": correlations[:10],
        "period_comparison": period_comparison,
        "consultation_readiness": readiness,
        "baseline_comparison": {
            "baseline_status": baseline_status,
            "baseline_sample_size": len(baseline_entries),
            "baseline_average_severity": baseline_severity.get("average"),
            "current_period_average_severity": severity_metrics.get("average"),
            "difference": round((severity_metrics.get("average") or 0) - (baseline_severity.get("average") or 0), 2)
                if (severity_metrics.get("average") is not None and baseline_severity.get("average") is not None) else None
        },
        "missing_data_summary": {
            "missing_severity_entries": missing_severity_count,
            "missing_duration_entries": missing_duration_count,
            "notes": "Unlogged days are not assumed to be symptom-free. Incomplete ratings are excluded from averages."
        },
        "disclaimer": (
            "All analytics are descriptive calculations of user-recorded observations. "
            "SignalBridge does not diagnose diseases or predict medical conditions."
        )
    }

@router.get("/readiness")
def get_consultation_readiness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dedicated Consultation Readiness & Evidence Coverage evaluation.
    Evaluates the completeness, depth, and organization of logged health records
    prior to a clinical consultation.
    """
    entries = db.query(SymptomEntry).filter(SymptomEntry.user_id == current_user.id).all()
    medications = db.query(Medication).filter(Medication.user_id == current_user.id).all()
    cycles = db.query(Cycle).filter(Cycle.user_id == current_user.id).all()
    quality_issues = db.query(DataQualityIssue).filter(
        DataQualityIssue.user_id == current_user.id,
        DataQualityIssue.status == "open"
    ).all()
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    reports = db.query(Report).filter(Report.user_id == current_user.id).all()

    readiness = AnalyticsEngine.calculate_consultation_readiness(
        entries,
        medications,
        cycles,
        quality_issues,
        profile,
        reports
    )
    return readiness

@router.get("/flare-ups")
def get_flare_ups(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SymptomEntry).filter(SymptomEntry.user_id == current_user.id)
    if start_date or end_date:
        start_date, end_date, _, _ = parse_and_validate_dates(start_date, end_date)
        query = query.filter(SymptomEntry.onset_date >= start_date, SymptomEntry.onset_date <= end_date)

    entries = query.all()
    flare_ups = AnalyticsEngine.detect_flare_ups(entries)
    return {
        "flare_ups": flare_ups,
        "methodology": "Symptom recorded on >= 3 days within rolling 7-day window with average severity exceeding non-window personal baseline by >= 1.5 points.",
        "sample_size_requirement": ">= 10 historical records with severity outside candidate window required for baseline",
        "rule_type": "Exploratory application rule (not a medical prediction or clinical diagnostic threshold)"
    }

@router.get("/correlations")
def get_correlations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entries = db.query(SymptomEntry).filter(SymptomEntry.user_id == current_user.id).all()
    correlations = AnalyticsEngine.calculate_correlations(entries)
    return {
        "correlations": correlations,
        "methodology": "Conditional probability P(Symptom | Context) = (Days with both) / (Days with context)",
        "disclaimer": "Correlation does not imply medical causation. Temporal co-occurrence should be discussed with a qualified clinician."
    }
