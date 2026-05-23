import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv

# .env dosyasından ortam değişkenlerini yükle
load_dotenv()

# Pickle dosyasından verileri yükle
df = pd.read_pickle("database/tusas_liftup_embeddings.pkl")

# PostgreSQL bağlantı parametreleri
DB_PARAMS = {
    "dbname": os.getenv("DB_NAME", "liftup_db"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

def migrate_data():
    conn = None
    try:
        # Veritabanı bağlantısını başlat
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # DataFrame'deki her satırı veritabanı formatına dönüştür
        data_to_insert = []
        for _, row in df.iterrows():
            # Numpy array'i Python listesine çevir (pgvector uyumluluğu için)
            emb = row['embedding']
            if isinstance(emb, np.ndarray):
                emb = emb.tolist()
            elif not isinstance(emb, list):
                emb = list(emb)
            
            data_to_insert.append((
                row['Year'], 
                row['Title_TR'], 
                row['Abstract_TR'], 
                row['Keywords_TR'], 
                row['combined_text'], 
                emb
            ))
        
        # Toplu veri ekleme sorgusu
        insert_query = """
            INSERT INTO projects (year, title_tr, abstract_tr, keywords_tr, combined_text, embedding)
            VALUES %s
        """
        template = "(%s, %s, %s, %s, %s, %s::vector)"
        
        print(f"🚀 {len(data_to_insert)} proje veritabanına aktarılıyor...")
        
        # Verileri toplu olarak ekle
        execute_values(cur, insert_query, data_to_insert, template=template)
        
        conn.commit()
        print(f"✅ Başarılı: {len(data_to_insert)} proje 'liftup_db' içine aktarıldı.")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Hata: {e}")
        
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    migrate_data()