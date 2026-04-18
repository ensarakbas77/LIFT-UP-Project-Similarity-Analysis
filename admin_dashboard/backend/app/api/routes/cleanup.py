"""
Admin Backend — Route Katmanı: Geçici Dosya Temizleme.

DELETE /admin/cleanup/{job_id} → İş geçici dizinini sil

"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import verify_admin_key
from app.jobs.job_store import cleanup_job
from app.schemas.admin_schemas import CleanupResponse

router = APIRouter(prefix="/admin", tags=["Admin — Temizleme"])


@router.delete(
    "/cleanup/{job_id}",
    response_model=CleanupResponse,
    summary="Geçici Dosyaları Temizle",
    description="Belirtilen iş için oluşturulan tüm geçici dosyaları ve dizini siler.",
    dependencies=[Depends(verify_admin_key)],
)
def cleanup(job_id: str) -> CleanupResponse:
    """
    Geçici iş dosyalarını siler.

    Args:
        job_id: Temizlenecek iş kimliği.
    """
    deleted = cleanup_job(job_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{job_id}' ID'li iş bulunamadı veya zaten temizlenmiş.",
        )

    return CleanupResponse(
        success=True,
        message=f"'{job_id}' iş dosyaları başarıyla temizlendi.",
    )
