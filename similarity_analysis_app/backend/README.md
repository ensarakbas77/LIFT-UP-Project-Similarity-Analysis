# LIFT UP — Backend Guideline

**Semantik Proje Benzerlik Analizi Sistemi**
FastAPI + SBERT + PostgreSQL + pgvector

---

## Klasor Yapisi

```
backend/
│
├── .env                          # Veritabani ve model ayarlari
├── .env.example                  # Ornek .env sablonu
├── requirements.txt              # Python bagimliliklar
│
└── app/
    ├── main.py                   # Uygulama giris noktasi (startup/shutdown)
    │
    ├── api/routes/
    │   ├── analyze.py            # POST /analyze  — benzerlik analizi endpoint'i
    │   └── health.py             # GET  /health   — sistem saglik kontrolu
    │
    ├── core/
    │   └── config.py             # .env dosyasindan ayarlari okur
    │
    ├── db/
    │   ├── session.py            # PostgreSQL baglanti havuzu yonetimi
    │   └── queries.py            # pgvector ile cosine similarity sorgusu
    │
    ├── services/
    │   ├── embedding_service.py  # Metin temizleme + SBERT embedding uretimi
    │   └── similarity_service.py # Ana is mantigi: embed → sorgula → sinifla
    │
    ├── schemas/
    │   ├── request_schema.py     # Istek yapisi (title, abstract, keywords)
    │   └── response_schema.py    # Yanit yapisi (similar_projects, classification)
    │
    └── ml/
        └── model_loader.py       # SBERT modelini yukleme ve bellekte tutma
```

---

## Neyin Ne Yaptigi

### `main.py`
Uygulamanin giris noktasi. Sunucu basladiginda SBERT modelini ve veritabani baglantisini hazirlar, kapandiginda temizler. Router'lari ve CORS ayarlarini kaydeder.

### `api/routes/analyze.py`
`POST /analyze` endpoint'i. Kullanicidan gelen `title`, `abstract`, `keywords` bilgilerini alir, service katmanina iletir ve sonucu JSON olarak dondurur. Kendisi hicbir is mantigi icermez.

### `api/routes/health.py`
`GET /health` endpoint'i. SBERT modelinin yuklu olup olmadigini ve veritabani baglantisinin aktif olup olmadigini kontrol eder.

### `core/config.py`
`.env` dosyasindan tum ayarlari (DB bilgileri, model adi, esik degerleri, CORS) okuyup `settings` nesnesi olarak sunar.

### `db/session.py`
PostgreSQL icin connection pool olusturur. Her istekte yeni baglanti acmak yerine havuzdan baglanti alinir ve islem bitince iade edilir.

### `db/queries.py`
pgvector'un `<=>` operatoru ile cosine similarity sorgusu yapar. Verilen embedding vektorune en yakin `top_k` projeyi veritabanindan getirir.

### `services/embedding_service.py`
`title + abstract + keywords` birlestirir, metni temizler (kucuk harf, ozel karakter) ve SBERT modeli ile 384 boyutlu embedding vektoru uretir.

### `services/similarity_service.py`
Ana is mantigi burada. Sirasiyla: embedding uretir → DB'de benzer projeleri arar → en yuksek skora gore siniflandirir (`high` >= 0.75, `medium` >= 0.50, `low` < 0.50) → yaniti formatlar.

### `schemas/request_schema.py`
Pydantic modeli. Gelen istekteki `title`, `abstract`, `keywords` alanlarini dogrular.

### `schemas/response_schema.py`
Pydantic modeli. Donen yanittaki `similar_projects` listesi ve `classification` alanini tanimlar.

### `ml/model_loader.py`
SBERT modelini uygulama basladiginda bir kez yukler ve bellekte tutar. Her istekte yeniden yukleme yapmaz.

---

## Calistirma

```powershell
cd similarity_analysis_app\backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger UI: `http://localhost:8000/docs`
