# 🗄️ Database Modülü — LIFT UP Proje Benzerlik Analizi

Bu modül, **LIFT UP** programı kapsamında üretilmiş proje verilerinin bir **PostgreSQL + pgvector** veritabanında saklanmasını ve bu veriler üzerinde **semantik (vektör tabanlı) benzerlik araması** yapılmasını sağlar.

---

## 📁 Dosya Yapısı

| Dosya | Açıklama |
|---|---|
| `main.py` | Pickle dosyasındaki embedding verilerini PostgreSQL veritabanına toplu aktaran (migration) script. |
| `terminal_similarity_example.py` | Terminal üzerinden çalışan, kullanıcıdan alınan proje bilgisiyle veritabanında benzerlik araması yapan örnek script. |
| `example_scripts.sql` | Veritabanı ve tablo oluşturma, pgvector extension kurulumu ve temel sorguları içeren SQL referans dosyası. |
| `install_guideline.md` | Windows üzerinde PostgreSQL 18 için pgvector 0.8.1 eklentisinin adım adım kurulum rehberi. |
| `tusas_liftup_embeddings.pkl` | LIFT UP projelerine ait önceden hesaplanmış embedding vektörlerini içeren Pickle (pandas DataFrame) dosyası. |
| `.env` | Veritabanı bağlantı bilgilerini içeren ortam değişkenleri dosyası.|
| `.env.example` | `.env` dosyasının şablon hali. Yeni geliştiriciler bu dosyayı kopyalayarak kendi `.env` dosyasını oluşturmalıdır. |

---

## ⚙️ Gereksinimler

### Sistem Gereksinimleri

- **PostgreSQL 18** (veya uyumlu sürüm)
- **pgvector 0.8.1** extension'ı (kurulum için bkz. [`install_guideline.md`](./install_guideline.md))

### Python Bağımlılıkları

| Paket | Kullanım Amacı |
|---|---|
| `psycopg2` | PostgreSQL veritabanı bağlantısı ve sorgu çalıştırma |
| `python-dotenv` | `.env` dosyasından ortam değişkenlerini yükleme |
| `numpy` | Embedding vektör dönüşümleri |
| `pandas` | Pickle dosyasından DataFrame okuma |
| `sentence-transformers` | Kullanıcı sorgusunu vektöre dönüştürme (yalnızca `terminal_similarity_example.py` için) |

---

## 🚀 Kurulum ve Çalıştırma Adımları

### 1. pgvector Kurulumu

pgvector extension'ı PostgreSQL ile birlikte gelmez, manuel olarak kurulması gerekir. Detaylı adımlar için:

👉 [`install_guideline.md`](./install_guideline.md)

### 2. Veritabanı Oluşturma

PostgreSQL üzerinde `liftup_db` adında bir veritabanı oluşturun (DBeaver, pgAdmin veya psql üzerinden):

```sql
CREATE DATABASE liftup_db;
```

### 3. pgvector Extension'ını Aktif Etme

Oluşturulan veritabanına bağlanarak aşağıdaki SQL'i çalıştırın:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Tabloyu Oluşturma

`example_scripts.sql` dosyasındaki `CREATE TABLE` sorgusunu çalıştırarak `projects` tablosunu oluşturun:

```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    year VARCHAR(20),
    title_tr TEXT,
    abstract_tr TEXT,
    keywords_tr TEXT,
    combined_text TEXT,
    embedding vector(384)
);
```

### 5. Ortam Değişkenlerini Ayarlama

`.env.example` dosyasını `.env` olarak kopyalayıp kendi veritabanı bilgilerinizi girin:

```
DB_NAME=liftup_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
```

> ⚠️ **Güvenlik:** `.env` dosyasını **asla** versiyon kontrolüne (Git) eklemeyin.

### 6. Veri Aktarımı (Migration)

Pickle dosyasındaki embedding verilerini veritabanına aktarmak için:

