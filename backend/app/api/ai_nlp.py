from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import NLPExtractRequest, NLPExtractResponse
from app.services.auth_service import get_current_user
from app.services.ai_extractor import AIExtractor

router = APIRouter(prefix="/ai", tags=["AI Assistance & NLP Extraction"])

@router.post("/extract", response_model=NLPExtractResponse)
def extract_symptoms_nlp(
    request: NLPExtractRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Converts unstructured natural language symptom descriptions into proposed
    structured candidates. The user must explicitly review, adjust, and confirm each record.
    AI NEVER automatically creates or commits records without user action.
    """
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")

    extracted = AIExtractor.extract_from_text(request.text)
    return extracted
