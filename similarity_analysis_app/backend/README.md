# LIFT UP — Backend

**FastAPI + SBERT + Emrecan BERT + PostgreSQL + pgvector**

---

## Klasör Yapısı

```
backend/
├── .env.example
├── requirements.txt
├── Dockerfile
│
└── app/
    ├── main.py                   # Uygulama giriş noktası (lifespan, CORS, router'lar)
    │
    ├── core/
    │   └── config.py             # .env'den ayarları okur, eşik değerlerini tanımlar
    │
    ├── api/routes/
    │   ├── analyze.py            # POST /analyze  — benzerlik analizi
    │   ├── health.py             # GET  /health   — sistem sağlık kontrolü
    │   ├── keywords.py           # POST /suggest-keywords — Gemini anahtar kelime önerisi
    │   └── projects.py           # GET  /projects/ — tüm projeleri listele
    │
    ├── db/
    │   ├── session.py            # PostgreSQL bağlantı havuzu (psycopg2 pool)
    │   └── queries.py            # pgvector cosine similarity sorguları
    │
    ├── ml/
    │   └── model_loader.py       # SBERT ve Emrecan BERT singleton'ları
    │
    ├── services/
    │   ├── similarity_service.py # Ana iş mantığı: embed → sorgula → sınıfla
    │   ├── embedding_service.py  # Ağırlıklı embedding üretimi (SBERT + Emrecan)
    │   └── keyword_service.py    # Gemini API entegrasyonu
    │
    └── schemas/
        ├── request_schema.py     # Pydantic istek modelleri
        └── response_schema.py    # Pydantic yanıt modelleri
```

---

## Neyin Ne Yaptığı

### `main.py`
Uygulamanın giriş noktası. Sunucu başladığında SBERT ve Emrecan BERT modellerini RAM'e yükler, PostgreSQL bağlantı havuzunu oluşturur. Kapanırken bağlantıları temizler. CORS ve router kayıtları burada yapılır.

### `core/config.py`
`.env` dosyasından tüm ayarları (veritabanı bilgileri, model adları, Gemini API anahtarı, benzerlik eşikleri, CORS kökleri) okuyup `settings` nesnesi olarak sunar.

### `api/routes/analyze.py`
`POST /analyze` endpoint'i. Gelen `title`, `abstract`, `keywords`, `top_k` girdilerini alır, `similarity_service`'e iletir ve sonucu JSON olarak döndürür. İş mantığı içermez.

### `api/routes/health.py`
`GET /health` endpoint'i. Her iki modelin yüklü olup olmadığını ve veritabanı bağlantısının aktif olup olmadığını kontrol eder.

### `api/routes/keywords.py`
`POST /suggest-keywords` endpoint'i. Gelen `abstract` metnini Gemini API'ye iletir, dönen anahtar kelime listesini yanıt olarak döndürür.

### `api/routes/projects.py`
`GET /projects/` endpoint'i. Veritabanındaki tüm projeleri listeler. Frontend'deki proje geçmişi görünümü tarafından kullanılır.

### `db/session.py`
`psycopg2.pool.SimpleConnectionPool` ile 1–10 arası bağlantı havuzu yönetir. Her istekte yeni bağlantı açmak yerine havuzdan alınır, işlem bitince iade edilir.

### `db/queries.py`
İki sorgu içerir:
- `find_similar_projects`: SBERT embedding'iyle pgvector `<=>` (cosine distance) operatörü kullanarak `sbert_projects` tablosundan en benzer `top_k` projeyi getirir.
- `find_emrecan_similarities_by_ids`: Belirtilen proje ID'leri için `emrecan_projects` tablosundan Emrecan BERT benzerlik skorlarını döndürür.

### `ml/model_loader.py`
İki model singleton'ı barındırır: `ModelLoader` (SBERT — 384 boyut) ve `EmrecanModelLoader` (Emrecan BERT — 768 boyut). Uygulama başlangıcında bir kez yüklenir, her istekte yeniden yüklenmez.

### `services/embedding_service.py`
`title`, `abstract`, `keywords` alanlarını temizler (küçük harf, özel karakter), her birini ayrı ayrı encode eder ve ağırlıklı toplamla birleştirir (başlık %20, özet %70, anahtar kelimeler %10). L2 normalizasyon uygular. Aynı süreci hem SBERT hem Emrecan için çalıştırır.

### `services/similarity_service.py`
Ana iş mantığı:
1. SBERT embedding üret
2. pgvector ile en benzer projeleri sorgula
3. Emrecan embedding üret
4. Aynı projeler için Emrecan skorlarını al
5. Her proje için 5 seviyeli sınıflandırma yap
6. `AnalyzeResponse` formatında döndür

**Benzerlik seviyeleri:**

| Seviye | Skor Aralığı |
|---|---|
| Kritik | ≥ 0.90 |
| Yüksek | 0.70 – 0.89 |
| Orta | 0.50 – 0.69 |
| Düşük | 0.25 – 0.49 |
| Alakasız | < 0.25 |

### `services/keyword_service.py`
Gemini Flash API'ye `abstract` metnini gönderir, 5 adet Türkçe anahtar kelimeyi JSON array olarak alır. 503 hatalarında exponential backoff ile maksimum 3 deneme yapar. `GEMINI_API_KEY` boş bırakılırsa bu servis devre dışı kalır.

### `schemas/`
Pydantic modelleri. `request_schema.py` gelen istekleri (`title`, `abstract`, `keywords`, `top_k`) doğrular; `response_schema.py` dönen yanıtı (`similar_projects`, `classification`) tanımlar.

---

## Çalıştırma

### Docker ile (Önerilen)

Tüm kurulum adımları için: **[DOCKER_SETUP.md](../../DOCKER_SETUP.md)**

### Yerel Geliştirme (.venv)

```powershell
cd similarity_analysis_app\backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger UI: **http://localhost:8000/docs**
