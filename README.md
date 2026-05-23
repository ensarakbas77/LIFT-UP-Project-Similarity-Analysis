<div align="center">

# LIFT UP — Proje Benzerlik Analizi Sistemi

**Anlamsal Proje Benzerlik Analizi | SBERT + Emrecan BERT + PostgreSQL + pgvector**

Kullanıcının girdiği proje fikrini, TUSAŞ LIFT UP programı kapsamındaki mevcut projelerle  
**yapay zeka tabanlı** semantik benzerlik analizi ile karşılaştıran tam yığın (full-stack) web uygulaması.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)

---

[Özellikler](#özellikler) •
[Mimari](#mimari-yapı) •
[Proje Yapısı](#proje-yapısı) •
[Kurulum](#kurulum) •
[Kullanım](#kullanım) •
[API](#api-referansı)

</div>

---

## Özellikler

**Benzerlik Analizi Uygulaması**
- Çift model analizi — SBERT (birincil) ve Emrecan BERT (Türkçe özelleşmiş, ikincil doğrulama) ile karşılaştırmalı skor
- 5 seviyeli otomatik sınıflandırma — Kritik / Yüksek / Orta / Düşük / Alakasız
- Ağırlıklı embedding — Başlık %20, Özet %70, Anahtar Kelimeler %10
- Gemini AI ile Türkçe anahtar kelime önerisi (opsiyonel)
- Yıl filtresi, skor sıralaması ve top-k güncelleme
- Veritabanındaki tüm projeleri arayabilen geçmiş görünümü
- Dark mode, responsive tasarım

**Admin Dashboard**
- JWT + bcrypt tabanlı güvenli yönetici girişi
- Akademik bildiri kitaplarından (PDF) otomatik makale ve meta-veri çıkarma
- Pickle ile toplu proje veri güncelleme
- Dashboard istatistikleri ve raporlar

**Altyapı**
- Docker Compose ile tek komutta 4 servis ayağa kaldırma
- pgvector ile PostgreSQL üzerinde yüksek performanslı vektör benzerlik sorgusu
- Model önbellekleme — SBERT ve Emrecan BERT yalnızca bir kez yüklenir

---

## Mimari Yapı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KULLANICI  (Tarayıcı)                           │
│                                                                         │
│         Benzerlik Uygulaması          Admin Paneli                      │
│         http://localhost:3000         http://localhost:8001              │
└──────────────┬────────────────────────────────┬────────────────────────┘
               │                                │
               ▼                                ▼
┌──────────────────────────┐     ┌──────────────────────────────────────┐
│  similarity-frontend     │     │  admin-backend                       │
│  Nginx — :3000           │     │  FastAPI — :8001                     │
│                          │     │                                      │
│  Statik HTML/JS/CSS      │     │  PDF işleme (PyMuPDF)                │
│  sunar                   │     │  Proje yönetimi                      │
└──────────────┬───────────┘     │  Frontend + API tek sunucuda         │
               │                 └──────────────────┬───────────────────┘
               │ JS → API çağrısı                   │
               │ POST /analyze                      │
               │ GET  /projects/                    │
               │ POST /suggest-keywords             │
               ▼                                    │
┌──────────────────────────┐                        │
│  similarity-backend      │                        │
│  FastAPI — :8000         │                        │
│                          │                        │
│  SBERT (384 boyut)       │                        │
│  Emrecan BERT (768 boyut)│                        │
│  Gemini API              │                        │
└──────────────┬───────────┘                        │
               │                                    │
               └─────────────────┬──────────────────┘
                                 │  SQL + pgvector
                                 ▼
               ┌─────────────────────────────────────┐
               │  db (pgvector/pgvector:pg17) — :5432 │
               │                                     │
               │  projects       (840 proje)          │
               │  sbert_projects (SBERT vektörleri)   │
               │  emrecan_projects (BERT vektörleri)  │
               │  admin_users                         │
               └─────────────────────────────────────┘
```

### Benzerlik Seviyeleri

| Seviye | Skor Aralığı | Anlam |
|---|---|---|
| Kritik | ≥ 0.90 | Potansiyel mükerrer kayıt |
| Yüksek | 0.70 – 0.89 | Yakın tematik bağlantı |
| Orta | 0.50 – 0.69 | Disiplin paralelliği |
| Düşük | 0.25 – 0.49 | Uzak tematik ilişki |
| Alakasız | < 0.25 | Anlamlı bağlantı yok |

---

## Proje Yapısı

```
LIFT UP Project Similarity Analysis/
│
├── README.md                              # Bu dosya
├── docker-compose.yml                     # 4 servisin Docker tanımı
├── docker-compose.prod.yml                # Production Docker konfigürasyonu
├── DOCKER_SETUP.md                        # Docker kurulum rehberi (başlangıç noktası)
├── .env.example                           # Kök ortam değişkenleri şablonu
├── .gitignore
│
├── similarity_analysis_app/               # Benzerlik analizi uygulaması
│   ├── README.md
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py                    # FastAPI giriş noktası
│   │   │   ├── api/routes/                # analyze, health, keywords, projects
│   │   │   ├── core/config.py             # Ayarlar ve eşik değerleri
│   │   │   ├── db/                        # Bağlantı havuzu + pgvector sorguları
│   │   │   ├── ml/model_loader.py         # SBERT ve Emrecan BERT singleton'ları
│   │   │   ├── services/                  # embedding, similarity, keyword servisleri
│   │   │   └── schemas/                   # Pydantic istek/yanıt modelleri
│   │   ├── .env.example
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── README.md                      # Backend developer rehberi
│   │
│   └── frontend/
│       ├── index.html                     # SPA — tek sayfalı uygulama
│       ├── js/main.js                     # Fetch API, state yönetimi, validasyon
│       └── css/styles.css                 # Design system, dark mode
│
├── admin_dashboard/                       # Admin yönetim paneli
│   ├── README.md
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py                    # FastAPI + statik dosya sunumu
│   │   │   ├── api/                       # auth, projects, admin, data route'ları
│   │   │   ├── services/                  # PDF parsing, CSV analizi
│   │   │   └── schemas/
│   │   ├── .env.example
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── frontend/
│       ├── login/                         # JWT tabanlı giriş
│       ├── dashboard/                     # Ana kontrol paneli
│       ├── pdf-extract/                   # PDF → CSV çıkarıcı
│       ├── data-management/               # Proje arşivi
│       ├── data-update/                   # Pickle ile toplu güncelleme
│       ├── reports/                       # İstatistikler
│       └── shared/                        # Auth Guard, ortak CSS/JS
│
├── database/                              # Veritabanı araçları ve migration
│   ├── main.py                            # Pickle → PostgreSQL migration scripti
│   ├── terminal_similarity_example.py     # Terminal benzerlik araması örneği
│   ├── example_scripts.sql                # Tablo oluşturma SQL referansı
│   ├── install_guideline.md               # Yerel pgvector kurulumu (Docker dışı)
│   ├── tusas_liftup_embeddings.pkl        # Önceden hesaplanmış embedding verileri
│   ├── .env.example
│   └── README.md
│
└── notebooks/                             # Model karşılaştırma deneyleri
    ├── SBERT.ipynb                        # ✅ Seçilen model
    ├── Emrecan_BERT.ipynb                 # Türkçe BERT (production'da ikincil model)
    ├── BERTurk.ipynb
    └── DistilBERT.ipynb
```

---

## Kurulum

### Docker ile (Önerilen)

Tüm kurulum adımları için:

**[DOCKER_SETUP.md](./DOCKER_SETUP.md)**

Kısaca:
```powershell
# 1. .env dosyalarını oluştur
Copy-Item .env.example .env
Copy-Item similarity_analysis_app\backend\.env.example similarity_analysis_app\backend\.env
Copy-Item admin_dashboard\backend\.env.example admin_dashboard\backend\.env

# 2. Servisleri derle ve başlat
docker compose up --build
```

İlk başlatmada SBERT ve Emrecan BERT modelleri HuggingFace'ten indirilir (~500 MB), 5–10 dakika sürebilir. Sonraki başlatmalarda modeller önbellekten yüklenir.

---

### Yerel Kurulum (Docker Olmadan)

Önkoşullar: Python 3.10+, PostgreSQL 18+, pgvector 0.8.1+

> pgvector kurulumu için: [database/install_guideline.md](database/install_guideline.md)

#### 1. Repoyu Klonlayın

```bash
git clone https://github.com/ensarakbas77/LIFT-UP-Project-Similarity-Analysis.git
cd LIFT-UP-Project-Similarity-Analysis
```

#### 2. Veritabanını Hazırlayın

```sql
CREATE DATABASE liftup_db;
-- liftup_db'ye bağlanın
CREATE EXTENSION IF NOT EXISTS vector;
```

Ardından migration scriptini çalıştırın (proje kök dizininden):

```powershell
python database/main.py
```

#### 3. Ortam Değişkenlerini Ayarlayın

```powershell
Copy-Item similarity_analysis_app\backend\.env.example similarity_analysis_app\backend\.env
```

`.env` dosyasını açıp `DB_PASSWORD` değerini girin. `GEMINI_API_KEY` opsiyoneldir.

#### 4. Backend'i Başlatın (Terminal 1)

```powershell
cd similarity_analysis_app\backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Hazır olduğunda terminalde şunu görmelisiniz:

```
Sistem hazir!
INFO:     Uvicorn running on http://127.0.0.1:8000
```

#### 5. Frontend'i Başlatın (Terminal 2)

```powershell
cd similarity_analysis_app\frontend
npx -y http-server ./ -p 3000 -c-1 --cors
```

---

## Erişim Adresleri

| Servis | URL |
|---|---|
| Benzerlik Uygulaması | http://localhost:3000 |
| Admin Paneli | http://localhost:8001 |
| Similarity API Docs | http://localhost:8000/docs |
| Similarity API Health | http://localhost:8000/health |
| Admin API Docs | http://localhost:8001/docs |

---

## Kullanım

### Benzerlik Analizi

1. http://localhost:3000 adresini açın
2. Sağ üst köşede **"Sistem hazır"** (yeşil nokta) yazısını doğrulayın
3. Proje başlığı, özeti ve anahtar kelimeleri girin
4. **"Analiz Et"** butonuna tıklayın
5. Sonuçlar benzerlik skoru ve sınıflandırmasıyla birlikte listelenir

**Örnek Test Verisi:**

| Alan | Değer |
|---|---|
| Başlık | Hava Muharebesinde Otonom Savunma Algoritmasının Geliştirilmesi |
| Özet | Bu çalışma kapsamında, temel hava muharebesi manevraları kullanılarak birebir muharebeler için otonom savunma algoritması geliştirilmiştir. Algoritma, hedef hava aracı ile beklenmedik bir şekilde karşılaşıldığı durumlarda saldırı üstünlüğünün sağlanması için en uygun muharebe manevrasını seçmeyi sağlamaktadır. |
| Anahtar Kelimeler | bire-bir hava muharebesi, kural tabanlı yöntem, temel hava muharebe manevraları |

### Admin Paneli

http://localhost:8001 adresine giriş yapın. Admin kimlik bilgileri veritabanındaki `admin_users` tablosunda saklanır.

---

## API Referansı

### Benzerlik API (`:8000`)

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/analyze` | `{title, abstract, keywords, top_k?}` → benzerlik analizi |
| POST | `/suggest-keywords` | `{abstract}` → Gemini ile anahtar kelime önerisi |
| GET | `/projects/` | Tüm projeleri listele |
| GET | `/health` | Model ve veritabanı durum kontrolü |

### Admin API (`:8001`)

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/auth/login` | JWT token al |
| POST | `/admin/extract` | PDF yükle, arka planda makale çıkar |
| GET | `/admin/jobs/{job_id}` | Arka plan iş durumunu sorgula |
| GET | `/admin/download/{job_id}/{filename}` | CSV çıktısını indir |
| POST | `/data/upload-pkl` | Pickle ile toplu proje ekle |
| GET | `/api/projects/stats` | Dashboard istatistikleri |

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Deployment | Docker Compose (4 servis) |
| Similarity Backend | FastAPI + Uvicorn (Python 3.10+) |
| Admin Backend | FastAPI + Uvicorn (Python 3.10+) |
| Birincil Model | SBERT `paraphrase-multilingual-MiniLM-L12-v2` — 384 boyut |
| İkincil Model | `emrecan/bert-base-turkish-cased-mean-nli-stsb-tr` — 768 boyut |
| AI Özelliği | Google Gemini API (anahtar kelime önerisi) |
| PDF İşleme | PyMuPDF |
| Veritabanı | PostgreSQL + pgvector (cosine similarity) |
| Similarity Frontend | Nginx + HTML5 + Vanilla JS + CSS3 |
| Admin Frontend | FastAPI static files + HTML5 + Bootstrap 5 + Vanilla JS |

---

## Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|---|---|
| "Sistem hazır" yerine "Bağlantı yok" | similarity-backend çalışmıyor, `docker compose logs similarity-backend` inceleyin |
| Analiz sonrası 500 hatası | PostgreSQL bağlantısını ve `.env` bilgilerini kontrol edin |
| İlk başlatma çok uzun sürüyor | Normal — SBERT ve Emrecan BERT modelleri (~500 MB) indiriliyor |
| Model indirme hatası | İnternet bağlantısını kontrol edin; Docker ağ kısıtlaması olabilir |
| Migration'da duplicate veri oluştu | `TRUNCATE TABLE projects RESTART IDENTITY;` ile tabloyu temizleyin |
| Admin paneline giriş yapılamıyor | `admin_users` tablosunda kayıt var mı? Veritabanı restore edildi mi? |
| Docker volume bozuldu | `docker compose down -v && docker compose up --build` (veriler silinir) |

---

## Notebooklar

`notebooks/` klasöründe farklı dil modellerinin karşılaştırma deneyleri yer alır:

| Notebook | Model | Durum |
|---|---|---|
| `SBERT.ipynb` | paraphrase-multilingual-MiniLM-L12-v2 | Seçilen birincil model |
| `Emrecan_BERT.ipynb` | emrecan/bert-base-turkish-cased-mean-nli-stsb-tr | Production'da ikincil model |
| `BERTurk.ipynb` | BERTurk | Deneme |
| `DistilBERT.ipynb` | DistilBERT | Deneme |

---

## Kaynaklar

- [pgvector — GitHub](https://github.com/pgvector/pgvector)
- [Sentence-Transformers Dokümantasyonu](https://www.sbert.net/)
- [paraphrase-multilingual-MiniLM-L12-v2 — HuggingFace](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
- [emrecan/bert-base-turkish-cased-mean-nli-stsb-tr — HuggingFace](https://huggingface.co/emrecan/bert-base-turkish-cased-mean-nli-stsb-tr)
- [FastAPI Dokümantasyonu](https://fastapi.tiangolo.com/)
- [Google Gemini API](https://aistudio.google.com)
- [PostgreSQL Dokümantasyonu](https://www.postgresql.org/docs/)

---

<div align="center">

**LIFT UP** — TUSAŞ & Prestige AI | Semantik Proje Benzerlik Analizi Sistemi

</div>
