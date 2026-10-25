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
        elevation_threshold: float = 1.5,
        min_baseline_records: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Flare-up detection with mathematically sound baseline separation:
        - Candidate flare-up records are strictly EXCLUDED from the baseline used to evaluate that window.
        - Baseline requires >= min_baseline_records (default 10) valid severity entries outside the candidate window.
        - Insufficient historical records produce an explicit 'insufficient_data' state.
        - Symptom entries missing numeric severity are safely excluded from average calculations.
        - Overlapping and contiguous candidate flare-up windows are merged into single cohesive episodes.
        - Returns full transparency: window dates, observation count, non-window baseline average, elevation, and exploratory rule disclaimer.
        """
        by_symptom = defaultdict(list)
        for e in all_entries:
            try:
                # Validate date
                AnalyticsEngine.parse_date(e.onset_date)
                by_symptom[e.symptom.name].append(e)
            except Exception:
                continue

        if not by_symptom:
            return []

        flare_ups = []

        for symptom_name, entries in by_symptom.items():
            valid_entries = [e for e in entries if e.severity is not None]
            
            # Sort entries chronologically
            sorted_entries = sorted(valid_entries, key=lambda x: (AnalyticsEngine.parse_date(x.onset_date), x.onset_time or "00:00"))

            if len(sorted_entries) == 0:
                flare_ups.append({
                    "symptom_name": symptom_name,
                    "status": "insufficient_data",
                    "message": "No records with numeric severity ratings (0-10) found for this symptom.",
                    "baseline_record_count": 0,
                    "min_required_records": min_baseline_records,
                    "disclaimer": "SignalBridge requires validated severity ratings to assess flare-up patterns."
                })
                continue

            # Slide rolling candidate window across entries
            raw_detected_windows = []
            cluster_with_insufficient_baseline_count = 0

            for i, current in enumerate(sorted_entries):
                curr_date = AnalyticsEngine.parse_date(current.onset_date)
                window_end = curr_date + datetime.timedelta(days=rolling_window_days - 1)

                # Candidate window entries
                window_entries = [
                    e for e in sorted_entries
                    if curr_date <= AnalyticsEngine.parse_date(e.onset_date) <= window_end
                ]
                distinct_window_days = set(e.onset_date for e in window_entries)

                if len(distinct_window_days) >= min_days_threshold:
                    # STRICT REQUIREMENT: Candidate flare-up records are EXCLUDED from the baseline
                    baseline_entries = [
                        e for e in sorted_entries
                        if not (curr_date <= AnalyticsEngine.parse_date(e.onset_date) <= window_end)
                    ]

                    if len(baseline_entries) < min_baseline_records:
                        # Record that a cluster occurred but baseline is insufficient to confirm elevation
                        cluster_with_insufficient_baseline_count += 1
                        continue

                    baseline_avg = statistics.mean([e.severity for e in baseline_entries])
                    window_avg_sev = statistics.mean([e.severity for e in window_entries])
                    elevation = window_avg_sev - baseline_avg

                    if elevation >= elevation_threshold:
                        raw_detected_windows.append({
                            "start_date": curr_date,
                            "end_date": window_end,
                            "active_days": len(distinct_window_days),
                            "window_entries": window_entries,
                            "window_average_severity": round(window_avg_sev, 2),
                            "baseline_severity": round(baseline_avg, 2),
                            "baseline_sample_size": len(baseline_entries),
                            "elevation": round(elevation, 2),
                        })

            if raw_detected_windows:
                # Merge overlapping / contiguous candidate windows sensibly
                merged_windows = []
                current_merged = raw_detected_windows[0]

                for nxt in raw_detected_windows[1:]:
                    # If windows overlap or touch within 1 day
                    if nxt["start_date"] <= current_merged["end_date"] + datetime.timedelta(days=1):
                        # Merge spans
                        merged_end = max(current_merged["end_date"], nxt["end_date"])
                        combined_entries_map = {e.id: e for e in (current_merged["window_entries"] + nxt["window_entries"])}
                        combined_entries = list(combined_entries_map.values())
                        
                        # Recalculate baseline excluding entire merged window
                        combined_start = current_merged["start_date"]
                        merged_baseline = [
                            e for e in sorted_entries
                            if not (combined_start <= AnalyticsEngine.parse_date(e.onset_date) <= merged_end)
                        ]
                        
                        m_base_avg = statistics.mean([e.severity for e in merged_baseline]) if len(merged_baseline) >= min_baseline_records else current_merged["baseline_severity"]
                        m_win_avg = statistics.mean([e.severity for e in combined_entries])
                        m_days = len(set(e.onset_date for e in combined_entries))

                        current_merged = {
                            "start_date": combined_start,
                            "end_date": merged_end,
                            "active_days": m_days,
                            "window_entries": combined_entries,
                            "window_average_severity": round(m_win_avg, 2),
                            "baseline_severity": round(m_base_avg, 2),
                            "baseline_sample_size": len(merged_baseline),
                            "elevation": round(m_win_avg - m_base_avg, 2)
                        }
                    else:
                        merged_windows.append(current_merged)
                        current_merged = nxt
                merged_windows.append(current_merged)

                # Format detected flare-up records
                for win in merged_windows:
                    flare_ups.append({
                        "symptom_name": symptom_name,
                        "status": "detected",
                        "start_date": win["start_date"].isoformat(),
                        "end_date": win["end_date"].isoformat(),
                        "active_days": win["active_days"],
                        "window_average_severity": win["window_average_severity"],
                        "baseline_severity": win["baseline_severity"],
                        "baseline_sample_size": win["baseline_sample_size"],
                        "elevation": win["elevation"],
                        "evidence_entry_ids": [e.id for e in win["window_entries"]],
                        "rule": f">= {min_days_threshold} days in 7-day window with average severity >= non-window baseline ({win['baseline_severity']}) + {elevation_threshold}",
                        "formula": "window_average_severity - non_window_baseline_average_severity",
                        "threshold": f"+{elevation_threshold} points above personal baseline (0-10 scale)",
                        "confidence_level": "moderate evidence",
                        "rule_type": "Exploratory application rule (not a clinical diagnostic threshold)",
                        "disclaimer": "A flare-up is an empirical mathematical frequency and severity cluster, not a medical diagnosis or disease relapse prediction."
                    })
            else:
                # Check if historical data was simply insufficient or if symptoms were evaluated and stable
                if len(sorted_entries) < min_baseline_records:
                    flare_ups.append({
                        "symptom_name": symptom_name,
                        "status": "insufficient_data",
                        "message": f"Not enough baseline data to assess a flare-up ({len(sorted_entries)} of {min_baseline_records} required records with severity).",
                        "baseline_record_count": len(sorted_entries),
                        "min_required_records": min_baseline_records,
                        "rule_type": "Exploratory application rule",
                        "disclaimer": "SignalBridge requires at least 10 historical records with severity outside candidate windows to establish an individual baseline."
                    })
                elif cluster_with_insufficient_baseline_count > 0:
                    baseline_avg = round(statistics.mean([e.severity for e in sorted_entries]), 2)
                    flare_ups.append({
                        "symptom_name": symptom_name,
                        "status": "insufficient_data",
                        "message": f"A symptom frequency cluster was observed, but historical records outside that window were insufficient (< {min_baseline_records}) to establish whether elevation exceeded your personal baseline.",
                        "baseline_record_count": len(sorted_entries),
                        "baseline_severity": baseline_avg,
                        "min_required_records": min_baseline_records,
                        "rule_type": "Exploratory application rule",
                        "disclaimer": "Exploratory mathematical rule: Candidate flare-up records are strictly excluded from the baseline used to evaluate that window."
                    })
                else:
                    baseline_avg = round(statistics.mean([e.severity for e in sorted_entries]), 2)
                    flare_ups.append({
                        "symptom_name": symptom_name,
                        "status": "no_flare_up",
                        "message": "No flare-up pattern detected in the evaluated period. Symptom levels remained consistent with personal baseline.",
                        "baseline_severity": baseline_avg,
                        "baseline_sample_size": len(sorted_entries),
                        "rule_type": "Exploratory application rule",
                        "disclaimer": "Descriptive aggregation based on logged records. No medical prediction is made."
                    })

        return flare_ups

    @staticmethod
    def calculate_correlations(all_entries: List[SymptomEntry]) -> List[Dict[str, Any]]:
        """
        Calculates P(symptom | context) = (days with both symptom and context) / (total days with context)
        """
        daily_map = defaultdict(lambda: {"symptoms": set(), "contexts": set(), "entries": []})

        for e in all_entries:
            daily_map[e.onset_date]["symptoms"].add(e.symptom.name)
            daily_map[e.onset_date]["entries"].append(e)
            for c in e.contexts:
                context_tag = f"{c.context_type}: {c.value}"
                daily_map[e.onset_date]["contexts"].add(context_tag)

        context_days_count = defaultdict(int)
        co_occurrence = defaultdict(int)
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
            if total_ctx_days >= 3:
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
                    "disclaimer": "Correlation does not imply causation. Temporal co-occurrence does not indicate a medical trigger or health risk."
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
        - Distinguishes valid numeric zero from missing data with explicit null checks.
        - Handles empty periods safely.
        - Calculates percentage change only when base severity > 0.
        """
        p1_sev = [e.severity for e in period1_entries if e.severity is not None]
        p2_sev = [e.severity for e in period2_entries if e.severity is not None]

        p1_avg = round(statistics.mean(p1_sev), 2) if len(p1_sev) > 0 else None
        p2_avg = round(statistics.mean(p2_sev), 2) if len(p2_sev) > 0 else None

        sev_abs_change = None
        sev_pct_change = None
        interpretation = "Insufficient severity data to compare between periods."

        if p1_avg is not None and p2_avg is not None:
            sev_abs_change = round(p1_avg - p2_avg, 2)
            if p2_avg > 0:
                sev_pct_change = round(((p1_avg - p2_avg) / p2_avg) * 100, 1)
                if sev_abs_change > 0.5:
                    interpretation = f"Average severity increased by {sev_abs_change} points (+{sev_pct_change}%)."
                elif sev_abs_change < -0.5:
                    interpretation = f"Average severity decreased by {abs(sev_abs_change)} points ({sev_pct_change}%)."
                else:
                    interpretation = "Average severity remained relatively stable (change within ±0.5 points)."
            elif p2_avg == 0.0 and p1_avg == 0.0:
                sev_pct_change = 0.0
                interpretation = "Both periods maintained average severity of 0.0 (asymptomatic/minimal)."
            else:
                sev_pct_change = None
                interpretation = f"Prior period baseline severity was 0.0; current average is {p1_avg}/10 (percentage change undefined from zero base)."
        elif p1_avg is not None and p2_avg is None:
            interpretation = f"Current period average is {p1_avg}/10; prior period has no severity records for comparison."
        elif p1_avg is None and p2_avg is not None:
            interpretation = f"Prior period average was {p2_avg}/10; current period has no severity records for comparison."

        return {
            "period1_label": period1_label,
            "period2_label": period2_label,
            "period1_records": len(period1_entries),
            "period2_records": len(period2_entries),
            "period1_rated_records": len(p1_sev),
            "period2_rated_records": len(p2_sev),
            "period1_avg_severity": p1_avg,
            "period2_avg_severity": p2_avg,
            "severity_absolute_change": sev_abs_change,
            "severity_percentage_change": sev_pct_change,
            "interpretation": interpretation,
            "evidence_p1_ids": [e.id for e in period1_entries],
            "evidence_p2_ids": [e.id for e in period2_entries]
        }

    @staticmethod
    def calculate_consultation_readiness(
        entries: List[SymptomEntry],
        medications: List[Any],
        cycles: List[Any],
        quality_issues: List[Any],
        profile: Optional[Any] = None,
        reports: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Consultation Readiness & Evidence Coverage Module:
        Evaluates the completeness, depth, and organization of logged health records
        to help users prepare for a clinical consultation.

        MEASURES DATA ORGANIZATION AND RECORD COMPLETENESS ONLY.
        Does NOT measure disease severity, clinical risk, diagnostic certainty,
        or the quality of a healthcare provider's care.
        """
        checklist = []

        # 1. Main symptoms recorded (at least 3 entries)
        sym_count = len(entries)
        distinct_symptoms = len(set(e.symptom.name for e in entries if e.symptom))
        checklist.append({
            "key": "symptoms_recorded",
            "title": "Symptom Log Frequency",
            "is_complete": sym_count >= 3,
            "status": "complete" if sym_count >= 3 else "pending",
            "available_summary": f"{sym_count} entries recorded across {distinct_symptoms} distinct symptom(s)." if sym_count > 0 else "No symptom records yet.",
            "missing_summary": None if sym_count >= 3 else f"Need at least 3 logs to establish observable patterns (currently {sym_count}).",
            "target_link": "/journal",
            "action_text": "Log Symptom"
        })

        # 2. Severity ratings coverage (>= 80% with 0-10 severity)
        valid_sev = [e for e in entries if e.severity is not None]
        sev_ratio = (len(valid_sev) / sym_count) if sym_count > 0 else 0.0
        checklist.append({
            "key": "severity_ratings",
            "title": "Severity Score Coverage",
            "is_complete": sym_count > 0 and sev_ratio >= 0.8,
            "status": "complete" if (sym_count > 0 and sev_ratio >= 0.8) else "pending",
            "available_summary": f"{len(valid_sev)} of {sym_count} entries have 0–10 severity ratings ({round(sev_ratio * 100)}%)." if sym_count > 0 else "No severity ratings recorded yet.",
            "missing_summary": None if (sym_count > 0 and sev_ratio >= 0.8) else f"{sym_count - len(valid_sev)} entry(ies) lack a severity rating.",
            "target_link": "/data-quality",
            "action_text": "Review Severity"
        })

        # 3. Timeline depth (spanning >= 3 distinct calendar days)
        distinct_days = len(set(e.onset_date for e in entries))
        checklist.append({
            "key": "timeline_depth",
            "title": "Chronological Timeline Span",
            "is_complete": distinct_days >= 3,
            "status": "complete" if distinct_days >= 3 else "pending",
            "available_summary": f"Logs span {distinct_days} distinct calendar date(s)." if distinct_days > 0 else "No dated entries yet.",
            "missing_summary": None if distinct_days >= 3 else f"Timeline covers {distinct_days} day(s); logging across multiple days helps clinicians see temporal trends.",
            "target_link": "/timeline",
            "action_text": "View Timeline"
        })

        # 4. Medication documentation
        med_count = len(medications)
        checklist.append({
            "key": "medications_documented",
            "title": "Medication & Supplement History",
            "is_complete": med_count > 0,
            "status": "complete" if med_count > 0 else "pending",
            "available_summary": f"{med_count} medication(s) or supplement(s) recorded." if med_count > 0 else "No medications recorded.",
            "missing_summary": None if med_count > 0 else "Listing active medications or supplements helps your clinician check for interactions.",
            "target_link": "/medications",
            "action_text": "Manage Medications"
        })

        # 5. Cycle tracking or hormonal context
        cycle_enabled = profile.cycle_tracking_enabled if profile else False
        cycle_count = len(cycles)
        cycle_complete = (cycle_count > 0) if cycle_enabled else True
        checklist.append({
            "key": "cycle_context",
            "title": "Menstrual Cycle / Hormonal Context",
            "is_complete": cycle_complete,
            "status": "complete" if cycle_complete else "pending",
            "available_summary": f"{cycle_count} cycle record(s) logged." if cycle_enabled else "Cycle tracking not enabled for your profile (marked non-applicable).",
            "missing_summary": None if cycle_complete else "Cycle tracking is enabled but no cycle records have been logged yet.",
            "target_link": "/cycles",
            "action_text": "Update Cycles"
        })

        # 6. Critical data quality warnings resolved
        open_critical_issues = [q for q in quality_issues if getattr(q, 'status', 'open') == 'open' and getattr(q, 'severity', '') == 'critical']
        checklist.append({
            "key": "data_quality_resolved",
            "title": "Data Integrity & Chronological Validity",
            "is_complete": len(open_critical_issues) == 0,
            "status": "complete" if len(open_critical_issues) == 0 else "pending",
            "available_summary": "Zero critical date or format conflicts." if len(open_critical_issues) == 0 else f"{len(open_critical_issues)} critical data quality warning(s) unresolved.",
            "missing_summary": None if len(open_critical_issues) == 0 else "Resolve reversed dates or format anomalies to keep clinical reports accurate.",
            "target_link": "/data-quality",
            "action_text": "Resolve Issues"
        })

        # 7. Consultation summary report generated
        report_count = len(reports) if reports is not None else 0
        checklist.append({
            "key": "report_ready",
            "title": "Clinical Summary Report Draft",
            "is_complete": report_count > 0 or sym_count >= 1,
            "status": "complete" if (report_count > 0 or sym_count >= 1) else "pending",
            "available_summary": f"{report_count} report(s) drafted." if report_count > 0 else ("Ready to generate report from existing logs." if sym_count >= 1 else "Awaiting symptom records before report generation."),
            "missing_summary": None if (report_count > 0 or sym_count >= 1) else "Log at least one symptom to generate a consultation summary.",
            "target_link": "/reports",
            "action_text": "Generate Report"
        })

        # Calculate coverage score
        completed_count = sum(1 for item in checklist if item["is_complete"])
        total_items = len(checklist)
        completeness_pct = round((completed_count / total_items) * 100)

        readiness_tier = (
            "Well Prepared" if completeness_pct >= 85 else
            "Moderate Coverage" if completeness_pct >= 55 else
            "Initial Stage"
        )

        # Practical next steps
        practical_steps = []
        for item in checklist:
            if not item["is_complete"]:
                practical_steps.append({
                    "task": item["missing_summary"] or item["title"],
                    "link": item["target_link"],
                    "action_text": item["action_text"]
                })

        return {
            "readiness_tier": readiness_tier,
            "completeness_percentage": completeness_pct,
            "completed_criteria_count": completed_count,
            "total_criteria_count": total_items,
            "calculation_formula": f"completed_criteria ({completed_count}) / total_criteria ({total_items}) * 100",
            "summary_statement": f"You have completed {completed_count} of {total_items} information organization checkpoints ({completeness_pct}% coverage).",
            "checklist": checklist,
            "practical_next_steps": practical_steps[:3],
            "disclaimer": (
                "Consultation Readiness measures the organization, completeness, and documentation depth "
                "of your entered health journal records. It is NOT an assessment of your physical health, "
                "disease severity, medical risk, or clinical prognosis."
            )
        }

    @staticmethod
    def generate_dynamic_insights(
        entries: List[SymptomEntry],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Dynamically computes evidence-linked insights directly from verified user records.
        Every insight includes:
        - Symptom or context analyzed
        - Selected date range
        - Number of records vs distinct symptom days
        - Calculation method & formula
        - Resulting statistic
        - Comparison values
        - Traceable supporting journal record IDs
        - Missing-data limitations & disclaimers
        - Plain-language explanation
        """
        if not entries:
            return []

        today = datetime.date.today()
        if not end_date:
            end_date = today.isoformat()
        if not start_date:
            start_date = (today - datetime.timedelta(days=90)).isoformat()

        # Filter active period entries
        period_entries = [e for e in entries if start_date <= e.onset_date <= end_date]
        if not period_entries:
            period_entries = entries

        insights: List[Dict[str, Any]] = []

        # 1. Frequency Insight: Most frequent symptom
        freqs = AnalyticsEngine.calculate_frequency(period_entries, start_date, end_date)
        if freqs:
            top_freq = freqs[0]
            if top_freq["distinct_days_count"] >= 1:
                insights.append({
                    "id": 1001,
                    "insight_type": "frequency",
                    "title": f"Frequency Analysis: {top_freq['symptom_name']}",
                    "symptom_or_context": top_freq["symptom_name"],
                    "date_range": f"{start_date} to {end_date}",
                    "description": (
                        f"{top_freq['symptom_name']} was recorded on {top_freq['distinct_days_count']} distinct calendar day(s) "
                        f"across {top_freq['total_records_count']} individual log(s) over the {top_freq['period_total_days']}-day window "
                        f"({top_freq['frequency_percentage']}% of days)."
                    ),
                    "evidence_entry_ids": top_freq["evidence_entry_ids"],
                    "calculation_metadata": {
                        "formula": top_freq["calculation_formula"],
                        "resulting_statistic": f"{top_freq['frequency_percentage']}%",
                        "distinct_days_count": top_freq["distinct_days_count"],
                        "total_records_count": top_freq["total_records_count"],
                        "period_total_days": top_freq["period_total_days"],
                        "comparison_values": f"Across {len(freqs)} recorded symptoms",
                        "missing_summary": top_freq["limitations"],
                        "confidence_level": top_freq["confidence_level"]
                    },
                    "confidence_level": top_freq["confidence_level"],
                    "status": "active",
                    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                })

        # 2. Period Comparison Insight: Severity shift
        d_start = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
        d_end = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
        duration_days = max(1, (d_end - d_start).days + 1)
        prior_end = d_start - datetime.timedelta(days=1)
        prior_start = prior_end - datetime.timedelta(days=duration_days - 1)

        prior_entries = [
            e for e in entries
            if prior_start.isoformat() <= e.onset_date <= prior_end.isoformat()
        ]

        comp = AnalyticsEngine.compare_periods(
            period_entries,
            prior_entries,
            f"{start_date} to {end_date}",
            f"{prior_start.isoformat()} to {prior_end.isoformat()}"
        )

        if comp["period1_avg_severity"] is not None:
            insights.append({
                "id": 1002,
                "insight_type": "trend",
                "title": "Period-Over-Period Severity Trend",
                "symptom_or_context": "Overall Severity Rating",
                "date_range": f"{start_date} to {end_date} vs {prior_start.isoformat()} to {prior_end.isoformat()}",
                "description": comp["interpretation"],
                "evidence_entry_ids": comp["evidence_p1_ids"] + comp["evidence_p2_ids"],
                "calculation_metadata": {
                    "formula": "current_period_average_severity - prior_period_average_severity",
                    "resulting_statistic": f"{comp['period1_avg_severity']}/10 (current)",
                    "comparison_values": f"Prior: {comp['period2_avg_severity']}/10" if comp['period2_avg_severity'] is not None else "Prior: No records",
                    "absolute_change": comp["severity_absolute_change"],
                    "percentage_change": comp["severity_percentage_change"],
                    "distinct_days_count": len(set(e.onset_date for e in period_entries)),
                    "total_records_count": len(period_entries),
                    "missing_summary": "Only logs with verified 0-10 severity ratings are averaged.",
                    "confidence_level": "moderate evidence" if comp["period1_rated_records"] >= 5 else "preliminary evidence"
                },
                "confidence_level": "moderate evidence" if comp["period1_rated_records"] >= 5 else "preliminary evidence",
                "status": "active",
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })

        # 3. Flare-Up Clusters
        flare_ups = AnalyticsEngine.detect_flare_ups(entries)
        detected_flares = [f for f in flare_ups if f.get("status") == "detected"]
        for idx, fl in enumerate(detected_flares[:2]):
            insights.append({
                "id": 1003 + idx,
                "insight_type": "flare_up",
                "title": f"Elevated Flare-Up Cluster: {fl['symptom_name']}",
                "symptom_or_context": fl["symptom_name"],
                "date_range": f"{fl['start_date']} to {fl['end_date']}",
                "description": (
                    f"A cluster of {fl['active_days']} active days was detected with average severity {fl['window_average_severity']}/10, "
                    f"exceeding your non-window personal baseline ({fl['baseline_severity']}/10) by +{fl['elevation']} points."
                ),
                "evidence_entry_ids": fl.get("evidence_entry_ids", []),
                "calculation_metadata": {
                    "formula": fl.get("formula", "window_avg - non_window_baseline_avg"),
                    "resulting_statistic": f"+{fl['elevation']} points above baseline",
                    "comparison_values": f"Baseline: {fl['baseline_severity']}/10 (N={fl['baseline_sample_size']})",
                    "threshold": fl.get("threshold"),
                    "rule_type": fl.get("rule_type"),
                    "missing_summary": "Candidate flare-up records were strictly excluded from the baseline used to evaluate this window.",
                    "confidence_level": fl.get("confidence_level", "moderate evidence")
                },
                "confidence_level": fl.get("confidence_level", "moderate evidence"),
                "status": "active",
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })

        # 4. Context Association (Correlation)
        corrs = AnalyticsEngine.calculate_correlations(entries)
        if corrs:
            top_corr = corrs[0]
            insights.append({
                "id": 1005,
                "insight_type": "correlation",
                "title": f"Context Association: {top_corr['symptom']} with {top_corr['context']}",
                "symptom_or_context": f"{top_corr['symptom']} & {top_corr['context']}",
                "date_range": "All-time recorded history",
                "description": (
                    f"On days when '{top_corr['context']}' was recorded, '{top_corr['symptom']}' co-occurred "
                    f"in {top_corr['percentage']}% of cases ({top_corr['both_days_count']} of {top_corr['total_context_days']} context days). "
                    "Note: Co-occurrence indicates observational association, NOT medical causation."
                ),
                "evidence_entry_ids": top_corr["evidence_entry_ids"],
                "calculation_metadata": {
                    "formula": top_corr["formula"],
                    "resulting_statistic": f"{top_corr['percentage']}% co-occurrence",
                    "comparison_values": f"{top_corr['both_days_count']} co-occurring days / {top_corr['total_context_days']} context days",
                    "missing_summary": "Days without contextual tags cannot be assessed for associations.",
                    "disclaimer": "Association does not establish causation. Discuss patterns with your clinician.",
                    "confidence_level": "moderate evidence" if top_corr["total_context_days"] >= 5 else "preliminary evidence"
                },
                "confidence_level": "moderate evidence" if top_corr["total_context_days"] >= 5 else "preliminary evidence",
                "status": "active",
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })

        return insights


