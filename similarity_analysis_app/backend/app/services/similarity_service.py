"""
Service Katmanı — Benzerlik Analizi.

Bu modül tüm iş mantığını barındırır:
  1. Embedding üretimi
  2. Veritabanı similarity sorgusu
  3. Eşik değerine göre sınıflandırma
  4. Yanıt formatlama
"""

from app.core.config import settings
from app.services.embedding_service import generate_embedding
from app.db.queries import find_similar_projects
from app.schemas.response_schema import AnalyzeResponse, SimilarProject


def classify_similarity(score: float) -> str:
    """
    En yüksek benzerlik skoruna göre sınıflandırma yapar.

    Eşik Değerleri (varsayılan):
      - >= 0.75 → "high"   (yüksek benzerlik)
      - >= 0.50 → "medium" (orta benzerlik)
      - <  0.50 → "low"    (düşük benzerlik)
    """
    if score >= settings.HIGH_THRESHOLD:
        return "high"
    elif score >= settings.MEDIUM_THRESHOLD:
        return "medium"
    else:
        return "low"


def analyze_project(title: str, abstract: str, keywords: str, top_k: int | None = None) -> AnalyzeResponse:
    """
    Proje benzerlik analizinin ana fonksiyonu.

    Akis:
      1. title + abstract + keywords → combined_text → embedding uret
      2. embedding ile DB'de similarity sorgusu yap
      3. En yuksek skora gore siniflandir
      4. AnalyzeResponse formatinda dondur

    Args:
        title: Proje basligi.
        abstract: Proje ozeti.
        keywords: Anahtar kelimeler.
        top_k: Dondurilecek sonuc sayisi (varsayilan: config'den).

    Returns:
        AnalyzeResponse nesnesi.
    """
    if top_k is None:
        top_k = settings.DEFAULT_TOP_K

    # 1. Embedding uretimi (title + abstract + keywords → combined_text → embedding)
    query_vector = generate_embedding(title, abstract, keywords)

    # 2. Veritabanı sorgusu — en benzer projeler
    raw_results = find_similar_projects(query_vector, top_k=top_k)

    # 3. Sonuçları şemaya dönüştür
    similar_projects = [
        SimilarProject(
            project_id=r["project_id"],
            title=r["title"],
            abstract=r["abstract"] or "",
            similarity=r["similarity"],
            year=r["year"],
        )
        for r in raw_results
    ]

    # 4. Sınıflandırma — en yüksek skora göre
    max_score = similar_projects[0].similarity if similar_projects else 0.0
    classification = classify_similarity(max_score)

    return AnalyzeResponse(
        similar_projects=similar_projects,
        classification=classification,
    )
