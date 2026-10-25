import io
import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

class ReportGenerator:
    MANDATORY_DISCLAIMER = (
        "This report is based solely on information entered by the user. "
        "It is intended to support communication with a healthcare professional "
        "and does not constitute a diagnosis or medical advice."
    )

    @staticmethod
    def generate_report_content(
        user_name: str,
        date_range_start: str,
        date_range_end: str,
        primary_concerns: str,
        questions_for_clinician: str,
        symptom_entries: List[Any],
        frequency_data: List[Dict[str, Any]],
        severity_data: Dict[str, Any],
        flare_ups: List[Dict[str, Any]],
        medications: List[Any],
        cycles: List[Any],
        data_quality_notes: List[str]
    ) -> Dict[str, Any]:
        """
        Structures the full consultation report payload.
        """
        # Formulate timeline summary
        timeline_items = []
        for e in symptom_entries:
            timeline_items.append({
                "id": e.id,
                "symptom": e.symptom.name,
                "category": e.symptom.category,
                "date": e.onset_date,
                "time": e.onset_time or "unspecified",
                "severity": f"{e.severity}/10" if e.severity is not None else "Not rated",
                "duration": f"{e.duration_minutes} mins" if e.duration_minutes else "unknown",
                "location": e.body_location or "None specified",
                "notes": e.notes or ""
            })

        # Formulate medication list
        med_items = []
        for m in medications:
            med_items.append({
                "name": m.name,
                "dosage": m.dosage,
                "frequency": m.frequency,
                "start_date": m.start_date,
                "end_date": m.end_date or "Ongoing",
                "purpose": m.purpose or "Unspecified"
            })

        # Formulate cycle items
        cycle_items = []
        for c in cycles:
            cycle_items.append({
                "start": c.period_start_date,
                "end": c.period_end_date or "ongoing",
                "flow": c.flow_intensity,
                "length": f"{c.cycle_length} days" if c.cycle_length else "N/A"
            })

        # Limitations list
        limitations = [
            "Observations reflect only user-entered entries; unlogged days cannot be confirmed as symptom-free.",
            "Temporal correlations between symptoms, context, or medications do not establish medical causation.",
            f"{severity_data.get('excluded_count', 0)} entries lacked numeric severity scores and were excluded from severity averages."
        ]
        if data_quality_notes:
            limitations.extend(data_quality_notes)

        return {
            "patient_name": user_name,
            "generated_at": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "date_range": {"start": date_range_start, "end": date_range_end},
            "primary_concerns": primary_concerns or "General longitudinal symptom review for consultation.",
            "questions_for_clinician": questions_for_clinician or "None specified by patient.",
            "disclaimer": ReportGenerator.MANDATORY_DISCLAIMER,
            "frequency_summary": frequency_data[:6],
            "severity_metrics": severity_data,
            "flare_ups": flare_ups,
            "medications": med_items,
            "cycles": cycle_items,
            "timeline": timeline_items,
            "limitations": limitations,
            "evidence_appendix": {
                "total_records_analyzed": len(symptom_entries),
                "record_ids": [e.id for e in symptom_entries]
            }
        }

    @staticmethod
    def generate_html_report(content: Dict[str, Any]) -> str:
        """
        Renders a printable HTML report.
        """
        freq_rows = "".join([
            f"""<tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">{item.get('symptom_name')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{item.get('category')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{item.get('distinct_days_count')} days ({item.get('frequency_percentage')}%)</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">IDs: {item.get('evidence_entry_ids', [])[:4]}...</td>
            </tr>"""
            for item in content.get("frequency_summary", [])
        ])

        med_rows = "".join([
            f"""<tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">{m.get('name')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{m.get('dosage')} ({m.get('frequency')})</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{m.get('start_date')} – {m.get('end_date')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{m.get('purpose')}</td>
            </tr>"""
            for m in content.get("medications", [])
        ])

        timeline_rows = "".join([
            f"""<tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{t.get('date')} {t.get('time')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">{t.get('symptom')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">{t.get('severity')}</span></td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{t.get('duration')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{t.get('location')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569;">{t.get('notes')}</td>
            </tr>"""
            for t in content.get("timeline", [])[:25]
        ])

        limitations_html = "".join([f"<li style='margin-bottom: 4px;'>{lim}</li>" for lim in content.get("limitations", [])])

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SignalBridge Consultation Report - {content.get('patient_name')}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      margin: 0;
      padding: 32px;
      background-color: #ffffff;
    }}
    .report-container {{
      max-width: 850px;
      margin: 0 auto;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }}
    .logo {{
      font-size: 24px;
      font-weight: 700;
      color: #c2425b;
    }}
    .tagline {{
      font-size: 12px;
      color: #64748b;
    }}
    .disclaimer-banner {{
      background: #fff1f2;
      border-left: 4px solid #e11d48;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #9f1239;
      margin-bottom: 24px;
    }}
    .section-title {{
      font-size: 16px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #334155;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 16px;
    }}
    th {{
      text-align: left;
      background-color: #f8fafc;
      padding: 8px;
      border-bottom: 2px solid #cbd5e1;
      color: #475569;
    }}
    .card-grid {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }}
    .card {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
    }}
    .card-val {{
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }}
    .card-label {{
      font-size: 12px;
      color: #64748b;
    }}
    @media print {{
      body {{ padding: 0; }}
      .no-print {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div>
        <div class="logo">SignalBridge</div>
        <div class="tagline">Personal Evidence-Backed Health Journal</div>
      </div>
      <div style="text-align: right; font-size: 13px; color: #64748b;">
        <div><strong>Patient:</strong> {content.get('patient_name')}</div>
        <div><strong>Date Range:</strong> {content.get('date_range', {}).get('start')} to {content.get('date_range', {}).get('end')}</div>
        <div><strong>Generated:</strong> {content.get('generated_at')}</div>
      </div>
    </div>

    <div class="disclaimer-banner">
      <strong>Important Notice:</strong> {content.get('disclaimer')}
    </div>

    <div class="section-title">1. Patient Summary & Primary Concerns</div>
    <p style="font-size: 14px; margin-bottom: 16px;">{content.get('primary_concerns')}</p>

    <div class="section-title">2. Questions for Healthcare Clinician</div>
    <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; border-radius: 4px; font-size: 13px; color: #166534;">
      {content.get('questions_for_clinician')}
    </div>

    <div class="section-title">3. Severity & Frequency Overview</div>
    <div class="card-grid">
      <div class="card">
        <div class="card-val">{content.get('severity_metrics', {}).get('average', 'N/A')}/10</div>
        <div class="card-label">Overall Average Severity</div>
      </div>
      <div class="card">
        <div class="card-val">{content.get('severity_metrics', {}).get('max', 'N/A')}/10</div>
        <div class="card-label">Peak Severity</div>
      </div>
      <div class="card">
        <div class="card-val">{content.get('evidence_appendix', {}).get('total_records_analyzed', 0)}</div>
        <div class="card-label">Total Verified Records</div>
      </div>
    </div>

    <h4 style="margin-top: 16px; margin-bottom: 8px;">Most Frequent Symptoms</h4>
    <table>
      <thead>
        <tr>
          <th>Symptom</th>
          <th>Category</th>
          <th>Frequency in Period</th>
          <th>Evidence Reference</th>
        </tr>
      </thead>
      <tbody>
        {freq_rows if freq_rows else "<tr><td colspan='4' style='padding: 8px; text-align: center;'>No frequent symptoms logged</td></tr>"}
      </tbody>
    </table>

    <div class="section-title">4. Current Medications & Supplements</div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Dosage / Freq</th>
          <th>Dates</th>
          <th>Purpose</th>
        </tr>
      </thead>
      <tbody>
        {med_rows if med_rows else "<tr><td colspan='4' style='padding: 8px; text-align: center;'>No medications logged</td></tr>"}
      </tbody>
    </table>

    <div class="section-title">5. Chronological Symptom Timeline (Recent Excerpt)</div>
    <table>
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Symptom</th>
          <th>Severity</th>
          <th>Duration</th>
          <th>Location</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {timeline_rows if timeline_rows else "<tr><td colspan='6' style='padding: 8px; text-align: center;'>No timeline entries</td></tr>"}
      </tbody>
    </table>

    <div class="section-title">6. Data Quality & Limitations Disclosure</div>
    <ul style="font-size: 13px; color: #475569; padding-left: 20px;">
      {limitations_html}
    </ul>

    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
      SignalBridge &bull; Clinical Consultation Report &bull; Evidence-First Health Journal
    </div>
  </div>
</body>
</html>
"""
        return html

    @staticmethod
    def generate_pdf_report(content: Dict[str, Any]) -> bytes:
        """
        Builds a downloadable PDF report using ReportLab.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#a33148')
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#64748b')
        )
        heading_style = ParagraphStyle(
            'ReportHeading',
            parent=styles['Heading2'],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=10,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        disclaimer_style = ParagraphStyle(
            'ReportDisclaimer',
            parent=styles['Normal'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#9f1239'),
            backColor=colors.HexColor('#fff1f2'),
            borderColor=colors.HexColor('#f43f5e'),
            borderWidth=1,
            borderPadding=6,
            spaceAfter=10
        )

        elements = []

        # Header
        elements.append(Paragraph("SignalBridge | Health Consultation Report", title_style))
        elements.append(Paragraph(f"Patient: {content.get('patient_name')} &bull; Date Range: {content.get('date_range', {}).get('start')} to {content.get('date_range', {}).get('end')} &bull; Generated: {content.get('generated_at')}", subtitle_style))
        elements.append(Spacer(1, 8))

        # Mandatory Disclaimer
        elements.append(Paragraph(f"<b>MANDATORY NOTICE:</b> {content.get('disclaimer')}", disclaimer_style))

        # 1. Primary Concerns
        elements.append(Paragraph("1. Primary Concerns", heading_style))
        elements.append(Paragraph(content.get('primary_concerns', 'General longitudinal symptom review.'), body_style))
        elements.append(Spacer(1, 6))

        # 2. Questions for Clinician
        elements.append(Paragraph("2. Questions for Healthcare Provider", heading_style))
        elements.append(Paragraph(content.get('questions_for_clinician', 'None specified.'), body_style))
        elements.append(Spacer(1, 6))

        # 3. Frequency & Severity Overview
        elements.append(Paragraph("3. Observed Frequency & Severity Metrics", heading_style))
        sev_meta = content.get('severity_metrics', {})
        overview_text = (
            f"Average Severity: <b>{sev_meta.get('average', 'N/A')}/10</b> &bull; "
            f"Peak Severity: <b>{sev_meta.get('max', 'N/A')}/10</b> &bull; "
            f"Total Analyzed Records: <b>{content.get('evidence_appendix', {}).get('total_records_analyzed', 0)}</b>"
        )
        elements.append(Paragraph(overview_text, body_style))
        elements.append(Spacer(1, 6))

        # Table of frequent symptoms
        freq_list = content.get("frequency_summary", [])
        if freq_list:
            table_data = [["Symptom", "Category", "Active Days", "Rate"]]
            for item in freq_list[:5]:
                table_data.append([
                    item.get("symptom_name", ""),
                    item.get("category", ""),
                    f"{item.get('distinct_days_count', 0)} days",
                    f"{item.get('frequency_percentage', 0)}%"
                ])
            t = Table(table_data, colWidths=[150, 120, 100, 100])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 8))

        # 4. Limitations
        elements.append(Paragraph("4. Data Limitations & Disclosures", heading_style))
        for lim in content.get("limitations", []):
            elements.append(Paragraph(f"&bull; {lim}", body_style))
        elements.append(Spacer(1, 10))

        # Build document
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
