"""
Database Katmanı — pgvector Sorguları.

Cosine similarity hesaplaması pgvector'ün <=> operatörü ile yapılır.
1 - (A <=> B) = Cosine Similarity
"""

from app.db.session import DatabaseSession


def find_similar_projects(query_vector: list[float], top_k: int = 5) -> list[dict]:
    """
    Verilen embedding vektörüne en benzer projeleri veritabanından getirir.

    Args:
        query_vector: Sorgu metninin embedding vektörü (384 boyutlu).
        top_k: Döndürülecek en benzer proje sayısı.

    Returns:
        Benzerlik skoruna göre sıralanmış proje listesi.
    """
    conn = None
    try:
        conn = DatabaseSession.get_connection()
        cur = conn.cursor()

        sql = """
            SELECT id, title_tr, abstract_tr,
                   1 - (embedding <=> %s::vector) AS similarity,
                   year
            FROM sbert_projects
            ORDER BY embedding <=> %s::vector
            LIMIT %s;
        """

        cur.execute(sql, (query_vector, query_vector, top_k))
        rows = cur.fetchall()

        results = []
        for row in rows:
            results.append({
                "project_id": row[0],
                "title": row[1],
                "abstract": row[2],
                "similarity": round(float(row[3]), 4),
                "year": row[4],
            })

        cur.close()
        return results

    except Exception as e:
        raise RuntimeError(f"Veritabanı sorgu hatası: {e}") from e

    finally:
        if conn:
            DatabaseSession.return_connection(conn)
