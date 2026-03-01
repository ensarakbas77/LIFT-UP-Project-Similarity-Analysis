"""
Route Layer — /analyze Endpoint.

HTTP request alır, service katmanını çağırır, JSON response döndürür.
İş mantığı bu katmanda bulunmaz.
"""

from fastapi import APIRouter, HTTPException

from app.schemas.request_schema import AnalyzeRequest
from app.schemas.response_schema import AnalyzeResponse
from app.services.similarity_service import analyze_project

router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Proje Benzerlik Analizi",
    description=(
        "Verilen proje başlığı ve özetini SBERT ile vektöre dönüştürür, "
        "veritabanındaki mevcut projelerle cosine similarity hesaplar "
        "ve eşik değerlerine göre sınıflandırma yapar."
    ),
)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Proje benzerlik analizi endpoint'i.

    Request Body:
        - title: Proje başlığı
        - abstract: Proje özeti

    Response:
        - similar_projects: Benzer projelerin listesi
        - classification: "high" | "medium" | "low"
    """
    try:
        result = analyze_project(
            title=request.title,
            abstract=request.abstract,
            keywords=request.keywords,
        )
        return result

    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analiz sırasında beklenmeyen bir hata oluştu: {e}",
        )
