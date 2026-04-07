# LIFT UP — Admin Backend API

**FastAPI tabanlı admin backend servisi.**  
PDF bildiri kitaplarından makale çıkarma, CSV analizi ve veri yönetimi.

---

## 🏗️ Mimari

Ana backend (`similarity_analysis_app/backend`) ile **aynı katmanlı yapı** kullanılır:

```
admin_dashboard/backend/
│
├── app/
│   ├── main.py                    # Uygulama giriş noktası (startup/shutdown)
│   ├── api/
│   │   └── routes/
│   │       ├── extract.py         # POST /admin/extract, GET /admin/jobs/{id}
│   │       ├── csv_ops.py         # GET  /admin/analyze/{id}/{file}, GET /admin/download/{id}/{file}
│   │       └── cleanup.py         # DELETE /admin/cleanup/{id}
│   ├── core/
│   │   ├── config.py              # .env ayar yönetimi
│   │   └── security.py            # Admin API key doğrulama
│   ├── jobs/
│   │   └── job_store.py           # Thread-safe in-memory iş kaydı
│   ├── schemas/
│   │   └── admin_schemas.py       # Pydantic istek/yanıt şemaları
│   └── services/
│       ├── pdf_service.py         # PDF işleme iş mantığı
│       └── csv_service.py         # CSV analiz iş mantığı
│
├── .env                           # Ortam değişkenleri
├── .env.example                   # Şablon
└── requirements.txt               # Python bağımlılıkları
```

> **Not:** `data_extract.py` ve `analysis.py` saf Python modülleridir, `data_extract_automation/` altında aynen durur. Sadece Flask routing katmanı (`app.py`) devre dışı bırakılmıştır.

---

## ⚙️ Kurulum

```powershell
cd admin_dashboard\backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
```

---

## 🚀 Çalıştırma

```powershell
cd admin_dashboard\backend
uvicorn app.main:app --reload --port 8001
```

**Swagger UI:** [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 🔌 API Endpoint'leri

| Method   | Path                              | Açıklama                          |
|:---------|:----------------------------------|:----------------------------------|
| `POST`   | `/admin/extract`                  | PDF yükle → makale çıkar          |
| `GET`    | `/admin/jobs/{job_id}`            | İş durumunu sorgula               |
| `GET`    | `/admin/analyze/{job_id}/{file}`  | CSV analizi yap                   |
| `GET`    | `/admin/download/{job_id}/{file}` | CSV dosyasını indir               |
| `DELETE` | `/admin/cleanup/{job_id}`         | Geçici dosyaları sil              |

### Kimlik Doğrulama

Tüm endpoint'ler `X-Admin-Key` header'ı gerektirir:

```
X-Admin-Key: lift-up-admin-secret-2026
```

---

## 🔄 Flask → FastAPI Karşılaştırması

| Flask (eski)             | FastAPI (yeni)                         |
|:-------------------------|:---------------------------------------|
| `POST /process`          | `POST /admin/extract` (BackgroundTask) |
| `GET /download/<id>/<f>` | `GET /admin/download/{id}/{f}`         |
| `GET /analyze/<id>/<f>`  | `GET /admin/analyze/{id}/{f}`          |
| `POST /cleanup/<id>`     | `DELETE /admin/cleanup/{id}`           |
| Port: 5000               | Port: 8001                             |
| Blocking (sync)          | Non-blocking (BackgroundTasks)         |
| Jinja2 template          | JSON API (frontend ayrı servis)        |
