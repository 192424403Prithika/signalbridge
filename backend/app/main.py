from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.seed_data import seed_database
from app.api import (
    auth, profile, symptoms, ai_nlp, analytics, insights,
    data_quality, medications, cycles, reports, appointments, admin, export
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    # Seed initial taxonomy and demo account
    db = SessionLocal()
    try:
        seed_database(db)
        from app.services.mongo_service import sync_all_mongo_data
        sync_all_mongo_data(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "SignalBridge API: Evidence-first, non-diagnostic women's health journal, "
        "transparent analytics engine, data quality auditing, and consultation report generator."
    ),
    lifespan=lifespan
)

# CORS Middleware - Secure explicit origins with credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(profile.router, prefix=settings.API_V1_STR)
app.include_router(symptoms.router, prefix=settings.API_V1_STR)
app.include_router(ai_nlp.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(insights.router, prefix=settings.API_V1_STR)
app.include_router(data_quality.router, prefix=settings.API_V1_STR)
app.include_router(medications.router, prefix=settings.API_V1_STR)
app.include_router(cycles.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(appointments.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(export.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
        "docs_url": "/docs",
        "disclaimer": settings.NON_DIAGNOSTIC_DISCLAIMER
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }
