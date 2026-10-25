import re
import datetime
from typing import List, Dict, Any, Optional
from app.config import settings
from app.schemas import ExtractedSymptomProposal, NLPExtractResponse, ContextItem

KNOWN_SYMPTOM_PATTERNS = [
    {"name": "Pelvic Cramps", "keywords": ["cramp", "cramps", "cramping", "uterine cramp", "period pain"], "category": "Menstrual", "tags": ["menstrual", "pelvic", "pain"]},
    {"name": "Bloating", "keywords": ["bloat", "bloated", "bloating", "swollen abdomen", "distension"], "category": "Digestive", "tags": ["digestive", "gut"]},
    {"name": "Headache", "keywords": ["headache", "migraine", "head pain", "throbbing head", "sinus headache"], "category": "Pain", "tags": ["headache", "neurological"]},
    {"name": "Fatigue", "keywords": ["fatigue", "tired", "exhausted", "exhaustion", "lethargic", "no energy", "wiped out"], "category": "Systemic", "tags": ["energy", "fatigue"]},
    {"name": "Abdominal Pain", "keywords": ["abdominal pain", "stomach ache", "belly pain", "gut pain", "stomach cramp"], "category": "Digestive", "tags": ["digestive", "pain"]},
    {"name": "Sleep Difficulty", "keywords": ["insomnia", "hard to sleep", "trouble sleeping", "woke up", "sleepless", "poor sleep"], "category": "Sleep", "tags": ["sleep", "rest"]},
    {"name": "Mood Changes", "keywords": ["anxious", "anxiety", "mood swing", "irritability", "irritable", "depressed", "low mood", "tearful"], "category": "Mood", "tags": ["mood", "emotional"]},
    {"name": "Joint Pain", "keywords": ["joint pain", "stiff joints", "knee pain", "hip pain", "wrist pain"], "category": "Pain", "tags": ["joints", "musculoskeletal"]},
    {"name": "Nausea", "keywords": ["nausea", "nauseous", "queasy", "feel sick"], "category": "Digestive", "tags": ["digestive", "nausea"]},
    {"name": "Hot Flashes", "keywords": ["hot flash", "hot flashes", "night sweats", "sweating", "flushed"], "category": "Systemic", "tags": ["temperature", "hormonal"]},
    {"name": "Brain Fog", "keywords": ["brain fog", "foggy", "can't focus", "confusion", "spacing out"], "category": "Neurological", "tags": ["cognitive", "focus"]},
    {"name": "Breast Tenderness", "keywords": ["breast pain", "breast tenderness", "sore breasts"], "category": "Menstrual", "tags": ["hormonal", "breast"]}
]

