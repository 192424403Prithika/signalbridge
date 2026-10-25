import datetime
import random
import json
from sqlalchemy.orm import Session
from app.models import (
    User, HealthProfile, Symptom, SymptomEntry, EntryContext, Tag,
    Medication, MedicationLog, Cycle, Insight, DataQualityIssue,
    Report, Appointment
)
from app.services.auth_service import get_password_hash
from app.services.data_quality_engine import DataQualityEngine
from app.services.analytics_engine import AnalyticsEngine
from app.services.report_generator import ReportGenerator

TAXONOMY_SEEDS = [
    {"name": "Headache", "category": "Pain", "description": "Pain located in the head, temples, or neck.", "urgency": False},
    {"name": "Fatigue", "category": "Systemic", "description": "Persistent tiredness or physical/mental exhaustion.", "urgency": False},
    {"name": "Abdominal Pain", "category": "Digestive", "description": "Discomfort or pain located in the mid or upper stomach area.", "urgency": False},
    {"name": "Pelvic Cramps", "category": "Menstrual", "description": "Cramping or aching sensations in the lower pelvis.", "urgency": False},
    {"name": "Bloating", "category": "Digestive", "description": "Sensation of abdominal tightness, swelling, or gas fullness.", "urgency": False},
    {"name": "Sleep Difficulty", "category": "Sleep", "description": "Difficulty falling asleep, waking frequently, or non-restorative rest.", "urgency": False},
    {"name": "Mood Changes", "category": "Mood", "description": "Shifts in emotional state, irritability, tearfulness, or heightened anxiety.", "urgency": False},
    {"name": "Joint Pain", "category": "Pain", "description": "Stiffness, aching, or soreness in joints.", "urgency": False},
    {"name": "Nausea", "category": "Digestive", "description": "Feeling of sickness with an inclination to vomit.", "urgency": False},
    {"name": "Hot Flashes", "category": "Systemic", "description": "Sudden intense feeling of heat, often with sweating or flushing.", "urgency": False},
    {"name": "Brain Fog", "category": "Neurological", "description": "Sluggish thinking, forgetfulness, or difficulty concentrating.", "urgency": False},
    {"name": "Breast Tenderness", "category": "Menstrual", "description": "Soreness, fullness, or sensitivity in breast tissue.", "urgency": False},
    {"name": "Severe Sudden Chest Pain", "category": "Systemic", "description": "Intense sudden chest pain or acute shortness of breath (urgent medical evaluation recommended).", "urgency": True}
]

def seed_database(db: Session, force_reseed: bool = False):
    """
    Seeds initial taxonomy and the complete 90-day synthetic demo dataset covering
    every requested symptom:
    - Headache
    - Fatigue
    - Abdominal pain
    - Bloating
    - Sleep difficulty
    - Mood changes
    - Joint pain
    - Nausea
    - Pelvic cramps
    - Hot flashes
    - Breast tenderness
    Along with cycles, medications, adherence logs, data quality issues, and consultation reports.
    """
    # 1. Seed Taxonomy
    existing_symptoms = {s.name: s for s in db.query(Symptom).all()}
    sym_map = {}

    for item in TAXONOMY_SEEDS:
        if item["name"] not in existing_symptoms:
            sym = Symptom(
                name=item["name"],
                category=item["category"],
                description=item["description"],
                is_custom=False,
                urgency_flag=item["urgency"]
            )
            db.add(sym)
            db.flush()
            sym_map[item["name"]] = sym.id
        else:
            sym_map[item["name"]] = existing_symptoms[item["name"]].id

    db.commit()

    # 2. Seed Admin User
    admin = db.query(User).filter(User.email == "admin@signalbridge.health").first()
    if not admin:
        admin = User(
            email="admin@signalbridge.health",
            hashed_password=get_password_hash("AdminPass123!"),
            full_name="SignalBridge System Admin",
            role="admin",
            email_verified=True,
            ai_consent=False
        )
        db.add(admin)
        db.commit()

    # 3. Seed / Reseed Demo User
    demo_user = db.query(User).filter(User.email == "demo@signalbridge.health").first()
    if demo_user and force_reseed:
        db.delete(demo_user)
        db.commit()
        demo_user = None

    if not demo_user:
        demo_user = User(
            email="demo@signalbridge.health",
            hashed_password=get_password_hash("DemoUser123!"),
            full_name="Maya Lin (Synthetic Demo Account)",
            role="guest",
            email_verified=True,
            privacy_settings_json=json.dumps({
                "data_sharing": False,
                "sensitive_categories_opt_in": True,
                "export_restricted": False,
                "is_synthetic_demo": True
            }),
            ai_consent=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        # Health Profile
        demo_profile = HealthProfile(
            user_id=demo_user.id,
            preferred_name="Maya",
            pronouns="she/her",
            date_of_birth="1994-06-15",
            age_range="25-34",
            biological_sex="Female",
            gender_identity="Woman",
            cycle_tracking_enabled=True,
            average_cycle_length=28,
            typical_period_duration=5,
            allergies="Penicillin (mild urticaria)",
            long_term_conditions="Mild episodic migraine, seasonal allergies",
            emergency_contact="Alex Lin (Partner) - 555-0192",
            consent_acknowledged=True
        )
        db.add(demo_profile)

        # Tags
        tag_defs = [
            ("work-stress", "#f0b4bd"),
            ("poor-sleep", "#c084fc"),
            ("high-caffeine", "#618a70"),
            ("luteal-phase", "#d75f75"),
            ("menstrual", "#a33148"),
            ("digestive-trigger", "#80a58d")
        ]
        created_tags = {}
        for tname, tcolor in tag_defs:
            t = Tag(user_id=demo_user.id, name=tname, color=tcolor)
            db.add(t)
            db.flush()
            created_tags[tname] = t

        # Medications
        today = datetime.date.today()
        magnesium = Medication(
            user_id=demo_user.id,
            name="Magnesium Glycinate",
            dosage="200 mg",
            frequency="Once daily at bedtime",
            start_date=(today - datetime.timedelta(days=75)).isoformat(),
            purpose="Sleep quality, muscle relaxation & migraine prophylaxis",
            notes="Over-the-counter dietary supplement",
            is_active=True
        )
        iron = Medication(
            user_id=demo_user.id,
            name="Iron Ferrous Bisglycinate",
            dosage="25 mg",
            frequency="Alternate days with breakfast",
            start_date=(today - datetime.timedelta(days=60)).isoformat(),
            purpose="Ferritin support for mild fatigue",
            notes="Prescribed after annual bloodwork",
            is_active=True
        )
        db.add_all([magnesium, iron])
        db.commit()

        # Cycles across 90 days (3 complete past cycles)
        cycle_starts = [
            today - datetime.timedelta(days=82),
            today - datetime.timedelta(days=54),
            today - datetime.timedelta(days=26),
        ]
        for c_start in cycle_starts:
            c_end = c_start + datetime.timedelta(days=5)
            db.add(Cycle(
                user_id=demo_user.id,
                period_start_date=c_start.isoformat(),
                period_end_date=c_end.isoformat(),
                flow_intensity="medium",
                cycle_length=28,
                notes="Synthetic cycle entry for demonstration"
            ))
        db.commit()

        # Deterministic random generator for realistic 90-day trajectory
        rnd = random.Random(1337)

        # -------------------------------------------------------------
        # SEED EVERY SINGLE REQUESTED DEMO SYMPTOM:
        # 1. Headache
        # 2. Fatigue
        # 3. Abdominal Pain
        # 4. Bloating
        # 5. Sleep Difficulty
        # 6. Mood Changes
        # 7. Joint Pain
        # 8. Nausea
        # Plus: Pelvic Cramps, Breast Tenderness, Hot Flashes
        # -------------------------------------------------------------

        for day_offset in range(90, 0, -1):
            curr_date = today - datetime.timedelta(days=day_offset)
            date_str = curr_date.isoformat()
            days_from_cycle = (curr_date - cycle_starts[-1]).days % 28

            # Determine cycle phase
            if days_from_cycle in [0, 1, 2, 3, 4]:
                phase = "menstrual"
            elif 5 <= days_from_cycle <= 12:
                phase = "follicular"
            elif 13 <= days_from_cycle <= 15:
                phase = "ovulation"
            else:
                phase = "luteal"

            # 1. PELVIC CRAMPS: Menstrual days & late luteal
            if phase == "menstrual" or days_from_cycle in [26, 27]:
                sev = rnd.choice([5, 6, 7, 8]) if phase == "menstrual" else rnd.choice([3, 4, 5])
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Pelvic Cramps"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(20, 15)),
                    onset_date=date_str,
                    onset_time="20:15",
                    duration_minutes=rnd.choice([120, 180, 240]),
                    severity=sev,
                    body_location="Lower pelvis / uterine",
                    notes="Aching lower pelvic cramps; applied heating pad.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase=phase
                )
                db.add(e)

            # 2. BLOATING: Luteal phase and menstrual onset
            if (phase == "luteal" and days_from_cycle >= 20) or (phase == "menstrual" and days_from_cycle <= 2):
                if rnd.random() > 0.35:
                    e = SymptomEntry(
                        user_id=demo_user.id,
                        symptom_id=sym_map["Bloating"],
                        recorded_at=datetime.datetime.combine(curr_date, datetime.time(21, 0)),
                        onset_date=date_str,
                        onset_time="21:00",
                        duration_minutes=rnd.choice([180, 300, 360]),
                        severity=rnd.choice([4, 5, 6, 7]),
                        body_location="Abdomen",
                        notes="Abdominal tightness and distension after evening meal.",
                        source_type="structured",
                        ai_extracted=False,
                        user_confirmed=True,
                        cycle_phase=phase
                    )
                    db.add(e)

            # 3. FATIGUE: Scattered weekdays with stress correlation
            if curr_date.weekday() in [1, 3] and rnd.random() > 0.3:
                has_stress = rnd.random() > 0.4
                sev = rnd.choice([6, 7, 8]) if has_stress else rnd.choice([3, 4, 5])
                # Deliberate test case: leave day 22 and day 58 without severity
                if day_offset in [22, 58]:
                    sev = None

                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Fatigue"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(15, 30)),
                    onset_date=date_str,
                    onset_time="15:30",
                    duration_minutes=rnd.choice([180, 240, 360, None]),
                    severity=sev,
                    body_location="Generalized",
                    notes="Sluggishness and afternoon energy drop during workday.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase=phase
                )
                db.add(e)
                db.flush()

                if has_stress:
                    db.add(EntryContext(
                        symptom_entry_id=e.id,
                        context_type="stress",
                        value="high",
                        notes="Work deadlines"
                    ))

            # 4. HEADACHE: Cluster between day 42 and 48 (Creates proven Flare-Up!)
            if (42 <= day_offset <= 48) or (day_offset in [15, 30, 72]):
                sev = rnd.choice([7, 8, 9]) if (42 <= day_offset <= 48) else rnd.choice([4, 5, 6])
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Headache"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(16, 0)),
                    onset_date=date_str,
                    onset_time="16:00",
                    duration_minutes=rnd.choice([180, 240, 360]),
                    severity=sev,
                    body_location="Left temple / frontal forehead",
                    notes="Throbbing tension headache; sensitive to screen light.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase=phase
                )
                db.add(e)
                db.flush()
                db.add(EntryContext(
                    symptom_entry_id=e.id,
                    context_type="sleep",
                    value="poor",
                    notes="Interrupted sleep night before"
                ))

            # 5. ABDOMINAL PAIN: Periodic mid-cycle or digestive episodes
            if day_offset in [12, 13, 39, 67, 81]:
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Abdominal Pain"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(13, 15)),
                    onset_date=date_str,
                    onset_time="13:15",
                    duration_minutes=rnd.choice([90, 120, 180]),
                    severity=rnd.choice([4, 5, 6]),
                    body_location="Mid-abdominal / epigastric",
                    notes="Sharp localized stomach discomfort following lunch.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase=phase
                )
                db.add(e)
                db.flush()
                db.add(EntryContext(
                    symptom_entry_id=e.id,
                    context_type="diet",
                    value="dairy_or_sugar",
                    notes="Consumed dairy dessert"
                ))

            # 6. SLEEP DIFFICULTY: Insomnia on Sunday and Wednesday nights
            if curr_date.weekday() in [2, 6] and rnd.random() > 0.45:
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Sleep Difficulty"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(23, 45)),
                    onset_date=date_str,
                    onset_time="23:45",
                    duration_minutes=rnd.choice([120, 180, 240]),
                    severity=rnd.choice([5, 6, 7]),
                    body_location="N/A (Sleep)",
                    notes="Difficulty falling asleep; restless sleep and waking up early.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase=phase
                )
                db.add(e)

            # 7. MOOD CHANGES: Late luteal phase irritability or emotional sensitivity
            if days_from_cycle in [24, 25, 26]:
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Mood Changes"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(18, 0)),
                    onset_date=date_str,
                    onset_time="18:00",
                    duration_minutes=rnd.choice([180, 300]),
                    severity=rnd.choice([4, 5, 6]),
                    body_location="Emotional / Systemic",
                    notes="Heightened emotional reactivity, anxiety, and irritability.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase="luteal"
                )
                db.add(e)

            # 8. JOINT PAIN: Occasional knees/wrists aching
            if day_offset in [10, 28, 52, 77]:
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Joint Pain"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(10, 30)),
                    onset_date=date_str,
                    onset_time="10:30",
                    duration_minutes=rnd.choice([120, 240]),
                    severity=rnd.choice([3, 4, 5]),
                    body_location="Knees and fingers",
                    notes="Morning stiffness and aching in joints after damp cold weather.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase=phase
                )
                db.add(e)

            # 9. NAUSEA: Occasional episodes
            if day_offset in [8, 36, 64]:
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Nausea"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(11, 0)),
                    onset_date=date_str,
                    onset_time="11:00",
                    duration_minutes=90,
                    severity=rnd.choice([4, 5, 6]),
                    body_location="Stomach",
                    notes="Queasy feeling after morning coffee on empty stomach.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase=phase
                )
                db.add(e)
                db.flush()
                db.add(EntryContext(
                    symptom_entry_id=e.id,
                    context_type="caffeine",
                    value="high",
                    notes="Coffee without breakfast"
                ))

            # 10. BREAST TENDERNESS: Days 23 to 27 in cycle
            if days_from_cycle in [23, 24, 25]:
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Breast Tenderness"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(9, 0)),
                    onset_date=date_str,
                    onset_time="09:00",
                    duration_minutes=720,
                    severity=rnd.choice([4, 5, 6]),
                    body_location="Bilateral breast tissue",
                    notes="Cyclical tenderness and heaviness pre-menses.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase="luteal"
                )
                db.add(e)

            # 11. HOT FLASHES: Occasional evening / nighttime flushing episodes
            if day_offset in [6, 19, 34, 62, 85]:
                e = SymptomEntry(
                    user_id=demo_user.id,
                    symptom_id=sym_map["Hot Flashes"],
                    recorded_at=datetime.datetime.combine(curr_date, datetime.time(22, 15)),
                    onset_date=date_str,
                    onset_time="22:15",
                    duration_minutes=25,
                    severity=rnd.choice([4, 5, 6]),
                    body_location="Face, neck, and upper chest",
                    notes="Sudden wave of intense warmth and night sweating.",
                    source_type="structured",
                    ai_extracted=False,
                    user_confirmed=True,
                    cycle_phase=phase
                )
                db.add(e)
                db.flush()
                db.add(EntryContext(
                    symptom_entry_id=e.id,
                    context_type="other",
                    value="night_sweat",
                    notes="Sudden nocturnal surge"
                ))

        # -------------------------------------------------------------
        # DELIBERATE DATA QUALITY TEST CASES FOR USER TO TEST & RESOLVE:
        # -------------------------------------------------------------
        # Case A: Duplicate symptom entry on same date
        dupe_date = (today - datetime.timedelta(days=12)).isoformat()
        db.add(SymptomEntry(
            user_id=demo_user.id,
            symptom_id=sym_map["Bloating"],
            recorded_at=datetime.datetime.now(),
            onset_date=dupe_date,
            onset_time="10:00",
            duration_minutes=60,
            severity=4,
            notes="Duplicate entry #1 (Intentional test case for duplicate rule)",
            source_type="structured",
            ai_extracted=False,
            user_confirmed=True
        ))
        db.add(SymptomEntry(
            user_id=demo_user.id,
            symptom_id=sym_map["Bloating"],
            recorded_at=datetime.datetime.now(),
            onset_date=dupe_date,
            onset_time="10:15",
            duration_minutes=60,
            severity=4,
            notes="Duplicate entry #2 (Intentional test case for duplicate rule)",
            source_type="structured",
            ai_extracted=False,
            user_confirmed=True
        ))

        # Case B: Unconfirmed AI extracted entry awaiting user confirmation
        yesterday_str = (today - datetime.timedelta(days=1)).isoformat()
        unconfirmed = SymptomEntry(
            user_id=demo_user.id,
            symptom_id=sym_map["Nausea"],
            recorded_at=datetime.datetime.now(),
            onset_date=yesterday_str,
            onset_time="18:30",
            duration_minutes=120,
            severity=5,
            body_location="Stomach",
            notes="Extracted from note: 'Felt queasy around dinner time yesterday after coffee.'",
            source_type="natural_language",
            ai_extracted=True,
            user_confirmed=False  # Requires explicit user confirmation!
        )
        db.add(unconfirmed)
        db.commit()

        # Seed Daily Medication Adherence Logs for Magnesium (past 20 days)
        for i in range(20, 0, -1):
            log_date = datetime.datetime.combine(today - datetime.timedelta(days=i), datetime.time(21, 30))
            is_missed = (i == 7 or i == 14)
            db.add(MedicationLog(
                medication_id=magnesium.id,
                user_id=demo_user.id,
                taken_at=log_date,
                status="missed" if is_missed else "taken",
                side_effects="None reported" if not is_missed else None,
                perceived_effectiveness="moderate" if not is_missed else None,
                notes="Nightly dose with water" if not is_missed else "Forgot dose while traveling"
            ))

        # Seed Iron Adherence Logs (alternate days)
        for i in range(20, 0, -2):
            log_date = datetime.datetime.combine(today - datetime.timedelta(days=i), datetime.time(8, 30))
            db.add(MedicationLog(
                medication_id=iron.id,
                user_id=demo_user.id,
                taken_at=log_date,
                status="taken",
                side_effects="Mild metallic aftertaste",
                perceived_effectiveness="moderate",
                notes="Taken with orange juice (Vitamin C)"
            ))
        db.commit()

        # Seed Upcoming Appointment with Pre-Visit Checklist
        upcoming_date = (today + datetime.timedelta(days=6)).isoformat() + " 10:30"
        appointment = Appointment(
            user_id=demo_user.id,
            clinician_name="Dr. Elena Vance, MD",
            specialty="Obstetrics & Gynecology",
            appointment_date=upcoming_date,
            location="Women's Health Specialty Center, Suite 300",
            top_concerns="Review cyclical pelvic cramps, luteal phase bloating, and recent fatigue patterns.",
            questions_to_ask="1. Do my frequency clusters warrant hormonal panel testing or ultrasound?\n2. Should I continue 200mg magnesium for sleep?",
            pre_visit_checklist_json=json.dumps({
                "listed_questions": True,
                "medication_list_ready": True,
                "printed_report": True,
                "data_gaps_noted": False,
                "photos_or_records_brought": True
            })
        )
        db.add(appointment)
        db.commit()

        # Seed Consultation Report
        demo_entries = db.query(SymptomEntry).filter(SymptomEntry.user_id == demo_user.id).all()
        freq_data = AnalyticsEngine.calculate_frequency(
            demo_entries,
            (today - datetime.timedelta(days=90)).isoformat(),
            today.isoformat()
        )
        sev_data = AnalyticsEngine.calculate_severity_metrics(demo_entries)
        flare_ups = AnalyticsEngine.detect_flare_ups(demo_entries)

        report_content = ReportGenerator.generate_report_content(
            user_name=demo_user.full_name,
            date_range_start=(today - datetime.timedelta(days=90)).isoformat(),
            date_range_end=today.isoformat(),
            primary_concerns="Longitudinal 90-day evaluation of premenstrual pelvic cramping, bloating, and tension headaches.",
            questions_for_clinician="1. Are the cyclical patterns consistent with dysmenorrhea?\n2. Would ultrasound imaging be indicated for the pelvic cramps?",
            symptom_entries=demo_entries,
            frequency_data=freq_data,
            severity_data=sev_data,
            flare_ups=flare_ups,
            medications=[magnesium, iron],
            cycles=db.query(Cycle).filter(Cycle.user_id == demo_user.id).all(),
            data_quality_notes=[
                "Synthetic demonstration records spanning 90 days.",
                "2 entries intentionally left without severity rating to illustrate data-quality checks."
            ]
        )

        demo_report = Report(
            user_id=demo_user.id,
            title="90-Day Longitudinal Consultation Summary (Demonstration)",
            date_range_start=(today - datetime.timedelta(days=90)).isoformat(),
            date_range_end=today.isoformat(),
            primary_concerns="Longitudinal 90-day evaluation of premenstrual pelvic cramping, bloating, and tension headaches.",
            questions_for_clinician="1. Are the cyclical patterns consistent with dysmenorrhea?\n2. Would ultrasound imaging be indicated for the pelvic cramps?",
            selected_sections_json=json.dumps([
                "patient_summary", "symptom_timeline", "trends", "medications", "cycles", "questions", "evidence_appendix"
            ]),
            generated_content_json=json.dumps(report_content),
            status="draft"
        )
        db.add(demo_report)
        db.commit()

        # Seed Insights with Evidence
        headache_cluster_entries = [e.id for e in demo_entries if e.symptom.name == "Headache" and e.severity and e.severity >= 7]
        cramps_entries = [e.id for e in demo_entries if e.symptom.name == "Pelvic Cramps"]

        insight1 = Insight(
            user_id=demo_user.id,
            insight_type="flare_up",
            title="Headache Cluster Episode Detected",
            description="A concentration of elevated headache severity was recorded on 7 consecutive days, averaging 8.0/10 (+2.1 above baseline).",
            evidence_entry_ids=json.dumps(headache_cluster_entries[:7]),
            calculation_metadata_json=json.dumps({
                "formula": "symptom recorded >= 3 days in rolling 7-day window with avg severity >= baseline + 1.5",
                "sample_size": len(headache_cluster_entries[:7]),
                "excluded_count": 0,
                "missing_summary": "No unlogged days in cluster window."
            }),
            confidence_level="high evidence",
            status="active"
        )

        insight2 = Insight(
            user_id=demo_user.id,
            insight_type="frequency",
            title="Cyclical Pelvic Cramp Clustering",
            description="Pelvic cramps were recorded primarily within the late luteal and early menstrual phases (cycle days 26–3).",
            evidence_entry_ids=json.dumps(cramps_entries[:10]),
            calculation_metadata_json=json.dumps({
                "formula": "phase_frequency = occurrences_in_phase / total_phase_days",
                "sample_size": len(cramps_entries),
                "excluded_count": 0,
                "missing_summary": "Empirical correlation with logged period start dates."
            }),
            confidence_level="high evidence",
            status="active"
        )
        db.add_all([insight1, insight2])
        db.commit()

        # Scan Data Quality Engine to create the open issues
        DataQualityEngine.scan_user_data(db, demo_user.id)
