"""
Route Layer — /projects Endpoint.

Veri tabanındaki tüm projeleri listeler. Frontend'deki "Proje Geçmişi"
sekmesi tarafından kullanılır.
"""

from fastapi import APIRouter, HTTPException

from app.db.session import DatabaseSession

router = APIRouter(prefix="/projects", tags=["Projeler"])


@router.get(
    "/",
    summary="Tüm Projeler",
    description="Veri tabanındaki tüm LIFT UP projelerini döndürür.",
)
def list_projects():
    """projects tablosundaki tüm projeleri döndürür."""
    conn = None
    try:
        conn = DatabaseSession.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, year, title_tr, abstract_tr, keywords_tr "
            "FROM projects ORDER BY id ASC;"
        )
        rows = cur.fetchall()
        cur.close()

        return [
            {
                "id": row[0],
                "year": row[1],
                "title": row[2],
                "abstract": row[3],
                "keywords": row[4],
            }
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Projeler okunurken hata oluştu: {str(e)}"
        )
    finally:
        if conn:
            DatabaseSession.return_connection(conn)
