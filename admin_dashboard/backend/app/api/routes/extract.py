"""
Admin Backend — Route Katmanı: PDF Extraction.

POST /admin/extract  → PDF yükle, arka planda işle
GET  /admin/jobs/{job_id} → İş durumunu sorgula

Flask'taki @app.route('/process') endpoint'inin FastAPI karşılığı.
Ana backend'deki analyze.py route yapısını takip eder.
"""

import uuid
from werkzeug.utils import secure_filename as _secure_filename

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import admin_settings
from app.core.security import verify_admin_key
from app.jobs.job_store import create_job, get_job
from app.schemas.admin_schemas import ExtractResponse, JobStatusResponse
from app.services.pdf_service import run_pdf_extraction

router = APIRouter(prefix="/admin", tags=["Admin — PDF Extraction"])

ALLOWED_EXTENSIONS = {"pdf"}


def _validate_pdf(file: UploadFile) -> None:
    """Dosya uzantısı ve MIME type doğrulaması."""
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sadece PDF dosyaları kabul edilir.",
        )


@router.post(
    "/extract",
    response_model=ExtractResponse,
    summary="PDF Yükle ve Makale Çıkar",
    description=(
        "LIFT UP bildiri kitabı PDF'ini yükler. "
        "İşlem arka planda başlatılır — sonucu `/admin/jobs/{job_id}` ile takip edin."
    ),
    dependencies=[Depends(verify_admin_key)],
)
async def extract_pdf(
    background_tasks: BackgroundTasks,
    pdfFile: UploadFile = File(..., description="İşlenecek LIFT UP PDF dosyası"),
    year: str = Form(
        default="2021-2022",
        description="Bildiri kitabı yılı (örn: '2021-2022')",
        examples=["2021-2022", "2022-2023"],
    ),
) -> ExtractResponse:
    """
    PDF dosyasını yükler ve makale çıkarma işlemini arka planda başlatır.

    Akış:
      1. PDF validasyonu
      2. Benzersiz job_id üretilir
      3. Geçici dizin oluşturulur
      4. BackgroundTask olarak PDFProcessor başlatılır
      5. Hemen job_id ile yanıt döner (non-blocking)
    """
    # 1. Validasyon
    _validate_pdf(pdfFile)

    # 2. Benzersiz iş kimliği ve güvenli dosya adı
    job_id = str(uuid.uuid4())[:8]
    safe_filename = _secure_filename(pdfFile.filename or "upload.pdf")

    # 3. Dosya içeriğini oku (stream'den)
    pdf_bytes = await pdfFile.read()

    # Boyut kontrolü
    max_bytes = admin_settings.MAX_PDF_SIZE_MB * 1024 * 1024
    if len(pdf_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dosya çok büyük. Maksimum {admin_settings.MAX_PDF_SIZE_MB} MB.",
        )

    # 4. Job kaydı ve geçici dizin oluştur
    job_dir = create_job(job_id)

    # 5. Arka planda çalıştır (non-blocking)
    background_tasks.add_task(
        run_pdf_extraction,
        job_id=job_id,
        job_dir=job_dir,
        pdf_bytes=pdf_bytes,
        filename=safe_filename,
        year=year,
    )

    return ExtractResponse(
        job_id=job_id,
        status="processing",
        message=f"PDF işleme başladı. Durumu takip etmek için job_id: '{job_id}' kullanın.",
    )


@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="İş Durumu Sorgula",
    description="Başlatılan PDF işleme işinin mevcut durumunu döndürür.",
    dependencies=[Depends(verify_admin_key)],
)
def get_job_status(job_id: str) -> JobStatusResponse:
    """
    Verilen job_id için iş durumunu döndürür.

    Status değerleri:
      - "processing": İşlem devam ediyor
      - "done": İşlem tamamlandı, CSV hazır
      - "error": İşlem başarısız
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{job_id}' ID'li iş bulunamadı.",
        )

    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        article_count=job.get("article_count"),
        csv_filename=job.get("csv_filename"),
        error=job.get("error"),
    )
