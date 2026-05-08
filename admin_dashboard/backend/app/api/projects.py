import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, Depends, HTTPException
from app.core.config import admin_settings
from app.api.auth import get_current_admin

router = APIRouter(prefix="/api/projects", tags=["Proje Veritabanı"])


def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname=admin_settings.DB_NAME,
            user=admin_settings.DB_USER,
            password=admin_settings.DB_PASSWORD,
            host=admin_settings.DB_HOST,
            port=admin_settings.DB_PORT
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


@router.get("/", dependencies=[Depends(get_current_admin)])
def get_all_projects():
    """projects tablosundaki tüm projeleri döndürür."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Veritabanına bağlanılamadı. .env ayarlarınızı kontrol edin.")

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT id, year, title_tr AS title, abstract_tr AS abstract, keywords_tr AS keywords "
            "FROM projects ORDER BY id ASC"
        )
        rows = cur.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veriler okunurken hata oluştu: {str(e)}")
    finally:
        if conn:
            cur.close()
            conn.close()


@router.get("/stats", dependencies=[Depends(get_current_admin)])
def get_project_stats():
    """Dashboard için özet istatistikler döndürür."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Veritabanına bağlanılamadı. .env ayarlarınızı kontrol edin.")

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT
                COUNT(*)             AS total_projects,
                COUNT(DISTINCT year) AS total_years
            FROM projects
            """
        )
        base = cur.fetchone() or {}

        cur.execute(
            """
            SELECT COUNT(*) AS unique_keywords FROM (
                SELECT DISTINCT TRIM(LOWER(kw)) AS kw
                FROM projects, LATERAL unnest(string_to_array(keywords_tr, ',')) AS kw
                WHERE keywords_tr IS NOT NULL AND keywords_tr <> ''
            ) t
            WHERE kw <> ''
            """
        )
        kw = cur.fetchone() or {}

        cur.execute(
            """
            SELECT year, COUNT(*) AS project_count
            FROM projects
            WHERE year IS NOT NULL AND year <> ''
            GROUP BY year
            ORDER BY project_count DESC, year DESC
            LIMIT 1
            """
        )
        top = cur.fetchone() or {}

        return {
            "total_projects":   base.get("total_projects", 0),
            "total_years":      base.get("total_years", 0),
            "unique_keywords":  kw.get("unique_keywords", 0),
            "top_year":         top.get("year"),
            "top_year_count":   top.get("project_count", 0),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İstatistikler okunurken hata oluştu: {str(e)}")
    finally:
        if conn:
            cur.close()
            conn.close()
