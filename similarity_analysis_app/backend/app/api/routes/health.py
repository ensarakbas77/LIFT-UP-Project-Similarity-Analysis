"""
Route Layer — /health Endpoint.

Sistemin sağlık durumunu kontrol eder:
  - SBERT modeli yüklü mü?
  - Veritabanı bağlantısı aktif mi?
"""

from fastapi import APIRouter

from app.schemas.response_schema import HealthResponse
from app.ml.model_loader import ModelLoader
from app.db.session import DatabaseSession

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Sağlık Kontrolü",
    description="Sistemin çalışma durumunu, model yükleme durumunu ve veritabanı bağlantısını kontrol eder.",
)
def health_check() -> HealthResponse:
    """Sistem sağlık kontrolü endpoint'i."""

    # Model durumu
    model_loaded = False
    try:
        ModelLoader.get_model()
        model_loaded = True
    except RuntimeError:
        model_loaded = False

    # Veritabanı durumu
    db_connected = False
    conn = None
    try:
        conn = DatabaseSession.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.close()
        db_connected = True
    except Exception:
        db_connected = False
    finally:
        if conn:
            DatabaseSession.return_connection(conn)

    # Genel durum
    status = "healthy" if (model_loaded and db_connected) else "degraded"

    return HealthResponse(
        status=status,
        model_loaded=model_loaded,
        database_connected=db_connected,
    )
