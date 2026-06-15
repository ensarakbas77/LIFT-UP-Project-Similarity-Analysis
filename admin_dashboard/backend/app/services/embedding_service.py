"""
Service Katmanı — Embedding Üretimi (Admin Backend).

NOT (kod tekrarı bilinçlidir):
    clean_text + ağırlıklı embedding mantığı, similarity_analysis_app/backend/
    app/services/embedding_service.py ile AYNIDIR. İki servis ayrı Docker
    imajları olduğu için kopyalanır; biri değişirse diğeri de güncellenmelidir.

Bu dosya, similarity'deki tek-kayıt mantığına ek olarak CSV toplu yüklemesi
için *batch* fonksiyonlar içerir (notebook'taki toplu encode yaklaşımı).
Ağırlıklar, temizleme ve normalizasyon birebir aynı kalır ki üretilen
vektörler notebook/similarity ile tutarlı olsun.
"""

import re

import numpy as np

from app.ml.model_loader import ModelLoader, EmrecanModelLoader

# Notebook + similarity ile AYNI ağırlıklar — değiştirmeyin.
W_TITLE = 0.20
W_ABSTRACT = 0.70
W_KEYWORDS = 0.10


def clean_text(text) -> str:
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


def build_combined_text(title, abstract, keywords) -> str:
    """
    DB'de saklanan `combined_text` alanını üretir.

    Notebook'taki `combined_text` ile tutarlı olacak şekilde temizlenmiş
    başlık + özet + anahtar kelimeleri birleştirir. (Embedding bu alandan
    DEĞİL, üç alanın ayrı ayrı encode edilmesinden üretilir; bu alan yalnızca
    saklama/gösterim içindir.)
    """
    parts = [clean_text(title), clean_text(abstract), clean_text(keywords)]
    return " ".join(p for p in parts if p).strip()


def _weighted_normalized(t_emb, a_emb, k_emb) -> np.ndarray:
    """
    Üç embedding matrisini (N×D) ağırlıklı toplar ve satır bazında L2 normalize
    eder. Notebook'taki Emrecan batch mantığının birebir aynısı.
    """
    weighted = (W_TITLE * t_emb) + (W_ABSTRACT * a_emb) + (W_KEYWORDS * k_emb)
    norms = np.linalg.norm(weighted, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return weighted / norms


def _encode_batch(model, titles, abstracts, keywords) -> np.ndarray:
    """Bir model ile başlık/özet/anahtar listelerini toplu encode edip birleştirir."""
    t = [clean_text(x) for x in titles]
    a = [clean_text(x) for x in abstracts]
    k = [clean_text(x) for x in keywords]

    t_emb = model.encode(t, convert_to_numpy=True, show_progress_bar=False).astype(np.float32)
    a_emb = model.encode(a, convert_to_numpy=True, show_progress_bar=False).astype(np.float32)
    k_emb = model.encode(k, convert_to_numpy=True, show_progress_bar=False).astype(np.float32)

    return _weighted_normalized(t_emb, a_emb, k_emb)


def generate_sbert_embeddings_batch(titles, abstracts, keywords) -> list[list[float]]:
    """
    SBERT (384d) modeliyle bir grup proje için ağırlıklı embedding üretir.

    Args:
        titles, abstracts, keywords: Eşit uzunlukta metin listeleri.

    Returns:
        Her proje için normalize edilmiş 384 boyutlu vektör listesi.
    """
    model = ModelLoader.get_model()
    return _encode_batch(model, titles, abstracts, keywords).tolist()


def generate_emrecan_embeddings_batch(titles, abstracts, keywords) -> list[list[float]]:
    """
    Emrecan BERT (768d) modeliyle bir grup proje için ağırlıklı embedding üretir.

    Args:
        titles, abstracts, keywords: Eşit uzunlukta metin listeleri.

    Returns:
        Her proje için normalize edilmiş 768 boyutlu vektör listesi.
    """
    model = EmrecanModelLoader.get_model()
    return _encode_batch(model, titles, abstracts, keywords).tolist()
