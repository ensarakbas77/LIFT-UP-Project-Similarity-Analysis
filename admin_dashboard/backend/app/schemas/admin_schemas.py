"""
Admin Backend — Pydantic Şemalar.

/admin endpoint'leri için istek ve yanıt modelleri.
Ana backend'deki request_schema / response_schema yapısını takip eder.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─── PDF Extraction Şemaları ──────────────────────────────────────────────────

class ExtractResponse(BaseModel):
    """
    POST /admin/extract — PDF işleme başlatma yanıtı.

    Attributes:
        job_id:   İşin benzersiz kimliği (geçici dosyalar bu ID ile yönetilir).
        status:   İşin mevcut durumu ("processing" | "done" | "error").
        message:  Kullanıcıya gösterilecek bilgi mesajı.
    """
    job_id: str = Field(..., description="Benzersiz iş kimliği")
    status: str = Field(..., description="İş durumu: 'processing' | 'done' | 'error'")
    message: str = Field(..., description="Durum mesajı")


class JobStatusResponse(BaseModel):
    """
    GET /admin/jobs/{job_id} — İş durumu sorgulama yanıtı.

    Attributes:
        job_id:        İş kimliği.
        status:        İşin durumu.
        article_count: Çıkarılan makale sayısı (tamamlandıysa).
        csv_filename:  Oluşturulan CSV dosyasının adı (tamamlandıysa).
        error:         Hata mesajı (hata varsa).
    """
    job_id: str = Field(..., description="Benzersiz iş kimliği")
    status: str = Field(..., description="İş durumu: 'processing' | 'done' | 'error'")
    article_count: Optional[int] = Field(None, description="Çıkarılan makale sayısı")
    csv_filename: Optional[str] = Field(None, description="Oluşturulan CSV dosyasının adı")
    error: Optional[str] = Field(None, description="Hata mesajı")


# ─── CSV Analiz Şemaları ──────────────────────────────────────────────────────

class MissingValueDetail(BaseModel):
    """Eksik değer detayı — bir sütun için."""
    column: str
    count: int
    percentage: float


class MissingValuesStats(BaseModel):
    """Eksik değer istatistikleri."""
    has_missing: bool
    total_missing: int
    details: List[MissingValueDetail]


class BasicStats(BaseModel):
    """CSV temel istatistikleri."""
    total_articles: int
    total_columns: int
    columns: List[str]
    file_size: int


class TextLengthStat(BaseModel):
    """Tek sütun için metin uzunluğu istatistiği."""
    avg_length: float
    min_length: int
    max_length: int


class LanguageStats(BaseModel):
    """TR/EN dil doluluk istatistikleri."""
    tr_titles_filled: int
    en_titles_filled: int
    tr_abstracts_filled: int
    en_abstracts_filled: int
    tr_keywords_filled: int
    en_keywords_filled: int
    tr_completeness: float
    en_completeness: float


class AnalyzeCSVResponse(BaseModel):
    """
    GET /admin/analyze/{job_id}/{filename} — CSV analiz yanıtı.

    Ana backend'deki AnalyzeResponse ile aynı yapı anlayışını takip eder.
    """
    basic_stats: BasicStats
    missing_values: MissingValuesStats
    first_rows: List[Dict[str, Any]]
    year_distribution: Dict[str, int]
    language_stats: LanguageStats
    text_length_stats: Dict[str, TextLengthStat]


# ─── Temizleme Şemaları ───────────────────────────────────────────────────────

class CleanupResponse(BaseModel):
    """DELETE /admin/cleanup/{job_id} — Geçici dosya temizleme yanıtı."""
    success: bool = Field(..., description="İşlem başarılı mı?")
    message: str = Field(..., description="Durum mesajı")
