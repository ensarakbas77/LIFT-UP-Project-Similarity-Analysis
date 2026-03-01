"""
Service Katmanı — Embedding Üretimi.

Kullanıcıdan gelen metni temizler ve SBERT modeli ile vektöre dönüştürür.
"""

import re
from app.ml.model_loader import ModelLoader


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
    Baslik, ozet ve anahtar kelimeleri birlestirip SBERT embedding vektoru uretir.

    Akis:
      1. title + abstract + keywords → combined_text
      2. combined_text temizlenir (clean_text)
      3. SBERT ile embedding uretilir

    Args:
        title: Proje basligi.
        abstract: Proje ozeti.
        keywords: Anahtar kelimeler.

    Returns:
        384 boyutlu embedding vektoru (list[float]).
    """
    combined_text = f"{clean_text(title)} {clean_text(abstract)} {clean_text(keywords)}"

    model = ModelLoader.get_model()
    embedding = model.encode(combined_text)

    return embedding.tolist()
