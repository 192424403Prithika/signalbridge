import datetime
import statistics
from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.models import SymptomEntry, EntryContext

class AnalyticsEngine:
    @staticmethod
    def parse_date(date_str: str) -> datetime.date:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()

    @staticmethod
    def calculate_frequency(entries: List[SymptomEntry], start_date_str: str, end_date_str: str) -> List[Dict[str, Any]]:
        """
        frequency = (number of days with recorded symptom) / (number of days in selected period)
        Returns evidence-backed metrics per symptom.
        """
        start_d = AnalyticsEngine.parse_date(start_date_str)
        end_d = AnalyticsEngine.parse_date(end_date_str)
        total_period_days = max(1, (end_d - start_d).days + 1)

        symptom_groups = defaultdict(list)
        for e in entries:
            try:
                entry_d = AnalyticsEngine.parse_date(e.onset_date)
                if start_d <= entry_d <= end_d:
                    symptom_groups[e.symptom.name].append(e)
            except Exception:
                continue

        results = []
        for symptom_name, group_entries in symptom_groups.items():
            distinct_days = set(e.onset_date for e in group_entries)
            days_count = len(distinct_days)
            freq_rate = round(days_count / total_period_days, 4)
            record_ids = [e.id for e in group_entries]

            results.append({
                "symptom_name": symptom_name,
                "category": group_entries[0].symptom.category if group_entries else "General",
                "frequency_rate": freq_rate,
                "frequency_percentage": round(freq_rate * 100, 1),
                "distinct_days_count": days_count,
                "total_records_count": len(group_entries),
                "period_total_days": total_period_days,
                "evidence_entry_ids": record_ids,
                "calculation_formula": f"distinct_days ({days_count}) / total_period_days ({total_period_days})",
                "limitations": "Only days with user-logged entries are counted. Unlogged days cannot be confirmed as symptom-free.",
                "confidence_level": "high evidence" if len(group_entries) >= 5 else "low evidence"
            })

        results.sort(key=lambda x: x["frequency_rate"], reverse=True)
        return results

    @staticmethod
    def calculate_severity_metrics(entries: List[SymptomEntry]) -> Dict[str, Any]:
        """
        Calculates average, median, min, max, and latest severity.
        Excludes entries with missing severity and reports counts transparently.
        """
        valid_entries = [e for e in entries if e.severity is not None]
        excluded_count = len(entries) - len(valid_entries)

        if not valid_entries:
            return {
                "has_data": False,
                "sample_size": 0,
                "excluded_count": excluded_count,
                "exclusion_reason": "No severity rating provided (scale 0-10)",
                "average": None,
                "median": None,
                "min": None,
                "max": None,
                "latest": None,
                "trend": "insufficient_data"
            }

        severities = [e.severity for e in valid_entries]
        sorted_by_date = sorted(valid_entries, key=lambda x: (x.onset_date, x.onset_time or "00:00"))
        latest_entry = sorted_by_date[-1]

        avg_val = round(statistics.mean(severities), 2)
        med_val = round(statistics.median(severities), 2)
        min_val = min(severities)
        max_val = max(severities)

        # Trend: first half vs second half if >= 4 entries
        trend = "stable"
        if len(sorted_by_date) >= 4:
            mid = len(sorted_by_date) // 2
            first_half_avg = statistics.mean([e.severity for e in sorted_by_date[:mid]])
            second_half_avg = statistics.mean([e.severity for e in sorted_by_date[mid:]])
            diff = second_half_avg - first_half_avg
            if diff >= 1.0:
                trend = "increasing"
            elif diff <= -1.0:
                trend = "decreasing"

        return {
            "has_data": True,
            "sample_size": len(valid_entries),
            "excluded_count": excluded_count,
            "exclusion_reason": "Severity was unrecorded" if excluded_count > 0 else None,
            "average": avg_val,
            "median": med_val,
            "min": min_val,
            "max": max_val,
            "latest": latest_entry.severity,
            "latest_date": latest_entry.onset_date,
            "trend": trend,
            "contributing_entry_ids": [e.id for e in valid_entries],
            "calculation_formula": "Standard arithmetic mean & median of validated 0-10 severity entries"
        }

    @staticmethod
    def calculate_duration_metrics(entries: List[SymptomEntry]) -> Dict[str, Any]:
        """
        Calculates average, median, min, and max duration in minutes.
        Treats missing durations as 'unknown', not zero.
        """
        valid_entries = [e for e in entries if e.duration_minutes is not None and e.duration_minutes > 0]
        unknown_count = len(entries) - len(valid_entries)

        if not valid_entries:
            return {
                "has_data": False,
                "sample_size": 0,
                "unknown_count": unknown_count,
                "average_minutes": None,
                "median_minutes": None,
                "shortest_minutes": None,
                "longest_minutes": None,
                "calculation_notes": "All durations were marked unknown or unrecorded."
            }

        durations = [e.duration_minutes for e in valid_entries]
        return {
            "has_data": True,
            "sample_size": len(valid_entries),
            "unknown_count": unknown_count,
            "average_minutes": round(statistics.mean(durations), 1),
            "median_minutes": round(statistics.median(durations), 1),
            "shortest_minutes": min(durations),
            "longest_minutes": max(durations),
            "contributing_entry_ids": [e.id for e in valid_entries],
            "calculation_notes": f"{unknown_count} entries had unspecified duration and were labeled 'unknown', not zero."
        }

    @staticmethod
    def detect_flare_ups(
        all_entries: List[SymptomEntry],
        baseline_days: int = 90,
        rolling_window_days: int = 7,
        min_days_threshold: int = 3,
        elevation_threshold: float = 1.5
    ) -> List[Dict[str, Any]]:
        """
        Flare-up definition:
        - Recorded on >= 3 days within rolling 7-day window.
        - Average severity above personal baseline by elevation_threshold (default +1.5).
        - If baseline history < 10 records, display 'Not enough data to determine a flare-up.'
        """
        by_symptom = defaultdict(list)
        for e in all_entries:
            by_symptom[e.symptom.name].append(e)

        flare_ups = []

        for symptom_name, entries in by_symptom.items():
            valid_entries = [e for e in entries if e.severity is not None]
            if len(valid_entries) < 10:
                flare_ups.append({
                    "symptom_name": symptom_name,
                    "status": "insufficient_data",
                    "message": "Not enough data to determine a flare-up (requires >= 10 baseline records with severity).",
                    "baseline_record_count": len(valid_entries)
                })
                continue

            # Sort entries by onset date
            sorted_entries = sorted(valid_entries, key=lambda x: AnalyticsEngine.parse_date(x.onset_date))
            baseline_avg = statistics.mean([e.severity for e in sorted_entries])

            # Rolling 7-day window check
            detected_windows = []
            for i, current in enumerate(sorted_entries):
                curr_date = AnalyticsEngine.parse_date(current.onset_date)
                window_end = curr_date + datetime.timedelta(days=rolling_window_days - 1)
                window_entries = [
                    e for e in sorted_entries
                    if curr_date <= AnalyticsEngine.parse_date(e.onset_date) <= window_end
                ]
                distinct_window_days = set(e.onset_date for e in window_entries)

                if len(distinct_window_days) >= min_days_threshold:
                    window_avg_sev = statistics.mean([e.severity for e in window_entries])
                    if window_avg_sev >= (baseline_avg + elevation_threshold):
                        detected_windows.append({
                            "start_date": curr_date.isoformat(),
                            "end_date": window_end.isoformat(),
                            "active_days": len(distinct_window_days),
                            "window_average_severity": round(window_avg_sev, 2),
                            "baseline_severity": round(baseline_avg, 2),
                            "elevation": round(window_avg_sev - baseline_avg, 2),
                            "evidence_entry_ids": [e.id for e in window_entries]
                        })

            if detected_windows:
                # Merge overlapping windows if any, take latest
                latest = detected_windows[-1]
                flare_ups.append({
                    "symptom_name": symptom_name,
                    "status": "detected",
                    "start_date": latest["start_date"],
                    "end_date": latest["end_date"],
                    "active_days": latest["active_days"],
                    "window_average_severity": latest["window_average_severity"],
                    "baseline_severity": latest["baseline_severity"],
                    "elevation": latest["elevation"],
                    "evidence_entry_ids": latest["evidence_entry_ids"],
                    "rule": f">= {min_days_threshold} days in 7-day window and severity >= baseline ({latest['baseline_severity']}) + {elevation_threshold}",
                    "confidence_level": "moderate evidence",
                    "disclaimer": "A flare-up is a mathematical pattern of increased frequency and severity, not a diagnostic finding."
                })

        return flare_ups

    @staticmethod
    def calculate_correlations(all_entries: List[SymptomEntry]) -> List[Dict[str, Any]]:
        """
        Calculates P(symptom | context) = (days with both symptom and context) / (total days with context)
        """
        # Map: date -> {symptoms: set(), contexts: set(), entries: []}
        daily_map = defaultdict(lambda: {"symptoms": set(), "contexts": set(), "entries": []})

        for e in all_entries:
            daily_map[e.onset_date]["symptoms"].add(e.symptom.name)
            daily_map[e.onset_date]["entries"].append(e)
            for c in e.contexts:
                context_tag = f"{c.context_type}: {c.value}"
                daily_map[e.onset_date]["contexts"].add(context_tag)

        # Context frequencies
        context_days_count = defaultdict(int)
        co_occurrence = defaultdict(int)  # (symptom, context) -> count
        evidence_map = defaultdict(list)

        for date_str, data in daily_map.items():
            for ctx in data["contexts"]:
                context_days_count[ctx] += 1
                for sym in data["symptoms"]:
                    co_occurrence[(sym, ctx)] += 1
                    evidence_map[(sym, ctx)].extend([e.id for e in data["entries"] if e.symptom.name == sym])

        correlations = []
        for (sym, ctx), both_days in co_occurrence.items():
            total_ctx_days = context_days_count[ctx]
            if total_ctx_days >= 3:  # minimum context occurrences for meaningful percentage
                conditional_prob = round(both_days / total_ctx_days, 3)
                correlations.append({
                    "symptom": sym,
                    "context": ctx,
                    "both_days_count": both_days,
                    "total_context_days": total_ctx_days,
                    "conditional_probability": conditional_prob,
                    "percentage": round(conditional_prob * 100, 1),
                    "evidence_entry_ids": list(set(evidence_map[(sym, ctx)])),
                    "formula": f"days_with_both ({both_days}) / days_with_context ({total_ctx_days})",
                    "disclaimer": "Correlation does not imply causation. Temporal co-occurrence does not indicate a medical trigger."
                })

        correlations.sort(key=lambda x: x["conditional_probability"], reverse=True)
        return correlations

    @staticmethod
    def compare_periods(
        period1_entries: List[SymptomEntry],
        period2_entries: List[SymptomEntry],
        period1_label: str = "Current Period",
        period2_label: str = "Prior Period"
    ) -> Dict[str, Any]:
        """
        Compares severity and frequency between two periods.
        Calculates absolute change and percentage change only when base > 0.
        """
        p1_sev = [e.severity for e in period1_entries if e.severity is not None]
        p2_sev = [e.severity for e in period2_entries if e.severity is not None]

        p1_avg = round(statistics.mean(p1_sev), 2) if p1_sev else None
        p2_avg = round(statistics.mean(p2_sev), 2) if p2_sev else None

        sev_abs_change = round(p1_avg - p2_avg, 2) if (p1_avg is not None and p2_avg is not None) else None
        sev_pct_change = round(((p1_avg - p2_avg) / p2_avg) * 100, 1) if (p1_avg is not None and p2_avg is not None and p2_avg > 0) else None

        return {
            "period1_label": period1_label,
            "period2_label": period2_label,
            "period1_records": len(period1_entries),
            "period2_records": len(period2_entries),
            "period1_avg_severity": p1_avg,
            "period2_avg_severity": p2_avg,
            "severity_absolute_change": sev_abs_change,
            "severity_percentage_change": sev_pct_change,
            "interpretation": (
                "Severity increased" if (sev_abs_change and sev_abs_change > 0.5) else
                "Severity decreased" if (sev_abs_change and sev_abs_change < -0.5) else
                "Severity remained relatively stable"
            ) if sev_abs_change is not None else "Insufficient severity data to compare",
            "evidence_p1_ids": [e.id for e in period1_entries],
            "evidence_p2_ids": [e.id for e in period2_entries]
        }
