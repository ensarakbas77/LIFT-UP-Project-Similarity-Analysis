import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Query
from app.core.config import admin_settings

router = APIRouter(prefix="/api/projects", tags=["Proje Veritabanı"])

ALLOWED_TABLES = {"projects", "sbert_projects", "emrecan_projects"}

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

@router.get("/")
def get_all_projects(table: str = Query("projects")):
    """Belirtilen tablodan projeleri döndürür (projects, sbert_projects, emrecan_projects)."""
    if table not in ALLOWED_TABLES:
        raise HTTPException(
            status_code=422,
            detail=f"Geçersiz tablo adı. İzin verilenler: {', '.join(sorted(ALLOWED_TABLES))}",
        )

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Veritabanına bağlanılamadı. .env ayarlarınızı kontrol edin.")

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Vektör sütunu hariç hafif kolonları çekiyoruz
        # table adı ALLOWED_TABLES ile doğrulandı; string interpolasyon güvenlidir.
        query = (
            f"SELECT id, year, title_tr AS title, abstract_tr AS abstract, keywords_tr AS keywords "
            f"FROM {table} ORDER BY id ASC"
        )
        cur.execute(query)
        rows = cur.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veriler okunurken hata oluştu: {str(e)}")
    finally:
        if conn:
            cur.close()
            conn.close()
