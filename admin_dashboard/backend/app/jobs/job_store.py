"""
Admin Backend — İş Yönetimi Modülü.

PDF işleme işlerini (job) takip eder.
Ana backend'deki DatabaseSession singleton yaklaşımını takip eder —
burada in-memory job registry kullanılır.
"""

import os
import shutil
import threading
from typing import Dict, Optional
from app.core.config import admin_settings


# ─── Job Store ────────────────────────────────────────────────────────────────

_lock = threading.Lock()
_jobs: Dict[str, dict] = {}
"""
Thread-safe in-memory iş kaydı.
Format: { job_id: { status, article_count, csv_filename, error, job_dir } }
"""


def create_job(job_id: str) -> str:
    """
    Yeni bir iş kaydı ve geçici dizin oluşturur.

    Args:
        job_id: Benzersiz iş kimliği.

    Returns:
        Oluşturulan iş dizininin tam yolu.
    """
    job_dir = _get_job_dir(job_id)
    os.makedirs(job_dir, exist_ok=True)

    with _lock:
        _jobs[job_id] = {
            "status": "processing",
            "article_count": None,
            "csv_filename": None,
            "error": None,
            "job_dir": job_dir,
        }

    return job_dir


def complete_job(job_id: str, article_count: int, csv_filename: str) -> None:
    """İşi başarılı olarak işaretler."""
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["status"] = "done"
            _jobs[job_id]["article_count"] = article_count
            _jobs[job_id]["csv_filename"] = csv_filename


def fail_job(job_id: str, error: str) -> None:
    """İşi hata ile işaretler."""
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["error"] = error


def get_job(job_id: str) -> Optional[dict]:
    """Mevcut iş bilgisini döndürür. Bulunamazsa None."""
    with _lock:
        return _jobs.get(job_id)


def cleanup_job(job_id: str) -> bool:
    """
    İş kaydını ve geçici dizini siler.

    Returns:
        True: Başarıyla silindi.
        False: İş bulunamadı.
    """
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return False
        job_dir = job["job_dir"]
        del _jobs[job_id]

    if os.path.exists(job_dir):
        shutil.rmtree(job_dir, ignore_errors=True)

    return True


def get_job_csv_path(job_id: str, filename: str) -> Optional[str]:
    """
    İş dizinindeki CSV dosyasının tam yolunu döndürür.
    Dosya yoksa None.
    """
    job = get_job(job_id)
    if not job:
        return None

    csv_path = os.path.join(job["job_dir"], filename)
    return csv_path if os.path.exists(csv_path) else None


def _get_job_dir(job_id: str) -> str:
    """İş dizini yolunu hesaplar."""
    base = os.path.abspath(admin_settings.JOBS_DIR)
    return os.path.join(base, f"lift_up_{job_id}")
