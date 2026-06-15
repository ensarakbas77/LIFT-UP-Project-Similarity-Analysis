"""
ML Katmanı — Model Yönetimi (Admin Backend).

NOT (kod tekrarı bilinçlidir):
    Bu modül, similarity_analysis_app/backend/app/ml/model_loader.py ile
    AYNI mantığı taşır. İki servis ayrı Docker imajları olduğu ve build
    context'leri kesişmediği için kod paylaşılamaz, kopyalanır.
    Biri değişirse diğeri de güncellenmelidir.

Modeller her request'te yüklenmez; uygulama startup'ında bir kez yüklenip
RAM'de tutulur. İndirilen model dosyaları docker volume (liftup_model_cache)
üzerinden similarity backend ile paylaşılır, böylece tekrar indirilmez.
"""

from sentence_transformers import SentenceTransformer

from app.core.config import admin_settings


class ModelLoader:
    """Singleton-benzeri SBERT model yükleyici."""

    _model: SentenceTransformer | None = None

    @classmethod
    def load(cls) -> None:
        """Modeli RAM'e yükler. Startup sırasında çağrılır."""
        if cls._model is None:
            print(f"SBERT modeli yukleniyor: {admin_settings.MODEL_NAME}")
            cls._model = SentenceTransformer(admin_settings.MODEL_NAME)
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
            print(f"Emrecan BERT modeli yukleniyor: {admin_settings.EMRECAN_MODEL_NAME}")
            cls._model = SentenceTransformer(admin_settings.EMRECAN_MODEL_NAME)
            print("Emrecan BERT modeli basariyla yuklendi.")

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """Yüklü modeli döndürür."""
        if cls._model is None:
            raise RuntimeError(
                "Emrecan modeli henüz yüklenmedi. Önce load() çağrılmalı."
            )
        return cls._model
