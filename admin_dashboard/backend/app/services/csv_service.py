"""
Admin Backend — Service Katmanı: CSV Analiz.

CSV dosyasını analiz eden iş mantığı katmanı.
Ana backend'deki similarity_service.py yapısını takip eder.

Akış:
  1. Job ID'ye göre CSV dosyasının yolu doğrulanır
  2. CSVAnalyzer ile tam analiz yapılır
  3. Pydantic şemasına dönüştürülerek döndürülür
"""

import os
from app.pdf_processing.analysis import CSVAnalyzer


from app.schemas.admin_schemas import (
    AnalyzeCSVResponse,
    BasicStats,
    MissingValuesStats,
    MissingValueDetail,
    LanguageStats,
    TextLengthStat,
)


def analyze_csv_file(csv_path: str) -> AnalyzeCSVResponse:
    """
    CSV dosyasını analiz eder ve yapılandırılmış yanıt döndürür.

    Ana backend'deki analyze_project() fonksiyonuna karşılık gelir:
    ham veriyi alır, iş mantığını uygular, Pydantic şemasına dönüştürür.

    Args:
        csv_path: Analiz edilecek CSV dosyasının tam yolu.

    Returns:
        AnalyzeCSVResponse — Pydantic doğrulamasından geçmiş analiz sonucu.

    Raises:
        FileNotFoundError: CSV dosyası bulunamazsa.
        RuntimeError:      Analiz sırasında beklenmedik hata.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV dosyası bulunamadı: {csv_path}")

    try:
        analyzer = CSVAnalyzer(csv_path)
        raw = analyzer.get_full_analysis()
    except Exception as e:
        raise RuntimeError(f"CSV analiz hatası: {e}") from e

    # ── BasicStats ──────────────────────────────────────────────────
    basic_raw = raw.get("basic_stats", {})
    basic = BasicStats(
        total_articles=basic_raw.get("total_articles", 0),
        total_columns=basic_raw.get("total_columns", 0),
        columns=basic_raw.get("columns", []),
        file_size=basic_raw.get("file_size", 0),
    )

    # ── MissingValuesStats ───────────────────────────────────────────
    missing_raw = raw.get("missing_values", {})
    missing = MissingValuesStats(
        has_missing=missing_raw.get("has_missing", False),
        total_missing=missing_raw.get("total_missing", 0),
        details=[
            MissingValueDetail(**d) for d in missing_raw.get("details", [])
        ],
    )

    # ── LanguageStats ────────────────────────────────────────────────
    lang_raw = raw.get("language_stats", {})
    lang = LanguageStats(
        tr_titles_filled=lang_raw.get("tr_titles_filled", 0),
        en_titles_filled=lang_raw.get("en_titles_filled", 0),
        tr_abstracts_filled=lang_raw.get("tr_abstracts_filled", 0),
        en_abstracts_filled=lang_raw.get("en_abstracts_filled", 0),
        tr_keywords_filled=lang_raw.get("tr_keywords_filled", 0),
        en_keywords_filled=lang_raw.get("en_keywords_filled", 0),
        tr_completeness=lang_raw.get("tr_completeness", 0.0),
        en_completeness=lang_raw.get("en_completeness", 0.0),
    )

    # ── TextLengthStats ──────────────────────────────────────────────
    text_len_raw = raw.get("text_length_stats", {})
    text_len = {
        col: TextLengthStat(**stats)
        for col, stats in text_len_raw.items()
    }

    return AnalyzeCSVResponse(
        basic_stats=basic,
        missing_values=missing,
        first_rows=raw.get("first_rows", []),
        year_distribution=raw.get("year_distribution", {}),
        language_stats=lang,
        text_length_stats=text_len,
    )
