"""
Request şemaları — API'ye gelen istek yapıları.
"""

from typing import Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """
    POST /analyze endpoint'i icin istek govdesi.

    Attributes:
        title: Proje basligi.
        abstract: Proje ozeti.
        keywords: Anahtar kelimeler.
        top_k: Dondurilecek benzer proje sayisi.
    """

    title: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Proje basligi",
        examples=["Hava Muharebesinde Otonom Savunma Algoritmasinin Gelistirilmesi"],
    )
    abstract: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Proje ozeti",
        examples=["Bu calismada, temel hava muharebesi manevralari kullanilarak..."],
    )
    keywords: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Anahtar kelimeler",
        examples=["bire-bir hava muharebesi, kural tabanli yontem, temel hava muharebe manevralari."],
    )
    top_k: Optional[int] = Field(
        None,
        ge=1,
        le=50,
        description="Dondurilecek benzer proje sayisi (varsayilan: 5)",
        examples=[5, 10, 20],
    )
