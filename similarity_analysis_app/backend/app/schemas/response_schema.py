"""
Response şemaları — API'den dönen yanıt yapıları.
"""

from typing import Optional

from pydantic import BaseModel, Field


class SimilarProject(BaseModel):
    """Benzer proje bilgisi."""

    title: str = Field(..., description="Proje başlığı")
    abstract: str = Field(..., description="Proje özeti")
    similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity skoru (0-1 arası)",
    )
    year: Optional[str] = Field(None, description="Projenin yılı")
    classification: str = Field(
        ...,
        description="Bireysel benzerlik sınıflandırması: 'critical', 'high', 'medium', 'low' veya 'irrelevant'",
    )


class AnalyzeResponse(BaseModel):
    """
    POST /analyze endpoint'i için yanıt gövdesi.

    Attributes:
        similar_projects: En benzer projelerin listesi (her biri kendi sınıflandırmasıyla).
        classification: Genel benzerlik sınıflandırması (en yüksek skora göre).
    """

    similar_projects: list[SimilarProject] = Field(
        ..., description="Benzerlik skoruna göre sıralanmış projeler"
    )
    classification: str = Field(
        ...,
        description="Genel benzerlik sınıflandırması: 'critical', 'high', 'medium', 'low' veya 'irrelevant'",
    )


class HealthResponse(BaseModel):
    """Health check yanıtı."""

    status: str = Field(..., description="Servis durumu")
    model_loaded: bool = Field(..., description="SBERT modeli yüklü mü?")
    database_connected: bool = Field(..., description="Veritabanı bağlantısı aktif mi?")
