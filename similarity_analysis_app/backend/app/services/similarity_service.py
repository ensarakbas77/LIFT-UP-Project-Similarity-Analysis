"""
Service Katmanı — Benzerlik Analizi.

Bu modül tüm iş mantığını barındırır:
  1. Embedding üretimi
  2. Veritabanı similarity sorgusu
  3. Eşik değerine göre sınıflandırma (5 seviye)
  4. Yanıt formatlama
"""

from app.core.config import settings
from app.services.embedding_service import generate_embedding, generate_emrecan_embedding
from app.db.queries import find_similar_projects, find_emrecan_similarities_by_ids
from app.schemas.response_schema import AnalyzeResponse, SimilarProject


def classify_similarity(score: float) -> str:
    """
    Benzerlik skoruna göre 5 seviyeli sınıflandırma yapar.

    Eşik Değerleri:
      - >= 0.90 → "critical"    (Çok Yüksek — Potansiyel Mükerrer Kayıt)
      - >= 0.70 → "high"        (Yüksek — Yakın Tematik Bağlantı)
      - >= 0.50 → "medium"      (Orta — Disiplin Paralelliği)
      - >= 0.25 → "low"         (Düşük — Uzak Tematik İlişki)
      - <  0.25 → "irrelevant"  (Alakasız — İlişki Yok)
    """
    if score >= settings.CRITICAL_THRESHOLD:
        return "critical"
    elif score >= settings.HIGH_THRESHOLD:
        return "high"
    elif score >= settings.MEDIUM_THRESHOLD:
        return "medium"
    elif score >= settings.LOW_THRESHOLD:
        return "low"
    else:
        return "irrelevant"


def analyze_project(title: str, abstract: str, keywords: str, top_k: int | None = None) -> AnalyzeResponse:
    """
    Proje benzerlik analizinin ana fonksiyonu.

    Akis:
      1. title + abstract + keywords → combined_text → embedding uret
      2. embedding ile DB'de similarity sorgusu yap
      3. Her proje icin bireysel siniflandirma yap
      4. En yuksek skora gore genel siniflandirma belirle
      5. AnalyzeResponse formatinda dondur

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

    # 1. SBERT embedding üretimi
    query_vector = generate_embedding(title, abstract, keywords)

    # 2. SBERT ile veritabanı sorgusu — en benzer projeler
    raw_results = find_similar_projects(query_vector, top_k=top_k)

    # 3. Emrecan BERT embedding üretimi
    emrecan_vector = generate_emrecan_embedding(title, abstract, keywords)

    # 4. Aynı projeler için Emrecan benzerlik skorlarını getir
    project_ids = [r["project_id"] for r in raw_results]
    emrecan_scores = find_emrecan_similarities_by_ids(project_ids, emrecan_vector)

    # 5. Sonuçları şemaya dönüştür — her projeye bireysel sınıflandırma ve Emrecan skoru ekle
    similar_projects = [
        SimilarProject(
            title=r["title"],
            abstract=r["abstract"] or "",
            similarity=r["similarity"],
            year=r["year"],
            classification=classify_similarity(r["similarity"]),
            emrecan_similarity=(
                max(0.0, emrecan_scores[r["project_id"]])
                if r["project_id"] in emrecan_scores
                else None
            ),
        )
        for r in raw_results
    ]

    # 6. Genel sınıflandırma — en yüksek skora göre
    max_score = similar_projects[0].similarity if similar_projects else 0.0
    classification = classify_similarity(max_score)

    return AnalyzeResponse(
        similar_projects=similar_projects,
        classification=classification,
    )
