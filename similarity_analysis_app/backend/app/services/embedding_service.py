"""
Service Katmanı — Embedding Üretimi.

Kullanıcıdan gelen metni temizler ve SBERT modeli ile vektöre dönüştürür.
Her alan ayrı ayrı encode edilir, ağırlıklı toplamı normalize edilerek döndürülür.
"""

import re
import numpy as np
from app.ml.model_loader import ModelLoader, EmrecanModelLoader

W_TITLE = 0.20
W_ABSTRACT = 0.70
W_KEYWORDS = 0.10


def clean_text(text: str) -> str:
    """
    Metni embedding üretimi için normalize eder.

    - Küçük harfe çevirir
    - Fazla boşlukları temizler
    - Özel karakterleri kaldırır
    """
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[#%&*_=+<>]", "", text)
    return text.strip()


def generate_embedding(title: str, abstract: str, keywords: str) -> list[float]:
    """
    Baslik, ozet ve anahtar kelimeleri ayrı ayrı encode edip ağırlıklı SBERT vektörü üretir.

    Akis:
      1. Her alan ayrı clean_text ile temizlenir
      2. Her alan için bağımsız SBERT vektörü üretilir
      3. Ağırlıklı toplam alınır: title×0.20 + abstract×0.70 + keywords×0.10
      4. L2 normalize edilerek döndürülür

    Args:
        title: Proje basligi.
        abstract: Proje ozeti.
        keywords: Anahtar kelimeler.

    Returns:
        384 boyutlu normalize edilmiş embedding vektörü (list[float]).
    """
    model = ModelLoader.get_model()

    vec_title = model.encode(clean_text(title), convert_to_numpy=True).astype(np.float32)
    vec_abstract = model.encode(clean_text(abstract), convert_to_numpy=True).astype(np.float32)
    vec_keywords = model.encode(clean_text(keywords), convert_to_numpy=True).astype(np.float32)

    query_vector = W_TITLE * vec_title + W_ABSTRACT * vec_abstract + W_KEYWORDS * vec_keywords

    norm = np.linalg.norm(query_vector)
    if norm > 0:
        query_vector = query_vector / norm

    return query_vector.tolist()


def generate_emrecan_embedding(title: str, abstract: str, keywords: str) -> list[float]:
    """
    Emrecan BERT modeli ile ağırlıklı embedding vektörü üretir.

    Akis:
      1. Her alan ayrı clean_text ile temizlenir
      2. Her alan için bağımsız Emrecan BERT vektörü üretilir
      3. Ağırlıklı toplam alınır: title×0.20 + abstract×0.70 + keywords×0.10
      4. L2 normalize edilerek döndürülür

    Args:
        title: Proje basligi.
        abstract: Proje ozeti.
        keywords: Anahtar kelimeler.

    Returns:
        Normalize edilmiş embedding vektörü (list[float]).
    """
    model = EmrecanModelLoader.get_model()

    vec_title = model.encode(clean_text(title), convert_to_numpy=True).astype(np.float32)
    vec_abstract = model.encode(clean_text(abstract), convert_to_numpy=True).astype(np.float32)
    vec_keywords = model.encode(clean_text(keywords), convert_to_numpy=True).astype(np.float32)

    query_vector = W_TITLE * vec_title + W_ABSTRACT * vec_abstract + W_KEYWORDS * vec_keywords

    norm = np.linalg.norm(query_vector)
    if norm > 0:
        query_vector = query_vector / norm

    return query_vector.tolist()
