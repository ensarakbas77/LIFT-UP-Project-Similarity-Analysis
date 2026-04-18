"""
Admin Backend — Konfigürasyon Modülü.

.env dosyasından ortam değişkenlerini okur.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class AdminSettings:
    """Admin backend ayarları — ortam değişkenlerinden okunur."""

    # PostgreSQL Bağlantı Bilgileri (ana backend ile aynı DB)
    DB_NAME: str = os.getenv("DB_NAME", "liftup_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")

    # Admin API Güvenlik Anahtarı
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "")

    # Geçici Dosya Dizini (PDF yükleme işleri için)
    JOBS_DIR: str = os.getenv("JOBS_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "jobs"))

    # Maksimum PDF boyutu (byte — varsayılan 200 MB)
    MAX_PDF_SIZE_MB: int = int(os.getenv("MAX_PDF_SIZE_MB", "200"))

    # CORS — Frontend origin'leri
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:4000"
    ).split(",")


admin_settings = AdminSettings()
