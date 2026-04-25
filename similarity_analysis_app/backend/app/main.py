"""
Semantic Project Similarity System — FastAPI Uygulaması.

Başlangıç noktası:
  uvicorn app.main:app --reload

Startup sırasında:
  1. SBERT modeli yüklenir
  2. PostgreSQL bağlantı havuzu oluşturulur

Shutdown sırasında:
  1. Bağlantı havuzu kapatılır
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.ml.model_loader import ModelLoader, EmrecanModelLoader
from app.db.session import DatabaseSession
from app.api.routes import analyze, health


# ─── Lifecycle ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama startup / shutdown yaşam döngüsü."""
    # ── STARTUP ──
    print("Uygulama baslatiliyor...")
    ModelLoader.load()              # SBERT modelini yükle
    EmrecanModelLoader.load()       # Emrecan BERT modelini yükle
    DatabaseSession.initialize()    # DB bağlantı havuzunu oluştur
    print("Sistem hazir!\n")

    yield

    # ── SHUTDOWN ──
    print("\nUygulama kapatiliyor...")
    DatabaseSession.close_all()     # DB bağlantılarını kapat
    print("Gule gule!")


# ─── FastAPI App ──────────────────────────────────────────────
app = FastAPI(
    title="LIFT UP — Proje Benzerlik Analizi API",
    description=(
        "SBERT + pgvector tabanlı semantik proje benzerlik analizi sistemi. "
        "Kullanıcıdan alınan proje başlığı ve özetini mevcut LIFT UP "
        "projeleriyle karşılaştırır."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ─── CORS Middleware ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Router'ları Kaydet ──────────────────────────────────────
app.include_router(analyze.router, tags=["Analiz"])
app.include_router(health.router, tags=["Sistem"])


# ─── Root Endpoint ───────────────────────────────────────────
@app.get("/", tags=["Sistem"])
def root():
    """API kök endpoint'i — karşılama mesajı."""
    return {
        "message": "LIFT UP — Proje Benzerlik Analizi API'sine hoş geldiniz!",
        "docs": "/docs",
        "health": "/health",
    }
