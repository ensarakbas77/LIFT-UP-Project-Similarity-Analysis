"""
ML Katmanı — Model Yönetimi.

Modeller her request'te yüklenmez.
Uygulama startup sırasında bir kez yüklenir ve RAM'de tutulur.
"""

from sentence_transformers import SentenceTransformer
from app.core.config import settings


class ModelLoader:
    """Singleton-benzeri SBERT model yükleyici."""

    _model: SentenceTransformer | None = None

    @classmethod
    def load(cls) -> None:
        """Modeli RAM'e yükler. Startup sırasında çağrılır."""
        if cls._model is None:
            print(f"SBERT modeli yukleniyor: {settings.MODEL_NAME}")
            cls._model = SentenceTransformer(settings.MODEL_NAME)
            print("SBERT modeli basariyla yuklendi.")

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """Yüklü modeli döndürür."""
        if cls._model is None:
            raise RuntimeError(
                "SBERT modeli henüz yüklenmedi. Önce load() çağrılmalı."
            )
        return cls._model


class EmrecanModelLoader:
    """Singleton-benzeri Emrecan BERT model yükleyici."""

    _model: SentenceTransformer | None = None

    @classmethod
    def load(cls) -> None:
        """Modeli RAM'e yükler. Startup sırasında çağrılır."""
        if cls._model is None:
            print(f"Emrecan BERT modeli yukleniyor: {settings.EMRECAN_MODEL_NAME}")
            cls._model = SentenceTransformer(settings.EMRECAN_MODEL_NAME)
            print("Emrecan BERT modeli basariyla yuklendi.")

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """Yüklü modeli döndürür."""
        if cls._model is None:
            raise RuntimeError(
                "Emrecan modeli henüz yüklenmedi. Önce load() çağrılmalı."
            )
        return cls._model
