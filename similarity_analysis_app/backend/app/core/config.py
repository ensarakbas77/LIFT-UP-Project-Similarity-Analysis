"""
Uygulama konfigürasyon modülü.
Ortam değişkenlerinden veritabanı ve model ayarlarını yükler.
"""

import os
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()


class Settings:
    """Uygulama ayarları — ortam değişkenlerinden okunur."""

    # PostgreSQL Bağlantı Bilgileri
    DB_NAME: str = os.getenv("DB_NAME", "liftup_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")

    # SBERT Model Adı
    MODEL_NAME: str = os.getenv(
        "MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2"
    )

    # Emrecan BERT Model Adı
    EMRECAN_MODEL_NAME: str = os.getenv(
        "EMRECAN_MODEL_NAME", "emrecan/bert-base-turkish-cased-mean-nli-stsb-tr"
    )

    # Benzerlik Eşik Değerleri (5 Seviye)
    CRITICAL_THRESHOLD: float = float(os.getenv("CRITICAL_THRESHOLD", "0.90"))
    HIGH_THRESHOLD: float = float(os.getenv("HIGH_THRESHOLD", "0.70"))
    MEDIUM_THRESHOLD: float = float(os.getenv("MEDIUM_THRESHOLD", "0.50"))
    LOW_THRESHOLD: float = float(os.getenv("LOW_THRESHOLD", "0.25"))

    # Varsayılan top-k sonuç sayısı
    DEFAULT_TOP_K: int = int(os.getenv("DEFAULT_TOP_K", "5"))

    # CORS — Frontend origin
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")

    # Gemini API (anahtar kelime önerisi)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_KEYWORD_COUNT: int = int(os.getenv("GEMINI_KEYWORD_COUNT", "5"))


settings = Settings()
