"""
Service Katmanı — Gemini API ile Anahtar Kelime Önerisi.

Kullanıcının yazdığı proje özetinden Gemini modeli ile 5 adet anahtar kelime
önerir. Hata durumlarında (503 sunucu meşgul, 429 kota dolu) zarif şekilde
geri döner ve kullanıcı dostu mesajlar üretir.
"""

import json
import time
from google import genai
from google.genai import types

from app.core.config import settings


# Hata türleri — route katmanına HTTP statüsünü taşıması için
class GeminiQuotaExceeded(Exception):
    """API kotası dolduğunda fırlatılır (HTTP 429)."""


class GeminiUnavailable(Exception):
    """Gemini servisi geçici olarak ulaşılamaz olduğunda fırlatılır (HTTP 503)."""


class GeminiNotConfigured(Exception):
    """GEMINI_API_KEY ayarlanmamış (HTTP 500)."""


class GeminiInvalidResponse(Exception):
    """Gemini cevabı beklenen JSON listesi formatında değil (HTTP 502)."""


def suggest_keywords(abstract: str, max_attempts: int = 3) -> list[str]:
    """
    Verilen proje özetinden Gemini ile anahtar kelime önerileri üretir.

    Args:
        abstract: Proje özeti.
        max_attempts: 503 hatasında üst üste deneme sayısı.

    Returns:
        Kelime listesi (varsayılan olarak 5 kelime).

    Raises:
        GeminiNotConfigured, GeminiQuotaExceeded, GeminiUnavailable, GeminiInvalidResponse
    """
    if not settings.GEMINI_API_KEY:
        raise GeminiNotConfigured("GEMINI_API_KEY .env dosyasında tanımlı değil.")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    count = settings.GEMINI_KEYWORD_COUNT

    prompt = (
        "Sen uzman bir sistem asistanısın. Sana verilen proje özetini analiz et ve "
        f"projeyi en iyi temsil eden tam olarak {count} adet Türkçe anahtar kelime çıkar. "
        "Çıktıyı başka hiçbir açıklama, yorum veya ek metin olmadan, sadece anahtar "
        "kelimeleri içeren bir JSON dizisi (array) olarak ver. "
        f'Örnek format: ["Kelime1", "Kelime2", "Kelime3", "Kelime4", "Kelime5"]\n\n'
        f"Proje Özeti:\n{abstract.strip()}"
    )

    contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.3,
    )

    last_error: Exception | None = None
    for attempt in range(max_attempts):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=config,
            )
            data = json.loads(response.text)

            if not isinstance(data, list):
                raise GeminiInvalidResponse("Gemini bir JSON dizisi döndürmedi.")

            cleaned: list[str] = []
            seen: set[str] = set()
            for item in data:
                if not isinstance(item, str):
                    continue
                kw = item.strip()
                if not kw:
                    continue
                key = kw.lower()
                if key in seen:
                    continue
                seen.add(key)
                cleaned.append(kw)

            if not cleaned:
                raise GeminiInvalidResponse("Gemini boş bir kelime listesi döndürdü.")

            return cleaned[:count]

        except (GeminiInvalidResponse,):
            raise

        except json.JSONDecodeError as e:
            raise GeminiInvalidResponse(f"Gemini cevabı JSON olarak parse edilemedi: {e}") from e

        except Exception as e:
            msg = str(e)
            last_error = e

            # Kota / rate-limit
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower():
                raise GeminiQuotaExceeded(
                    "Gemini API günlük/dakikalık limitinize ulaşıldı."
                ) from e

            # Geçici sunucu meşguliyeti — exponential backoff ile yeniden dene
            if "503" in msg or "UNAVAILABLE" in msg or "504" in msg:
                if attempt < max_attempts - 1:
                    time.sleep(2 ** attempt)
                    continue
                raise GeminiUnavailable(
                    "Gemini servisi şu an meşgul. Lütfen biraz sonra tekrar deneyin."
                ) from e

            # Diğer hatalar
            raise

    # Buraya düşmek için tüm denemeler 503 olmalı
    raise GeminiUnavailable(
        "Gemini servisi şu an meşgul. Lütfen biraz sonra tekrar deneyin."
    ) from last_error
