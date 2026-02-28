import os
import re
import numpy as np
import psycopg2
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer, util

# 1. Ortam Değişkenlerini Yükle
load_dotenv()

# 2. Modeli Yükle
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# 3. Metin Temizleme Fonksiyonu
def clean_text(text):
    if not isinstance(text, str): return ""
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[#%&*_=+<>]", "", text)
    return text.strip()

# 4. Veritabanı Bağlantı Bilgileri
DB_PARAMS = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT")
}

def search_in_db(raw_title, raw_abstract, raw_keywords, top_k=5):
    """
    Veritabanında benzer projeleri arar ve sonuçları yazdırır.

    Args:
        raw_title (str): Proje başlığı.
        raw_abstract (str): Proje özeti.
        raw_keywords (str): Proje anahtar kelimeleri.
        top_k (int): Gösterilecek en benzer ve en az benzer sonuç sayısı.
    """

    # Kullanıcıdan gelen ham verileri birleştir ve temizle
    combined_query = f"{clean_text(raw_title)} {clean_text(raw_abstract)} {clean_text(raw_keywords)}"
    
    # Sorguyu vektöre çevir
    query_vector = model.encode(combined_query).tolist()
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()

        # SQL Sorgusu: pgvector <=> operatörü (Cosine Distance) kullanır.
        # 1 - (A <=> B) bize Cosine Similarity verir.
        # TOP 5 (En Benzer)
        search_query_top = """
            SELECT year, title_tr, 1 - (embedding <=> %s::vector) AS similarity_score
            FROM projects
            ORDER BY similarity_score DESC
            LIMIT %s;
        """
        
        # BOTTOM 5 (En Az Benzer)
        search_query_bottom = """
            SELECT year, title_tr, 1 - (embedding <=> %s::vector) AS similarity_score
            FROM projects
            ORDER BY similarity_score ASC
            LIMIT %s;
        """

        print(f"\n🔍 Sorgu İşleniyor: '{raw_title[:50]}...'")
        print("="*80)

        # En Benzerleri Getir
        cur.execute(search_query_top, (query_vector, top_k))
        top_results = cur.fetchall()
        
        print("\n--- ✅ EN BENZER İLK 5 SONUÇ ---")
        for res in top_results:
            print(f"⭐ [%{res[2]*100:.2f}] ({res[0]}) - {res[1]}")

        # En Az Benzerleri Getir
        cur.execute(search_query_bottom, (query_vector, top_k))
        bottom_results = cur.fetchall()
        
        print("\n--- ❌ EN AZ BENZER SON 5 SONUÇ ---")
        for res in bottom_results:
            print(f"💀 [%{res[2]*100:.2f}] ({res[0]}) - {res[1]}")

    except Exception as e:
        print(f"❌ Hata: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

# --- TEST VERİLERİ ---
if __name__ == "__main__":
    title = "Bildiri Kitapları Üzerinden Proje Benzerlik Analizii"
    abstract = (
    "Bu projenin amacı, girilen proje başlığı ve özetinin analiz edilerek daha önce LIFT UP programı kapsamında yapılan projelerle karşılaştırılması ve yeni projenin eski projelere göre benzerlik oranının hesaplanarak yüzdesel olarak gösterilmesidir. LIFT UP sitesinde yer alan Bildiri Kitapları alanındaki tüm projeler taranarak başlık ve özet bilgileri bir veritabanında toplanmalıdır. Sisteme yeni bir proje önerisi girildiğinde, metin benzerliği algoritmaları yardımıyla mevcut veritabanındaki projelerle karşılaştırma yapılacak ve sonuçlar raporlanacaktır. Bu raporda benzerlik oranı yüzdesel olarak ifade edilecek, ayrıca belirlenen eşik değerlerine göre “yüksek benzerlik”, “orta benzerlik” veya “düşük benzerlik” şeklinde sınıflandırılacaktır. Böylece önerilen projenin yenilikçi yönleri görülebilecek, tekrar eden çalışmaların önüne geçilecek ve özgün proje fikirleri teşvik edilecektir."
    )
    keywords = "benzerlik analizi, metin benzerliği, özgünlük."
    
    search_in_db(title, abstract, keywords)