"""
ML Katmanı — SBERT Model Yönetimi.

Model her request'te yüklenmez.
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
            print("Model basariyla yuklendi.")

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """Yüklü modeli döndürür."""
        if cls._model is None:
            raise RuntimeError(
                "Model henüz yüklenmedi. Önce load() çağrılmalı."
            )
        return cls._model
