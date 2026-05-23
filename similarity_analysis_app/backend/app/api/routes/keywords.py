"""
Route Layer — /suggest-keywords Endpoint.

Proje özetine bakarak Gemini ile anahtar kelime önerisi üretir.
Basit IP-bazlı cooldown ile spam'e karşı korunur (frontend'in disable
mantığını atlayan kötü niyetli istekleri yumuşatır).
"""

import time

from fastapi import APIRouter, HTTPException, Request

from app.schemas.request_schema import KeywordSuggestRequest
from app.schemas.response_schema import KeywordSuggestResponse
from app.services.keyword_service import (
    GeminiInvalidResponse,
    GeminiNotConfigured,
    GeminiQuotaExceeded,
    GeminiUnavailable,
    suggest_keywords,
)

router = APIRouter()

# IP başına son istek zamanı — basit in-memory throttle
_LAST_REQUEST_AT: dict[str, float] = {}
_COOLDOWN_SECONDS: float = 5.0


@router.post(
    "/suggest-keywords",
    response_model=KeywordSuggestResponse,
    summary="Gemini ile Anahtar Kelime Önerisi",
    description=(
        "Verilen proje özetinden Gemini API kullanarak Türkçe anahtar "
        "kelime önerileri üretir."
    ),
)
def suggest(request: Request, body: KeywordSuggestRequest) -> KeywordSuggestResponse:
    # ── IP cooldown ──────────────────────────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    last = _LAST_REQUEST_AT.get(client_ip)
    if last is not None and (now - last) < _COOLDOWN_SECONDS:
        wait = round(_COOLDOWN_SECONDS - (now - last), 1)
        raise HTTPException(
            status_code=429,
            detail=f"Çok hızlı istek yapıyorsunuz. {wait} saniye sonra tekrar deneyin.",
        )
    _LAST_REQUEST_AT[client_ip] = now

    # ── Gemini çağrısı ───────────────────────────────────────────
    try:
        keywords = suggest_keywords(body.abstract)
        return KeywordSuggestResponse(keywords=keywords)

    except GeminiNotConfigured as e:
        raise HTTPException(status_code=500, detail=str(e))
    except GeminiQuotaExceeded as e:
        raise HTTPException(
            status_code=429,
            detail="Günlük AI öneri limitine ulaşıldı. Lütfen daha sonra tekrar deneyin.",
        ) from e
    except GeminiUnavailable as e:
        raise HTTPException(
            status_code=503,
            detail="AI servisi şu an meşgul. Lütfen biraz sonra tekrar deneyin.",
        ) from e
    except GeminiInvalidResponse as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI servisinden geçersiz yanıt: {e}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Anahtar kelime önerisi sırasında beklenmeyen bir hata oluştu: {e}",
        ) from e
