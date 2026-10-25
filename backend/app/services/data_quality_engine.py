import datetime
import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import SymptomEntry, DataQualityIssue, Cycle, Report

class DataQualityEngine:
    @staticmethod
    def scan_user_data(db: Session, user_id: int):
        """
        Scans all user entries, cycles, and reports to detect data quality anomalies,
        upserting open issues into the data_quality_issues table.
        """
        entries = db.query(SymptomEntry).filter(SymptomEntry.user_id == user_id).all()
        cycles = db.query(Cycle).filter(Cycle.user_id == user_id).all()
        reports = db.query(Report).filter(Report.user_id == user_id, Report.status == "finalized").all()

        existing_issues = db.query(DataQualityIssue).filter(
            DataQualityIssue.user_id == user_id
        ).all()
        open_issues_by_type = {i.issue_type: i for i in existing_issues if i.status == "open"}
        ignored_issue_types = set(i.issue_type for i in existing_issues if i.status == "ignored")
        existing_issue_types = set(open_issues_by_type.keys()) | ignored_issue_types

        new_issues: List[DataQualityIssue] = []

        # 1. Missing Severity
        missing_sev_entries = [e for e in entries if e.severity is None]
        if missing_sev_entries:
            if "missing_severity" not in open_issues_by_type and "missing_severity" not in ignored_issue_types:
                new_issues.append(DataQualityIssue(
                    user_id=user_id,
                    issue_type="missing_severity",
                    severity="info",
                    description=f"{len(missing_sev_entries)} symptom entries do not have a 0–10 severity rating.",
                    affected_entry_ids=json.dumps([e.id for e in missing_sev_entries[:15]]),
                    suggested_action="Assign a severity score (0 mild to 10 severe) so analytics can track severity changes accurately."
                ))
            elif "missing_severity" in open_issues_by_type:
                # Update affected count
                open_issues_by_type["missing_severity"].description = f"{len(missing_sev_entries)} symptom entries do not have a 0–10 severity rating."
                open_issues_by_type["missing_severity"].affected_entry_ids = json.dumps([e.id for e in missing_sev_entries[:15]])
        elif "missing_severity" in open_issues_by_type:
            # Auto-resolve if resolved by user
            open_issues_by_type["missing_severity"].status = "resolved"

        # 2. Impossible / Reversed Dates
        reversed_date_entries = []
        for e in entries:
            if e.end_date and e.onset_date:
                try:
                    d_onset = datetime.datetime.strptime(e.onset_date, "%Y-%m-%d")
                    d_end = datetime.datetime.strptime(e.end_date, "%Y-%m-%d")
                    if d_end < d_onset:
                        reversed_date_entries.append(e)
                except Exception:
                    pass

        if reversed_date_entries:
            if "reversed_dates" not in open_issues_by_type and "reversed_dates" not in ignored_issue_types:
                new_issues.append(DataQualityIssue(
                    user_id=user_id,
                    issue_type="reversed_dates",
                    severity="critical",
                    description=f"{len(reversed_date_entries)} entries have an end date recorded before the onset date.",
                    affected_entry_ids=json.dumps([e.id for e in reversed_date_entries]),
                    suggested_action="Correct the onset or end date so duration calculations are mathematically valid."
                ))
        elif "reversed_dates" in open_issues_by_type:
            open_issues_by_type["reversed_dates"].status = "resolved"

        # 3. Duplicate / Suspiciously Similar Entries
        # Entries with same symptom, same onset_date, AND same onset_time (or identical content)
        date_time_map = {}
        duplicates = []
        for e in entries:
            # Match identical symptom, onset_date, and onset_time
            time_key = e.onset_time or "unspecified"
            key = (e.symptom_id, e.onset_date, time_key)
            if key in date_time_map:
                duplicates.extend([e.id, date_time_map[key]])
            else:
                date_time_map[key] = e.id

        if duplicates:
            unique_dupe_ids = list(set(duplicates))
            if "duplicate_entry" not in open_issues_by_type and "duplicate_entry" not in ignored_issue_types:
                new_issues.append(DataQualityIssue(
                    user_id=user_id,
                    issue_type="duplicate_entry",
                    severity="warning",
                    description=f"Found multiple logs for the same symptom with identical timestamps ({len(unique_dupe_ids)} entries).",
                    affected_entry_ids=json.dumps(unique_dupe_ids[:10]),
                    suggested_action="Review and remove true duplicate entries. Note: Repeated symptoms at different times of day are legitimate and not flagged as duplicates."
                ))
        elif "duplicate_entry" in open_issues_by_type:
            open_issues_by_type["duplicate_entry"].status = "resolved"

        # 4. Out-of-Range Severity (> 10 or < 0)
        invalid_sev = [e for e in entries if e.severity is not None and (e.severity < 0 or e.severity > 10)]
        if invalid_sev and "out_of_range_severity" not in existing_issue_types:
            new_issues.append(DataQualityIssue(
                user_id=user_id,
                issue_type="out_of_range_severity",
                severity="critical",
                description=f"{len(invalid_sev)} entries have severity numbers outside the standard 0–10 scale.",
                affected_entry_ids=json.dumps([e.id for e in invalid_sev]),
                suggested_action="Update severity to be within the 0 to 10 range."
            ))

        # 5. Symptoms Recorded Without Context (No triggers, sleep, food, etc.)
        no_ctx_entries = [e for e in entries if not e.contexts and not e.body_location]
        if len(no_ctx_entries) >= 5 and "missing_context" not in existing_issue_types:
            new_issues.append(DataQualityIssue(
                user_id=user_id,
                issue_type="missing_context",
                severity="info",
                description=f"{len(no_ctx_entries)} entries lack contextual tags (e.g., stress, sleep quality, food, or cycle phase).",
                affected_entry_ids=json.dumps([e.id for e in no_ctx_entries[:15]]),
                suggested_action="Add context factors to help identify possible associations between your daily routine and symptoms."
            ))

        # 6. Unconfirmed AI Extractions
        unconfirmed_ai = [e for e in entries if e.ai_extracted and not e.user_confirmed]
        if unconfirmed_ai and "unconfirmed_ai" not in existing_issue_types:
            new_issues.append(DataQualityIssue(
                user_id=user_id,
                issue_type="unconfirmed_ai",
                severity="warning",
                description=f"{len(unconfirmed_ai)} entries were parsed by natural-language AI and await your review.",
                affected_entry_ids=json.dumps([e.id for e in unconfirmed_ai]),
                suggested_action="Review and confirm AI proposed fields, or dismiss them to ensure only accurate data is retained."
            ))

        # 7. Long Logging Gaps (> 14 days)
        if len(entries) >= 2:
            sorted_dates = sorted(list(set(e.onset_date for e in entries)))
            max_gap = 0
            gap_start = None
            gap_end = None
            for idx in range(len(sorted_dates) - 1):
                try:
                    d1 = datetime.datetime.strptime(sorted_dates[idx], "%Y-%m-%d")
                    d2 = datetime.datetime.strptime(sorted_dates[idx + 1], "%Y-%m-%d")
                    gap_days = (d2 - d1).days
                    if gap_days > max_gap:
                        max_gap = gap_days
                        gap_start = sorted_dates[idx]
                        gap_end = sorted_dates[idx + 1]
                except Exception:
                    continue

            if max_gap >= 14 and "long_gap" not in existing_issue_types:
                new_issues.append(DataQualityIssue(
                    user_id=user_id,
                    issue_type="long_gap",
                    severity="info",
                    description=f"A gap of {max_gap} days with no symptom logs was detected between {gap_start} and {gap_end}.",
                    affected_entry_ids=json.dumps([]),
                    suggested_action="SignalBridge cannot determine whether you were symptom-free or paused logging. Consider noting periods of health in your journal."
                ))

        # 8. Conflicting Cycle Entries (e.g. overlapping periods)
        if len(cycles) >= 2:
            sorted_cycles = sorted(cycles, key=lambda c: c.period_start_date)
            cycle_conflicts = []
            for i in range(len(sorted_cycles) - 1):
                c1 = sorted_cycles[i]
                c2 = sorted_cycles[i + 1]
                if c1.period_end_date and c1.period_end_date >= c2.period_start_date:
                    cycle_conflicts.extend([c1.id, c2.id])
            if cycle_conflicts and "cycle_conflict" not in existing_issue_types:
                new_issues.append(DataQualityIssue(
                    user_id=user_id,
                    issue_type="cycle_conflict",
                    severity="warning",
                    description="Overlapping menstrual cycle dates detected in cycle records.",
                    affected_entry_ids=json.dumps(list(set(cycle_conflicts))),
                    suggested_action="Verify period start and end dates to ensure cycle length and phase calculations remain accurate."
                ))

        for issue in new_issues:
            db.add(issue)

        if new_issues:
            db.commit()
