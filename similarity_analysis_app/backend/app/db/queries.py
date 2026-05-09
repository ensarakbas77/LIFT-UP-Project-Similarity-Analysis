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
                   1 - (sbert_embedding <=> %s::vector) AS similarity,
                   year
            FROM projects
            ORDER BY sbert_embedding <=> %s::vector
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


def find_emrecan_similarities_by_ids(
    project_ids: list[int], query_vector: list[float]
) -> dict[int, float]:
    """
    Verilen proje ID'leri için projects tablosundan Emrecan BERT benzerlik skorlarını getirir.

    Args:
        project_ids: SBERT sorgusundan dönen proje ID listesi.
        query_vector: Emrecan BERT sorgu embedding vektörü.

    Returns:
        {project_id: emrecan_similarity_score} sözlüğü.
    """
    if not project_ids:
        return {}

    conn = None
    try:
        conn = DatabaseSession.get_connection()
        cur = conn.cursor()

        sql = """
            SELECT id,
                   1 - (emrecan_embedding <=> %s::vector) AS similarity
            FROM projects
            WHERE id = ANY(%s);
        """

        cur.execute(sql, (query_vector, project_ids))
        rows = cur.fetchall()

        cur.close()
        return {row[0]: round(float(row[1]), 4) for row in rows}

    except Exception as e:
        raise RuntimeError(f"Emrecan veritabanı sorgu hatası: {e}") from e

    finally:
        if conn:
            DatabaseSession.return_connection(conn)
