# SignalBridge

> **“Turning Women’s Health Experiences into Evidence-Backed Insights.”**

SignalBridge is a responsive, privacy-conscious women’s health web application that empowers users to record symptoms, organize them into a personal timeline, identify transparent mathematical patterns, detect data-quality issues, and generate editable consultation-ready clinician reports.

---

## 🛡️ Core Principles

1. **Strictly Non-Diagnostic**: SignalBridge never states that a user has, may have, or is at risk of a disease, nor does it recommend medications or medical treatments.
2. **Evidence-Linked Insights**: Every metric, chart, and pattern exposes its contributing source entries, sample size, date window, calculation formula, and data limitations via an interactive **Evidence Viewer**.
3. **User Control & Privacy by Default**: Users retain full control to view, edit, delete, and restrict sensitive health categories. Complete GDPR-compliant data export is available in both structured JSON and CSV formats.
4. **Transparent AI Policy**: Natural-language symptom extraction proposes structured candidate records only. **AI proposals are never saved automatically**—users must review, edit, and confirm each record.
5. **Neutral Medical Safety**: If potentially urgent symptoms are entered, a calm safety banner directs users to emergency medical evaluation without diagnosing or assessing severity.

---

## 🏗️ Architecture & Technology Stack

### Frontend
- **Framework**: React 19 with Vite & TypeScript
- **Styling**: Tailwind CSS v4 with custom soothing clinical palette (warm rose, sage, plum accents)
- **Routing**: React Router DOM (v7)
- **Charts**: Recharts (Frequency bar charts, severity distributions, and period comparisons)
- **State Management**: TanStack Query / React Query
- **Icons**: Lucide React

### Backend
- **Framework**: Python FastAPI
- **Data Validation**: Pydantic v2 with Pydantic Settings
- **ORM & Database**: SQLAlchemy with SQLite
- **Security & Authentication**: Bcrypt password hashing and JWT sessions
- **Reporting Engine**: ReportLab for downloadable PDF reports and responsive printable HTML
- **API Documentation**: Interactive OpenAPI / Swagger UI at `/docs`

---

## 👥 User Roles & Seed Credentials

The application includes an automated seed script that pre-populates the database with symptom taxonomy and a rich **90-day synthetic dataset** for demonstration:

| Role | Email | Password | Access & Purpose |
| :--- | :--- | :--- | :--- |
| **Demo / Guest User** | `demo@signalbridge.health` | `DemoUser123!` | 90 days of synthetic data including cramps, fatigue, migraines, bloating, cycle intervals, and deliberate data-quality test cases. One-click instant login available on the login page. |
| **System Admin** | `admin@signalbridge.health` | `AdminPass123!` | Anonymized aggregate metrics only (strictly isolated from private symptom records), feature flag toggles, and taxonomy management. |
| **Registered User** | *User creates account* | *User password* | Personal isolated health journal, onboarding preferences, cycle tracking, and consultation report generation. |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (Node 24+ recommended)
- Python 3.10+ (Python 3.13 tested)
- pip

### 1. Clone & Set Up the Backend
```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
```

Start the FastAPI backend server:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Health Check: `http://127.0.0.1:8000/api/health`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

### 2. Set Up the Frontend
```bash
cd ../frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```
- Open your browser at `http://127.0.0.1:3000/`

---

## 🐳 Docker Deployment

SignalBridge includes multi-stage Dockerfiles and `docker-compose.yml` for unified containerized deployment:

```bash
docker-compose up --build -d
```
- **Frontend Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`

---

## 📊 Core Deterministic Analytics Engine

All calculations are implemented purely in deterministic Python (`backend/app/services/analytics_engine.py`):

1. **Symptom Frequency**:
   $$\text{Frequency} = \frac{\text{Distinct days with recorded symptom}}{\text{Total days in selected period}}$$
2. **Severity Tracking**:
   - Calculates arithmetic mean, median, minimum, maximum, and latest score on the validated 0–10 scale.
   - Entries without numeric ratings are excluded from averages and transparently counted under `excluded_records_count`.
3. **Period-Over-Period Comparison**:
   - Compares the active period against an equal preceding timeframe (e.g. current 30 days vs prior 30 days).
   - Reports both absolute score difference and percentage change when baseline $> 0$.
4. **Rolling Flare-Up Cluster Detection**:
   - Flags an episode when a symptom is recorded on $\ge 3$ days within a rolling 7-day window with average severity exceeding personal baseline by $\ge 1.5$ points.
   - Displays *"Not enough data to determine a flare-up"* if fewer than 10 baseline records exist.
5. **Correlation Analysis**:
   - Computes conditional probability:
     $$P(\text{Symptom} \mid \text{Context}) = \frac{\text{Days with both symptom and context}}{\text{Total days with context}}$$
   - Always displays a clear disclaimer: **Correlation does not imply medical causation.**

---

## 🔍 Data Quality Engine

The Data Quality Center automatically scans records to flag:
- Incomplete severity ratings (unrated 0–10 entries)
- Reversed / impossible dates (end date before onset date)
- Duplicate logs within short windows
- Extended logging gaps ($> 14$ days without logs)
- Symptoms recorded without context or triggers
- Conflicting menstrual cycle intervals
- Unconfirmed AI natural-language extractions

For each issue, users can mark the anomaly as resolved, ignore it as intentional, or edit the underlying entry.

---

## 📄 Consultation Reports

Users can generate clinician-ready consultation reports for any date range:
- Patient-entered summary and top concerns
- Chronological symptom timeline excerpt
- Severity and frequency distribution tables
- Current medications, dosages, and adherence
- Cycle context and flow intensity
- Limitations and data completeness disclosures
- Pre-formulated questions for the healthcare provider
- Direct export to **Downloadable PDF** (`reportlab`) or **Printable HTML**

---

## 🧪 Running Automated Tests

Run backend unit and integration test suites:
```bash
cd backend
python -m pytest tests -v
```

The test suite validates:
- Frequency rate calculations & distinct day deduplication
- Severity exclusion handling
- Duration "unknown" vs zero handling
- Period-over-period comparison mathematics
- Password hashing & JWT verification
- Report content generation and PDF rendering
- End-to-end full user journey integration test