class AIExtractor:
    @staticmethod
    def extract_from_text(raw_text: str) -> NLPExtractResponse:
        """
        Parses free-form user text into structured candidate records.
        Strictly outputs proposals that require manual review and confirmation.
        """
        lower_text = raw_text.lower()
        today = datetime.date.today()

        # 1. Resolve date
        extracted_date = today.isoformat()
        if "yesterday" in lower_text:
            extracted_date = (today - datetime.timedelta(days=1)).isoformat()
        elif "2 days ago" in lower_text or "two days ago" in lower_text:
            extracted_date = (today - datetime.timedelta(days=2)).isoformat()
        elif "3 days ago" in lower_text or "three days ago" in lower_text:
            extracted_date = (today - datetime.timedelta(days=3)).isoformat()
        elif "last night" in lower_text:
            extracted_date = (today - datetime.timedelta(days=1)).isoformat()

        # 2. Resolve time of day
        extracted_time = None
        if "evening" in lower_text or "night" in lower_text:
            extracted_time = "19:00"
        elif "morning" in lower_text:
            extracted_time = "08:30"
        elif "afternoon" in lower_text:
            extracted_time = "14:00"
        elif "noon" in lower_text:
            extracted_time = "12:00"

        # Explicit time regex (e.g., 4:30 pm or 15:00)
        time_match = re.search(r'\b(\d{1,2}):(\d{2})\s*(am|pm)?\b', lower_text)
        if time_match:
            hr = int(time_match.group(1))
            mn = time_match.group(2)
            ampm = time_match.group(3)
            if ampm == "pm" and hr < 12:
                hr += 12
            elif ampm == "am" and hr == 12:
                hr = 0
            extracted_time = f"{hr:02d}:{mn}"

        # 3. Resolve duration
        duration_minutes = None
        dur_hour_match = re.search(r'(\d+|one|two|three|four|five|six|seven|eight)\s*(hours|hour|hrs|hr)', lower_text)
        if dur_hour_match:
            val_str = dur_hour_match.group(1)
            word_to_num = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8}
            hrs = word_to_num.get(val_str, int(val_str) if val_str.isdigit() else 1)
            duration_minutes = hrs * 60
        else:
            dur_min_match = re.search(r'(\d+)\s*(minutes|mins|min)', lower_text)
            if dur_min_match:
                duration_minutes = int(dur_min_match.group(1))
            elif "all day" in lower_text:
                duration_minutes = 720  # 12 hours

        # 4. Resolve severity hints (mild: 2-3, moderate: 5, strong/severe: 7-8)
        severity_hint = None
        if re.search(r'\b(mild|slight|light)\b', lower_text):
            severity_hint = 3
        elif re.search(r'\b(moderate|noticeable|medium)\b', lower_text):
            severity_hint = 5
        elif re.search(r'\b(strong|intense|bad|heavy)\b', lower_text):
            severity_hint = 7
        elif re.search(r'\b(severe|excruciating|unbearable|very bad)\b', lower_text):
            severity_hint = 9

        # Explicit 0-10 severity mentioned (e.g., "7/10" or "severity 6")
        explicit_sev = re.search(r'\b(\d{1,2})\s*/\s*10\b|\bseverity\s*(\d{1,2})\b', lower_text)
        if explicit_sev:
            num = int(explicit_sev.group(1) or explicit_sev.group(2))
            if 0 <= num <= 10:
                severity_hint = num

        # 5. Context factors
        context_factors = []
        if re.search(r'\b(stress|stressed|work pressure|deadline)\b', lower_text):
            context_factors.append(ContextItem(context_type="stress", value="high", notes="Detected from natural-language notes"))
        if re.search(r'\b(poor sleep|hard to sleep|bad sleep|insomnia|tired)\b', lower_text):
            context_factors.append(ContextItem(context_type="sleep", value="poor", notes="Impacted sleep difficulty mentioned"))
        if re.search(r'\b(caffeine|coffee|energy drink)\b', lower_text):
            context_factors.append(ContextItem(context_type="caffeine", value="present", notes="Caffeine mentioned"))
        if re.search(r'\b(alcohol|wine|beer|drinks)\b', lower_text):
            context_factors.append(ContextItem(context_type="alcohol", value="present", notes="Alcohol mentioned"))
        if re.search(r'\b(period|menstrual|cycle|ovulation)\b', lower_text):
            context_factors.append(ContextItem(context_type="other", value="menstrual_cycle_phase", notes="Cycle context referenced"))

        # 6. Body location
        body_location = None
        if "lower abdomen" in lower_text or "pelvis" in lower_text or "pelvic" in lower_text:
            body_location = "Lower abdomen / Pelvis"
        elif "stomach" in lower_text or "belly" in lower_text:
            body_location = "Abdomen"
        elif "temple" in lower_text or "forehead" in lower_text:
            body_location = "Head / Temples"
        elif "lower back" in lower_text:
            body_location = "Lower back"

        # 7. Impact
        impact = None
        if "made it hard to sleep" in lower_text or "couldn't sleep" in lower_text:
            impact = "Difficulty falling or staying asleep"
        elif "missed work" in lower_text or "could not work" in lower_text:
            impact = "Disrupted work activities"

        # 8. Find matching symptoms from taxonomy
        matched_proposals: List[ExtractedSymptomProposal] = []
        for sym_def in KNOWN_SYMPTOM_PATTERNS:
            for kw in sym_def["keywords"]:
                if re.search(rf'\b{re.escape(kw)}\b', lower_text):
                    tags = list(sym_def["tags"])
                    if impact and "sleep" in tags:
                        tags.append("sleep-disrupted")

                    matched_proposals.append(ExtractedSymptomProposal(
                        symptom_name=sym_def["name"],
                        category=sym_def["category"],
                        onset_date=extracted_date,
                        onset_time=extracted_time,
                        duration_minutes=duration_minutes,
                        severity=severity_hint,
                        body_location=body_location,
                        impact=impact,
                        suggested_tags=tags,
                        context_factors=context_factors,
                        confidence_score=0.90,
                        original_snippet=f"Detected from user input referencing '{kw}'",
                        disclaimer="AI-generated proposal. You must review, adjust values, and explicitly confirm before saving."
                    ))
                    break  # One proposal per symptom definition

        # Fallback if no specific symptom was matched
        if not matched_proposals:
            matched_proposals.append(ExtractedSymptomProposal(
                symptom_name="Unspecified Symptom",
                category="General",
                onset_date=extracted_date,
                onset_time=extracted_time,
                duration_minutes=duration_minutes,
                severity=severity_hint,
                body_location=body_location,
                impact=impact,
                suggested_tags=["user-entry"],
                context_factors=context_factors,
                confidence_score=0.60,
                original_snippet=raw_text[:100],
                disclaimer="AI-generated proposal. Please select the specific symptom name and confirm details."
            ))

        return NLPExtractResponse(
            proposals=matched_proposals,
            raw_text=raw_text,
            extracted_count=len(matched_proposals),
            disclaimer="AI-generated proposal only. SignalBridge does not diagnose or save entries automatically."
        )
