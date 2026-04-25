"""
Admin Backend — Veri Güncelleme Router.

POST /data/upload-pkl
  - .pkl dosyasından projeleri veritabanına ekler (append, silme yok).
  - Admin şifresi ile çift doğrulama yapılır.
"""

import io

import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values, RealDictCursor

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.auth import get_current_admin, get_db, verify_password

router = APIRouter(prefix="/data", tags=["Veri Güncelleme"])

REQUIRED_COLUMNS = {"Year", "Title_TR", "Abstract_TR", "Keywords_TR", "combined_text", "embedding"}


@router.post("/upload-pkl")
async def upload_pkl(
    file: UploadFile = File(...),
    password: str = Form(...),
    payload: dict = Depends(get_current_admin),
):
    """
    .pkl dosyasından projeleri veritabanına ekler.

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

    # ── 2. Dosya doğrulama ────────────────────────────────────────────────────
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
    data_to_insert = []
    for _, row in df.iterrows():
        emb = row["embedding"]
        if isinstance(emb, np.ndarray):
            emb = emb.tolist()
        elif not isinstance(emb, list):
            emb = list(emb)

        data_to_insert.append((
            row["Year"],
            row["Title_TR"],
            row["Abstract_TR"],
            row["Keywords_TR"],
            row["combined_text"],
            emb,
        ))

    # ── 4. Veritabanına toplu ekleme ──────────────────────────────────────────
    insert_query = """
        INSERT INTO projects (year, title_tr, abstract_tr, keywords_tr, combined_text, embedding)
        VALUES %s
    """
    template = "(%s, %s, %s, %s, %s, %s::vector)"

    try:
        conn = get_db()
        cur = conn.cursor()
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
        "message": f"{len(data_to_insert)} proje başarıyla veritabanına eklendi.",
    }
