"""
Admin Backend — Service Katmanı: PDF Extraction.

İş mantığı burada bulunur — route katmanı sadece call yapar.
Ana backend'deki similarity_service.py yapısını takip eder.

Akış:
  1. Yüklenen PDF geçici dizine kaydedilir
  2. PDFProcessor ile makale çıkarma işlemi yapılır
  3. Sonuç CSV olarak kaydedilir
  4. İş kaydı güncellenir
"""

import os
from pathlib import Path

from app.pdf_processing.data_extract import PDFProcessor



def run_pdf_extraction(job_id: str, job_dir: str, pdf_bytes: bytes, filename: str, year: str) -> None:
    """
    PDF dosyasını işler ve CSV çıktısı üretir.

    Bu fonksiyon FastAPI BackgroundTasks aracılığıyla arka planda çalışır.
    Ana backend'deki analyze_project() iş mantığı katmanına karşılık gelir.

    Args:
        job_id:    İş kimliği (job_store.py'den güncelleme için).
        job_dir:   Geçici dosyaların kaydedileceği dizin.
        pdf_bytes: Yüklenen PDF'in ham byte içeriği.
        filename:  Orijinal dosya adı (güvenli hale getirilmiş).
        year:      Kullanıcının belirttiği yıl bilgisi (örn: "2021-2022").
    """
    # import burada yapılır — background thread'de çalıştığı için
    from app.jobs.job_store import complete_job, fail_job

    try:
        # 1. PDF'i geçici dizine kaydet
        pdf_path = os.path.join(job_dir, filename)
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        # 2. CSV çıktı yolunu belirle
        csv_filename = f"{Path(filename).stem}_extracted.csv"
        csv_path = os.path.join(job_dir, csv_filename)

        # 3. PDFProcessor ile makale çıkarma
        processor = PDFProcessor()
        articles = processor.process_pdf(pdf_path, year, csv_path)

        # 4. İş kaydını başarılı olarak işaretle
        complete_job(job_id, len(articles), csv_filename)

    except Exception as e:
        # Hata oluşursa iş kaydını hata ile işaretle
        fail_job(job_id, str(e))
        raise
