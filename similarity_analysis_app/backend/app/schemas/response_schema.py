"""
Response şemaları — API'den dönen yanıt yapıları.
"""

from typing import Optional

from pydantic import BaseModel, Field


class SimilarProject(BaseModel):
    """Benzer proje bilgisi."""

    project_id: int = Field(..., description="Projenin veritabanı ID'si")
    title: str = Field(..., description="Proje başlığı")
    abstract: str = Field(..., description="Proje özeti")
    similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity skoru (0-1 arası)",
    )
    year: Optional[str] = Field(None, description="Projenin yılı")


class AnalyzeResponse(BaseModel):
    """
    POST /analyze endpoint'i için yanıt gövdesi.

    Attributes:
        similar_projects: En benzer projelerin listesi.
        classification: Genel benzerlik sınıflandırması (high / medium / low).
    """

    similar_projects: list[SimilarProject] = Field(
        ..., description="Benzerlik skoruna göre sıralanmış projeler"
    )
    classification: str = Field(
        ...,
        description="Benzerlik sınıflandırması: 'high', 'medium' veya 'low'",
    )


class HealthResponse(BaseModel):
    """Health check yanıtı."""

    status: str = Field(..., description="Servis durumu")
    model_loaded: bool = Field(..., description="SBERT modeli yüklü mü?")
    database_connected: bool = Field(..., description="Veritabanı bağlantısı aktif mi?")
