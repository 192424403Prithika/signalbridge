import pytest
from app.services.auth_service import get_password_hash, verify_password, create_access_token
import jwt
from app.config import settings

def test_password_hashing():
    pw = "SecretPass123!"
    hashed = get_password_hash(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPass", hashed) is False

def test_jwt_token_generation():
    token = create_access_token({"sub": "user@test.com", "role": "user"})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "user@test.com"
    assert payload["role"] == "user"
    assert "exp" in payload