```bash
python main.py
```

> ℹ️ Bu script, `tusas_liftup_embeddings.pkl` dosyasındaki **666 adet** proje kaydını `projects` tablosuna toplu (batch) olarak ekler.

### 7. Benzerlik Araması (Opsiyonel — Test)

Terminal üzerinden örnek bir benzerlik araması yapmak için:

```bash
python terminal_similarity_example.py
```

Bu script:
- `paraphrase-multilingual-MiniLM-L12-v2` modeli ile sorgu metnini vektöre çevirir.
- pgvector'ün `<=>` (Cosine Distance) operatörünü kullanarak veritabanında arama yapar.
- **En benzer 5** ve **en az benzer 5** projeyi benzerlik yüzdesiyle birlikte listeler.

---

## 🏗️ Veritabanı Şeması

### `projects` Tablosu

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Otomatik artan benzersiz kimlik |
| `year` | `VARCHAR(20)` | Projenin yılı |
| `title_tr` | `TEXT` | Proje başlığı (Türkçe) |
| `abstract_tr` | `TEXT` | Proje özeti (Türkçe) |
| `keywords_tr` | `TEXT` | Anahtar kelimeler (Türkçe) |
| `combined_text` | `TEXT` | Embedding üretiminde kullanılan birleştirilmiş metin |
| `embedding` | `vector(384)` | Projeye ait 384 boyutlu SBERT vektör temsili |

---

## 🔍 Kullanılan Teknolojiler ve Yaklaşım

### Embedding Modeli

- **Model:** `paraphrase-multilingual-MiniLM-L12-v2` (Sentence-Transformers)
- **Boyut:** 384 boyutlu vektör
- **Özellik:** Çok dilli destek — Türkçe metinlerle doğrudan çalışabilir.

### Benzerlik Metriği

- **Cosine Similarity** kullanılır.
- pgvector'ün `<=>` operatörü **Cosine Distance** hesaplar.
- Benzerlik skoru şu formülle elde edilir: `1 - (embedding <=> query_vector)`
- Sonuç **0 ile 1** arasında bir değerdir; 1'e yakınlık yüksek benzerliği ifade eder.

### Metin Ön İşleme

Benzerlik aramasından önce metinlere aşağıdaki ön işleme adımları uygulanır:
1. Küçük harfe dönüştürme
2. Fazla boşlukları temizleme
3. Özel karakterlerin (`#`, `%`, `&`, `*`, `_`, `=`, `+`, `<`, `>`) kaldırılması

---

## 📌 Önemli Notlar

- `main.py` scripti **proje kök dizininden** çalıştırılmalıdır, çünkü Pickle dosya yolu `database/tusas_liftup_embeddings.pkl` şeklinde relatif olarak tanımlanmıştır.
- `terminal_similarity_example.py` scripti ise `.env` dosyasını **bulunduğu dizinden** yükler; bu nedenle `database/` klasörü içinden çalıştırılmalı veya `.env` yolu güncellenmelidir.
- `tusas_liftup_embeddings.pkl` dosyası yaklaşık **3.7 MB** boyutundadır ve 666 adet projenin embedding verilerini içerir.
- Migration işlemi (`main.py`) birden fazla kez çalıştırılırsa veriler **tekrar eklenir** (duplicate oluşur). Gerekirse tabloyu öncesinde temizleyin:
  ```sql
  TRUNCATE TABLE projects RESTART IDENTITY;
  ```

---

## 🔗 Kaynaklar

- [pgvector — GitHub](https://github.com/pgvector/pgvector)
- [pgvector Windows Build](https://github.com/andreiramani/pgvector_pgsql_windows)
- [Sentence-Transformers Dökümantasyonu](https://www.sbert.net/)
- [paraphrase-multilingual-MiniLM-L12-v2 — HuggingFace](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
- [psycopg2 Dökümantasyonu](https://www.psycopg.org/docs/)
