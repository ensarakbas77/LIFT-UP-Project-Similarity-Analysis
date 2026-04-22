"""
Admin Backend — Güvenlik Katmanı.

X-Admin-Key header ile basit API key doğrulaması.
Tüm /admin endpoint'leri bu dependency'yi kullanır.
"""

from fastapi import Header, HTTPException, status
from app.core.config import admin_settings


def verify_admin_key(x_admin_key: str = Header(..., description="Admin API anahtarı")) -> None:
    """
    Admin API anahtarını doğrular.

    Header:
        X-Admin-Key: <ADMIN_API_KEY>

    Raises:
        HTTPException 401: Anahtar hatalı veya eksik.
    """
    if x_admin_key != admin_settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz admin anahtarı. X-Admin-Key header'ı kontrol edin.",
        )
