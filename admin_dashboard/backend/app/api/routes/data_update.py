"""
Admin Backend — Veri Güncelleme Router.

POST /data/upload-pkl
  - .pkl dosyasından projeleri veritabanına ekler (append, silme yok).
  - Notebook akışını uygulayan (embedding'leri hazır) kullanıcılar içindir.
  - Admin şifresi ile çift doğrulama yapılır.

POST /data/upload-csv
  - PDF Veri Çıkarıcı'dan gelen ham CSV'yi (embedding'siz) alır.
  - Arka tarafta combined_text + SBERT + Emrecan embedding üretir, DB'ye ekler.
  - Notebook ile uğraşmak istemeyen kullanıcılar içindir (CPU'da uzun sürebilir).
  - Admin şifresi ile çift doğrulama yapılır.
"""

import io

import numpy as np
import pandas as pd
from psycopg2.extras import execute_values, RealDictCursor

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.auth import get_current_admin, get_db, verify_password
from app.ml.model_loader import ModelLoader, EmrecanModelLoader
from app.services.embedding_service import (
    build_combined_text,
    generate_sbert_embeddings_batch,
    generate_emrecan_embeddings_batch,
)

router = APIRouter(prefix="/data", tags=["Veri Güncelleme"])

REQUIRED_COLUMNS = {
    "Year", "Title_TR", "Abstract_TR", "Keywords_TR",
    "combined_text", "sbert_embedding", "emrecan_embedding",
}

# CSV yolunda embedding'leri biz ürettiğimiz için yalnızca ham metin alanları gerekir.
REQUIRED_CSV_COLUMNS = {"Year", "Title_TR", "Abstract_TR", "Keywords_TR"}


