# LIFT UP — Admin Dashboard

**FastAPI tabanlı admin paneli ve veri yönetim arayüzü.**

Sistem yöneticilerine proje veritabanı yönetimi, akademik PDF'lerden otomatik veri çıkarma ve toplu veri güncelleme imkânı sağlar. Frontend (HTML/CSS/JS) ve Backend (FastAPI) aynı sunucu üzerinden servis edilir.

---

## Klasör Yapısı

```text
admin_dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # Uygulama giriş noktası (lifespan, routing)
│   │   ├── api/                 # Endpoint router'ları (auth, projects, admin, data)
│   │   ├── core/                # Konfigürasyon ve JWT/bcrypt güvenlik katmanı
│   │   ├── services/            # PDF parsing ve CSV analizi iş mantığı
│   │   ├── schemas/             # Pydantic request/response modelleri
│   │   ├── jobs/                # Arka plan iş takibi (in-memory job registry)
│   │   └── pdf_processing/      # PyMuPDF tabanlı metin ve meta-veri çıkarıcı
│   ├── .env.example             # Ortam değişkenleri şablonu
│   └── requirements.txt         # Python bağımlılıkları
│
└── frontend/
    ├── login/                   # JWT tabanlı giriş ekranı
    ├── dashboard/               # Ana kontrol paneli (proje istatistikleri)
    ├── pdf-extract/             # PDF yükle → CSV çıkart arayüzü
    ├── data-management/         # Proje arşivi ve tablo tarayıcısı
    ├── data-update/             # Pickle ile toplu veri güncelleme
    ├── reports/                 # İstatistikler ve raporlar
    ├── settings/                # Sistem ayarları
    ├── notebooks/               # Jupyter Notebook tanıtım sayfası
    └── shared/                  # Ortak CSS, Auth Guard ve yardımcı JS
```

---

## Teknoloji Stack'i

| Katman | Teknoloji |
|---|---|
| Web Framework | FastAPI 0.111+ |
| ASGI Server | Uvicorn 0.29+ |
| Kimlik Doğrulama | JWT (HS256) + bcrypt |
| Veritabanı | PostgreSQL (psycopg2-binary) |
| PDF İşleme | PyMuPDF 1.24+ |
| Veri Analizi | Pandas 2.2+ |
| Frontend | HTML5 + Bootstrap 5.3 + Vanilla JS |

---

## Kimlik Doğrulama

- Admin şifreleri veritabanındaki `admin_users` tablosunda **bcrypt** ile hashlenmiş şekilde saklanır.
- Giriş başarılı olunca kısa ömürlü bir **JWT** üretilir ve istemcinin `localStorage`'ına kaydedilir.
- Tüm korumalı sayfalar, `shared/` altındaki **Auth Guard** ile token geçerliliğini kontrol eder; süresi dolan token otomatik olarak logout tetikler.

---

## Temel API Endpoint'leri

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/auth/login` | Kullanıcı adı + şifre → JWT token |
| GET | `/auth/me` | Token doğrulama ve kullanıcı bilgisi |
| POST | `/auth/logout` | Oturum kapatma |
| PATCH | `/auth/update-profile` | Profil güncelleme |
| GET | `/api/projects/` | Tüm projeleri listele |
| GET | `/api/projects/stats` | Dashboard istatistikleri |
| POST | `/admin/extract` | PDF yükle, arka planda makale çıkar |
| GET | `/admin/jobs/{job_id}` | Arka plan iş durumunu sorgula |
| GET | `/admin/analyze/{job_id}/{filename}` | Çıktı CSV analizini al |
| GET | `/admin/download/{job_id}/{filename}` | CSV dosyasını indir |
| DELETE | `/admin/cleanup/{job_id}` | Geçici iş dosyalarını temizle |
| POST | `/data/upload-pkl` | Pickle dosyasından toplu proje ekle |
| GET | `/health` | API sağlık kontrolü |

İnteraktif API dokümantasyonuna uygulama çalışırken buradan ulaşabilirsiniz: **http://localhost:8001/docs**

---

## Ortam Değişkenleri

`backend/.env.example` dosyasını kopyalayın:

```powershell
Copy-Item admin_dashboard\backend\.env.example admin_dashboard\backend\.env
```

Aşağıdaki alanları doldurun:

```env
# PostgreSQL
DB_NAME=liftup_db
DB_USER=postgres
DB_PASSWORD=veritabani_sifresi
DB_HOST=localhost        # Docker kullanıyorsanız: db
DB_PORT=5432

# Güvenlik
ADMIN_API_KEY=guclu_bir_api_anahtari
JWT_SECRET=guclu_bir_jwt_gizli_anahtari
JWT_EXPIRE_MINUTES=180

# Dosya İşleme
JOBS_DIR=./jobs
MAX_PDF_SIZE_MB=200

# CORS (geliştirme için)
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173
```

---

## Çalıştırma

### Docker ile (Önerilen)

Projenin tüm servislerini Docker üzerinden çalıştırmak için ana dizindeki kurulum rehberine bakın:  
**[DOCKER_SETUP.md](../DOCKER_SETUP.md)**

Admin paneline **http://localhost:8001** adresinden erişilir.

### Yerel Geliştirme (.venv)

```powershell
cd admin_dashboard\backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

> `.env` dosyasında `DB_HOST=localhost` olarak ayarlayın (Docker kullanmıyorsanız).

---

## PDF Çıkarma İş Akışı

```
1. /pdf-extract sayfasında PDF + yıl seçilir
2. POST /admin/extract → job_id döner
3. Arka planda PDF işlenir (BackgroundTask)
4. Frontend polling ile GET /admin/jobs/{job_id} sorgular
5. Status "done" olunca CSV analizi ve indirme yapılır
6. DELETE /admin/cleanup/{job_id} ile geçici dosyalar temizlenir
```
