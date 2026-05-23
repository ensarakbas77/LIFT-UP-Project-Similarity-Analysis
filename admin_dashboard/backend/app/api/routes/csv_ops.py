"""
Admin Backend — Route Katmanı: CSV Analiz ve İndirme.

GET  /admin/analyze/{job_id}/{filename}  → CSV analiz sonuçları
GET  /admin/download/{job_id}/{filename} → CSV dosyası indirme

Ana backend'deki health.py route yapısını takip eder.
"""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.api.auth import get_current_admin
from app.jobs.job_store import get_job_csv_path
from app.schemas.admin_schemas import AnalyzeCSVResponse
from app.services.csv_service import analyze_csv_file

router = APIRouter(prefix="/admin", tags=["Admin — CSV İşlemleri"])


@router.get(
    "/analyze/{job_id}/{filename}",
    response_model=AnalyzeCSVResponse,
    summary="CSV Dosyasını Analiz Et",
    description=(
        "Tamamlanmış bir iş için oluşturulan CSV dosyasını analiz eder. "
        "Temel istatistikler, dil doluluk oranları ve metin uzunlukları döndürülür."
    ),
    dependencies=[Depends(get_current_admin)],
)
def analyze_csv(job_id: str, filename: str) -> AnalyzeCSVResponse:
    if not re.match(r'^[\w][\w\-\.]*\.csv$', filename):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz dosya adı.")
    csv_path = get_job_csv_path(job_id, filename)
    if not csv_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{job_id}' ID'li iş için '{filename}' dosyası bulunamadı.",
        )

    try:
        return analyze_csv_file(csv_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/download/{job_id}/{filename}",
    summary="CSV Dosyasını İndir",
    description="Tamamlanmış işin CSV çıktısını dosya olarak indirir.",
    dependencies=[Depends(get_current_admin)],
)
def download_csv(job_id: str, filename: str) -> FileResponse:
    if not re.match(r'^[\w][\w\-\.]*\.csv$', filename):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz dosya adı.")
    csv_path = get_job_csv_path(job_id, filename)
    if not csv_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{job_id}' ID'li iş için '{filename}' dosyası bulunamadı.",
        )

    return FileResponse(
        path=csv_path,
        media_type="text/csv",
        filename=filename,
    )
