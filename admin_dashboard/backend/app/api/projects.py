import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException
from app.core.config import admin_settings

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

@router.get("/")
def get_all_projects():
    """Tüm projeleri veritabanından döndürür."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Veritabanına bağlanılamadı. .env ayarlarınızı kontrol edin.")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Sadece arayüzde gösterilecek hafif kolonları çekiyoruz, ağır vektörleri çekmiyoruz
        query = "SELECT id, year, title_tr as title, abstract_tr as abstract, keywords_tr as keywords FROM projects ORDER BY id ASC"
        cur.execute(query)
        rows = cur.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veriler okunurken hata oluştu: {str(e)}")
    finally:
        if conn:
            cur.close()
            conn.close()
