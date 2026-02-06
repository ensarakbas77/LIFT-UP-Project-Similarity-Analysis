import os
import psycopg2
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# Veritabanı bağlantı ayarları
DB_PARAMS = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT")
}

def fetch_all_columns():

    """
    Örnek olması amacıyla, veri tabanındaki ilk 5 kaydı getiren fonksiyon
    """
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # Tüm sütunları çekiyoruz
        query = "SELECT * FROM projects LIMIT 5;"
        cur.execute(query)
        
        # Sütun isimlerini dinamik olarak alalım
        colnames = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        
        print(f"📊 {len(rows)} kayıt tüm detaylarıyla getiriliyor...\n")

        for i, row in enumerate(rows, 1):
            print(f"🌟 --- KAYIT {i} --- 🌟")
            # Sütun adı ve veriyi eşleştirerek yazdırıyoruz
            for colname, value in zip(colnames, row):
                print(f"🔹 {colname}: {value}")
            print("\n" + "="*80 + "\n")
            
    except Exception as e:
        print(f"❌ Hata: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    fetch_all_columns()