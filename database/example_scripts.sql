-- =========================================================
-- pgvector Extension Setup
-- =========================================================

-- Mevcut veritabanında pgvector extension'ını aktif eder.
-- Bu komut HER DATABASE için yalnızca 1 kez çalıştırılır.
CREATE EXTENSION IF NOT EXISTS vector;


-- pgvector extension'ının kurulu ve aktif olduğunu kontrol eder.
SELECT * 
FROM pg_extension 
WHERE extname = 'vector';


-- =========================================================
-- Projects Table (Vector Embedding Storage)
-- =========================================================

-- Proje verilerini ve embedding'lerini saklamak için tablo oluşturur.
-- embedding kolonu 384 boyutlu vektörler (SBERT) için tasarlanmıştır.
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,        -- Otomatik artan benzersiz ID
    year VARCHAR(20),             -- Proje yılı
    title_tr TEXT,                -- Proje başlığı
    abstract_tr TEXT,             -- Proje özeti
    keywords_tr TEXT,             -- Anahtar kelimeler
    combined_text TEXT,           -- Embedding üretiminde kullanılan birleştirilmiş metin
    embedding vector(384)         -- Projeye ait vektör temsili
);


-- projects tablosundaki tüm kayıtları listeler
SELECT * 
FROM projects;


-- projects tablosundan örnek olarak ilk 5 kaydı getirir.
SELECT id, title_tr, embedding 
FROM projects 
LIMIT 5;

-- toplam veri sayısı: 666 
SELECT COUNT(*) FROM projects;