@router.post("/upload-pkl")
async def upload_pkl(
    file: UploadFile = File(...),
    password: str = Form(...),
    payload: dict = Depends(get_current_admin),
):
    """
    .pkl dosyasından projeleri projects tablosuna ekler.

    - Mevcut kayıtlar korunur, yeni kayıtlar sona eklenir.
    - Admin şifresi yeniden doğrulanır; hatalıysa işlem iptal edilir.
    """
    user_id = int(payload.get("sub", 0))

    # ── 1. Şifre doğrulama ────────────────────────────────────────────────────
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT password_hash FROM admin_users WHERE id = %s", (user_id,))
        user_row = cur.fetchone()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı hatası: {e}")
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    if not user_row or not verify_password(password, user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Şifre hatalı. İşlem iptal edildi.")

    # ── 2. Dosya formatı doğrulama ────────────────────────────────────────────
    if not (file.filename or "").endswith(".pkl"):
        raise HTTPException(status_code=422, detail="Yalnızca .pkl uzantılı dosyalar kabul edilir.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=422, detail="Dosya boş.")

    try:
        df = pd.read_pickle(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Dosya okunamadı: {e}")

    if not isinstance(df, pd.DataFrame):
        raise HTTPException(status_code=422, detail="Dosya bir pandas DataFrame içermiyor.")

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Eksik sütunlar: {', '.join(sorted(missing))}",
        )

    if len(df) == 0:
        raise HTTPException(status_code=422, detail="DataFrame boş, eklenecek kayıt yok.")

    # ── 3. Veri hazırlama ─────────────────────────────────────────────────────
    def to_list(val):
        if isinstance(val, np.ndarray):
            return val.tolist()
        if isinstance(val, list):
            return val
        return list(val)

    data_to_insert = []
    for _, row in df.iterrows():
        data_to_insert.append((
            row["Year"],
            row["Title_TR"],
            row["Abstract_TR"],
            row["Keywords_TR"],
            row["combined_text"],
            to_list(row["sbert_embedding"]),
            to_list(row["emrecan_embedding"]),
        ))

    # ── 4. Veritabanına toplu ekleme ──────────────────────────────────────────
    insert_query = """
        INSERT INTO projects
            (year, title_tr, abstract_tr, keywords_tr, combined_text, sbert_embedding, emrecan_embedding)
        VALUES %s
    """
    template = "(%s, %s, %s, %s, %s, %s::vector, %s::vector)"

    try:
        conn = get_db()
        cur = conn.cursor()
        # SERIAL dizisini mevcut max(id) ile senkronize et
        cur.execute(
            "SELECT setval(pg_get_serial_sequence('projects', 'id'), COALESCE(MAX(id), 0)) FROM projects"
        )
        execute_values(cur, insert_query, data_to_insert, template=template)
        conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Veritabanı ekleme hatası: {e}")
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    return {
        "success": True,
        "inserted": len(data_to_insert),
        "table": "projects",
        "message": f"{len(data_to_insert)} proje 'projects' tablosuna başarıyla eklendi.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# CSV → embedding → DB  (ham veri yolu; notebook gerektirmez)
# ══════════════════════════════════════════════════════════════════════════════

def _verify_admin_password(user_id: int, password: str) -> None:
    """Admin şifresini yeniden doğrular; hatalıysa HTTPException fırlatır."""
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT password_hash FROM admin_users WHERE id = %s", (user_id,))
        user_row = cur.fetchone()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı hatası: {e}")
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    if not user_row or not verify_password(password, user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Şifre hatalı. İşlem iptal edildi.")


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    password: str = Form(...),
    payload: dict = Depends(get_current_admin),
):
    """
    PDF Veri Çıkarıcı'dan gelen ham CSV'yi alır, embedding üretip DB'ye ekler.

    Beklenen sütunlar: Year, Title_TR, Abstract_TR, Keywords_TR
    (PDF çıkarıcının ürettiği diğer sütunlar — PageNumber, *_EN — yok sayılır.)

    Akış:
      1. Admin şifresi yeniden doğrulanır.
      2. CSV okunur, sütunlar doğrulanır.
      3. Başlığı VE özeti boş olan satırlar atlanır.
      4. SBERT + Emrecan embedding'leri ve combined_text üretilir.
      5. Mevcut kayıtlar korunarak projects tablosuna eklenir.
    """
    user_id = int(payload.get("sub", 0))

    # ── 1. Şifre doğrulama ────────────────────────────────────────────────────
    _verify_admin_password(user_id, password)

    # ── 2. Dosya formatı doğrulama ────────────────────────────────────────────
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=422, detail="Yalnızca .csv uzantılı dosyalar kabul edilir.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=422, detail="Dosya boş.")

    # PDF çıkarıcı CSV'yi utf-8-sig ile yazar; okuyamazsa varsayılana düş.
    try:
        df = pd.read_csv(io.BytesIO(contents), encoding="utf-8-sig")
    except Exception:
        try:
            df = pd.read_csv(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"CSV okunamadı: {e}")

    missing = REQUIRED_CSV_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Eksik sütunlar: {', '.join(sorted(missing))}",
        )

    total_rows = len(df)
    if total_rows == 0:
        raise HTTPException(status_code=422, detail="CSV boş, eklenecek kayıt yok.")

    # ── 3. Temizlik + boş satırları atla ──────────────────────────────────────
    for col in ("Year", "Title_TR", "Abstract_TR", "Keywords_TR"):
        df[col] = df[col].fillna("").astype(str).str.strip()

    # Başlığı VE özeti boş olan satırlar anlamlı embedding üretmez → atla.
    valid_mask = ~((df["Title_TR"] == "") & (df["Abstract_TR"] == ""))
    df_valid = df[valid_mask].reset_index(drop=True)
    skipped = total_rows - len(df_valid)

    if len(df_valid) == 0:
        raise HTTPException(
            status_code=422,
            detail="Geçerli satır bulunamadı (tüm satırlarda başlık ve özet boş).",
        )

    # ── 4. Modelleri lazy yükle (ilk çağrıda RAM'e alınır) ────────────────────
    try:
        ModelLoader.load()
        EmrecanModelLoader.load()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Embedding modelleri yüklenemedi: {e}")

    titles = df_valid["Title_TR"].tolist()
    abstracts = df_valid["Abstract_TR"].tolist()
    keywords = df_valid["Keywords_TR"].tolist()
    years = df_valid["Year"].tolist()

    # ── 5. Embedding üretimi (batch) ──────────────────────────────────────────
    try:
        sbert_vectors = generate_sbert_embeddings_batch(titles, abstracts, keywords)
        emrecan_vectors = generate_emrecan_embeddings_batch(titles, abstracts, keywords)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding üretim hatası: {e}")

    # ── 6. Insert verisini hazırla ────────────────────────────────────────────
    data_to_insert = []
    for i in range(len(df_valid)):
        combined = build_combined_text(titles[i], abstracts[i], keywords[i])
        data_to_insert.append((
            years[i],
            titles[i],
            abstracts[i],
            keywords[i],
            combined,
            sbert_vectors[i],
            emrecan_vectors[i],
        ))

    # ── 7. Veritabanına toplu ekleme (upload-pkl ile aynı güvenli pattern) ────
    insert_query = """
        INSERT INTO projects
            (year, title_tr, abstract_tr, keywords_tr, combined_text, sbert_embedding, emrecan_embedding)
        VALUES %s
    """
    template = "(%s, %s, %s, %s, %s, %s::vector, %s::vector)"

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT setval(pg_get_serial_sequence('projects', 'id'), COALESCE(MAX(id), 0)) FROM projects"
        )
        execute_values(cur, insert_query, data_to_insert, template=template)
        conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Veritabanı ekleme hatası: {e}")
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    msg = f"{len(data_to_insert)} proje 'projects' tablosuna başarıyla eklendi."
    if skipped:
        msg += f" ({skipped} satır boş olduğu için atlandı.)"

    return {
        "success": True,
        "inserted": len(data_to_insert),
        "skipped": skipped,
        "table": "projects",
        "message": msg,
    }
