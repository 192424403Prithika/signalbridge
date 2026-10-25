import pytest
from app.services.report_generator import ReportGenerator

def test_report_content_structure_and_disclaimer():
    content = ReportGenerator.generate_report_content(
        user_name="Jane Doe",
        date_range_start="2026-01-01",
        date_range_end="2026-03-31",
        primary_concerns="Intermittent migraine and cramps",
        questions_for_clinician="Could medication timing be adjusted?",
        symptom_entries=[],
        frequency_data=[],
        severity_data={"average": 5.5, "max": 8, "excluded_count": 0},
        flare_ups=[],
        medications=[],
        cycles=[],
        data_quality_notes=[]
    )

    assert "does not constitute a diagnosis" in content["disclaimer"]
    assert content["patient_name"] == "Jane Doe"
    assert "date_range" in content
    assert len(content["limitations"]) >= 2

def test_html_and_pdf_export_generation():
    content = ReportGenerator.generate_report_content(
        user_name="Jane Doe",
        date_range_start="2026-01-01",
        date_range_end="2026-03-31",
        primary_concerns="Testing report",
        questions_for_clinician="None",
        symptom_entries=[],
        frequency_data=[],
        severity_data={"average": 4.0, "max": 7, "excluded_count": 1},
        flare_ups=[],
        medications=[],
        cycles=[],
        data_quality_notes=[]
    )

    html = ReportGenerator.generate_html_report(content)
    assert "SignalBridge Consultation Report" in html
    assert "Jane Doe" in html

    pdf_bytes = ReportGenerator.generate_pdf_report(content)
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
