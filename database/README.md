# Veritabanı Modülü — LIFT UP Proje Benzerlik Analizi

Bu modül, **LIFT UP** programı kapsamında üretilmiş proje verilerinin bir **PostgreSQL + pgvector** veritabanında saklanmasını ve bu veriler üzerinde **semantik (vektör tabanlı) benzerlik araması** yapılmasını sağlar.

---

## Dosya Yapısı

| Dosya | Açıklama |
|---|---|
| `main.py` | Pickle dosyasındaki embedding verilerini PostgreSQL'e toplu aktaran migration scripti |
| `terminal_similarity_example.py` | Terminal üzerinden benzerlik araması yapan örnek script |
| `example_scripts.sql` | Veritabanı kurulum ve temel sorgu referansları |
| `install_guideline.md` | Windows'ta PostgreSQL 18 üzerine pgvector 0.8.1 kurulum rehberi |
| `tusas_liftup_embeddings.pkl` | Önceden hesaplanmış embedding vektörlerini içeren Pickle (pandas DataFrame) dosyası (~3.7 MB, 666 proje) |
| `.env.example` | Ortam değişkenleri şablonu |

---

## Veritabanı Şeması

### `projects` Tablosu

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Otomatik artan benzersiz kimlik |
| `year` | `VARCHAR(20)` | Projenin yılı |
| `title_tr` | `TEXT` | Proje başlığı (Türkçe) |
| `abstract_tr` | `TEXT` | Proje özeti (Türkçe) |
| `keywords_tr` | `TEXT` | Anahtar kelimeler (Türkçe) |
| `combined_text` | `TEXT` | Embedding üretiminde kullanılan birleştirilmiş metin |
| `embedding` | `vector(384)` | 384 boyutlu SBERT vektör temsili |

### `admin_users` Tablosu

Admin Dashboard kimlik doğrulama sistemi için kullanılır. `admin_dashboard` modülü tarafından yönetilir.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Otomatik artan benzersiz kimlik |
| `username` | `TEXT` | Kullanıcı adı |
| `email` | `TEXT` | E-posta adresi |
| `full_name` | `TEXT` | Ad soyad |
| `password_hash` | `TEXT` | bcrypt hashlenmiş şifre |
| `is_active` | `BOOLEAN` | Hesap aktiflik durumu |
| `last_login` | `TIMESTAMP` | Son giriş zamanı |

---

## Kurulum ve Kullanım

Veritabanı iki farklı yöntemle kurulabilir. Docker önerilir; yerel kurulum ise geliştirme ortamı veya Docker kullanılamayan senaryolar için geçerlidir.

### Docker ile (Önerilen)

Docker kurulumunda **pgvector manuel olarak kurulmaz** — kullanılan `pgvector/pgvector:pg17` imajı pgvector'ü yerleşik olarak içerir. Veritabanı `liftup_backup.sql` ile restore edilir; migration scriptlerine gerek kalmaz.

Tüm adımlar için:  
**[DOCKER_SETUP.md](../DOCKER_SETUP.md)**

---

### Yerel Kurulum (Docker Olmadan)

Aşağıdaki adımlar Docker kullanmadan, PostgreSQL'i doğrudan bilgisayarınıza kurduğunuz senaryo içindir.

#### 1. pgvector Kurulumu

pgvector PostgreSQL ile birlikte gelmez, manuel kurulum gerekir. Adımlar için:  
**[install_guideline.md](./install_guideline.md)**

#### 2. Veritabanı Oluşturma

```sql
CREATE DATABASE liftup_db;
```

#### 3. pgvector Extension'ını Aktif Etme

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 4. Tabloyu Oluşturma

`example_scripts.sql` içindeki `CREATE TABLE` sorgusunu çalıştırın:

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

#### 5. Ortam Değişkenlerini Ayarlama

```powershell
Copy-Item .env.example .env
```

`.env` dosyasını açıp doldurun:

```env
DB_NAME=liftup_db
DB_USER=postgres
DB_PASSWORD=veritabani_sifresi
DB_HOST=localhost
DB_PORT=5432
```

> `.env` dosyasını asla versiyon kontrolüne eklemeyin.

#### 6. Veri Aktarımı (Migration)

Pickle dosyasındaki 666 proje kaydını veritabanına aktarmak için projenin **kök dizininden** çalıştırın:

```bash
python database/main.py
```

> Script `database/tusas_liftup_embeddings.pkl` dosyasını relatif yol ile okur, bu nedenle kök dizinden çalıştırılmalıdır.

> Migration birden fazla çalıştırılırsa veriler tekrar eklenir. Gerekirse önce temizleyin:
> ```sql
> TRUNCATE TABLE projects RESTART IDENTITY;
> ```

#### 7. Benzerlik Araması (Opsiyonel — Test)

```bash
cd database
python terminal_similarity_example.py
```

Bu script `paraphrase-multilingual-MiniLM-L12-v2` modeliyle sorgu metnini vektöre çevirir ve pgvector'ün `<=>` operatörü ile en benzer / en az benzer 5 projeyi listeler.

---

## Python Bağımlılıkları

Aşağıdaki paketler **yerel kurulum** ve script kullanımı içindir. Docker kurulumunda bağımlılıklar ilgili container'ın `requirements.txt` dosyasından otomatik yüklenir.

| Paket | Kullanım Amacı |
|---|---|
| `psycopg2` | PostgreSQL bağlantısı ve sorgu çalıştırma |
| `python-dotenv` | `.env` dosyasından ortam değişkenlerini yükleme |
| `numpy` | Embedding vektör dönüşümleri |
| `pandas` | Pickle dosyasından DataFrame okuma |
| `sentence-transformers` | Sorgu metnini vektöre dönüştürme (yalnızca `terminal_similarity_example.py`) |

---

## Kullanılan Teknolojiler

### Embedding Modeli

- **Model:** `paraphrase-multilingual-MiniLM-L12-v2` (Sentence-Transformers)
- **Boyut:** 384 boyutlu vektör
- **Özellik:** Çok dilli destek — Türkçe metinlerle doğrudan çalışır

### Benzerlik Metriği

- **Cosine Similarity** kullanılır
- pgvector `<=>` operatörü Cosine Distance hesaplar
- Benzerlik skoru: `1 - (embedding <=> query_vector)` → 0 ile 1 arasında, 1'e yakınlık yüksek benzerliği ifade eder

### Metin Ön İşleme

1. Küçük harfe dönüştürme
2. Fazla boşlukları temizleme
3. Özel karakterlerin (`#`, `%`, `&`, `*`, `_`, `=`, `+`, `<`, `>`) kaldırılması

---

## Kaynaklar

- [pgvector — GitHub](https://github.com/pgvector/pgvector)
- [pgvector Windows Build](https://github.com/andreiramani/pgvector_pgsql_windows)
- [Sentence-Transformers Dokümantasyonu](https://www.sbert.net/)
- [paraphrase-multilingual-MiniLM-L12-v2 — HuggingFace](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
- [psycopg2 Dokümantasyonu](https://www.psycopg.org/docs/)
