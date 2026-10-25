import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SymptomEntry
from app.services.auth_service import get_current_user
from app.services.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/analytics", tags=["Deterministic Analytics"])

@router.get("/overview")
def get_analytics_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.date.today()
    if not end_date:
        end_date = today.isoformat()
    if not start_date:
        start_date = (today - datetime.timedelta(days=90)).isoformat()

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
    d_start = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
    d_end = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
    duration_days = (d_end - d_start).days + 1
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
        "baseline_comparison": {
            "baseline_status": baseline_status,
            "baseline_sample_size": len(baseline_entries),
            "baseline_average_severity": baseline_severity.get("average"),
            "current_period_average_severity": severity_metrics.get("average"),
            "difference": round((severity_metrics.get("average") or 0) - (baseline_severity.get("average") or 0), 2)
                if (severity_metrics.get("average") and baseline_severity.get("average")) else None
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

@router.get("/flare-ups")
def get_flare_ups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entries = db.query(SymptomEntry).filter(SymptomEntry.user_id == current_user.id).all()
    flare_ups = AnalyticsEngine.detect_flare_ups(entries)
    return {
        "flare_ups": flare_ups,
        "methodology": "Symptom recorded on >= 3 days within rolling 7-day window with average severity exceeding personal baseline by >= 1.5 points.",
        "sample_size_requirement": ">= 10 historical records with severity required for baseline"
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
