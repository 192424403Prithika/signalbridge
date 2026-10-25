import datetime
import statistics
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Cycle
from app.schemas import CycleCreate, CycleOut, CyclePrediction
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/cycles", tags=["Menstrual Cycle Tracking"])

@router.get("", response_model=List[CycleOut])
def get_cycles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Cycle).filter(Cycle.user_id == current_user.id).order_by(Cycle.period_start_date.desc()).all()

@router.post("", response_model=CycleOut)
def record_cycle(
    cycle_in: CycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cycle = Cycle(
        user_id=current_user.id,
        period_start_date=cycle_in.period_start_date,
        period_end_date=cycle_in.period_end_date,
        flow_intensity=cycle_in.flow_intensity,
        cycle_length=cycle_in.cycle_length,
        notes=cycle_in.notes
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)

    try:
        from app.services.mongo_service import save_mongo_cycle
        save_mongo_cycle({
            "user_email": current_user.email,
            "period_start_date": cycle.period_start_date,
            "period_end_date": cycle.period_end_date,
            "flow_intensity": cycle.flow_intensity,
            "cycle_length": cycle.cycle_length,
            "notes": cycle.notes
        })
    except Exception:
        pass

    return cycle

@router.delete("/{cycle_id}")
def delete_cycle(cycle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Cycle).filter(Cycle.id == cycle_id, Cycle.user_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cycle entry not found.")
    period_start = c.period_start_date
    db.delete(c)
    db.commit()

    try:
        from app.services.mongo_service import delete_mongo_cycle
        delete_mongo_cycle(current_user.email, period_start)
    except Exception:
        pass

    return {"message": "Cycle entry deleted."}

@router.get("/prediction", response_model=CyclePrediction)
def predict_next_cycle(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Calculates estimated next period dates using historical cycle intervals.
    Returns explicit uncertainty disclosure.
    """
    cycles = db.query(Cycle).filter(Cycle.user_id == current_user.id).order_by(Cycle.period_start_date.asc()).all()

    if len(cycles) < 2:
        return CyclePrediction(
            predicted_next_period_start=None,
            predicted_next_period_end=None,
            predicted_ovulation_date=None,
            cycle_length_average=None,
            confidence="insufficient_data",
            uncertainty_notice="At least 2 completed cycles are required to calculate an estimated baseline."
        )

    # Compute observed cycle intervals
    intervals = []
    for i in range(len(cycles) - 1):
        d1 = datetime.datetime.strptime(cycles[i].period_start_date, "%Y-%m-%d").date()
        d2 = datetime.datetime.strptime(cycles[i + 1].period_start_date, "%Y-%m-%d").date()
        diff = (d2 - d1).days
        if 20 <= diff <= 45:  # realistic physiological range
            intervals.append(diff)

    avg_len = round(statistics.mean(intervals), 1) if intervals else 28.0
    latest_cycle = cycles[-1]
    last_start = datetime.datetime.strptime(latest_cycle.period_start_date, "%Y-%m-%d").date()

    next_start = last_start + datetime.timedelta(days=int(avg_len))
    next_end = next_start + datetime.timedelta(days=5)
    ovulation_est = next_start - datetime.timedelta(days=14)

    # Assess variance for confidence score
    stdev = statistics.stdev(intervals) if len(intervals) >= 2 else 2.0
    confidence = "high evidence" if stdev <= 2.0 and len(intervals) >= 3 else "moderate evidence"

    return CyclePrediction(
        predicted_next_period_start=next_start.isoformat(),
        predicted_next_period_end=next_end.isoformat(),
        predicted_ovulation_date=ovulation_est.isoformat(),
        cycle_length_average=avg_len,
        confidence=confidence,
        uncertainty_notice=(
            f"Estimated with an average cycle length of {avg_len} days across {len(intervals)} intervals. "
            "Biological cycles vary naturally due to stress, travel, sleep, and lifestyle. "
            "This mathematical estimate is not a medical prediction or fertility determination."
        )
    )
