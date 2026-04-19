"""
Admin Backend — Uygulama Giriş Noktası.

Başlatma:
  uvicorn app.main:app --reload --port 8001

Startup sırasında:
  1. Jobs dizini oluşturulur

Shutdown sırasında:
  (Gerekirse ek temizlik yapılabilir)

"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import admin_settings
from app.api.routes import extract, csv_ops, cleanup
from app.api import projects
from app.api import auth


# ─── Lifecycle ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama startup / shutdown yaşam döngüsü."""

    # ── STARTUP ──────────────────────────────────────
    print("=" * 60)
    print("LIFT UP Admin Backend baslatiliyor...")

    # Jobs dizinini oluştur
    jobs_dir = os.path.abspath(admin_settings.JOBS_DIR)
    os.makedirs(jobs_dir, exist_ok=True)
    print(f"Jobs dizini: {jobs_dir}")

    print("Admin backend hazir!")
    print("=" * 60 + "\n")

    yield

    # ── SHUTDOWN ─────────────────────────────────────
    print("\nAdmin backend kapatiliyor...")
    print("Gule gule!")


# ─── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="LIFT UP — Admin Backend API",
    description=(
        "LIFT UP Admin Paneli backend servisi. "
        "PDF bildiri kitaplarından makale çıkarma, "
        "CSV analizi ve veri yönetimi işlemlerini sağlar."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ─── CORS Middleware ──────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=admin_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Router'ları Kaydet ───────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(extract.router)
app.include_router(csv_ops.router)
app.include_router(cleanup.router)
app.include_router(projects.router)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Sistem"])
def health_check():
    """API sağlık durumu — frontend sistem durumu widget'ı tarafından kullanılır."""
    return {"status": "ok", "service": "LIFT UP Admin Backend"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Tarayıcının otomatik istediği favicon — boş yanıt döner."""
    from fastapi.responses import Response
    return Response(status_code=204)

# ─── Static Files (Admin Frontend) ───────────────────────────────────────────

# __file__ = admin_dashboard/backend/app/main.py
# Hedef  = admin_dashboard/frontend/
_FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
)

if os.path.isdir(_FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=_FRONTEND_DIR), name="static")


@app.get("/", tags=["Sistem"], include_in_schema=False)
def serve_login() -> FileResponse:
    """Admin giriş sayfasını serve eder."""
    return FileResponse(os.path.join(_FRONTEND_DIR, "login", "login.html"))


@app.get("/dashboard", tags=["Sistem"], include_in_schema=False)
def serve_frontend() -> FileResponse:
    """Admin dashboard ana sayfasını serve eder."""
    return FileResponse(os.path.join(_FRONTEND_DIR, "dashboard", "index.html"))


@app.get("/pdf-extract", tags=["Sistem"], include_in_schema=False)
def serve_pdf_extract() -> FileResponse:
    """PDF Veri Çıkarıcı sayfasını serve eder."""
    return FileResponse(os.path.join(_FRONTEND_DIR, "pdf-extract", "pdf-extract.html"))


@app.get("/reports", tags=["Sistem"], include_in_schema=False)
def serve_reports() -> FileResponse:
    """Raporlar ve İstatistikler sayfasını serve eder."""
    return FileResponse(os.path.join(_FRONTEND_DIR, "reports", "reports.html"))


@app.get("/data-management", tags=["Sistem"], include_in_schema=False)
def serve_data_management() -> FileResponse:
    """Veri Yönetimi sayfasını serve eder."""
    return FileResponse(os.path.join(_FRONTEND_DIR, "data-management", "data-management.html"))


@app.get("/settings", tags=["Sistem"], include_in_schema=False)
def serve_settings() -> FileResponse:
    """Ayarlar sayfasını serve eder."""
    return FileResponse(os.path.join(_FRONTEND_DIR, "settings", "settings.html"))
