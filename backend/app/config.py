from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "SignalBridge"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "signalbridge_super_secure_secret_key_change_in_prod_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for prototype
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./signalbridge.db")
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000,http://localhost:4173,http://127.0.0.1:4173"
        ).split(",") if origin.strip()
    ]
    
    # Optional LLM API Key (if provided, can be used for extra LLM calls; otherwise smart local NLP engine works autonomously)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Safety Disclaimer
    NON_DIAGNOSTIC_DISCLAIMER: str = (
        "SignalBridge is not a diagnostic tool and does not provide medical advice, disease prediction, "
        "or treatment recommendations. All insights are transparent calculations based solely on user-entered records."
    )

    model_config = {"env_file": ".env", "extra": "allow"}

settings = Settings()
